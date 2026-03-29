<p align="center">
  <h1 align="center">Healthcare Appointment System</h1>
  <p align="center">
    A full-stack, HIPAA-aware healthcare appointment platform with role-based access control for patients, doctors, and administrators.
    <br />
    <strong>Built with Angular 21 · Node.js · TypeScript · MySQL</strong>
  </p>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Security and HIPAA Controls](#security-and-hipaa-controls)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Getting Started](#getting-started)
- [Docker Setup (Optional)](#docker-setup-optional)
- [Production Deployment (AWS Lightsail)](#production-deployment-aws-lightsail)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [API Contract Discipline](#api-contract-discipline)
- [Engineering Docs](#engineering-docs)
- [Deployment Checklist](#deployment-checklist)
- [Scripts](#scripts)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Healthcare Appointment System is a production-focused web application that streamlines the appointment lifecycle between patients and providers. The platform includes JWT auth with refresh-token rotation, MFA flows, role-based access control, PHI audit logging, encrypted sensitive data, and an Angular SPA.

### Live Demo

- Public URL: http://44.215.251.252/
- Status: currently deployed and publicly reachable from the internet.

---

## Features

### Authentication and Access

- JWT-based authentication with access and refresh token rotation
- Role-based authorization for Patient, Doctor, and Admin
- MFA setup and login verification support
- Email verification and password reset flows
- Account lockout controls for repeated failed login attempts

### Patient Portal

- Search doctors and book available appointment slots
- View upcoming and historical appointments
- Access and export personal medical records (CSV and PDF)
- Manage insurance details and personal profile data

### Doctor Portal

- Manage profile and professional availability
- Confirm and complete appointments
- Review assigned patient context in authorized flows

### Admin Portal

- View system-level metrics
- Manage users and roles
- Review and process pending doctor approvals
- Verify insurance records

### Messaging

- Conversation list and direct messaging between authenticated users
- Unread message counters and read-state updates

---

## Security and HIPAA Controls

### PHI Audit Logging

- PHI access routes are instrumented with route-level audit middleware
- Logs are written after response completion so outcome reflects real HTTP status
- Audit records include actor, action, resource type, patient context, IP, user-agent, and success or failure outcome
- Persistence retries are built in for transient failures

### Encryption at Rest

- Sensitive secrets are encrypted with AES-256-GCM
- Current ciphertext format is versioned as v1 with HKDF-based key derivation
- Legacy encrypted values remain decryptable for backward compatibility

### Request and Runtime Protections

- Input validation with Zod on DTO-backed routes
- Security middleware including Helmet, CORS controls, and rate limiting
- Production startup validates critical secrets and rejects weak values

For detailed threat analysis, see [docs/threat-model.md](docs/threat-model.md).

---

## Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Frontend    | Angular 21, TypeScript 5.9, Bootstrap 5.3, SCSS |
| Backend     | Node.js 20, Express 5, TypeScript 5.9           |
| Database    | MySQL 8, Sequelize 6                            |
| Auth        | JWT, bcrypt, otplib                             |
| Validation  | Zod                                             |
| Email       | SendGrid (@sendgrid/mail)                       |
| Logging     | Winston                                         |
| Security    | Helmet, CORS, rate-limiter-flexible             |
| Dev Tooling | ESLint, Prettier, Jest, ts-node-dev             |

---

## Architecture

The backend follows a layered structure:

```text
Client (Angular SPA)
  <-> REST API (Express)
       |- Middleware (auth, validation, rate limiting, error handling, PHI audit)
       |- Controllers
       |- Services
       |- Repositories and Models (Sequelize)
       |- MySQL
```

Key architecture patterns:

- API versioning through a canonical base path
- Strong DTO and schema validation at route boundaries
- Separation of controller, service, and persistence concerns

---

## Quick Start

```bash
npm run install:all
cp backend/.env.example backend/.env
cd backend && npm run migrate
npx ts-node scripts/create-phi-audit-table.ts
cd ..
npm start
```

PowerShell equivalent for the env copy step:

```powershell
Copy-Item backend/.env.example backend/.env
```

Local URLs:

- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- Health check: http://localhost:3000/api/v1/health

---

## Getting Started

### Prerequisites

- Node.js 18.13.0 or higher
- npm 9 or higher
- MySQL 8 or higher
- Git

### 1. Clone

```bash
git clone https://github.com/<your-username>/healthcare-appointment-system.git
cd healthcare-appointment-system
```

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Configure Environment

```bash
cp backend/.env.example backend/.env
```

PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Update values in backend/.env for your local machine.

### 4. Create Database

```sql
CREATE DATABASE healthcare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Run Migrations

```bash
cd backend
npm run migrate
```

Current migration set:

- 20260322090000-baseline-healthcare-schema.js creates baseline tables and indexes
- 20260322100000-add-soft-deletes-doctor-approval-encrypt-insurance.js adds soft deletes, doctor approval, and encrypted insurance storage compatibility
- 20261122000100-add-auth-security-columns-to-users.js adds auth security token-hash columns and indexes

Apply the one-time PHI audit table creation script:

```bash
npx ts-node scripts/create-phi-audit-table.ts
```

Check migration state if needed:

```bash
npm run migrate:status
```

### 6. Start Development Servers

From the project root:

```bash
npm start
```

This starts backend and frontend concurrently.

---

## Docker Setup (Optional)

For containerized local development:

This section is for local or development containers. Production deployment guidance is documented in [Production Deployment (AWS Lightsail)](#production-deployment-aws-lightsail).

### 1. Prepare Docker Env File

```bash
cp backend/.env.docker.example backend/.env.docker
```

PowerShell:

```powershell
Copy-Item backend/.env.docker.example backend/.env.docker
```

Update secrets before running containers.

### 2. Start Services

```bash
docker-compose up --build
```

Services:

| Service | Port |
| ------- | ---- |
| MySQL   | 3306 |
| API     | 3000 |

Notes:

- API container connects to MySQL with host db
- Docker compose file currently defines database and API services

### 3. Run Migrations in Container

```bash
docker-compose exec api npm run migrate
docker-compose exec api npx ts-node scripts/create-phi-audit-table.ts
```

---

## Production Deployment (AWS Lightsail)

### Live Endpoint

- Current public endpoint: http://44.215.251.252/
- Current state: publicly reachable HTTP endpoint on a Lightsail static IP.
- Note: domain and HTTPS can be added later without changing core app architecture.

### Deployed Stack

- AWS Lightsail Ubuntu instance
- Nginx serving Angular static files from `/var/www/healthcare`
- Backend API running in Docker via Compose
- Reverse proxy from Nginx `/api/` to backend `127.0.0.1:3000`
- Lightsail Managed MySQL (TLS-enabled)

### Runtime Topology

```text
Browser
  -> Nginx (public :80/:443)
       -> Angular static assets (/var/www/healthcare)
       -> /api/* reverse proxy to backend (127.0.0.1:3000)
            -> Lightsail Managed MySQL (TLS)
```

### Production Environment Notes

For production, use `backend/.env.docker` with production values.

- Set `NODE_ENV=production`
- Set `DB_HOST` to the Lightsail managed MySQL endpoint (not `db`)
- Set `FRONTEND_URL` to the exact browser origin with scheme, for example `http://44.215.251.252`
- Use strong values (at least 32 chars) for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MFA_TOKEN_SECRET`, and `ENCRYPTION_KEY`

### Managed MySQL TLS Configuration

Production DB connections enforce TLS certificate validation. If startup fails with `self-signed certificate in certificate chain`, add the AWS RDS CA bundle and mount it into the API container.

Download CA bundle on VM:

```bash
mkdir -p /home/ubuntu/certs
curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /home/ubuntu/certs/aws-rds-global-bundle.pem
```

In `docker-compose.prod.yml` under the `api` service:

```yaml
environment:
  - NODE_EXTRA_CA_CERTS=/etc/ssl/certs/aws-rds-global-bundle.pem
volumes:
  - /home/ubuntu/certs/aws-rds-global-bundle.pem:/etc/ssl/certs/aws-rds-global-bundle.pem:ro
```

### Deploy or Restart Commands

```bash
docker compose -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
docker compose -f docker-compose.prod.yml ps
```

Health checks:

```bash
curl -i http://127.0.0.1:3000/api/v1/health
curl -i http://127.0.0.1/api/v1/health
```

### Automated Deployment (GitHub Actions)

This repository now includes an automated Lightsail deployment workflow at `.github/workflows/deploy-lightsail.yml`.

Behavior:

- Trigger source: successful completion of CI workflow (`Healthcare Appointment System CI`)
- Branch policy: deploys only for `push` events on `main`
- Target server path: `/home/ubuntu/Healthcare-Appointment-System`
- Scope: backend container rebuild/restart, backend migrations, frontend build + sync to Nginx web root, Nginx reload, and post-deploy health checks

Required GitHub repository secrets:

- `LIGHTSAIL_HOST` (public IP or hostname)
- `LIGHTSAIL_USER` (for example `ubuntu`)
- `LIGHTSAIL_SSH_KEY` (private key content for the VM)
- Optional: `LIGHTSAIL_SSH_PORT` (defaults to `22`)

Notes:

- The workflow fails fast when required secrets are missing.
- Health checks are executed at the end of deployment:
  - `http://127.0.0.1:3000/api/v1/health`
  - `http://127.0.0.1/api/v1/health`
- Re-running a failed deployment is supported from the GitHub Actions UI once the root cause is fixed.

### Troubleshooting 502 Bad Gateway

If frontend actions return 502 from Nginx:

- Check container status: `docker compose -f docker-compose.prod.yml ps`
- Check backend logs in container file outputs:
  - `/app/logs/error.log`
  - `/app/logs/combined.log`
- Check Nginx errors: `/var/log/nginx/error.log`
- If you see `connect() failed (111: Connection refused)`, backend is not running
- If backend logs show `self-signed certificate in certificate chain`, apply the TLS CA bundle steps above

Note: Docker Compose may warn that `version` is obsolete. This warning does not block deployment.

---

## Environment Variables

Use [backend/.env.example](backend/.env.example) for local development and [backend/.env.docker.example](backend/.env.docker.example) for containerized setup.

### Core Variables

| Variable     | Description              | Default               | Required in Production |
| ------------ | ------------------------ | --------------------- | ---------------------- |
| NODE_ENV     | App runtime environment  | development           | Yes                    |
| PORT         | API port                 | 3000                  | Yes                    |
| API_VERSION  | API base version segment | v1                    | Yes                    |
| FRONTEND_URL | Allowed CORS origin      | http://localhost:4200 | Yes                    |
| LOG_LEVEL    | Logger verbosity         | debug                 | Yes                    |

`FRONTEND_URL` must be an exact origin and include the protocol (`http://` or `https://`) with no path or trailing slash.

### Database

| Variable    | Description       | Default                | Required in Production |
| ----------- | ----------------- | ---------------------- | ---------------------- |
| DB_DIALECT  | Database dialect  | mysql                  | Yes                    |
| DB_HOST     | Database host     | localhost              | Yes                    |
| DB_PORT     | Database port     | 3306                   | Yes                    |
| DB_NAME     | Database name     | healthcare_db          | Yes                    |
| DB_USER     | Database user     | root                   | Yes                    |
| DB_PASSWORD | Database password | empty in code fallback | Yes                    |

### Authentication and Secrets

| Variable               | Description                               | Default                         | Required in Production |
| ---------------------- | ----------------------------------------- | ------------------------------- | ---------------------- |
| JWT_SECRET             | Access token signing secret               | dev fallback outside production | Yes                    |
| JWT_EXPIRES_IN         | Access token duration                     | 15m                             | Yes                    |
| JWT_REFRESH_SECRET     | Refresh token signing secret              | dev fallback outside production | Yes                    |
| JWT_REFRESH_EXPIRES_IN | Refresh token duration                    | 7d                              | Yes                    |
| MFA_TOKEN_SECRET       | MFA/session token secret                  | dev fallback outside production | Yes                    |
| ENCRYPTION_KEY         | Encryption key for sensitive at-rest data | dev fallback outside production | Yes                    |

### Rate Limiting

| Variable                | Description            | Default | Required in Production |
| ----------------------- | ---------------------- | ------- | ---------------------- |
| RATE_LIMIT_WINDOW_MS    | Rate limit time window | 900000  | Yes                    |
| RATE_LIMIT_MAX_REQUESTS | Max requests in window | 100     | Yes                    |

### Email (SendGrid)

| Variable         | Description                          | Default | Required in Production |
| ---------------- | ------------------------------------ | ------- | ---------------------- |
| SENDGRID_API_KEY | SendGrid Web API key (`SG.xxx`)      | empty   | Yes                    |
| EMAIL_FROM       | Verified sender email address        | empty   | Yes                    |

Email is sent via the SendGrid Web API (`@sendgrid/mail`). No SMTP credentials are required. The sender address set in `EMAIL_FROM` must be verified in the SendGrid dashboard under Settings → Sender Authentication before emails will be delivered.

### Generating Strong Secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Production startup validates critical variables and enforces minimum secret strength.

---

## API Reference

All endpoints are under /api/v1.

### Health

| Method | Endpoint | Description                  |
| ------ | -------- | ---------------------------- |
| GET    | /health  | API health and version check |

### Authentication

| Method | Endpoint                  | Description                   |
| ------ | ------------------------- | ----------------------------- |
| POST   | /auth/register            | Register user                 |
| POST   | /auth/register/patient    | Register patient with profile |
| POST   | /auth/register/doctor     | Register doctor with profile  |
| POST   | /auth/login               | Login                         |
| POST   | /auth/verify-mfa          | Verify MFA during login       |
| POST   | /auth/refresh-token       | Refresh access token          |
| POST   | /auth/logout              | Logout and revoke session     |
| POST   | /auth/change-password     | Change password               |
| GET    | /auth/profile             | Get current user profile      |
| POST   | /auth/setup-mfa           | Start MFA setup               |
| POST   | /auth/verify-setup-mfa    | Finalize MFA setup            |
| POST   | /auth/forgot-password     | Request password reset        |
| POST   | /auth/reset-password      | Complete password reset       |
| POST   | /auth/verify-email        | Verify email                  |
| POST   | /auth/resend-verification | Resend verification email     |

### Appointments

| Method | Endpoint                      | Description                  |
| ------ | ----------------------------- | ---------------------------- |
| GET    | /appointments                 | List appointments            |
| GET    | /appointments/available-slots | Get available slots          |
| GET    | /appointments/dashboard-stats | Patient dashboard aggregates |
| GET    | /appointments/:id             | Get appointment details      |
| POST   | /appointments                 | Book appointment             |
| PUT    | /appointments/:id             | Update appointment           |
| POST   | /appointments/:id/cancel      | Cancel appointment           |
| POST   | /appointments/:id/confirm     | Confirm appointment          |
| POST   | /appointments/:id/complete    | Complete appointment         |

### Doctors

| Method | Endpoint                  | Description                           |
| ------ | ------------------------- | ------------------------------------- |
| GET    | /doctors                  | List doctors                          |
| GET    | /doctors/:id              | Get doctor profile                    |
| GET    | /doctors/:id/availability | Get doctor availability               |
| GET    | /doctors/availability     | Get authenticated doctor availability |
| PUT    | /doctors/profile          | Update doctor profile                 |
| POST   | /doctors/availability     | Create availability slot              |
| PUT    | /doctors/availability/:id | Update availability slot              |
| DELETE | /doctors/availability/:id | Delete availability slot              |
| POST   | /doctors/schedule         | Set weekly schedule                   |

### Patients

| Method | Endpoint          | Description                 |
| ------ | ----------------- | --------------------------- |
| GET    | /patients/me      | Get current patient profile |
| PUT    | /patients/profile | Update patient profile      |
| GET    | /patients/:id     | Get patient profile by ID   |

### Medical Records

| Method | Endpoint                    | Description                     |
| ------ | --------------------------- | ------------------------------- |
| GET    | /medical-records/my-records | Get records for current patient |
| GET    | /medical-records/export/csv | Export records as CSV           |
| GET    | /medical-records/export/pdf | Export records as PDF           |

### Messages

| Method | Endpoint                        | Description                        |
| ------ | ------------------------------- | ---------------------------------- |
| GET    | /messages/users                 | List users available for messaging |
| GET    | /messages/unread-count          | Get unread count                   |
| GET    | /messages/conversations         | List conversations                 |
| GET    | /messages/conversations/:userId | Get conversation with one user     |
| POST   | /messages                       | Send message                       |
| PATCH  | /messages/read/:senderId        | Mark sender messages as read       |

### Insurance

| Method | Endpoint                      | Description                           |
| ------ | ----------------------------- | ------------------------------------- |
| POST   | /insurance                    | Create insurance record               |
| GET    | /insurance                    | Get current patient insurance records |
| GET    | /insurance/active             | Get active insurance record           |
| GET    | /insurance/:id                | Get insurance by id                   |
| PUT    | /insurance/:id                | Update insurance record               |
| POST   | /insurance/:id/deactivate     | Deactivate insurance record           |
| DELETE | /insurance/:id                | Delete insurance record               |
| POST   | /insurance/:id/verify         | Verify insurance record               |
| GET    | /insurance/patient/:patientId | Get insurance by patient id           |

### Admin

| Method | Endpoint                   | Description                |
| ------ | -------------------------- | -------------------------- |
| GET    | /admin/stats               | System statistics          |
| GET    | /admin/users               | List users                 |
| POST   | /admin/users               | Create user                |
| PATCH  | /admin/users/:id           | Update user role or status |
| DELETE | /admin/users/:id           | Delete user                |
| GET    | /admin/doctors/pending     | List pending doctors       |
| PATCH  | /admin/doctors/:id/approve | Approve doctor             |
| PATCH  | /admin/doctors/:id/reject  | Reject doctor              |

---

## API Contract Discipline

This project follows versioned API contracts.

- Public endpoints are mounted under /api/v1
- Breaking response or request shape changes require a new major version
- Backend DTO or schema changes must be reflected in frontend contract usage in the same change set

Root helper scripts:

| Command                 | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| npm run contracts:sync  | Sync backend and frontend generated contract artifacts |
| npm run contracts:check | Fail if generated contracts drift from committed state |

See [docs/api-versioning.md](docs/api-versioning.md) for full policy.

---

## Engineering Docs

- [docs/threat-model.md](docs/threat-model.md)
- [docs/api-versioning.md](docs/api-versioning.md)
- [docs/release-checklist.md](docs/release-checklist.md)

---

## Deployment Checklist

Before production rollout:

- Run lint and tests for backend and frontend
- Validate production environment variables and secret strength
- Apply and verify database migrations
- Run smoke checks on health, auth, patient, doctor, and admin core flows
- Verify API health directly and through Nginx:
  - `curl -i http://127.0.0.1:3000/api/v1/health`
  - `curl -i http://127.0.0.1/api/v1/health`
- Verify container status with `docker compose -f docker-compose.prod.yml ps`
- Check Nginx upstream errors in `/var/log/nginx/error.log`
- Check backend runtime errors in `/app/logs/error.log`

Reference: [docs/release-checklist.md](docs/release-checklist.md).

---

## Scripts

### Root

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| npm run install:all     | Install root, backend, and frontend dependencies |
| npm start               | Start backend and frontend in parallel           |
| npm run contracts:sync  | Synchronize API contract files                   |
| npm run contracts:check | Verify synchronized contracts are committed      |

### Backend

| Command                              | Description                                  |
| ------------------------------------ | -------------------------------------------- |
| npm run dev                          | Start backend in development mode            |
| npm run build                        | Build backend for production                 |
| npm start                            | Run built backend                            |
| npm run lint                         | Lint backend source                          |
| npm run lint:fix                     | Auto-fix lint issues                         |
| npm run format                       | Format backend source                        |
| npm test                             | Run backend tests with open-handle detection |
| npm run test:coverage                | Run tests with coverage                      |
| npm run test:watch                   | Run tests in watch mode                      |
| npm run test:unit                    | Run unit tests only                          |
| npm run test:integration             | Run integration tests only                   |
| npm run typecheck                    | Type-check backend without emit              |
| npm run seed                         | Seed development data                        |
| npm run migrate                      | Apply database migrations                    |
| npm run migrate:undo                 | Roll back last migration                     |
| npm run migrate:status               | Show migration status                        |
| npm run migrate:create --name <name> | Create migration file                        |

### Frontend

| Command       | Description                      |
| ------------- | -------------------------------- |
| npm start     | Start Angular development server |
| npm run build | Build Angular app                |
| npm run watch | Build in watch mode              |
| npm test      | Run frontend unit tests          |
| npm run lint  | Lint frontend source             |

---

## Testing

### Backend

```bash
cd backend
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
```

Current backend test setup includes open-handle detection and separate unit or integration command paths.

### Frontend

```bash
cd frontend
npm test
npm run test -- --watch=false --browsers=ChromeHeadless
```

---

## Project Structure

```text
healthcare-appointment-system/
|- backend/
|  |- src/
|  |  |- config/
|  |  |- controllers/
|  |  |- dto/
|  |  |- middleware/
|  |  |- models/
|  |  |- repositories/
|  |  |- routes/
|  |  |- services/
|  |  |- templates/
|  |  |- tests/
|  |  |- types/
|  |  |- utils/
|  |  |- app.ts
|  |  |- server.ts
|  |- scripts/
|  |- migrations/
|  |- package.json
|- frontend/
|  |- src/
|  |  |- app/
|  |  |- environments/
|  |- package.json
|- docs/
|- scripts/
|- docker-compose.yml
|- package.json
```

---

## Contributing

1. Fork the repository
2. Create a branch for your change
3. Implement and test your update
4. Submit a pull request

Minimum pull request expectations:

- Backend and frontend lint pass
- Relevant tests pass
- Security-sensitive changes include validation and access checks
- API contract changes include matching frontend or backend updates
- README and docs are updated when behavior, scripts, or configuration changes

Use the pull request templates under .github/pull_request_template for checklist-driven reviews.

---

## License

This project is licensed under the [MIT License](LICENSE).
