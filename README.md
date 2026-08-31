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
├── PLAN.md             # Comprehensive DevOps project blueprint
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

## Authentication Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new user (`name`, `email`, `password`, `studentId`, optional `role`) |
| `POST` | `/api/auth/login` | Public | Login with `email` and `password`, returns JWT `{ id, role }` |
| `GET` | `/api/auth/me` | Protected (`protect`) | Returns logged-in user profile (excluding password) |

---

## Role-Based Access Control

The system supports three user roles:
- **`student`**: Can register, raise complaints, and track status.
- **`admin`**: System administrators who assign staff and oversee operations.
- **`staff`**: Campus facility and maintenance personnel assigned to tickets.
