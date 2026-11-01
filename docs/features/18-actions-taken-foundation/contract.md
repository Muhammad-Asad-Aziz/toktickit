# Feature 18 Engineering Contract: Actions Taken Data Model, Migration, Seed Data & Backend APIs

**Feature Title**: Actions Taken Data Model, Migration, Seed Data & Backend APIs  
**Branch Name**: `feature/18-actions-taken-foundation` (Issue 18)  
**Base Branch**: `lab4-staging` (incorporating `feature/17-spec-and-tests`)  
**Document Status**: Approved Feature Engineering Contract  
**Author**: TokTickIT Engineering Team  
**Traceability References**:
* [TokTickIT-System-Level-SDS-v1.0.pdf](../../reference/TokTickIT-System-Level-SDS-v1.0.pdf) (§Architecture, §Data Conventions, §Security Invariants)
* [Lab_04_labsheet.pdf](../../reference/Lab_04_labsheet.pdf) (§1, §3, §4.1, §4.2, §5.1, §6.1, §10, §11, §12, §14 Part 1–2)
* [docs/lab-04/specification.md](../../lab-04/specification.md) (`FR-01`, `FR-02`, `FR-05`, `BR-01`, `BR-02`, `BR-03`, `BR-04`, `BR-05`, `BR-06`, `BR-10`, `AC-01` to `AC-06`)
* [docs/lab-04/ui-spec.md](../../lab-04/ui-spec.md) (Actions Taken Wireframes & Zen Green Tokens)
* [docs/lab-04/api-spec.md](../../lab-04/api-spec.md) (§2.1 Create Action Taken, §2.2 List Actions Taken, §2.3 Update Action Taken)
* [docs/lab-04/tests.md](../../lab-04/tests.md) (STS Test Catalog: `ACT-01` through `ACT-08`)
* [docs/lab-04/poc-scope-and-issues.md](../../lab-04/poc-scope-and-issues.md) (Issue 18 Scope & Implementation Plan)
* [AGENTS.md](../../../AGENTS.md) (Developer Work Norms: Strict Closed-World Rule, TDD, Theme Compliance, Blur Validation Rule)

---

## 1. Feature Goal & Scope

### 1.1. Strategic Objectives
Issue 18 implements the foundational data layer and backend REST APIs for the **Actions Taken Subsystem** in TokTickIT Sprint 4 (Lab 4). In previous labs, tickets tracked high-level statuses, single staff ownership, file attachments, public comments, and internal notes. However, complex service desk incidents require collaborative, multi-step investigation, physical hardware repairs, and technical intervention by various IT staff members. 

Key objectives include:
1. **Granular Work Item Tracking**: Establish the parent-child data model linking multiple discrete `ActionTaken` work entries to a parent `Ticket`.
2. **Independent Performer Auditability (`BR-02`, `BR-06`)**: Guarantee that discrete actions can be performed and logged by any active IT Staff member or Administrator independently of the primary Ticket Owner, with the performer identity (`performedById`) strictly auto-derived from the authenticated session (`req.user.id`) and made immutable once created.
3. **Strict Role-Based Access Control (`BR-03`)**: Restrict mutation operations (`POST`, `PUT`) exclusively to `IT_STAFF` and `ADMINISTRATOR` roles, rejecting Requester write attempts with HTTP `403 Forbidden`. Enforce ownership-scoped read-only visibility (`GET`) for Requesters (`ticket.requesterId === req.user.id`).
4. **Conditional Follow-Up Note Enforcement (`BR-05`)**: Enforce server-side validation requiring a non-empty `followUpNote` when `followUpRequired === true`, while clearing/nullifying the note when `followUpRequired === false`.
5. **Non-Destructive Schema Evolution**: Increment the Prisma schema and database with a non-destructive migration that preserves 100% of historical data from Labs 1 through 3.
6. **Idempotent Realistic Seeding**: Populate the database with realistic seed tickets featuring 0 actions, 1 action, and multiple actions performed by different IT staff members, exercising toggled follow-up requirements and attachment cross-references.

### 1.2. In-Scope Deliverables
1. **Prisma Schema Modifications (`server/prisma/schema.prisma`)**:
   - Define `ActionTaken` model with all required attributes, data types, defaults, and foreign keys.
   - Establish reciprocal one-to-many relation on `Ticket` (`actionsTaken ActionTaken[]`).
   - Establish reciprocal one-to-many relation on `User` (`actionsTaken ActionTaken[] @relation("UserActionsTaken")`).
   - Add performance composite and foreign key indexes (`ticketId`, `performedById`, `actionDateTime`).
2. **Non-Destructive Database Migration**:
   - Generate and apply a non-destructive Prisma migration (`actions_taken_subsystem`) preserving existing data across `users`, `categories`, `related_systems`, `tickets`, `attachments`, `ticket_number_sequences`, `public_comments`, and `internal_notes`.
3. **Idempotent Seed Data (`server/prisma/seed.ts`)**:
   - Seed tickets with varying Action Taken counts:
     - Tickets with **0 actions** (e.g. `TKT-2026-00002`, `TKT-2026-00009`, `TKT-2026-00011`) for testing empty states and the resolution gate.
     - Tickets with **1 action** (e.g. `TKT-2026-00004`, `TKT-2026-00005`).
     - Tickets with **multiple actions** performed by distinct IT Staff members (`wichai.it@kmutt.ac.th`, `ekachai.it@kmutt.ac.th`, `nareerat.it@kmutt.ac.th`) on tickets such as `TKT-2026-00001` and `TKT-2026-00003`.
     - Seed entries demonstrating `followUpRequired=true` with detailed `followUpNote`, `followUpRequired=false` with `null`, and cross-referenced `attachmentNotes`.
     - Ensure safe idempotent execution via existence/count checks.
4. **Backend REST API Endpoints**:
   - `POST /api/v1/tickets/:id/actions-taken`: Create an action taken line item (IT Staff/Admin only; session performer auto-population).
   - `GET /api/v1/tickets/:id/actions-taken`: List all actions taken for a ticket sorted by `actionDateTime ASC` (IT Staff/Admin on all tickets; Requester on owned tickets only; safe empty array `[]` when no actions exist).
   - `PUT /api/v1/tickets/:id/actions-taken/:actionId`: Update an existing action taken (IT Staff/Admin only; immutable `performedById`; optional optimistic concurrency check via `versionTimestamp`).
5. **Validation & Authorization Middleware**:
   - Integrated with existing `authenticateUser`, `requirePasswordChanged`, and `requireRole` middleware.
   - Robust input sanitization and boundary checking adhering strictly to `api-spec.md`.
6. **Automated Verification Test Suite**:
   - Comprehensive API integration test suite authored in `server/tests/lab-04/actions-taken.api.test.ts` covering `ACT-01` through `ACT-08` and edge cases.

### 1.3. Explicitly Excluded Scope (Out of Scope for Issue 18)
* **Frontend UI Components**: Rendering the Actions Taken table, creation modal, and toggle forms is deferred to Issue 19 (`feature/19-actions-taken-ui`).
* **Resolution Gate Enforcement on Status Transitions**: Blocking ticket status transitions to `RESOLVED` or `CLOSED` when Actions Taken count is 0 is deferred to Issue 20 (`feature/20-ticket-workflow`).
* **Dashboards & Metric Aggregations**: Computing summary metrics for Requesters, IT Staff, and Admins is deferred to Issue 21 (`feature/21-role-dashboards`).
* **SLA Countdown Clocks & Escalation Timers**: No automated SLA timers, warning alarms, breach notifications, or on-call staff rotation schedules.
* **External Notification Channels**: No outbound email, SMS, LINE messaging, webhook dispatches, or mobile push notifications.
* **Cost Accounting & Labor Timesheet Calculations**: No hourly labor rate calculations, staff timesheet submissions, inventory tracking, or service billing calculations.
* **Direct File Uploads within Actions Taken**: Files remain ticket-level attachments; Actions Taken store string cross-references in `attachmentNotes` pointing to ticket attachments or physical items.
* **Auxiliary Visual Screenshots**: Playwright screenshot generation is strictly an auxiliary visual verification step for developer review (saving screenshot artifacts to `artifacts/lab-04/screenshots/actions-taken/`). Playwright visual checks must never be added to `docs/lab-04/tests.md` or mixed into Jest/Vitest unit/API test specifications.

---

## 2. Prisma Schema Modifications & Migration Strategy

### 2.1. Prisma Schema Specification (`server/prisma/schema.prisma`)

The Prisma schema is modified to add the `ActionTaken` model and reciprocal relations on `Ticket` and `User`:

```prisma
// server/prisma/schema.prisma (Increment for Issue 18)

// ---------------------------------------------------------------------------
// 1. User Model Updates
// ---------------------------------------------------------------------------
model User {
  id                 Int          @id @default(autoincrement())
  name               String
  email              String       @unique
  passwordHash       String       @default("$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/E5O0H6uFvj/4J8O0M/v4e6T9i0yS")
  role               Role         @default(REQUESTER)
  department         String?
  isActive           Boolean      @default(true)
  mustChangePassword Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  // Relational Integrity
  submittedTickets   Ticket[]        @relation("RequesterTickets")
  assignedTickets    Ticket[]        @relation("StaffOwnedTickets")
  removedAttachments Attachment[]    @relation("UserRemovedAttachments")
  publicComments     PublicComment[] @relation("UserPublicComments")
  internalNotes      InternalNote[]  @relation("UserInternalNotes")

  // Issue 18 increment: Actions performed by this user (IT Staff / Administrator)
  actionsTaken       ActionTaken[]   @relation("UserActionsTaken")

  @@map("users")
}

// ---------------------------------------------------------------------------
// 4. Ticket Model Updates
// ---------------------------------------------------------------------------
model Ticket {
  id                  Int           @id @default(autoincrement())
  ticketNumber        String        @unique @db.VarChar(32)
  requesterId         Int
  ownerId             Int?
  categoryId          Int
  relatedSystemId     Int
  summary             String        @db.VarChar(100)
  description         String        @db.Text
  requestedPriority   Priority      @default(MEDIUM)
  itPriority          Priority?     @default(MEDIUM)
  currentStatus       TicketStatus  @default(NEW)
  requesterResolvedAt DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  // Relations
  requester           User          @relation("RequesterTickets", fields: [requesterId], references: [id], onDelete: Restrict)
  owner               User?         @relation("StaffOwnedTickets", fields: [ownerId], references: [id], onDelete: SetNull)
  category            Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  relatedSystem       RelatedSystem @relation(fields: [relatedSystemId], references: [id], onDelete: Restrict)
  attachments         Attachment[]
  publicComments      PublicComment[]
  internalNotes       InternalNote[]

  // Issue 18 increment: Parent-child relationship with discrete actions taken
  actionsTaken        ActionTaken[]

  @@index([requesterId])
  @@index([ownerId])
  @@index([currentStatus])
  @@index([itPriority])
  @@index([createdAt])
  @@map("tickets")
}

// ---------------------------------------------------------------------------
// 9. Action Taken Model (Issue 18 Increment: Granular Work Tracking)
// ---------------------------------------------------------------------------
model ActionTaken {
  id                Int      @id @default(autoincrement())
  ticketId          Int
  actionDateTime    DateTime @default(now())
  actionDescription String   @db.VarChar(1000)
  result            String   @db.VarChar(1000)
  performedById     Int
  followUpRequired  Boolean  @default(false)
  followUpNote      String?  @db.VarChar(1000)
  attachmentNotes   String?  @db.VarChar(500)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relational Integrity
  ticket            Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  performedBy       User     @relation("UserActionsTaken", fields: [performedById], references: [id], onDelete: Restrict)

  @@index([ticketId])
  @@index([performedById])
  @@index([actionDateTime])
  @@index([ticketId, actionDateTime])
  @@map("actions_taken")
}
```

### 2.2. Relational Integrity & Schema Design Justifications
1. **Cascade Deletion on Ticket (`onDelete: Cascade`)**: An `ActionTaken` is an intrinsic child work item of a parent `Ticket`. If a ticket is purged during automated test teardown, its child actions are automatically cleaned up, preventing orphan records.
2. **Restrict Deletion on Performer (`onDelete: Restrict`)**: To preserve an immutable audit trail (`BR-06`), a user record cannot be deleted if they are attributed as the performer of an `ActionTaken`.
3. **Optimized Multi-Index Strategy**:
   - `@@index([ticketId])`: Accelerates child lookups when rendering Ticket Detail or running resolution gate validation.
   - `@@index([performedById])`: Accelerates staff workload aggregations and audit history queries.
   - `@@index([actionDateTime])`: Accelerates chronological sorting (`ORDER BY actionDateTime ASC`) as required by `BR-01`.
   - `@@index([ticketId, actionDateTime])`: Accelerates combined ticket lookup with ascending chronological sort.
4. **Non-Destructive Migration Strategy**:
   - The migration strictly issues `CREATE TABLE "actions_taken"` and foreign key constraints without modifying existing tables or dropping any columns.
   - All historical data across Labs 1 through 3 (`users`, `categories`, `related_systems`, `tickets`, `attachments`, `ticket_number_sequences`, `public_comments`, `internal_notes`) is 100% preserved.
   - Safe rollback path: `DROP TABLE IF EXISTS "actions_taken" CASCADE;`.

---

## 3. Idempotent Seed Data Strategy (`server/prisma/seed.ts`)

### 3.1. Seeding Requirements
The seed script `server/prisma/seed.ts` must be extended to populate representative `ActionTaken` records across existing seed tickets. The seeding strategy must fulfill the following invariants:
1. **Tickets with Zero Actions (0 Actions)**:
   - Specific tickets (e.g. `TKT-2026-00002` projector lamp flickering `NEW`, `TKT-2026-00009` library Ethernet port dead `NEW`, `TKT-2026-00011` printer paper jam `NEW`) must remain with **0 Actions Taken**.
   - Purpose: Validates empty array responses (`[]`), empty state UI rendering, and Resolution Gate blocking (`WRK-01`).
2. **Tickets with Single Action (1 Action)**:
   - Tickets with exactly 1 recorded action:
     - `TKT-2026-00004` (VPN timeout): Action by Wichai IT with `followUpRequired=true` and detailed `followUpNote`.
     - `TKT-2026-00005` (Second monitor): Action by Ekachai IT with `followUpRequired=false` resolving hardware request.
3. **Tickets with Multiple Actions by Different IT Staff Members**:
   - `TKT-2026-00001` (CB2 Wi-Fi disconnects):
     - **Action 1**: Performed by `wichai.it@kmutt.ac.th` (`actionDateTime: "2026-09-03T11:15:00Z"`). Replaced switch patch cord on port 14. `followUpRequired=true`, `followUpNote="Check port drop statistics tomorrow morning after 9:00 AM lectures."`, `attachmentNotes="Cross-referenced with seed-wifi-signal-analysis.pdf"`.
     - **Action 2**: Performed by `ekachai.it@kmutt.ac.th` (`actionDateTime: "2026-09-03T14:30:00Z"`). Checked SNMP telemetry logs. `result="Zero CRC errors over past 3 hours"`. `followUpRequired=false`, `followUpNote=null`.
   - `TKT-2026-00003` (LEB2 portal timeout):
     - **Action 1**: Performed by `nareerat.it@kmutt.ac.th`. Adjusted web gateway firewall rules.
     - **Action 2**: Performed by `wichai.it@kmutt.ac.th`. Verified SSL handshake and student endpoint reachability.
4. **Idempotency Guarantee**:
   - Seed operations must inspect `prisma.actionTaken.count({ where: { ticketId } })` before inserting, ensuring subsequent executions of `npm run seed` do not duplicate action records.

### 3.2. Representative Seed Data Specification Table

| Target Ticket Number | Action Description | Result | Performed By Email | Follow-Up? | Follow-Up Note | Attachment Notes |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| `TKT-2026-00001` | Inspected CB2 3rd floor rack switch. Port 14 link flapping detected. Replaced patch cord. | Port link stabilized at 1Gbps full duplex. Packet loss dropped to 0%. | `wichai.it@kmutt.ac.th` | `true` | Check port drop statistics tomorrow morning after 9:00 AM lectures. | Photo of damaged RJ45 clip referenced in wifi-signal-analysis.pdf. |
| `TKT-2026-00001` | Conducted follow-up telemetry check on switch port 14 via SNMP console. | Zero CRC errors or packet drops over past 3 hours. Signal stable. | `ekachai.it@kmutt.ac.th` | `false` | `null` | `null` |
| `TKT-2026-00003` | Analyzed LEB2 reverse proxy firewall logs. Discovered blocked subnet from student dormitories. | Whitelisted dormitory subnet CIDR 10.24.0.0/16 in gateway security group. | `nareerat.it@kmutt.ac.th` | `true` | Request student test submission and monitor proxy latency during peak hours. | `null` |
| `TKT-2026-00003` | Performed end-to-end SSL handshake test from CB2 dormitory terminal. | HTTPS connection succeeded in 42ms. Homework portal loaded cleanly. | `wichai.it@kmutt.ac.th` | `false` | `null` | `null` |
| `TKT-2026-00004` | Reconfigured Cisco AnyConnect client profile on macOS Sonoma to use DTLS 1.2 tunnel. | VPN established successfully without packet timeouts. | `wichai.it@kmutt.ac.th` | `true` | Verify macOS auto-reconnect behavior after laptop sleep cycle. | `null` |
| `TKT-2026-00005` | Retrieved 24-inch Dell HDMI monitor from inventory (Asset #KMUTT-MON-8812) and installed at faculty desk. | Dual display output working at 1920x1080 @ 60Hz. | `ekachai.it@kmutt.ac.th` | `false` | `null` | Asset delivery form signed and filed. |
| `TKT-2026-00002` | *(None - Ticket has 0 Actions)* | — | — | — | — | — |
| `TKT-2026-00009` | *(None - Ticket has 0 Actions)* | — | — | — | — | — |
| `TKT-2026-00011` | *(None - Ticket has 0 Actions)* | — | — | — | — | — |

---

## 4. Access Control & Authorization Matrix

The Actions Taken subsystem strictly enforces role-based access control and ownership scoping:

| Endpoint | Method | `REQUESTER` | `IT_STAFF` | `ADMINISTRATOR` | Unauthenticated |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/api/v1/tickets/:id/actions-taken` | `POST` | `403 Forbidden` (`FORBIDDEN`) | `201 Created` (auto-derived performer) | `201 Created` (auto-derived performer) | `401 Unauthorized` |
| `/api/v1/tickets/:id/actions-taken` | `GET` | `200 OK` (Owned tickets only)<br/>`403 Forbidden` (Unowned tickets) | `200 OK` (All tickets) | `200 OK` (All tickets) | `401 Unauthorized` |
| `/api/v1/tickets/:id/actions-taken/:actionId` | `PUT` | `403 Forbidden` (`FORBIDDEN`) | `200 OK` (Immutable performer) | `200 OK` (Immutable performer) | `401 Unauthorized` |

### 4.1. Server-Derived Performer Security Policy (`BR-02`, `BR-06`)
* The client request body for `POST` or `PUT` may **not** specify or override `performedById`.
* The server runtime assigns `performedById = req.user.id`.
* Any client attempt to inject `performedById` in the JSON payload must be silently ignored and overwritten by the session user's ID.
* Upon update (`PUT`), `performedById` is strictly immutable and cannot be changed to another user ID.

### 4.2. Ownership Boundary for Requesters (`BR-03`)
* When a user with `role === "REQUESTER"` issues a `GET /api/v1/tickets/:id/actions-taken`, the controller verifies `ticket.requesterId === req.user.id`.
* If the ticket is owned by another user, the server responds with HTTP `403 Forbidden` (`FORBIDDEN`).
* If the ticket does not exist, the server responds with HTTP `404 Not Found` (`TICKET_NOT_FOUND`).
* When an authorized user queries a ticket with 0 actions, the server responds with HTTP `200 OK` and `{ actionsTaken: [] }`.

---

## 5. Validation & Payload Rules

All incoming payloads are rigorously validated before database persistence.

### 5.1. Attribute Validation Constraints Table

| Field Name | Type | Presence | Validation Constraints | Error Message on Failure |
| :--- | :--- | :---: | :--- | :--- |
| `ticketId` | Integer | Path | Required in URL path; positive integer $> 0$. | `"Ticket not found."` (`404`) |
| `actionId` | Integer | Path | Required in URL path for `PUT`; positive integer $> 0$. | `"Action taken not found."` (`404`) |
| `actionDateTime` | ISO 8601 String | Optional | Defaults to `NOW()`. If provided, must parse to a valid date and must satisfy `actionDateTime <= NOW()` (no future timestamps). | `"Action date/time cannot be in the future."` (`400`) |
| `actionDescription` | String | Mandatory | Trimmed length must be between 5 and 1,000 characters inclusive. | `"Action description must be between 5 and 1000 characters."` (`400`) |
| `result` | String | Mandatory | Trimmed length must be between 2 and 1,000 characters inclusive. | `"Result must be between 2 and 1000 characters."` (`400`) |
| `followUpRequired` | Boolean | Mandatory | Must be boolean (`true` or `false`). | `"Follow-up required must be a boolean."` (`400`) |
| `followUpNote` | String | Conditional | - If `followUpRequired === true`: Mandatory; trimmed length between 3 and 1,000 characters.<br/>- If `followUpRequired === false`: Server sets to `null`. | `"Follow-up note is required when follow-up is needed (3-1000 characters)."` (`400`) |
| `attachmentNotes` | String | Optional | If provided, trimmed length must be $\le 500$ characters. Nullable. | `"Attachment notes cannot exceed 500 characters."` (`400`) |
| `versionTimestamp` | ISO 8601 String | Optional (`PUT`) | If provided, must match database `actionTaken.updatedAt`. If mismatched, returns `409 Conflict`. | `"The action taken record was modified by another user."` (`409`) |

---

## 6. REST API Endpoint Specifications

### 6.1. Create Action Taken
`POST /api/v1/tickets/:id/actions-taken`

Creates a new Action Taken line item under the specified ticket.

* **Authorization**: `IT_STAFF`, `ADMINISTRATOR`. (Requesters return `403 Forbidden`).
* **Path Parameters**:
  - `id` (integer, required): Target Ticket ID.
* **Request Headers**:
  - `Content-Type: application/json`
  - `Cookie: toktickit_session=<token>` or `Authorization: Bearer <token>`
* **Request Body**:
```json
{
  "actionDateTime": "2026-10-29T09:30:00.000Z",
  "actionDescription": "Inspected Building 2 Cisco switch. Found port 14 flapping. Replaced patch cord.",
  "result": "Port link stabilized at 1Gbps full duplex. Packet loss reduced to 0%.",
  "followUpRequired": true,
  "followUpNote": "Check port drop statistics tomorrow morning after 9:00 AM lectures.",
  "attachmentNotes": "Photo of damaged RJ45 clip uploaded to attachments (switch_patch_bad.jpg)."
}
```

* **Success Response `201 Created`**:
```json
{
  "actionTaken": {
    "id": 1,
    "ticketId": 14,
    "actionDateTime": "2026-10-29T09:30:00.000Z",
    "actionDescription": "Inspected Building 2 Cisco switch. Found port 14 flapping. Replaced patch cord.",
    "result": "Port link stabilized at 1Gbps full duplex. Packet loss reduced to 0%.",
    "followUpRequired": true,
    "followUpNote": "Check port drop statistics tomorrow morning after 9:00 AM lectures.",
    "attachmentNotes": "Photo of damaged RJ45 clip uploaded to attachments (switch_patch_bad.jpg).",
    "performedBy": {
      "id": 7,
      "name": "Wichai IT",
      "email": "wichai.it@kmutt.ac.th",
      "role": "IT_STAFF"
    },
    "createdAt": "2026-10-29T09:35:12.000Z",
    "updatedAt": "2026-10-29T09:35:12.000Z"
  }
}
```

* **Error Responses**:
  - `400 Bad Request` (`VALIDATION_FAILED`): Schema violations or missing mandatory conditional follow-up note.
  - `401 Unauthorized` (`UNAUTHENTICATED`): User not authenticated.
  - `403 Forbidden` (`FORBIDDEN`): User has role `REQUESTER`.
  - `404 Not Found` (`TICKET_NOT_FOUND`): Ticket does not exist.

---

### 6.2. List Actions Taken for Ticket
`GET /api/v1/tickets/:id/actions-taken`

Retrieves all Action Taken entries associated with a ticket, sorted chronologically ascending by `actionDateTime`.

* **Authorization**:
  - `IT_STAFF`, `ADMINISTRATOR`: Permitted on all tickets.
  - `REQUESTER`: Permitted **only** if `ticket.requesterId === req.user.id`.
* **Path Parameters**:
  - `id` (integer, required): Target Ticket ID.
* **Success Response `200 OK` (Tickets with Actions)**:
```json
{
  "actionsTaken": [
    {
      "id": 1,
      "ticketId": 14,
      "actionDateTime": "2026-10-29T09:30:00.000Z",
      "actionDescription": "Inspected Building 2 Cisco switch. Found port 14 flapping. Replaced patch cord.",
      "result": "Port link stabilized at 1Gbps full duplex. Packet loss reduced to 0%.",
      "followUpRequired": true,
      "followUpNote": "Check port drop statistics tomorrow morning after 9:00 AM lectures.",
      "attachmentNotes": "Photo of damaged RJ45 clip uploaded to attachments (switch_patch_bad.jpg).",
      "performedBy": {
        "id": 7,
        "name": "Wichai IT",
        "email": "wichai.it@kmutt.ac.th",
        "role": "IT_STAFF"
      },
      "createdAt": "2026-10-29T09:35:12.000Z",
      "updatedAt": "2026-10-29T09:35:12.000Z"
    },
    {
      "id": 2,
      "ticketId": 14,
      "actionDateTime": "2026-10-29T10:15:00.000Z",
      "actionDescription": "Conducted follow-up telemetry check on switch port 14 via SNMP console.",
      "result": "Zero CRC errors or packet drops over past 45 minutes.",
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": null,
      "performedBy": {
        "id": 8,
        "name": "Ekachai IT",
        "email": "ekachai.it@kmutt.ac.th",
        "role": "IT_STAFF"
      },
      "createdAt": "2026-10-29T10:18:00.000Z",
      "updatedAt": "2026-10-29T10:18:00.000Z"
    }
  ]
}
```

* **Success Response `200 OK` (Legacy Tickets with Zero Actions)**:
```json
{
  "actionsTaken": []
}
```

* **Error Responses**:
  - `401 Unauthorized` (`UNAUTHENTICATED`): User not authenticated.
  - `403 Forbidden` (`FORBIDDEN`): Requester querying unowned ticket.
  - `404 Not Found` (`TICKET_NOT_FOUND`): Ticket does not exist.

---

### 6.3. Update Action Taken
`PUT /api/v1/tickets/:id/actions-taken/:actionId`

Updates an existing Action Taken record. Note that the original `performedById` is permanent and cannot be modified.

* **Authorization**: `IT_STAFF`, `ADMINISTRATOR`. (Requesters return `403 Forbidden`).
* **Path Parameters**:
  - `id` (integer, required): Target Ticket ID.
  - `actionId` (integer, required): Target Action Taken ID.
* **Request Body**:
```json
{
  "actionDateTime": "2026-10-29T09:30:00.000Z",
  "actionDescription": "Inspected Building 2 Cisco switch. Replaced patch cord and cleaned SFP optic.",
  "result": "Port link stabilized at 1Gbps full duplex. Packet loss reduced to 0%.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Updated photo uploaded to attachments.",
  "versionTimestamp": "2026-10-29T09:35:12.000Z"
}
```

* **Success Response `200 OK`**:
```json
{
  "actionTaken": {
    "id": 1,
    "ticketId": 14,
    "actionDateTime": "2026-10-29T09:30:00.000Z",
    "actionDescription": "Inspected Building 2 Cisco switch. Replaced patch cord and cleaned SFP optic.",
    "result": "Port link stabilized at 1Gbps full duplex. Packet loss reduced to 0%.",
    "followUpRequired": false,
    "followUpNote": null,
    "attachmentNotes": "Updated photo uploaded to attachments.",
    "performedBy": {
      "id": 7,
      "name": "Wichai IT",
      "email": "wichai.it@kmutt.ac.th",
      "role": "IT_STAFF"
    },
    "createdAt": "2026-10-29T09:35:12.000Z",
    "updatedAt": "2026-10-29T10:45:00.000Z"
  }
}
```

* **Error Responses**:
  - `400 Bad Request` (`VALIDATION_FAILED`): Schema violations or missing mandatory conditional follow-up note.
  - `401 Unauthorized` (`UNAUTHENTICATED`): Not authenticated.
  - `403 Forbidden` (`FORBIDDEN`): User has role `REQUESTER`.
  - `404 Not Found` (`NOT_FOUND`): Action Taken or Ticket does not exist.
  - `409 Conflict` (`STALE_RECORD_CONFLICT`): `versionTimestamp` does not match server `updatedAt`.

---

## 7. Software Test Specification (STS) Mapping

The automated verification suite for Issue 18 is mapped to `server/tests/lab-04/actions-taken.api.test.ts`.

### 7.1. Test Catalog Mapping Table

| Test ID | Method & Route | Mapped Requirement | Scenario & Assertion | Expected HTTP Status |
| :--- | :--- | :--- | :--- | :---: |
| **ACT-01** | `POST /api/v1/tickets/:id/actions-taken` | `AC-01`, `FR-01`, `BR-04` | IT Staff creates valid Action Taken. Response contains full DTO with auto-populated performer details. | `201 Created` |
| **ACT-02** | `POST /api/v1/tickets/:id/actions-taken` | `AC-02`, `BR-02`, `BR-06` | Performer ID is auto-derived from session (`req.user.id`). Payload containing spoofed `performedById: 99` is ignored; action is attributed to authenticated staff. | `201 Created` |
| **ACT-03** | `POST /api/v1/tickets/:id/actions-taken` | `AC-03`, `BR-05` | `followUpRequired = true` submitted with missing or blank `followUpNote`. Rejects with error envelope. | `400 Bad Request` |
| **ACT-04** | `POST /api/v1/tickets/:id/actions-taken` | `AC-03`, `BR-05` | `followUpRequired = true` submitted with valid `followUpNote`. Action persisted successfully. | `201 Created` |
| **ACT-05** | `PUT /api/v1/tickets/:id/actions-taken/:actionId` | `AC-04`, `BR-04`, `BR-06` | Staff updates description and result. Original `performedById` remains unchanged and immutable. | `200 OK` |
| **ACT-06** | `GET /api/v1/tickets/:id/actions-taken` | `AC-05`, `BR-03` | Requester retrieves Actions Taken for owned ticket (`ticket.requesterId === req.user.id`). | `200 OK` |
| **ACT-07** | `POST /api/v1/tickets/:id/actions-taken` | `AC-06`, `BR-03` | Requester attempts to create Action Taken. Rejected with forbidden error. | `403 Forbidden` |
| **ACT-08** | `PUT /api/v1/tickets/:id/actions-taken/:actionId` | `AC-06`, `BR-03` | Requester attempts to update Action Taken. Rejected with forbidden error. | `403 Forbidden` |
| **ACT-09** | `GET /api/v1/tickets/:id/actions-taken` | `AC-18.4`, `BR-01` | IT Staff or owned Requester queries legacy ticket with zero actions. Safely returns empty array `{ actionsTaken: [] }`. | `200 OK` |
| **ACT-10** | `GET /api/v1/tickets/:id/actions-taken` | `AC-18.5`, `BR-03` | Requester queries ticket owned by another user. Blocked with forbidden error. | `403 Forbidden` |
| **ACT-11** | `PUT /api/v1/tickets/:id/actions-taken/:actionId` | `BR-10` | Staff submits update with stale `versionTimestamp`. Rejection prevents overwrite. | `409 Conflict` |

### 7.2. Critical Rule for Playwright Visual Verification
> [!IMPORTANT]
> Playwright screenshot generation is strictly an auxiliary visual verification step for developer review (saving screenshot artifacts to `artifacts/lab-04/screenshots/actions-taken/`). Do NOT add, alter, or mix Playwright visual checks into `docs/lab-04/tests.md` or existing STS/Jest/Vitest unit test specifications.

---

## 8. Acceptance Criteria (AC-18.1 to AC-18.5)

### AC-18.1: Successful Action Taken Creation by IT Staff with Auto-Attributed Performer
* **Given** an authenticated user with role `IT_STAFF` or `ADMINISTRATOR` (e.g. `wichai.it@kmutt.ac.th`, ID 7),
* **When** they submit a `POST /api/v1/tickets/:id/actions-taken` with valid `actionDescription` ("Replaced blown fuse in power strip"), `result` ("Power restored to workstations"), `followUpRequired = false`, and optional `attachmentNotes`,
* **Then** the server responds with HTTP `201 Created`,
* **And** the returned `actionTaken` object contains the generated `id`, the target `ticketId`, timestamps, and `performedBy` containing `{ id: 7, name: "Wichai IT", email: "wichai.it@kmutt.ac.th", role: "IT_STAFF" }`, even if the request body attempted to specify a different performer ID.

### AC-18.2: Requester Write Prevention
* **Given** an authenticated user with role `REQUESTER`,
* **When** they attempt to submit either:
  - `POST /api/v1/tickets/:id/actions-taken` to log a new action, or
  - `PUT /api/v1/tickets/:id/actions-taken/:actionId` to edit an existing action,
* **Then** the backend rejects the request immediately with HTTP `403 Forbidden`,
* **And** the response returns standard error code `FORBIDDEN` without modifying any database records.

### AC-18.3: Conditional Follow-Up Note Validation
* **Given** an authenticated IT Staff member creating or updating an Action Taken,
* **When** they submit a payload with `followUpRequired = true` but omit `followUpNote` or provide an empty/whitespace string,
* **Then** the backend rejects the request with HTTP `400 Bad Request`,
* **And** the response returns error code `VALIDATION_FAILED` citing `followUpNote`,
* **When** they re-submit with `followUpRequired = true` and `followUpNote = "Inspect thermal sensor reading after 24 hours"`,
* **Then** the request succeeds with HTTP `201 Created` (or `200 OK`) and the follow-up note is persisted,
* **When** they submit with `followUpRequired = false`,
* **Then** any supplied `followUpNote` is safely cleared to `null` in the database.

### AC-18.4: Safe Empty Array Handling for Zero-Action Tickets
* **Given** an existing or legacy ticket that has zero recorded Action Taken entries (e.g. `TKT-2026-00002`),
* **When** an authorized IT Staff member or the owning Requester requests `GET /api/v1/tickets/:id/actions-taken`,
* **Then** the server returns HTTP `200 OK`,
* **And** the JSON response body contains `{ "actionsTaken": [] }`, avoiding null pointer errors or uncaught exceptions.

### AC-18.5: Requester Ownership Isolation on Read
* **Given** an authenticated user with role `REQUESTER` (e.g. `kittisak.stu@kmutt.ac.th`),
* **When** they request `GET /api/v1/tickets/:id/actions-taken` for a ticket where `ticket.requesterId !== req.user.id`,
* **Then** the backend rejects the request with HTTP `403 Forbidden`,
* **And** the response contains standard error code `FORBIDDEN`, preventing unauthorized disclosure of operational details.

---

## 9. Implementation Checklist & Next Steps

When implementation is approved to begin, the following execution order must be followed:
- [ ] **Step 1: Prisma Schema Increment**: Update `server/prisma/schema.prisma` with `ActionTaken` model, relations on `Ticket` and `User`, and composite indexes.
- [ ] **Step 2: Non-Destructive Database Migration**: Execute `npx prisma migrate dev --name actions_taken_subsystem` (or SQL script) ensuring legacy data remains intact.
- [ ] **Step 3: Idempotent Seed Data**: Update `server/prisma/seed.ts` with representative actions across 0-action, 1-action, and multi-action tickets.
- [ ] **Step 4: Backend Routes & Controller**: Implement `POST`, `GET`, and `PUT` under `/api/v1/tickets/:id/actions-taken` with auth and validation in `server/src/routes/tickets.ts` (or dedicated router).
- [ ] **Step 5: Automated API Verification**: Author and execute `server/tests/lab-04/actions-taken.api.test.ts` to prove 100% pass across `ACT-01` through `ACT-11`.

