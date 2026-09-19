# Feature 12 Engineering Contract: Authentication Foundation, User Migration & Application Shell Navigation

**Feature Title**: Authentication Foundation, User Migration & Application Shell Navigation  
**Branch Name**: `feature/12-auth-and-shell` (Issue 12)  
**Base Branch**: `lab3-staging`  
**Document Status**: Approved Feature Baseline  
**Author**: TokTickIT Engineering Team  
**Traceability References**:
* [TokTickIT-System-Level-SDS-v1.0.pdf](../../reference/TokTickIT-System-Level-SDS-v1.0.pdf) (§Security Architecture, §Decisions D-01, D-02, D-08, D-10)
* [Lab_3_sheet.pdf](../../reference/Lab_3_sheet.pdf) (§1, §3, §4.3, §4.4, §5.1, §5.2, §5.3, §6.1, §7, §8.1, §8.2, §14)
* [docs/lab-03/specification.md](../../lab-03/specification.md) (`FR-01`, `FR-02`, `BR-01`, `BR-02`, `BR-03`, `BR-09`, `BR-10`, `AC-01` to `AC-06`)
* [docs/lab-03/ui-spec.md](../../lab-03/ui-spec.md) (Zen Green Tokens, Typography, Badges, Screens 1 & 2, App Shell)
* [docs/lab-03/api-spec.md](../../lab-03/api-spec.md) (§2 Auth Endpoints, Error Envelopes, Anti-Enumeration Rules)
* [docs/lab-03/tests.md](../../lab-03/tests.md) (STS Test Catalog `AUTH-01` through `AUTH-09`, `UI-LOG-01`, `UI-PWD-01`)
* [docs/lab-03/poc-scope-and-issues.md](../../lab-03/poc-scope-and-issues.md) (Issue 12 Decomposition)
* [AGENTS.md](../../../AGENTS.md) (Work Norms: Closed-World Rule, TDD, Theme Compliance, Blur Validation Rule)

---

## 1. Feature Scope & Objectives

### 1.1. Strategic Objectives
Issue 12 establishes the authentication, authorization, user identity foundation, and core application navigation shell for TokTickIT Sprint 3 (Lab 3). It formally transitions TokTickIT from a simulated single-requester prototype into a real authenticated service platform supporting three distinct roles: **Requester**, **IT Staff**, and **Administrator**.

Key objectives include:
1. **Real User Authentication**: Replace the temporary Lab 2 Development Requester context selector and modal with real credential-based authentication using email and securely hashed passwords (`bcrypt` / `Argon2id`).
2. **User Data Migration & Foreign Key Preservation**: Safely evolve the Prisma schema from Lab 2's `RequesterUser` (`requester_users`) model into a unified `User` (`users`) model with role support (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), preserving all existing ticket records, foreign keys, and soft-removal audit tombstones.
3. **Mandatory First-Login Password Change**: Enforce a strict security workflow intercepting any user with `mustChangePassword = true`, blocking access to operational routes and screens until a strong, compliant password is saved.
4. **Application Shell Navigation & Session State**: Modernize the frontend application shell (`AppHeader.tsx`, `App.tsx`, and session context) to display the authenticated user's name and role badge, provide a working Logout action, eliminate the Lab 2 Dev Requester banner/modal, and render role-aware navigation links.
5. **Anti-Spoofing & Requester Regression Protection**: Update ticket creation and retrieval logic so that requester identity is derived strictly from the verified server-side session (`req.user.id`), disregarding client-supplied IDs or headers.

### 1.2. In-Scope Deliverables
1. **Prisma Schema & Migration**:
   - Add `Role` enum (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`).
   - Create unified `User` model with `passwordHash`, `role`, `mustChangePassword`, `isActive`, `department`.
   - Update `Ticket` and `Attachment` relations to reference `User`.
   - Preserve existing tickets and attachments during migration.
2. **Idempotent Database Seeding (`server/prisma/seed.ts`)**:
   - Seed at least 4 active Requesters, 1 inactive Requester, and 1 forced-change Requester.
   - Seed at least 3 active IT Staff and 1 inactive IT Staff.
   - Seed at least 1 Administrator (plus 1 backup Administrator).
   - Ensure all seed passwords are pre-hashed and upserted safely without primary key collisions.
3. **Authentication & Session REST APIs**:
   - `POST /api/v1/auth/login`: Authenticate with email/password; issue session/token; reject inactive accounts safely (`BR-01`).
   - `POST /api/v1/auth/logout`: Invalidate session and clear HTTP-only cookie.
   - `GET /api/v1/auth/me`: Return authenticated profile and role; return `401 Unauthorized` if unauthenticated.
   - `POST /api/v1/auth/change-password`: Validate current password, enforce strength rules, update hash, set `mustChangePassword = false`.
4. **Server Middleware**:
   - `authenticateToken`: Verify session cookie (`toktickit_session`) or `Authorization: Bearer <token>` header; attach `req.user`.
   - `requirePasswordChanged`: Block operational API requests when `req.user.mustChangePassword === true` with `403 Forbidden` (`PASSWORD_CHANGE_REQUIRED`).
5. **Frontend Screens & Shell Components**:
   - `LoginView.tsx` (`/login`): Centered Zen Green card, validation alerts, busy spinner.
   - `ChangePasswordView.tsx` (`/change-password`): Current/new/confirm password inputs, interactive live checklist, navigation barrier.
   - `AuthContext.tsx`: Client session management, token persistence, bootstrap session verification (`/api/v1/auth/me`), login/logout actions.
   - `AppHeader.tsx`: Authenticated user name, styled role badge, profile menu with working Logout.
   - Elimination of `RequesterModal.tsx` and Dev Requester banner.
6. **Automated Verification**:
   - Supertest API integration tests in `server/tests/lab-03/auth.api.test.ts`.
   - React Testing Library UI component tests in `client/src/tests/lab-03/Login.test.tsx` and `client/src/tests/lab-03/ChangePassword.test.tsx`.

### 1.3. Explicitly Excluded Scope (Strictly Out of Scope per §4.2 & Issue 12)
* **Email & External Auth**: No email invitations, password-reset emails, magic links, SMS/TOTP multi-factor authentication (MFA), social logins, or Single Sign-On (SSO / OAuth2 / OIDC).
* **Self-Registration**: No public sign-up or self-registration; all accounts are provisioned by Administrators (Issue 15) or seeded.
* **Multiple Roles**: Strictly one role per user (`REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`). No composite or granular permissions.
* **IT Staff Shared Queue**: Filterable staff ticket queue is deferred to Issue 13 (`feature/13-staff-ticket-queue`).
* **IT Staff Ticket Detail Operations & Internal Notes**: Ticket claim, status workflow transition, and confidential internal notes are deferred to Issue 14 (`feature/14-staff-ticket-detail`).
* **Administrator User Management Screens**: The `/admin/users` CRUD interface is deferred to Issue 15 (`feature/15-admin-user-management`).
* **E2E Playwright Automation**: Comprehensive multi-role E2E tests are deferred to Issue 16 (`feature/16-e2e-polish-release`).

---

## 2. Database Migration & Seed Data Specification

### 2.1. Prisma Schema Definition (`server/prisma/schema.prisma`)

The database schema evolves from the Lab 2 `RequesterUser` model into a unified, authenticated `User` model mapped to the PostgreSQL table `users`. All relational foreign keys in `Ticket` and `Attachment` are repointed to `User`.

```prisma
// server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------------------------------------------------------------------------
// 0. Role Enum (Strict Single-Role Policy per BR-09)
// ---------------------------------------------------------------------------
enum Role {
  REQUESTER
  IT_STAFF
  ADMINISTRATOR
}

// ---------------------------------------------------------------------------
// 1. User Model (Unified Authenticated Identity)
// ---------------------------------------------------------------------------
model User {
  id                 Int          @id @default(autoincrement())
  name               String
  email              String       @unique // Stored and queried in normalized lowercase (BR-10)
  passwordHash       String
  role               Role         @default(REQUESTER)
  department         String?      // Preserved from Lab 2 for academic/staff context
  isActive           Boolean      @default(true)
  mustChangePassword Boolean      @default(true) // Forces change on first login (FR-02, BR-02)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  // Relational Integrity
  submittedTickets   Ticket[]     @relation("RequesterTickets")
  removedAttachments Attachment[] @relation("UserRemovedAttachments")

  @@map("users")
}

// ---------------------------------------------------------------------------
// 2. Related System (Affected Campus IT Services)
// ---------------------------------------------------------------------------
model RelatedSystem {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relational Integrity
  tickets   Ticket[]

  @@map("related_systems")
}

// ---------------------------------------------------------------------------
// 3. Category (Problem Classification)
// ---------------------------------------------------------------------------
model Category {
  id          Int      @id @default(autoincrement())
  code        String?  @unique
  name        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relational Integrity
  tickets     Ticket[]

  @@map("categories")
}

// ---------------------------------------------------------------------------
// 4. Ticket (Service Desk Incident / Request)
// ---------------------------------------------------------------------------
model Ticket {
  id                  Int          @id @default(autoincrement())
  ticketNumber        String       @unique @db.VarChar(32) // Format: TKT-YYYY-NNNNN
  requesterId         Int
  categoryId          Int
  relatedSystemId     Int
  summary             String       @db.VarChar(100)
  description         String       @db.Text
  requestedPriority   String       // Low, Medium, High, Urgent (BR-05)
  itPriority          String?      // Low, Medium, High, Urgent (BR-07)
  currentStatus       String       @default("New")
  requesterResolvedAt DateTime?
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  // Relations (Repointed to User model)
  requester           User          @relation("RequesterTickets", fields: [requesterId], references: [id], onDelete: Restrict)
  category            Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  relatedSystem       RelatedSystem @relation(fields: [relatedSystemId], references: [id], onDelete: Restrict)
  attachments         Attachment[]

  @@index([requesterId])
  @@index([currentStatus])
  @@map("tickets")
}

// ---------------------------------------------------------------------------
// 5. Attachment (Supporting File Metadata & Soft-Removal Tombstone)
// ---------------------------------------------------------------------------
model Attachment {
  id                   Int       @id @default(autoincrement())
  ticketId             Int
  originalFilename     String
  storedFilename       String    @unique
  mimeType             String
  fileSize             Int
  isRemoved            Boolean   @default(false)
  removalReason        String?   @db.Text
  removedAt            DateTime?
  removedByRequesterId Int?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  // Relations (Repointed to User model)
  ticket               Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  removedByUser        User?     @relation("UserRemovedAttachments", fields: [removedByRequesterId], references: [id], onDelete: SetNull)

  @@index([ticketId])
  @@map("attachments")
}

// ---------------------------------------------------------------------------
// 6. Ticket Number Sequence (Annual Sequence Reset)
// ---------------------------------------------------------------------------
model TicketNumberSequence {
  year    Int @id
  nextVal Int @default(1)

  @@map("ticket_number_sequences")
}
```

### 2.2. Migration Strategy & Foreign Key Preservation

To prevent data loss and preserve foreign key integrity from Lab 2:
1. **Migration Tooling**: Execute `npx prisma migrate dev --name auth_user_migration_and_shell`.
2. **Schema Transformation**:
   - Create PostgreSQL enum type `"Role"` with values `'REQUESTER'`, `'IT_STAFF'`, `'ADMINISTRATOR'`.
   - Rename existing table `requester_users` to `users` (or alter table in place) so existing primary keys (`id: 1, 2, 3, 4, 5`) and sequence generators (`requester_users_id_seq` $\rightarrow$ `users_id_seq`) are retained.
   - Add new columns to `users`:
     - `"passwordHash"` `TEXT NOT NULL` (default placeholder hash during initial migration).
     - `"role"` `"Role" NOT NULL DEFAULT 'REQUESTER'`.
     - `"mustChangePassword"` `BOOLEAN NOT NULL DEFAULT true`.
     - `"isActive"` `BOOLEAN NOT NULL DEFAULT true`.
   - Update foreign key constraint `tickets_requesterId_fkey` and `attachments_removedByRequesterId_fkey` to point to `users(id)` with `ON DELETE RESTRICT` and `ON DELETE SET NULL` respectively.
3. **Integrity Guarantees**:
   - Zero existing tickets (`TKT-2026-00001` through `TKT-2026-00004`) lose their requester relationship.
   - All attachments and soft-removal metadata remain linked to their original user IDs.

### 2.3. Idempotent Seed Data Specification (`server/prisma/seed.ts`)

The seed script must use Prisma `upsert` matching on normalized lowercase `email` without passing hardcoded `id` values, ensuring PostgreSQL sequences remain in sync.

#### Password Hashing Standard
All seed passwords must be hashed before storage using `bcrypt` (salt rounds 10) or `argon2id`. Standard default passwords for development/testing:
- Default Active Accounts: `Password123!`
- First-Login Forced Change Account: `InitialPass123!`

#### Concrete Seed User Accounts

| Name | Normalized Email | Role | Department | isActive | mustChangePassword | Plaintext Password |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Sompong IT** | `sompong.it@kmutt.ac.th` | `REQUESTER` | Information Technology Office | `true` | `false` | `Password123!` |
| **Anong Staff** | `anong.sta@kmutt.ac.th` | `REQUESTER` | Academic Affairs Office | `true` | `false` | `Password123!` |
| **Kittisak Student** | `kittisak.stu@kmutt.ac.th` | `REQUESTER` | Computer Engineering Dept | `true` | `false` | `Password123!` |
| **Wichai Faculty** | `wichai.fac@kmutt.ac.th` | `REQUESTER` | Department of Mathematics | `true` | `false` | `Password123!` |
| **Prasert Inactive** | `prasert.ina@kmutt.ac.th` | `REQUESTER` | Human Resources Office | `false` | `false` | `Password123!` |
| **New Requester** | `new.requester@kmutt.ac.th` | `REQUESTER` | Science Faculty | `true` | `true` | `InitialPass123!` |
| **Wichai IT** | `wichai.it@kmutt.ac.th` | `IT_STAFF` | IT Infrastructure Services | `true` | `false` | `Password123!` |
| **Nareerat IT** | `nareerat.it@kmutt.ac.th` | `IT_STAFF` | Campus Network Operations | `true` | `false` | `Password123!` |
| **Ekachai IT** | `ekachai.it@kmutt.ac.th` | `IT_STAFF` | User Support Services | `true` | `false` | `Password123!` |
| **Inactive Staff** | `inactive.staff@kmutt.ac.th` | `IT_STAFF` | Former IT Resolver | `false` | `false` | `Password123!` |
| **Admin TokTick** | `admin.toktick@kmutt.ac.th` | `ADMINISTRATOR` | IT Central Administration | `true` | `false` | `Password123!` |
| **Backup Admin** | `backup.admin@kmutt.ac.th` | `ADMINISTRATOR` | Disaster Recovery Services | `true` | `false` | `Password123!` |

*(Summary: 5 active Requesters, 1 inactive Requester, 3 active IT Staff, 1 inactive IT Staff, 2 active Administrators; 1 user specifically configured with `mustChangePassword: true` for testing).*

---

## 3. API & Security Protocols

### 3.1. Authentication Architecture & Session Handling
* **Session Token**: Signed JSON Web Token (JWT) containing payload `{ id: number, email: string, role: Role, mustChangePassword: boolean }`.
* **Transport Mechanisms**:
  1. **HTTP-only Cookie**: Set as `toktickit_session` (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=86400`).
  2. **Bearer Authorization Header**: Optional/fallback header `Authorization: Bearer <token>` for API clients and automated tests.
* **Session Validation Flow**:
  - Middleware inspects cookies or the `Authorization` header.
  - If valid token found, verifies signature and sets `req.user`.
  - If invalid or expired, sets `req.user = undefined`.

### 3.2. REST Endpoint Contracts

#### 1. `POST /api/v1/auth/login`
Authenticates user credentials and establishes an active session.

* **Access**: Public
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "email": "sompong.it@kmutt.ac.th",
    "password": "Password123!"
  }
  ```
* **Validation Rules**:
  - `email`: Required string, trimmed, normalized to lowercase, valid email syntax.
  - `password`: Required non-empty string.
* **Success Response (`200 OK`)**:
  - Sets HTTP-only cookie `toktickit_session`.
  ```json
  {
    "user": {
      "id": 1,
      "name": "Sompong IT",
      "email": "sompong.it@kmutt.ac.th",
      "role": "REQUESTER",
      "mustChangePassword": false,
      "isActive": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Error Responses**:
  - `401 Unauthorized`:
    ```json
    {
      "error": {
        "code": "UNAUTHENTICATED",
        "message": "Invalid email or password",
        "timestamp": "2026-09-14T12:00:00.000Z"
      }
    }
    ```
    *(Note: Per `BR-01`, returned identically for non-existent emails, mismatched passwords, and inactive accounts `isActive = false`).*
  - `400 Bad Request`:
    ```json
    {
      "error": {
        "code": "VALIDATION_FAILED",
        "message": "Email and password are required",
        "timestamp": "2026-09-14T12:00:00.000Z"
      }
    }
    ```

---

#### 2. `POST /api/v1/auth/logout`
Invalidates the current session and clears session cookies.

* **Access**: Authenticated
* **Request Body**: None
* **Success Response (`200 OK`)**:
  - Clears `toktickit_session` cookie (`Max-Age=0`).
  ```json
  {
    "message": "Successfully logged out."
  }
  ```

---

#### 3. `GET /api/v1/auth/me`
Returns current authenticated user identity and role.

* **Access**: Authenticated
* **Success Response (`200 OK`)**:
  ```json
  {
    "user": {
      "id": 1,
      "name": "Sompong IT",
      "email": "sompong.it@kmutt.ac.th",
      "role": "REQUESTER",
      "mustChangePassword": false,
      "isActive": true
    }
  }
  ```
* **Error Response (`401 Unauthorized`)**:
  ```json
  {
    "error": {
      "code": "UNAUTHENTICATED",
      "message": "Authentication required",
      "timestamp": "2026-09-14T12:00:00.000Z"
    }
  }
  ```

---

#### 4. `POST /api/v1/auth/change-password`
Updates user password and clears `mustChangePassword` flag.

* **Access**: Authenticated (Permitted even when `mustChangePassword === true`).
* **Request Body**:
  ```json
  {
    "currentPassword": "InitialPass123!",
    "newPassword": "SecurePassword456!",
    "confirmPassword": "SecurePassword456!"
  }
  ```
* **Validation & Security Rules**:
  - `currentPassword`: Required string, verified against active `passwordHash`.
  - `newPassword`: Required string satisfying complexity rules:
    - Minimum length: 8 characters
    - At least 1 uppercase letter (`[A-Z]`)
    - At least 1 lowercase letter (`[a-z]`)
    - At least 1 numeric digit (`[0-9]`)
    - At least 1 special symbol (`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`)
  - `confirmPassword`: Must exactly match `newPassword`.
* **Success Response (`200 OK`)**:
  - Updates `passwordHash` in database.
  - Sets `mustChangePassword = false`.
  - Issues fresh session token with `mustChangePassword: false`.
  ```json
  {
    "message": "Password changed successfully.",
    "user": {
      "id": 6,
      "name": "New Requester",
      "email": "new.requester@kmutt.ac.th",
      "role": "REQUESTER",
      "mustChangePassword": false,
      "isActive": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Error Responses**:
  - `400 Bad Request` (`VALIDATION_FAILED`): Password does not meet complexity requirements or passwords do not match.
  - `401 Unauthorized` (`UNAUTHENTICATED`): Current password incorrect.

---

### 3.3. Security Invariants & Middleware Protocols

1. **Safe Error Responses & Anti-Enumeration Policy (`BR-01`)**:
   - The login endpoint must never indicate whether an email address exists in the system.
   - If an account exists but has `isActive: false`, the endpoint returns HTTP `401 Unauthorized` with the exact same error code and message as an incorrect password: `"Invalid email or password"`.
2. **Mandatory First-Login Enforcement (`BR-02`)**:
   - Middleware `requirePasswordChanged(req, res, next)` guards all operational API routes (ticket creation, listing, etc.).
   - If `req.user.mustChangePassword === true`, the middleware immediately returns HTTP `403 Forbidden`:
     ```json
     {
       "error": {
         "code": "PASSWORD_CHANGE_REQUIRED",
         "message": "You must change your password before accessing the service desk.",
         "timestamp": "2026-09-14T12:00:00.000Z"
       }
     }
     ```
   - Only `POST /api/v1/auth/change-password`, `POST /api/v1/auth/logout`, and `GET /api/v1/auth/me` are permitted while `mustChangePassword === true`.
3. **Session-Derived Requester Ownership & Anti-Spoofing (`BR-03`)**:
   - In `POST /api/v1/tickets` and `GET /api/v1/tickets`, the requester's ID is strictly assigned as `requesterId = req.user.id`.
   - Any client-supplied `requesterId` in request bodies, query params, or custom headers (e.g. `x-requester-id`) is completely discarded.
4. **Input Sanitization & Normalization (`BR-10`)**:
   - All emails are trimmed and normalized to lowercase on lookup and creation.
   - Passwords are never logged, never returned in API payloads, and never stored unhashed.

---

## 4. UI Wireframe & State Contracts

All screens adhere to the KMUTT IT Service Desk "Zen Green" design tokens defined in `docs/lab-03/ui-spec.md`.

### 4.1. Screen 1: Login View (`/login`)

```
+-------------------------------------------------------+
|                    [TokTickIT Logo]                   |
|              Sign in to TokTickIT Desk                |
|                                                       |
|  [ Alert: Invalid email or password (if error) ]      |
|                                                       |
|  Email Address *                                      |
|  [ user@kmutt.ac.th                                 ] |
|                                                       |
|  Password *                                           |
|  [ ******************                              ]  |
|                                                       |
|  [   Sign In (with spinner when busy)               ] |
+-------------------------------------------------------+
```

#### Visual & Layout Specifications:
* **Container**: Centered card (`max-width: 440px`), top margin `80px` (`40px` on mobile), background `#FFFFFF`, border `1px solid var(--zen-border-neutral)`, border-radius `8px`, box-shadow `0 4px 6px -1px rgba(0, 0, 0, 0.05)`.
* **Brand Header**: TokTickIT leaf icon, title `h1` ("Sign in to TokTickIT Desk", `24px`, bold, `--zen-text-primary`).
* **Email Field**:
  - Label: `Email Address` with red asterisk `<span className="text-danger ms-1">*</span>`.
  - Input: `<input type="email" name="email" className="form-control">`, height `40px`.
  - Autofocus enabled.
  - Normalization: lowercased and trimmed on blur.
* **Password Field**:
  - Label: `Password` with red asterisk.
  - Input: `<input type="password" name="password" className="form-control">`, height `40px`.
* **Submit Action**:
  - Primary button: `.btn-zen-primary` (background `--zen-primary-green: #006B3C`, text white, height `40px`, font-weight `600`).
  - Hover: background `--zen-secondary-green: #0B7A46`.
  - Submitting state: disabled, opacity 0.7, animated spinner icon, label changed to `"Signing in..."`.
* **Error Banner**:
  - Background `var(--zen-error-bg: #FDF2F2)`, border `1px solid #FECACA`, text `var(--zen-error: #B3261E)`, radius `6px`, padding `12px 16px`.
  - Displayed on 401: *"Invalid email or password"*.
* **Blur Validation Rule**:
  - Leaving a field with empty or invalid format does not trigger jarring inline red alerts prematurely.
  - Form validation is only surfaced upon explicit click of "Sign In".

---

### 4.2. Screen 2: Mandatory First-Login Password Change View (`/change-password`)

```
+-------------------------------------------------------+
|                    [TokTickIT Logo]                   |
|                Change Your Initial Password           |
|  For your security, you must update your password     |
|  before accessing the IT Service Desk.                |
|                                                       |
|  Current Password *                                   |
|  [ ******************                              ]  |
|                                                       |
|  New Password *                                       |
|  [ ******************                              ]  |
|                                                       |
|  Password Requirements:                               |
|  [v] At least 8 characters long                       |
|  [v] Contains an uppercase letter (A-Z)               |
|  [v] Contains a lowercase letter (a-z)                |
|  [v] Contains a numeric digit (0-9)                   |
|  [v] Contains a special symbol (!@#$%^&*...)          |
|                                                       |
|  Confirm New Password *                               |
|  [ ******************                              ]  |
|  [ Inline error: Passwords do not match (if any)   ]  |
|                                                       |
|  [   Update Password & Enter Application            ] |
+-------------------------------------------------------+
```

#### Visual & Layout Specifications:
* **Container**: Centered card (`max-width: 480px`), top margin `60px`, background `#FFFFFF`, border `1px solid var(--zen-border-neutral)`, border-radius `8px`.
* **Notice Banner**: Soft blue-gray alert explaining forced change: *"For your security, you must update your password before accessing the IT Service Desk."*
* **Fields**:
  - `Current Password`: Masked input.
  - `New Password`: Masked input with real-time requirement evaluation.
  - `Confirm New Password`: Masked input with equality check.
* **Interactive Complexity Checklist**:
  - Renders 5 criteria with real-time icons:
    - `[ ] At least 8 characters long`
    - `[ ] Contains an uppercase letter (A-Z)`
    - `[ ] Contains a lowercase letter (a-z)`
    - `[ ] Contains a numeric digit (0-9)`
    - `[ ] Contains a special symbol (!@#$%^&*...)`
  - Unmet rule: muted gray text with hollow circle `○`.
  - Satisfied rule: green text (`--zen-success: #2E7D32`) with checkmark icon `✓`.
* **Confirmation Validation**:
  - Evaluated on blur and on submit.
  - If mismatched: inline error text below confirm field (`"Passwords do not match"`).
* **Navigation Lock & Barrier**:
  - If a user with `mustChangePassword === true` attempts to navigate to `/`, `/tickets`, or `/staff/tickets`, the frontend router forces redirection back to `/change-password`.
  - Application navigation header hides operational links while in this state.
* **Submit Action**:
  - Button text: `"Update Password & Enter Application"`.
  - Disabled until all 5 complexity rules are green and confirm password is non-empty.
  - Submitting state: disabled with spinner `"Updating Password..."`.
  - Upon success: transitions session state to `mustChangePassword = false`, redirects user to their role-specific home view with a success toast or banner.

---

### 4.3. Screen 3: Application Shell & Global Header (`AppHeader.tsx`)

```
+---------------------------------------------------------------------------------------------------------+
| [TokTickIT Logo]   TokTickIT Desk   |  My Tickets  |  Create Ticket  |  Staff Queue  |  User Admin      |
|                                                                        [John Doe (IT Staff) v] [Logout] |
+---------------------------------------------------------------------------------------------------------+
```

#### Modifications to Existing Shell:
1. **Complete Removal of Dev Requester Selector**:
   - Eliminate `RequesterModal.tsx` and the simulated requester selection popup.
   - Eliminate the top banner notice: *"Select a Development Requester to test requester-specific ticket behavior."*
   - Eliminate the `Switch Requester` action from the header.
2. **Authenticated User Profile & Role Badges**:
   - Header right section displays:
     - User icon or avatar circle with initials.
     - Full Name (`req.user.name`, e.g. `"Sompong IT"`).
     - Styled Role Badge matching `ui-spec.md`:
       - `Requester`: Background `#EAF6EF`, text `#006B3C`, border `1px solid #C4E5D2`.
       - `IT Staff`: Background `#E0F2FE`, text `#0369A1`, border `1px solid #BAE6FD`.
       - `Administrator`: Background `#F3E8FF`, text `#6B21A8`, border `1px solid #E9D5FF`.
3. **Working Logout Action**:
   - Explicit "Logout" button or profile dropdown menu item.
   - Clicking triggers `POST /api/v1/auth/logout`.
   - Clears `localStorage` / session state in `AuthContext`.
   - Immediately redirects to `/login`.
4. **Role-Aware Header Navigation Links**:
   - **Requester**:
     - `My Tickets` (`/tickets`)
     - `Create Ticket` (`/tickets/new`)
   - **IT Staff**:
     - `Staff Queue` (`/staff/tickets`)
     - `Create Ticket` (`/tickets/new`)
     - `My Tickets` (`/tickets`)
   - **Administrator**:
     - `User Admin` (`/admin/users`)
     - `Staff Queue` (`/staff/tickets`)
     - `My Tickets` (`/tickets`)
5. **Unauthenticated / Guest State**:
   - If user is not authenticated and browsing `/login`, header displays brand logo and title without navigation links or user profile.

---

## 5. Test Traceability Matrix (STS)

Every Acceptance Criterion and requirement mapped to Issue 12 is verified through automated assertions across backend integration and frontend UI component test suites:

### 5.1. Requirements Traceability Overview

| Requirement ID | Acceptance Criterion | Test Tier | Test File | Test Scenario & Assertion |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01**, **BR-01** | **AC-01** (Valid Login & Session Grant) | API | `server/tests/lab-03/auth.api.test.ts` | `AUTH-01`: Valid login returns 200, session cookie, safe user object. |
| **BR-01** | **AC-02** (Invalid Credentials Protection) | API | `server/tests/lab-03/auth.api.test.ts` | `AUTH-02`: Wrong password returns 401 with generic error message. |
| **BR-01** | **AC-02** (Inactive Account Protection) | API | `server/tests/lab-03/auth.api.test.ts` | `AUTH-03`: Inactive user (`isActive: false`) returns 401 generic error without disclosure. |
| **FR-01** | **AC-01** (Current Profile Retrieval) | API | `server/tests/lab-03/auth.api.test.ts` | `AUTH-04`: `GET /auth/me` with session returns user profile. |
| **FR-01** | **AC-01** (Unauthenticated Rejection) | API | `server/tests/lab-03/auth.api.test.ts` | `AUTH-05`: `GET /auth/me` without session returns 401 Unauthorized. |
| **FR-01** | **AC-06** (Logout Session Invalidation) | API | `server/tests/lab-03/auth.api.test.ts` | `AUTH-06`: `POST /auth/logout` clears cookie; subsequent `/auth/me` returns 401. |
| **FR-02**, **BR-02** | **AC-03** (Operational Route Interception) | API | `server/tests/lab-03/auth.api.test.ts` | `AUTH-07`: User with `mustChangePassword = true` receives 403 `PASSWORD_CHANGE_REQUIRED` on operational route. |
| **FR-02** | **AC-04** (Valid Password Change) | API | `server/tests/lab-03/auth.api.test.ts` | `AUTH-08`: Submitting valid current/new password updates hash, sets `mustChangePassword = false`. |
| **FR-02** | **AC-04** (Weak Password Rejection) | API | `server/tests/lab-03/auth.api.test.ts` | `AUTH-09`: Weak new password returns 400 with field validation errors. |
| **FR-01**, **BR-01** | **AC-01**, **AC-02** (Login Form UI) | UI | `client/src/tests/lab-03/Login.test.tsx` | `UI-LOG-01`: Renders inputs, handles blur format clearing, submits credentials, shows error banner on 401. |
| **FR-02** | **AC-03**, **AC-04** (Password Change UI) | UI | `client/src/tests/lab-03/ChangePassword.test.tsx` | `UI-PWD-01`: Live updates 5 rule checkboxes, validates mismatch, handles successful submission and redirection. |

---

### 5.2. Server API Test Scenarios (`server/tests/lab-03/auth.api.test.ts`)

```typescript
// Test scenarios planned in server/tests/lab-03/auth.api.test.ts

describe("Auth API Integration Suite (Issue 12)", () => {
  // AUTH-01: Valid Login
  it("AUTH-01: logs in active user and returns session cookie and user profile", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.body.user).toMatchObject({
      email: "sompong.it@kmutt.ac.th",
      role: "REQUESTER",
      mustChangePassword: false,
      isActive: true,
    });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  // AUTH-02: Incorrect Password
  it("AUTH-02: returns 401 with generic error for incorrect password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "WrongPassword!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  // AUTH-03: Inactive User Account (BR-01 Anti-Enumeration)
  it("AUTH-03: returns 401 generic error for inactive user without leaking status", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "prasert.ina@kmutt.ac.th", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  // AUTH-04: Authenticated Me
  it("AUTH-04: retrieves current authenticated user profile via /me", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe("sompong.it@kmutt.ac.th");
  });

  // AUTH-05: Unauthenticated Me
  it("AUTH-05: returns 401 Unauthorized when requesting /me without session", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  // AUTH-06: Logout Flow
  it("AUTH-06: logs out user and invalidates session", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie);

    expect(logoutRes.status).toBe(200);

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookie);

    expect(meRes.status).toBe(401);
  });

  // AUTH-07: Mandatory Password Change Route Interception
  it("AUTH-07: blocks operational route for user with mustChangePassword = true", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "new.requester@kmutt.ac.th", password: "InitialPass123!" });

    const cookie = loginRes.headers["set-cookie"];

    const opRes = await request(app)
      .get("/api/v1/tickets")
      .set("Cookie", cookie);

    expect(opRes.status).toBe(403);
    expect(opRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  // AUTH-08: Successful Password Change
  it("AUTH-08: changes password, updates hash and sets mustChangePassword = false", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "new.requester@kmutt.ac.th", password: "InitialPass123!" });

    const cookie = loginRes.headers["set-cookie"];

    const changeRes = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", cookie)
      .send({
        currentPassword: "InitialPass123!",
        newPassword: "FreshPassword987#",
        confirmPassword: "FreshPassword987#",
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.user.mustChangePassword).toBe(false);

    // Verify login with new password works
    const newLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "new.requester@kmutt.ac.th", password: "FreshPassword987#" });

    expect(newLoginRes.status).toBe(200);
  });

  // AUTH-09: Weak Password Rejection
  it("AUTH-09: rejects new password failing complexity rules with 400", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    const changeRes = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", cookie)
      .send({
        currentPassword: "Password123!",
        newPassword: "short",
        confirmPassword: "short",
      });

    expect(changeRes.status).toBe(400);
    expect(changeRes.body.error.code).toBe("VALIDATION_FAILED");
  });
});
```

---

### 5.3. Client UI Component Test Scenarios

#### 1. `client/src/tests/lab-03/Login.test.tsx`
* **Render Test**: Renders "Sign in to TokTickIT Desk" title, Email input, Password input, and "Sign In" button.
* **Blur Validation Rule**: Entering an invalid email format and blurring the field clears/resets the invalid input without displaying premature red error banners.
* **Submit Validation**: Clicking "Sign In" with empty inputs displays required field feedback.
* **Loading / Spinner State**: While the login API request is in flight, the button displays a spinner and disabled state (`"Signing in..."`).
* **Safe Error Display**: On HTTP 401 response, renders generic alert banner: *"Invalid email or password"*.
* **Successful Login**: On successful response, stores session context and triggers redirection to home route.

#### 2. `client/src/tests/lab-03/ChangePassword.test.tsx`
* **Checklist Feedback**: Renders 5 password complexity rules; as the user types, verifies that satisfying each criterion dynamically turns its checklist item to active/green.
* **Mismatch Validation**: Entering a mismatched confirmation password flags an error on blur or submit: *"Passwords do not match"*.
* **Submit Action**: Submits current and new password; on success, verifies redirection and session update.

---

## 6. Review & Sign-Off Gate

| Gate Checklist Item | Status | Verification Criteria & Evidence |
| :--- | :---: | :--- |
| **No Application Code Pre-Written** | ✅ PASS | Only contract file drafted; no code, migrations, or tests implemented. |
| **Prisma User Model Specified** | ✅ PASS | `User` model specified with `passwordHash`, `role` enum, `mustChangePassword`, and `isActive`. |
| **Migration & FK Preservation** | ✅ PASS | Rename and foreign key repointing strategy documented to preserve existing Lab 2 tickets and attachments. |
| **Comprehensive Seed Requirements** | ✅ PASS | 5 active Requesters, 1 inactive Requester, 3 active Staff, 1 inactive Staff, 2 Admins with pre-hashed credentials. |
| **Anti-Enumeration Protocol (`BR-01`)** | ✅ PASS | Generic HTTP 401 response strictly specified for invalid password, missing user, and inactive account. |
| **Forced Password Change Protocol (`BR-02`)** | ✅ PASS | Middleware rejection with `403 PASSWORD_CHANGE_REQUIRED` and interactive UI checklist specified. |
| **Anti-Spoofing Session Derivation (`BR-03`)** | ✅ PASS | Strict server-side derivation of `requesterId` from session token specified; client headers ignored. |
| **Application Shell Updates Documented** | ✅ PASS | Complete removal of Dev Requester selector and addition of user profile, role badge, and working Logout. |
| **Test Traceability Matrix Completed** | ✅ PASS | All acceptance criteria mapped to `auth.api.test.ts`, `Login.test.tsx`, and `ChangePassword.test.tsx`. |
