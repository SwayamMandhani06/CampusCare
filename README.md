# CampusCare
Smart Campus Complaint & Facility Management System

## Overview
CampusCare is a centralized facility and complaint management platform designed for educational institutions. It provides a transparent, role-based workflow connecting students who report campus infrastructure issues, administrators who triage and assign tasks, and maintenance staff who execute and document repairs in real time.

---

## Problem & Solution

**The Problem**: Traditional campus maintenance reporting relies on informal and fragmented communication channels, such as verbal requests, email threads, or physical logbooks. These disparate methods frequently lead to lost complaints, delayed maintenance, lack of status visibility for students, and zero accountability for repair timelines.

**The Solution**: CampusCare digitizes the entire issue-reporting lifecycle through a unified web application. Every complaint follows a verified status progression (Pending → Assigned → In Progress → Resolved) backed by automated audit logging, priority-based technician queues, and role-specific user interfaces that ensure full accountability.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, Framer Motion |
| Backend | Node.js, Express |
| Database | MongoDB |
| Auth | JWT, bcrypt |
| Containerization | Docker, Docker Compose |
| Infrastructure | Terraform (GCP) |
| Configuration Management | Ansible |
| Cloud Provider | Google Cloud Platform (Compute Engine) |

---

## Architecture

```text
Developer → GitHub → Terraform → GCP Compute Engine → Ansible → Docker Compose → CampusCare (Frontend + Backend + MongoDB) → Browser
```

---

## Features by Role

### Student
- **Complaint Submission**: Report facility issues with title, description, category, campus location, and priority level.
- **Interactive Dashboard**: Animated statistic counters showing total, pending, in-progress, and resolved complaints.
- **Visual Status Tracking**: Five-stage timeline rail displaying real-time assignment and technician resolution notes.
- **Complaint Management**: Search, filter by status/category, and edit ticket details while in Pending status.

### Administrator
- **Analytics Dashboard**: Real-time summary metrics with category distribution and status breakdown charts.
- **Triage & Assignment**: Comprehensive complaint console with staff assignment and dynamic priority escalation.
- **Audit Logging**: Every status transition and note is timestamped and attributed to the acting administrator.
- **User Directory**: View and filter campus users by role (students, maintenance staff, administrators).

### Maintenance Staff
- **Priority-Driven Workbench**: Task queue automatically ordered by severity (Critical and High priority first).
- **Workflow State Management**: Transition assigned complaints to In Progress when work begins.
- **Resolution Documentation**: Formally resolve complaints with mandatory technician repair notes.

---

## Running Locally

To run the complete full-stack application locally using Docker Compose:

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Start Services
```bash
docker compose up --build -d
```

### 3. Seed Initial Demonstration Data
```bash
docker compose exec backend node seed.js
```

### 4. Access Local Application
- **Frontend App**: [http://localhost](http://localhost) (Port 80)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)

### 5. Stop and Reset
```bash
docker compose down -v
```

---

## Deployment

CampusCare is deployed on a dedicated Google Cloud Platform (GCP) Compute Engine instance:
- **Infrastructure as Code**: Provisioned using Terraform ([`/terraform`](terraform)) with custom firewall rules (HTTP 80, API 5000, SSH 22).
- **Configuration Management**: Automated using Ansible ([`/ansible`](ansible)) to install official Docker packages, transfer project source, template production environment variables, launch containers, and seed demonstration data.
- **Live Demo Instance**: [http://34.93.174.126](http://34.93.174.126) *(Note: This is an active evaluation instance for demonstration purposes).*

### Deployment Commands

```bash
# 1. Provision GCP Infrastructure
cd terraform
terraform init
terraform plan
terraform apply

# 2. Configure VM & Deploy Application Stack
cd ../ansible
ansible-playbook -i inventory.ini deploy.yml
```

---

## Project Structure

```text
CampusCare/
├── frontend/               # React + Vite client application
│   ├── src/                # Components, pages, contexts, design system
│   ├── Dockerfile          # Multi-stage production build (Node builder -> NGINX)
│   └── nginx.conf          # NGINX reverse routing & SPA fallback
├── backend/                # Express.js REST API
│   ├── config/             # Database connection configuration
│   ├── controllers/        # Route controllers (auth, complaints, admin, staff)
│   ├── middleware/         # JWT authentication & role-based access control
│   ├── models/             # Mongoose schemas (User, Complaint)
│   ├── routes/             # REST API routes
│   ├── Dockerfile          # Alpine-based Node.js runtime container
│   └── seed.js             # Demonstration account and ticket seeder
├── terraform/              # Infrastructure as Code (GCP Compute Engine)
│   ├── main.tf             # Compute instance, disk, and firewall resources
│   ├── variables.tf        # Configurable project, region, and VM variables
│   ├── providers.tf        # Google Cloud provider configuration
│   ├── outputs.tf          # Public IP and SSH output values
│   └── terraform.tfvars.example
├── ansible/                # Configuration management & deployment
│   ├── inventory.ini       # Target host connection definitions
│   ├── ansible.cfg         # Automation settings and host key configuration
│   └── deploy.yml          # End-to-end VM setup and Compose deployment playbook
├── docker-compose.yml      # Multi-container orchestration (Mongo, Backend, Frontend)
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

---

## Demo Credentials

Demonstration accounts (Administrator, Maintenance Staff, and Students) are pre-configured in the database. In accordance with security best practices, live login credentials are provided separately and verbally during evaluation sessions.
