<p align="center">
  <h1 align="center">Healthcare Appointment System</h1>
  <p align="center">
    A full-stack, HIPAA-aware healthcare appointment management platform with role-based access control for patients, doctors, and administrators.
    <br />
    <strong>Built with Angular 21 · Node.js · TypeScript · MySQL</strong>
  </p>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Healthcare Appointment System is a production-ready web application that streamlines the appointment lifecycle between patients and healthcare providers. It features secure JWT authentication with token rotation, granular role-based access control, doctor availability management, and a responsive Angular SPA.

---

## Features

### Authentication & Security
- JWT-based authentication with access and refresh token rotation
- Role-based access control (Patient, Doctor, Admin)
- Two-factor authentication (2FA/TOTP) support
- Account lockout after failed login attempts
- Password strength enforcement with bcrypt hashing
- Rate limiting, input sanitization, and Helmet security headers
- CORS whitelisting

### Patient Portal
- Dashboard with upcoming appointments and health summary
- Search doctors by specialization and book available time slots
- View appointment history and medical records
- Export medical records in **PDF** and **CSV** formats
- Manage profile, insurance details, and emergency contacts

### Doctor Portal
- Daily schedule overview with patient metrics
- Set and manage weekly availability
- Confirm, complete, or cancel appointments
- Add consultation notes and prescriptions

### Admin Panel
- System-wide dashboard with user and appointment statistics
- User management — activate, deactivate, and manage roles
- View and oversee all appointments across the platform

### Messaging
- In-app messaging between patients and doctors
- Conversation threading and read receipts

### Insurance & Billing
- Patient insurance profile management
- Insurance verification workflow (Admin-side)
- Integrated payments via **Stripe** and **PayPal**
- Refund processing and payment history

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Angular 21, TypeScript 5.9, Bootstrap 5.3, SCSS, Chart.js |
| **Backend** | Node.js 20, Express 5, TypeScript 5.9 |
| **Database** | MySQL 8.0, Sequelize 6 ORM |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Validation** | Zod |
| **Email** | Nodemailer (SMTP) |
| **Logging** | Winston |
| **Security** | Helmet, CORS, rate-limiter-flexible |
| **Dev Tools** | ESLint, Prettier, ts-node-dev, Jest |

---

## Architecture

The application follows a clean, layered architecture:

```
Client (Angular SPA)
  ↕  HTTP / REST
API Gateway (Express.js)
  ├── Middleware (Auth, Validation, Rate Limiting, Error Handling)
  ├── Controllers (Request / Response)
  ├── Services (Business Logic)
  ├── Models (Sequelize ORM)
  └── Database (MySQL)
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.13.0
- **npm** ≥ 9.x
- **MySQL** ≥ 8.0
- **Git**

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/healthcare-appointment-system.git
cd healthcare-appointment-system
```

### 2. Install dependencies

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all
```

Or install individually:

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 3. Configure the database

Create a MySQL database and user:

```sql
CREATE DATABASE healthcare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Copy the example environment file and update it with your credentials:

```bash
cp backend/.env.example backend/.env
```

### 4. Start development servers

```bash
# From the project root — starts both backend and frontend concurrently
npm start
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:4200` |
| Backend API | `http://localhost:3000` |

---

## Environment Variables

Create a `backend/.env` file based on [`backend/.env.example`](backend/.env.example):

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Backend server port | `3000` |
| `DB_DIALECT` | Database dialect | `mysql` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `3306` |
| `DB_NAME` | Database name | `healthcare_db` |
| `DB_USER` | Database user | `root` |
| `DB_PASSWORD` | Database password | — |
| `JWT_SECRET` | Access token secret | — |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:4200` |
| `SMTP_HOST` | SMTP server host | — |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASSWORD` | SMTP password | — |

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/register/patient` | Register as patient |
| `POST` | `/auth/register/doctor` | Register as doctor |
| `POST` | `/auth/login` | Login and receive tokens |
| `POST` | `/auth/refresh-token` | Refresh access token |
| `POST` | `/auth/logout` | Invalidate session |
| `POST` | `/auth/verify-mfa` | Verify MFA token for login |
| `POST` | `/auth/setup-mfa` | Initialize 2FA setup |
| `POST` | `/auth/verify-setup-mfa` | Finalize 2FA setup |
| `POST` | `/auth/change-password` | Change password |
| `GET` | `/auth/profile` | Get current user profile |

### Appointments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/appointments` | List appointments (role-filtered) |
| `GET` | `/appointments/:id` | Get appointment details |
| `GET` | `/appointments/available-slots` | Get available time slots |
| `POST` | `/appointments` | Book a new appointment |
| `PUT` | `/appointments/:id` | Update an appointment |
| `POST` | `/appointments/:id/cancel` | Cancel an appointment |
| `POST` | `/appointments/:id/confirm` | Confirm (doctor only) |
| `POST` | `/appointments/:id/complete` | Mark complete (doctor only) |

### Doctors

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/doctors` | List all doctors |
| `GET` | `/doctors/:id` | Get doctor profile |
| `GET` | `/doctors/:id/availability` | Get availability schedule |
| `PUT` | `/doctors/profile` | Update doctor profile |
| `POST` | `/doctors/availability` | Create availability slot |
| `PUT` | `/doctors/availability/:id` | Update availability |
| `DELETE` | `/doctors/availability/:id` | Remove availability |
| `POST` | `/doctors/schedule` | Set weekly schedule |

### Patients

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patients/me` | Get current patient profile |
| `PUT` | `/patients/profile` | Update patient profile |
| `GET` | `/patients/:id` | Get patient (doctor/admin) |

### Medical Records

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/medical-records/my-records` | Get current patient's records |
| `GET` | `/medical-records/export/csv` | Export records as CSV |
| `GET` | `/medical-records/export/pdf` | Export records as PDF |

### Insurance

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/insurance` | Add insurance details |
| `GET` | `/insurance` | Get my insurance records |
| `GET` | `/insurance/active` | Get current active insurance |
| `PUT` | `/insurance/:id` | Update insurance info |
| `POST` | `/insurance/:id/verify` | Verify insurance (Admin only) |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payments` | Create a new payment |
| `GET` | `/payments` | List my payment history |
| `POST` | `/payments/stripe/confirm` | Confirm Stripe payment |
| `POST` | `/payments/paypal/capture` | Capture PayPal payment |
| `POST` | `/payments/:id/refund` | Refund payment (Admin only) |

---

## Scripts

### Root

| Command | Description |
|---|---|
| `npm run install:all` | Install all dependencies |
| `npm start` | Start backend and frontend concurrently |

### Backend (`backend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript for production |
| `npm start` | Start production server |
| `npm test` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run seed` | Seed the database |

### Frontend (`frontend/`)

| Command | Description |
|---|---|
| `npm start` | Start Angular dev server |
| `npm run build` | Build production bundle |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
healthcare-appointment-system/
├── backend/
│   ├── src/
│   │   ├── config/            # Database, environment, and logger configuration
│   │   ├── controllers/       # Route handlers
│   │   ├── dto/               # Data Transfer Objects and validation schemas
│   │   ├── middleware/        # Auth, validation, rate limiting, error handling
│   │   ├── models/            # Sequelize model definitions and associations
│   │   ├── routes/            # Express route definitions
│   │   ├── services/          # Business logic layer
│   │   ├── templates/         # Email and document templates
│   │   ├── types/             # TypeScript type definitions and enums
│   │   ├── utils/             # Helper utilities (JWT, password, response)
│   │   ├── app.ts             # Express application setup
│   │   └── server.ts          # Server entry point
│   ├── scripts/               # Database seeding and utility scripts
│   ├── .env.example           # Environment variable template
│   ├── .eslintrc.json
│   ├── .prettierrc
│   ├── jest.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Singleton services, guards, interceptors, models
│   │   │   ├── features/      # Feature modules
│   │   │   │   ├── admin/     # Admin dashboard and user management
│   │   │   │   ├── auth/      # Login and registration
│   │   │   │   ├── doctor/    # Doctor dashboard, schedule, appointments
│   │   │   │   ├── messaging/ # In-app messaging
│   │   │   │   ├── patient/   # Patient dashboard, booking, records
│   │   │   │   └── profile/   # User profile management
│   │   │   └── shared/        # Reusable components (navbar, footer, spinner)
│   │   ├── environments/      # Environment configuration
│   │   └── styles.scss        # Global styles
│   ├── angular.json
│   ├── tsconfig.json
│   └── package.json
│
├── .github/                   # Issue templates, PR templates, CI workflows
├── .gitignore
└── package.json               # Root workspace scripts
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

This project is licensed under the [MIT License](LICENSE).
