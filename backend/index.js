require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
app.use(express.json());

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: 'Only ' + role + 's can do this' });
    next();
  };
}

app.get('/', (req, res) => {
  res.send('Hello! The appointment booking server is running');
});

app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !['owner', 'client'].includes(role)) {
    return res.status(400).json({ error: 'name, email, password and role (owner or client) are required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hash, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/me', auth, (req, res) => {
  res.json(req.user);
});

app.post('/services', auth, requireRole('owner'), async (req, res) => {
  const { name, duration_minutes, price } = req.body;
  if (!name || !Number.isInteger(duration_minutes) || duration_minutes <= 0 || typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'name, duration_minutes (positive integer) and price (number) are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO services (owner_id, name, duration_minutes, price) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name, duration_minutes, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/services', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.id, s.name, s.duration_minutes, s.price, u.name AS owner_name FROM services s JOIN users u ON u.id = s.owner_id ORDER BY s.id'
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/appointments', auth, requireRole('client'), async (req, res) => {
  const { service_id, starts_at } = req.body;
  const date = new Date(starts_at);
  if (!Number.isInteger(service_id) || isNaN(date) || date <= new Date()) {
    return res.status(400).json({ error: 'service_id (integer) and a future starts_at date are required' });
  }
  try {
    const svc = await pool.query('SELECT * FROM services WHERE id = $1', [service_id]);
    if (!svc.rows[0]) return res.status(404).json({ error: 'Service not found' });
    const service = svc.rows[0];
    const overlap = await pool.query(
      `SELECT 1 FROM appointments a JOIN services s ON s.id = a.service_id
       WHERE s.owner_id = $1 AND a.status = 'booked'
       AND a.starts_at < $3::timestamptz + make_interval(mins => $2::int)
       AND a.starts_at + make_interval(mins => s.duration_minutes) > $3::timestamptz`,
      [service.owner_id, service.duration_minutes, date.toISOString()]
    );
    if (overlap.rows.length > 0) return res.status(409).json({ error: 'That time slot is already taken' });
    const result = await pool.query(
      'INSERT INTO appointments (service_id, client_id, starts_at) VALUES ($1, $2, $3) RETURNING *',
      [service_id, req.user.id, date.toISOString()]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/appointments/mine', auth, async (req, res) => {
  try {
    const query = req.user.role === 'client'
      ? `SELECT a.id, a.starts_at, a.status, s.name AS service, u.name AS business
         FROM appointments a JOIN services s ON s.id = a.service_id JOIN users u ON u.id = s.owner_id
         WHERE a.client_id = $1 ORDER BY a.starts_at`
      : `SELECT a.id, a.starts_at, a.status, s.name AS service, c.name AS client
         FROM appointments a JOIN services s ON s.id = a.service_id JOIN users c ON c.id = a.client_id
         WHERE s.owner_id = $1 ORDER BY a.starts_at`;
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/appointments/:id/cancel', auth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid appointment id' });
  try {
    const found = await pool.query(
      'SELECT a.*, s.owner_id FROM appointments a JOIN services s ON s.id = a.service_id WHERE a.id = $1',
      [id]
    );
    const appt = found.rows[0];
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    if (appt.client_id !== req.user.id && appt.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your appointment' });
    }
    if (appt.status === 'cancelled') return res.status(409).json({ error: 'Already cancelled' });
    const result = await pool.query(
      "UPDATE appointments SET status = 'cancelled' WHERE id = $1 RETURNING id, status",
      [id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
