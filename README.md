# TokTickIT

TokTickIT is an IT service desk web application for handling Account and Access, Hardware, Software, and Network support requests.

This project is built as a full-stack vertical slice:
- Frontend: React, TypeScript, Vite, Bootstrap
- Backend: Node.js, Express, TypeScript
- Database & ORM: PostgreSQL, Prisma
- Testing: Vitest, Supertest

---

## Project Structure

```text
toktickit/
├── client/          # Frontend React application (Vite)
│   ├── src/         # Application components and API client
│   └── tests/       # UI tests (Vitest)
├── server/          # Backend REST API (Express)
│   ├── prisma/      # Database schema, migrations, and seed scripts
│   ├── src/         # Server endpoints and configuration
│   └── tests/       # API integration tests (Supertest + Vitest)
├── docs/            # Lab documentation, test plans, and peer review records
├── .gitignore
└── README.md
```

---

## Prerequisites

Before running the application, ensure the following are installed:
- Node.js (version 18 or higher)
- npm (version 9 or higher)
- PostgreSQL (version 14 or higher)

---

## Environment Variables

The project uses `.env` files for local configuration (never committed to Git). Copy the `.env.example` templates to `.env`:

### Client Environment Variables (`client/.env`)

| Variable | Required | Default Value | Description |
|---|---|---|---|
| `VITE_API_URL` | Yes | `http://localhost:3000` | Base URL of the backend Express REST API. |

### Server Environment Variables (`server/.env`)

| Variable | Required | Default Value | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public` | PostgreSQL connection string. |
| `PORT` | No | `3000` | Port on which the Express API server listens. |

---

## Getting Started

### 1. Environment Configuration

```bash
# Set up client environment
cp client/.env.example client/.env

# Set up server environment
cp server/.env.example server/.env
```

### 2. Dependency Installation

Install dependencies for both client and server:

```bash
# Install client dependencies
cd client
npm install
cd ..

# Install server dependencies
cd server
npm install
cd ..
```

### 3. Database Setup

Ensure PostgreSQL is running, then initialize the schema and seed data in the `server` directory:

```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
cd ..
```

---

## Running the Application

### Start Backend API Server

```bash
cd server
npm run dev
```
The Express API server starts at `http://localhost:3000`.

### Start Frontend Dev Server

In a separate terminal:
```bash
cd client
npm run dev
```
The React frontend starts at `http://localhost:5173`.

---

## Running Tests

Automated testing is configured using Vitest and Supertest.

### Run Backend Tests

```bash
cd server
npm test
```

### Run Frontend Tests

```bash
cd client
npm test
```

---

## Branch and Pull Request Rules

This project enforces Git Flow across all development sprints:

### 1. Branch Hierarchy
- `main`: Protected stable release branch. Never commit or push directly to `main`.
- `lab1-staging`: Integration branch for Lab 1 features.
- `feature/<issue-number>-<short-description>`: Short-lived feature branch created for each specific issue (e.g. `feature/1-project-foundation`, `feature/2-health-check`).

### 2. Development Workflow
1. Always branch from an up-to-date integration branch or `main`.
2. Commit small and often with descriptive imperative prefixes (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
3. Push your feature branch to GitHub (`git push -u origin <branch>`).

### 3. Pull Request & Review Rules
- **PR Target**: Every feature PR must target `lab1-staging` as its base branch (never target `main` directly).
- **Issue Linking**: Link the PR to its corresponding GitHub Issue using `Closes #<issue_number>` in the description and under the Development sidebar.
- **Mandatory Peer Review**: Every PR must be reviewed by a peer partner with comments in `Files changed` before approval.
- **Merge Responsibility**: The peer reviewer (not the PR author) performs the final merge into `lab1-staging`.
- **Release to Main**: Once all 4 feature branches are merged and verified in `lab1-staging`, open a single release PR from `lab1-staging` to `main`.