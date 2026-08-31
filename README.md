# CampusCare — Smart Campus Complaint & Facility Management System

> **Report. Track. Resolve.**

CampusCare is a centralized campus infrastructure and maintenance management platform. It enables students to report campus issues (such as electrical faults, plumbing leaks, classroom equipment failures, or Wi-Fi disruptions), administrators to triage and assign tickets, and maintenance staff to resolve tasks with complete status transparency.

---

## Quick Start (Running Locally with Docker Compose)

The entire CampusCare stack (Frontend, Backend, and MongoDB) can be spun up using Docker Compose:

### 1. Configure Environment Variables
Copy the root `.env.example` template:
```bash
cp .env.example .env
```
Default credentials and endpoints in `.env` are pre-configured for instant local execution.

### 2. Build and Start the Stack
Start all containerized services:
```bash
docker compose up --build -d
```
Docker Compose will automatically:
1. Initialize the `mongodb` service with health checks and authentication.
2. Build and launch the `backend` service once MongoDB is healthy.
3. Build and launch the `frontend` NGINX service on port 80.

### 3. Seed Initial Demonstration Data
Once the containers are up, seed the accounts and demonstration complaints inside the backend container:
```bash
docker compose exec backend node seed.js
```

### 4. Access the Application
- **Frontend Portal**: [http://localhost](http://localhost) (Port 80)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)

### 5. Pre-Seeded Demonstration Accounts
| Role | Email | Password | Portal Entry |
|---|---|---|---|
| **Admin** | `admin@pccoepune.org` | `Admin@12345` | `/admin/login` |
| **Staff** | `staff@pccoepune.org` | `Staff@12345` | `/staff/login` |
| **Student 1** | `aarav.sharma@pccoepune.org` (PRN: `123B1B201`) | `Student@12345` | `/login` |
| **Student 2** | `neha.patil@pccoepune.org` (PRN: `123B1B202`) | `Student@12345` | `/login` |

### 6. Teardown & Reset
To stop and remove all containers, networks, and database volumes:
```bash
docker compose down -v
```

---

## Project Structure

```text
CampusCare/
├── frontend/           # React + Vite application served via NGINX
│   ├── src/            # Components, pages, contexts, design system
│   ├── Dockerfile      # Multi-stage build (Node builder + NGINX runtime)
│   └── nginx.conf      # NGINX reverse routing & SPA fallback configuration
├── backend/            # Express.js REST API & MongoDB models
│   ├── config/         # Database connection (db.js)
│   ├── controllers/    # Route controllers (auth, complaints, admin, staff)
│   ├── middleware/     # JWT authentication & role-based access control
│   ├── models/         # Mongoose schemas (User, Complaint)
│   ├── routes/         # API routes
│   ├── Dockerfile      # Lightweight Alpine Node image (non-root)
│   ├── seed.js         # Initial seed script for Admin, Staff & Student data
│   └── server.js       # Express server entry point
├── docker-compose.yml  # Multi-container orchestration (Mongo, Backend, Frontend)
├── .env.example        # Environment variable template
├── .gitignore          # Root Git ignore rules
├── PLAN.md             # Comprehensive project architecture blueprint
└── README.md           # Project documentation
```

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Lucide React, Axios, Recharts, NGINX
- **Backend**: Node.js, Express.js
- **Database**: MongoDB 7 with Mongoose ODM
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs` password hashing
- **Containerization**: Docker, Docker Compose

---

## API Endpoints

### 1. Authentication Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new student (`name`, `email`, `studentId`, `password`, `role`) |
| `POST` | `/api/auth/login` | Public | Login with `email` and `password`, returns JWT `{ id, role }` |
| `GET` | `/api/auth/me` | Protected (`protect`) | Returns logged-in user profile (excluding password) |

### 2. Student Complaint Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/complaints` | Protected (`student`) | Submit a complaint (`title`, `description`, `category`, `location`, `priority`) |
| `GET` | `/api/complaints` | Protected (`student`) | List own complaints (supports `?status`, `?category`, `?priority`, `?search`) |
| `GET` | `/api/complaints/:id` | Protected | Get single complaint detail with full timeline (student can only access own) |
| `PUT` | `/api/complaints/:id` | Protected (`student`) | Edit complaint details (restricted to `PENDING` status only; 409 otherwise) |

### 3. Administrator Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Protected (`admin`) | Summary metrics (total, pending, assigned, in-progress, resolved) & charts |
| `GET` | `/api/admin/complaints` | Protected (`admin`) | Query all campus complaints with filters, search, and pagination |
| `PUT` | `/api/admin/complaints/:id/assign` | Protected (`admin`) | Assign a staff member (`staffId`); updates status to `ASSIGNED` |
| `PUT` | `/api/admin/complaints/:id/status` | Protected (`admin`) | Update complaint status and/or priority with timeline audit logging |
| `GET` | `/api/admin/users` | Protected (`admin`) | List users, filtered by `?role=student\|staff\|admin` |

### 4. Staff Task Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/staff/tasks` | Protected (`staff`) | List complaints assigned to logged-in staff member |
| `PUT` | `/api/staff/tasks/:id/status` | Protected (`staff`) | Transition task status to `IN_PROGRESS` or `RESOLVED` |
| `PUT` | `/api/staff/tasks/:id/resolve` | Protected (`staff`) | Mark task as `RESOLVED` and submit `resolutionNotes` |

---

## Complaint Lifecycle Flow

```text
Student Submits (PENDING)
         │
         ▼
Admin Assigns Staff (ASSIGNED)
         │
         ▼
Staff Starts Work (IN_PROGRESS)
         │
         ▼
Staff Resolves & Enters Notes (RESOLVED)
```
Every transition automatically appends to `statusHistory: [{ status, changedAt, changedBy, notes }]` for a complete audit trail.

---

## Deployment

> **Status**: *To be configured.*
> Cloud infrastructure provisioning (via Terraform) and production container deployment workflows will be documented here once cloud environments are active.

