# Appointment Booking

REST API for online appointment booking at small businesses (hair salons, clinics, sports courts). Business owners publish services, clients book time slots, and the system prevents double bookings.

## Features

- User registration and login with hashed passwords (bcrypt) and JWT authentication
- Two roles: `owner` (publishes services) and `client` (books appointments)
- Overlap detection: a time slot already taken at the same business is rejected
- Clients and owners can list and cancel their own appointments
- Input validation and role-based access control

## Tech stack

- Node.js and Express
- PostgreSQL (`pg`)
- JWT (`jsonwebtoken`) and `bcryptjs`

## API endpoints

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/register` | Public | Create an account (`name`, `email`, `password`, `role`) |
| POST | `/login` | Public | Log in and receive a JWT |
| GET | `/me` | Logged in | Show the current user |
| POST | `/services` | Owner | Create a service (`name`, `duration_minutes`, `price`) |
| GET | `/services` | Public | List all services |
| POST | `/appointments` | Client | Book an appointment (`service_id`, `starts_at`) |
| GET | `/appointments/mine` | Logged in | List my appointments |
| PATCH | `/appointments/:id/cancel` | Client or owner involved | Cancel an appointment |

Protected routes need the header `Authorization: Bearer YOUR_TOKEN`.

## Run it locally

1. Clone the repository and go into the `backend` folder
2. Install dependencies with `npm install`
3. Create a PostgreSQL database named `appointments`
4. Create the tables with `psql -d appointments -f schema.sql`
5. Create a `.env` file with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and `JWT_SECRET`
6. Start the server with `node index.js`
7. Open http://localhost:3000

## Roadmap

- React frontend
- Business opening hours and availability
- MercadoPago payments
- Automated tests
- Live deployment
