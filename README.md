# TokTickIT

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Course](https://img.shields.io/badge/course-CPE334%20KMUTT-D9381E)](https://www.cpe.kmutt.ac.th/)

TokTickIT is an IT service desk web application designed for campus environments to handle Account and Access, Hardware, Software, and Network support requests across Requesters, IT Staff, and Administrators.

---

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features and User Roles](#key-features-and-user-roles)
- [Architecture and Tech Stack](#architecture-and-tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation and Database Setup](#installation-and-database-setup)
- [Running the Application](#running-the-application)
- [Demo Credentials](#demo-credentials)
- [Running Tests](#running-tests)
- [Git and Pull Request Workflow](#git-and-pull-request-workflow)
- [Maintainers and Course Context](#maintainers-and-course-context)

---

## About the Project

TokTickIT provides a centralized ticketing workflow tailored for institutional IT service desks. It solves common operational challenges in tracking support tickets, preventing race conditions during concurrent staff triage, and enforcing work item accountability before tickets can be resolved.

The system is developed following Spec-Driven Development (SDD) and Test-Driven Development (TDD) disciplines, using rigorous engineering contracts for every feature increment.

---

## Key Features and User Roles

TokTickIT enforces role-based access control (RBAC) across three distinct user roles:

| Role | Core Capabilities |
| :--- | :--- |
| **Requester** | Submits support requests with priority and system categorization; uploads and soft-deletes file attachments; tracks personal ticket progress; reviews staff actions taken; marks advisory resolution upon issue completion. |
| **IT Staff** | Manages the centralized ticket triage queue; filters tickets by status, priority, and assignment; claims and reassigns tickets; updates ticket workflow states; logs immutable **Actions Taken** work entries with follow-up flags; adds internal notes. |
| **Administrator** | Accesses the user management dashboard; creates, edits, and deactivates accounts; resets user credentials; monitors system-wide user metric tallies; protected by account safety rules that prevent self-deactivation or self-demotion. |

### Core Business Invariants
- **Resolution Gate**: A ticket cannot transition to `RESOLVED` or `CLOSED` unless at least one Action Taken work entry is recorded. Attempting premature resolution is rejected with HTTP 400 Bad Request.
- **Optimistic Concurrency Control (OCC)**: Concurrent edits against the same ticket verify the record's `updatedAt` token. Stale submissions return HTTP 409 Conflict, preserving local form drafts without silently overwriting changes.
- **Zen Green Design System**: Consistent visual identity with verified color contrast ratios (WCAG 2.1 AA), responsive layouts (desktop, tablet, and mobile), and keyboard navigation support.

---

## Architecture and Tech Stack

TokTickIT is implemented as a full-stack vertical slice:

```mermaid
graph LR
    subgraph Client ["Frontend Tier (Client)"]
        UI["React 18 + TypeScript"]
        Vite["Vite Dev Server"]
        CSS["Zen Green CSS + Bootstrap 5"]
    end

    subgraph Server ["Backend Tier (Server)"]
        Express["Express REST API"]
        Auth["JWT Cookie Auth + RBAC"]
        Validation["Business Rule Invariants"]
    end

    subgraph Data ["Data Tier"]
        Prisma["Prisma ORM 5"]
        Postgres[("PostgreSQL 14+")]
    end

    UI -->|HTTP / JSON + Cookies| Express
    Express --> Validation
    Validation --> Prisma
    Prisma -->|SQL / Connection Pool| Postgres
```

- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5, Zen Green Design System tokens
- **Backend**: Node.js, Express 4, TypeScript, JSON Web Tokens (`httpOnly` cookies), Multer
- **Database & ORM**: PostgreSQL, Prisma ORM (migrations, schema relations, idempotent seed)
- **Testing**: Vitest, React Testing Library, Supertest, Playwright

---

## Project Structure

```text
toktickit/
├── client/                     # Frontend React application (Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI components & modals
│   │   ├── context/            # Auth and active session providers
│   │   ├── services/           # Typed API client functions
│   │   ├── tests/              # Component unit & integration tests
│   │   ├── App.tsx             # Root application shell & routing
│   │   └── main.tsx            # React DOM entry point
│   ├── index.html              # Single-page HTML shell
│   └── vite.config.ts          # Vite build & test configuration
├── server/                     # Backend REST API (Express)
│   ├── prisma/
│   │   ├── migrations/         # PostgreSQL database schema migrations
│   │   ├── schema.prisma       # Prisma data model definition
│   │   └── seed.ts             # Idempotent database seeder
│   ├── src/
│   │   ├── middleware/         # Auth, RBAC, and error handlers
│   │   ├── routes/             # REST API endpoint route handlers
│   │   ├── index.ts            # Server entry point
│   │   └── prisma.ts           # Prisma client singleton
│   └── tests/                  # API integration tests (Supertest + Vitest)
├── e2e/                        # End-to-end multi-role test suites (Playwright)
├── docs/                       # Specifications, test catalogs, and peer reviews
│   ├── reference/              # System-level SDS & lab requirements
│   ├── lab-01/                 # Sprint 1 documentation
│   ├── lab-02/                 # Sprint 2 engineering contract
│   ├── lab-03/                 # Sprint 3 engineering contract
│   └── lab-04/                 # Sprint 4 engineering contract & verification
├── artifacts/                  # Generated Playwright screenshot evidence
├── .gitignore
├── package.json                # Workspace scripts for tests
└── README.md
```

---

## Prerequisites

Ensure the following tools are installed before setting up the repository:

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14` or higher (running locally or in a container)

---

## Environment Variables

Environment variables are managed using `.env` files located in the `client/` and `server/` directories. As required by standard security practices, never commit `.env` files containing live credentials to Git.

### Client Environment (`client/.env`)

| Variable | Required | Default Value | Purpose |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | Yes | `http://localhost:3000` | Base URL of the backend Express REST API. |

### Server Environment (`server/.env`)

| Variable | Required | Default Value | Purpose |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public` | PostgreSQL connection string. |
| `PORT` | No | `3000` | Port number for the Express API server. |

---

## Installation and Database Setup

Follow these steps sequentially to set up a clean development environment:

### 1. Clone Repository and Enter Directory

```bash
git clone https://github.com/Muhammad-Asad-Aziz/toktickit.git
cd toktickit
```

### 2. Configure Environment Files

Copy the provided environment templates:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

If your local PostgreSQL credentials differ from the default (`toktickit:toktickit@localhost:5432/toktickit`), update `DATABASE_URL` in `server/.env`.

### 3. Install Dependencies

Install required packages for the workspace, backend, and frontend:

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 4. Initialize Database and Seed Data

Ensure PostgreSQL is running, then run the database migrations and seeder:

```bash
cd server
npx prisma generate
npx prisma migrate dev
npm run seed
cd ..
```

---

## Running the Application

To run TokTickIT locally, start both the backend API and frontend client in separate terminals.

### Terminal 1: Backend API Server

```bash
cd server
npm run dev
```
The Express REST API server runs at `http://localhost:3000`.

### Terminal 2: Frontend Client

```bash
cd client
npm run dev
```
The React development server runs at `http://localhost:5173`. Open this URL in your web browser.

---

## Demo Credentials

The database seeder provisions baseline user accounts across all three system roles for immediate testing:

| Role | Email Address | Password | Description |
| :--- | :--- | :--- | :--- |
| **Requester** | `sompong.it@kmutt.ac.th` | `Password123!` | Active requester with submitted tickets. |
| **IT Staff** | `wichai.it@kmutt.ac.th` | `Password123!` | Active resolver with assigned queue tickets. |
| **Administrator** | `admin.toktick@kmutt.ac.th` | `Password123!` | System administrator with user management access. |

---

## Running Tests

Automated testing is configured across unit, API integration, and browser end-to-end tiers:

### Run Full Test Suite (Server + Client)

From the project root:

```bash
npm test
```

### Run Backend API Tests

Runs all Express endpoint and business rule tests via Vitest and Supertest:

```bash
npm run test:server
```

### Run Frontend Component Tests

Runs all React component and state tests via React Testing Library:

```bash
npm run test:client
```

### Run End-to-End Tests (Playwright)

Runs full multi-role browser scenarios and captures screenshot evidence:

```bash
npm run test:e2e
```
*Note: Screenshot artifacts generated during E2E runs are saved to `artifacts/lab-04/screenshots/`.*

---

## Git and Pull Request Workflow

Development follows the branching and peer-review process established for the course:

```mermaid
graph TD
    M["main (Protected Production Release)"]
    S["lab4-staging (Integration Branch)"]
    F1["feature/17-spec-and-tests"]
    F2["feature/18-actions-taken-foundation"]
    F3["feature/19-actions-taken-ui"]
    F4["feature/20-ticket-workflow"]
    F5["feature/21-role-dashboards"]
    F6["feature/22-regression-polish-release"]

    M --> S
    S --> F1
    S --> F2
    S --> F3
    S --> F4
    S --> F5
    S --> F6
    F1 -->|Peer Reviewed PR| S
    F2 -->|Peer Reviewed PR| S
    F3 -->|Peer Reviewed PR| S
    F4 -->|Peer Reviewed PR| S
    F5 -->|Peer Reviewed PR| S
    F6 -->|Peer Reviewed PR| S
    S -->|Final Release PR| M
```

### Branch Rules
- **`main`**: Protected stable release branch. Direct commits and force pushes are disabled.
- **`lab*-staging`**: Integration branch for the active sprint (e.g. `lab4-staging`). All feature branches branch from and target staging.
- **`feature/<issue>-<description>`**: Bounded feature branch implementing one specific sprint issue.

### Pull Request & Review Standards
1. **Target Branch**: All feature PRs must target the active sprint staging branch (never target `main` directly).
2. **Issue Linking**: Link the corresponding GitHub issue in the PR description (e.g., `Closes #42`).
3. **Peer Review**: Every PR must receive a formal peer review before merging. Comments and verification notes are documented in GitHub's review interface.
4. **Merge Responsibility**: The designated peer reviewer merges approved PRs into the staging branch.
5. **Definition of Done (DoD)**: An increment is considered done when:
   $$\text{Done} = \text{Accepted by Review} + \text{Satisfies Criteria} + \text{Merged} + \text{Evidence Documented}$$
   *(A feature is never marked done simply because an AI agent generated code).*
6. **Staged Release**: Once all sprint feature branches are integrated and verified on staging, a release PR is submitted from staging to `main`.

---

## Maintainers and Course Context

- **Author**: Muhammad Asad Aziz (Student ID: 67070503472) — [@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz)
- **Peer Reviewer**: Al Xander James Codino Ybanez (Student ID: 67070503450) — [@ShortXander101205](https://github.com/ShortXander101205)
- **Course**: CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Institution**: Department of Computer Engineering, King Mongkut's University of Technology Thonburi (KMUTT)
