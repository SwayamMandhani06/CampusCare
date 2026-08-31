# CampusCare — Smart Campus Complaint & Facility Management System

> **Report. Track. Resolve.**

CampusCare is a centralized campus infrastructure and maintenance management platform. It enables students to report campus issues (such as electrical faults, plumbing leaks, classroom equipment failures, or Wi-Fi disruptions), administrators to triage and assign tickets, and maintenance staff to resolve tasks with complete status transparency.

---

## Project Structure

```text
CampusCare/
├── frontend/           # React + Vite application (planned for next phase)
├── backend/            # Express.js REST API & MongoDB database
│   ├── config/         # Database and server configuration
│   │   └── db.js       # Mongoose connection utility
│   ├── controllers/    # Request handlers and business logic
│   │   └── authController.js # Register, login, and profile handlers
│   ├── middleware/     # Custom Express middleware
│   │   └── auth.js     # JWT verification (protect) & role authorization (authorize)
│   ├── models/         # Mongoose data models
│   │   └── User.js     # User schema (student, admin, staff)
│   ├── routes/         # API route definitions
│   │   └── auth.js     # /api/auth endpoints
│   ├── .env.example    # Environment variable template
│   ├── package.json    # Backend dependencies and scripts
│   ├── seed.js         # Initial seed script for Admin and Staff accounts
│   └── server.js       # Express server entry point
├── .gitignore          # Root Git ignore rules
├── PLAN.md             # Comprehensive project architecture blueprint
└── README.md           # Project documentation
```

---

## Tech Stack (Backend & Auth)

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (`jsonwebtoken`)
- **Password Security**: Salted hashing with `bcryptjs`
- **CORS**: Configured for cross-origin API access

---

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance running on port 27017 or a MongoDB Atlas connection URI)

### 2. Backend Setup

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Configure the following variables in `.env`:
   - `PORT`: Server port (default: `5000`)
   - `MONGO_URI`: MongoDB connection string (e.g., `mongodb://127.0.0.1:27017/campuscare`)
   - `JWT_SECRET`: Secret key used to sign and verify JWT tokens

4. Seed the initial Administrator and Staff accounts:
   ```bash
   npm run seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   Or start in standard mode:
   ```bash
   npm start
   ```

---

## API Endpoints

### 1. Authentication Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new user (`name`, `email`, `password`, `studentId`, optional `role`) |
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
| `GET` | `/api/admin/dashboard` | Protected (`admin`) | Summary metrics (total, pending, assigned, in-progress, resolved) & category/priority charts |
| `GET` | `/api/admin/complaints` | Protected (`admin`) | Query all complaints across campus with filters, search, and pagination (`?page`, `?limit`) |
| `PUT` | `/api/admin/complaints/:id/assign` | Protected (`admin`) | Assign a staff member to complaint (`staffId`); updates status to `ASSIGNED` |
| `PUT` | `/api/admin/complaints/:id/status` | Protected (`admin`) | Update complaint status and append to timeline |
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
Every transition appends to `statusHistory: [{ status, changedAt, changedBy, notes }]` for a complete audit trail.
