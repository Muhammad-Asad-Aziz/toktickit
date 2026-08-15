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
│   ├── prisma/      # Database schema and seed scripts
│   ├── src/         # Server endpoints and configuration
│   └── tests/       # API integration tests (Supertest + Vitest)
├── docs/            # Lab documentation and reports
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

## Getting Started

### 1. Environment Configuration

Copy the example environment files to create local configuration files:

For the client:
```bash
cp client/.env.example client/.env
```

For the server:
```bash
cp server/.env.example server/.env
```

Review `server/.env` and update the `DATABASE_URL` if your PostgreSQL credentials differ from the default:
```text
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
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

Ensure PostgreSQL is running, then initialize Prisma and database migrations in the `server` directory:

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
The API server starts at `http://localhost:3000`.

### Start Frontend Dev Server

In a separate terminal:
```bash
cd client
npm run dev
```
The React frontend application starts at `http://localhost:5173`.

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