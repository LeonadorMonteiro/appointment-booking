# Appointment Booking

Full-stack web app for online appointment booking at small businesses (hair salons, clinics, sports courts). Business owners publish services, clients book time slots, and the system prevents double bookings.

**Live demo:** https://appointment-booking-ooz7.onrender.com

> The demo runs on a free hosting plan. If nobody has visited for a while, the first request can take up to a minute while the server wakes up.

## How to try it

1. Open the live demo and create an account as a **business owner**
2. Add a service (for example, "Haircut", 60 minutes)
3. Log out and create a second account as a **client**
4. Book an appointment. Try booking an overlapping time slot: the system rejects it

## Features

- Registration and login with hashed passwords (bcrypt) and JWT authentication
- Two roles: `owner` (publishes services) and `client` (books appointments)
- Overlap detection: a time slot already taken at the same business is rejected
- Clients and owners can list and cancel their own appointments
- Input validation and role-based access control
- Responsive web interface served by the same Express server

## Tech stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL (`pg`), hosted on Neon
- **Auth:** JWT (`jsonwebtoken`), `bcryptjs`
- **Frontend:** HTML, CSS and vanilla JavaScript
- **Hosting:** Render

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
3. Create a PostgreSQL database and load the tables with `psql -d YOUR_DATABASE -f schema.sql`
4. Create a `.env` file with `JWT_SECRET` and either `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
5. Start the server with `npm start`
6. Open http://localhost:3000

## Roadmap

- Business opening hours and availability
- Email notifications
- React version of the frontend
- MercadoPago payments
- Automated tests
