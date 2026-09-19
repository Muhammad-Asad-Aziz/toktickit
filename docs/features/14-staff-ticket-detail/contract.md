# Feature 14 Engineering Contract: IT Staff Ticket Detail, Operational Controls, Comments & Notes

**Feature Title**: IT Staff Ticket Detail, Operational Controls, Comments & Notes  
**Branch Name**: `feature/14-staff-ticket-detail` (Issue 14)  
**Base Branch**: `lab3-staging`  
**Document Status**: Approved Feature Baseline  
**Author**: TokTickIT Engineering Team  
**Traceability References**:
* [TokTickIT-System-Level-SDS-v1.0.pdf](../../reference/TokTickIT-System-Level-SDS-v1.0.pdf) (§Architecture, §Data Conventions, §Security Invariants)
* [Lab_3_sheet.pdf](../../reference/Lab_3_sheet.pdf) (§1, §3, §4.3, §4.4, §4.5, §4.6, §6, §7, §8.4, §14 Part 7)
* [docs/lab-03/specification.md](../../lab-03/specification.md) (`FR-04`, `FR-05`, `BR-04`, `BR-05`, `BR-08`, `AC-09`, `AC-10`, `AC-11`, `AC-12`, `AC-13`, `AC-14.1` to `AC-14.4`)
* [docs/lab-03/ui-spec.md](../../lab-03/ui-spec.md) (Zen Green Tokens, Typography, Badges, Screen 4: Staff Ticket Detail, Screen 5: Requester Ticket Detail Update, Internal Note Amber Tokens, Responsive Breakpoints)
* [docs/lab-03/api-spec.md](../../lab-03/api-spec.md) (§3.3 Ticket Detail, §3.4 Resolve Request, §4.2 Assignment, §4.3 IT Priority, §4.4 Status Transition, §5.1 Public Comments, §5.2 Internal Notes)
* [docs/lab-03/tests.md](../../lab-03/tests.md) (STS Test Catalog `TKTOP-01` to `TKTOP-06`, `COMM-01`, `COMM-02`, `NOTE-01` to `NOTE-03`, `UI-DET-01`, `UI-DET-02`)
* [docs/lab-03/poc-scope-and-issues.md](../../lab-03/poc-scope-and-issues.md) (Issue 14 Decomposition)
* [AGENTS.md](../../../AGENTS.md) (Work Norms: Closed-World Rule, TDD, Theme Compliance, Blur Validation Rule)

---

## 1. Feature Scope & Objectives

### 1.1. Strategic Objectives
Issue 14 delivers the operational core of TokTickIT for IT Staff resolvers, Administrators, and Requesters. Building upon the authentication and shell infrastructure (Issue 12) and the shared ticket queue (Issue 13), this feature empowers service desk personnel to inspect detailed ticket context, execute operational management actions, and collaborate securely across dual public and confidential communication threads.

Key objectives include:
1. **Operational Ticket Management**: Provide authorized IT Staff and Administrators with full operational controls on any ticket:
   - Claiming unassigned tickets in 1-click or reassigning tickets to active staff members.
   - Adjusting IT Priority independently of the Requester's initial requested priority.
   - Advancing tickets along a strictly governed, state-machine-driven status transition matrix.
2. **Dual-Thread Collaboration Architecture**:
   - **Public Comments**: An append-only shared thread visible to the owning Requester, IT Staff, and Administrators for bidirectional communication.
   - **Internal Notes**: A strictly role-isolated, confidential append-only thread accessible solely to IT Staff and Administrators for private diagnostics, vendor discussions, and handover logs.
3. **Information Barrier & Leak Prevention (`BR-04`)**:
   - Guarantee that Internal Notes are strictly stripped from responses to Requesters at the database query and API boundary (`GET /api/v1/tickets/:id`).
   - Enforce that any attempt by a Requester to post an internal note (`POST /api/v1/tickets/:id/notes`) is blocked with HTTP `403 Forbidden` without disclosing internal metadata.
   - Enforce unmistakable visual differentiation in the UI (amber styling, warning borders, lock icons, confidentiality banners) so resolvers never mistake internal notes for public comments.
4. **Requester Problem Resolution Indication (`BR-05`)**:
   - Provide authenticated Requesters with a dedicated "Problem Appears Resolved" action on active owned tickets.
   - Record the timestamp (`requesterResolvedAt = NOW()`) to notify staff that the user's issue has cleared, without granting Requesters formal authority to close or transition ticket statuses.
5. **Responsive Zen Green Frontend**:
   - Construct the dedicated IT Staff Ticket Detail screen and update the Requester Ticket Detail screen conforming to KMUTT IT Service Desk "Zen Green" design tokens, supporting rich loading skeletons, responsive column stacking, and zero horizontal scroll on mobile viewports (< 768px).

### 1.2. In-Scope Deliverables
1. **Database Schema Increment (`server/prisma/schema.prisma`)**:
   - Define `PublicComment` model (`id`, `ticketId`, `authorId`, `content`, `createdAt`).
   - Define `InternalNote` model (`id`, `ticketId`, `authorId`, `content`, `createdAt`).
   - Update relations in `Ticket` and `User` models to reference both models.
   - Strictly enforce append-only lifecycle with database cascading rules.
2. **Database Migration & Seed Increment (`server/prisma/seed.ts`)**:
   - Migration `staff_ticket_detail_comments_notes_schema_increment` preserving all existing users, categories, tickets, and attachments.
   - Seed representative public comments and internal notes across tickets in various statuses.
3. **Backend REST APIs**:
   - `GET /api/v1/tickets/:id`: Role-filtered ticket detail endpoint. IT Staff/Admin receive full details including internal notes; Requesters receive owned ticket details with internal notes strictly omitted (`BR-04`).
   - `PATCH /api/v1/staff/tickets/:id/assignment`: Reassign owner, claim ticket, or unassign (IT Staff / Admin only).
   - `PATCH /api/v1/staff/tickets/:id/priority`: Update `itPriority` (IT Staff / Admin only).
   - `PATCH /api/v1/staff/tickets/:id/status`: Enforce permitted status transitions per state machine matrix (IT Staff / Admin only).
   - `POST /api/v1/tickets/:id/resolve-request`: Record Requester resolution indication (`BR-05`).
   - `POST /api/v1/tickets/:id/comments`: Append Public Comment (owned Requester, IT Staff, Admin).
   - `POST /api/v1/tickets/:id/notes`: Append Internal Note (IT Staff and Admin only; `403 Forbidden` for Requester).
4. **Client API Methods (`client/src/api.ts`)**:
   - `fetchTicketDetail(id: number)`: Retrieves ticket detail according to current user role.
   - `assignTicketOwner(id: number, ownerId: number | null)`: Updates ticket ownership.
   - `updateTicketPriority(id: number, itPriority: string)`: Updates IT priority.
   - `transitionTicketStatus(id: number, status: string)`: Updates ticket status.
   - `indicateProblemResolved(id: number)`: Records requester resolution indication.
   - `postPublicComment(id: number, content: string)`: Posts public comment.
   - `postInternalNote(id: number, content: string)`: Posts internal note.
5. **Frontend Components & Views**:
   - Dedicated `StaffTicketDetail.tsx` component mounted for `IT_STAFF` and `ADMINISTRATOR` roles.
   - Updated `RequesterTicketDetail.tsx` component with public comments thread, post form, and "Problem Appears Resolved" banner.
   - Distinct amber container styling (`var(--zen-note-bg)`, `2px solid #F59E0B`), lock icons, and confidentiality headers for Internal Notes.
6. **Automated Verification**:
   - API integration suites in `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `comments-notes.api.test.ts`, and `authorization.api.test.ts`.
   - UI component suite in `client/src/tests/lab-03/StaffTicketDetail.test.tsx`.

### 1.3. Explicitly Excluded Scope (Strictly Out of Scope per Issue 14)
* **Actions Taken by IT Staff**: Formal "Actions Taken" records and checklists are explicitly deferred to Lab 4 (`Lab_3_sheet.pdf` §4.3, §14 Part 7).
* **Blocking Ticket Resolution**: Blocking status transitions to `RESOLVED` or `CLOSED` due to missing "Actions Taken" is deferred to Lab 4.
* **Editing or Deleting Comments/Notes**: Both Public Comments and Internal Notes are strictly append-only in Lab 3 (`BR-08`). No edit or delete endpoints/UI actions will be built.
* **Email / Webhook Notifications**: No outbound emails, push alerts, or external notification hooks.
* **SLA Timers & Escalation Rules**: No automated SLA countdown clocks or automated escalation triggers.
* **File Attachments in Comments**: Attachments remain scoped to the ticket level (Lab 2 baseline); attaching files directly inside individual comment or note entries is out of scope.

---

## 2. Database Modeling Increment

### 2.1. Prisma Schema Specification (`server/prisma/schema.prisma`)

The Prisma schema is extended with `PublicComment` and `InternalNote` models, and the `Ticket` and `User` models are updated with corresponding relational fields:

```prisma
// server/prisma/schema.prisma (Increment for Issue 14)

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
  submittedTickets   Ticket[]     @relation("RequesterTickets")
  assignedTickets    Ticket[]     @relation("StaffOwnedTickets")
  removedAttachments Attachment[] @relation("UserRemovedAttachments")
  
  // Issue 14 Relational Increments
  publicComments     PublicComment[] @relation("UserPublicComments")
  internalNotes      InternalNote[]  @relation("UserInternalNotes")

  @@map("users")
}

// ---------------------------------------------------------------------------
// 4. Ticket Model Updates
// ---------------------------------------------------------------------------
model Ticket {
  id                  Int           @id @default(autoincrement())
  ticketNumber        String        @unique @db.VarChar(32) // Format: TKT-YYYY-NNNNN
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
  
  // Issue 14 Relational Increments
  publicComments      PublicComment[]
  internalNotes       InternalNote[]

  @@index([requesterId])
  @@index([ownerId])
  @@index([currentStatus])
  @@index([itPriority])
  @@index([createdAt])
  @@map("tickets")
}

// ---------------------------------------------------------------------------
// 7. Public Comment Model (Shared Bidirectional Thread)
// ---------------------------------------------------------------------------
model PublicComment {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  authorId  Int
  content   String   @db.VarChar(2000) // Min 1, max 2000 chars after trimming (BR-08)
  createdAt DateTime @default(now())

  // Relational Integrity
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation("UserPublicComments", fields: [authorId], references: [id], onDelete: Restrict)

  @@index([ticketId])
  @@index([authorId])
  @@map("public_comments")
}

// ---------------------------------------------------------------------------
// 8. Internal Note Model (Confidential Staff-Only Thread)
// ---------------------------------------------------------------------------
model InternalNote {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  authorId  Int
  content   String   @db.VarChar(2000) // Min 1, max 2000 chars after trimming (BR-08)
  createdAt DateTime @default(now())

  // Relational Integrity
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation("UserInternalNotes", fields: [authorId], references: [id], onDelete: Restrict)

  @@index([ticketId])
  @@index([authorId])
  @@map("internal_notes")
}
```

### 2.2. Relational Integrity & Migration Strategy
1. **Migration Execution**:
   - Generated via Prisma: `npx prisma migrate dev --name staff_ticket_detail_comments_notes_schema_increment`
2. **Referential Constraints**:
   - `ticketId` references `tickets(id)` with `ON DELETE CASCADE`. If a ticket is purged, its public comments and internal notes are cleaned up automatically.
   - `authorId` references `users(id)` with `ON DELETE RESTRICT`. A user who has authored public comments or internal notes cannot be deleted from the database, preserving audit history integrity.
3. **Field Validations & Storage Constraints**:
   - `content`: `@db.VarChar(2000)`. Application logic validates `1 <= content.trim().length <= 2000`. Empty strings or whitespace-only inputs are rejected with `400 Bad Request`.
   - `createdAt`: Populated automatically via `@default(now())` on insert; immutable thereafter.
4. **Append-Only Enforcement (`BR-08`)**:
   - Prisma schema deliberately omits `updatedAt` for both `PublicComment` and `InternalNote`.
   - No `UPDATE` or `DELETE` API routes or Prisma mutations will exist for either model.

### 2.3. Idempotent Seed Data Specification (`server/prisma/seed.ts`)
The seed script will seed realistic comments and notes to support comprehensive verification:

```typescript
// Seed increment for Issue 14 in server/prisma/seed.ts

// 1. Seed Public Comments for TKT-2026-00001 (Wi-Fi disconnects)
await prisma.publicComment.createMany({
  data: [
    {
      ticketId: ticket1.id,
      authorId: sompongUser.id, // REQUESTER
      content: "The Wi-Fi dropped again during my 10 AM lecture in CB2 3rd floor.",
      createdAt: new Date("2026-09-03T11:00:00.000Z"),
    },
    {
      ticketId: ticket1.id,
      authorId: wichaiStaff.id, // IT_STAFF
      content: "Access point CB2-AP-04 has been rebooted. Please check if signal stabilizes.",
      createdAt: new Date("2026-09-03T13:30:00.000Z"),
    },
  ],
  skipDuplicates: true,
});

// 2. Seed Internal Notes for TKT-2026-00001 (Confidential Staff-Only)
await prisma.internalNote.createMany({
  data: [
    {
      ticketId: ticket1.id,
      authorId: wichaiStaff.id, // IT_STAFF
      content: "Network switch firmware on 3rd floor rack needs patch. Scheduled maintenance window Friday 10 PM.",
      createdAt: new Date("2026-09-03T13:15:00.000Z"),
    },
    {
      ticketId: ticket1.id,
      authorId: adminUser.id, // ADMINISTRATOR
      content: "Vendor TAC case #98432 opened with Cisco for transceiver replacements.",
      createdAt: new Date("2026-09-03T14:00:00.000Z"),
    },
  ],
  skipDuplicates: true,
});
```

---

## 3. REST API & Authorization Protocols

### 3.1. Middleware Chain & Authentication Protocols
Every endpoint in this feature relies on the unified authentication and authorization pipeline:
1. `authenticateUser`: Extracts and verifies JWT bearer token or session cookie `toktickit_session`. Attaches authenticated user entity to `req.user`.
2. `requireAuth`: Guarantees user presence (`401 UNAUTHENTICATED`).
3. `requirePasswordChanged`: Enforces mandatory first-login password change (`403 PASSWORD_CHANGE_REQUIRED`).
4. `requireRole(...roles)`: Enforces role permissions (`403 FORBIDDEN`).

### 3.2. Endpoint Contracts

#### 1. Retrieve Ticket Detail
`GET /api/v1/tickets/:id`

* **Access Control**:
  - **Requester**: Allowed **only** if `ticket.requesterId === req.user.id` (`BR-03`). If the ticket belongs to another user, returns `404 Not Found` (or generic `403 Forbidden`) to avoid existence leaks.
  - **IT Staff / Administrator**: Permitted to view any ticket across the system.
* **Response Filtering (`BR-04`)**:
  - When viewed by **IT Staff** or **Administrator**: Payload includes both `publicComments` and `internalNotes`.
  - When viewed by **Requester**: Payload includes `publicComments`. The `internalNotes` field is **strictly stripped / undefined** at the query/DTO level.
* **Success Response `200 OK` (IT Staff / Admin View)**:
```json
{
  "ticket": {
    "id": 1,
    "ticketNumber": "TKT-2026-00001",
    "summary": "Wi-Fi disconnects frequently in CB2 3rd floor",
    "description": "Wi-Fi signals disconnect repeatedly when connecting in CB2 3rd floor classrooms.",
    "requestedPriority": "HIGH",
    "itPriority": "URGENT",
    "currentStatus": "OPEN",
    "requesterResolvedAt": null,
    "createdAt": "2026-09-03T10:14:00.000Z",
    "updatedAt": "2026-09-03T11:00:00.000Z",
    "requester": {
      "id": 1,
      "name": "Sompong IT",
      "email": "sompong.it@kmutt.ac.th",
      "department": "Computer Engineering"
    },
    "owner": {
      "id": 6,
      "name": "Wichai IT",
      "email": "wichai.it@kmutt.ac.th"
    },
    "category": {
      "id": 1,
      "name": "Network"
    },
    "relatedSystem": {
      "id": 2,
      "name": "Campus Wi-Fi"
    },
    "attachments": [
      {
        "id": 12,
        "originalFilename": "wifi_error.png",
        "fileSize": 204850,
        "mimeType": "image/png",
        "createdAt": "2026-09-03T10:15:00.000Z"
      }
    ],
    "publicComments": [
      {
        "id": 1,
        "content": "The Wi-Fi dropped again during my 10 AM lecture.",
        "author": { "id": 1, "name": "Sompong IT", "role": "REQUESTER" },
        "createdAt": "2026-09-03T11:00:00.000Z"
      },
      {
        "id": 2,
        "content": "Access point CB2-AP-04 has been rebooted.",
        "author": { "id": 6, "name": "Wichai IT", "role": "IT_STAFF" },
        "createdAt": "2026-09-03T13:30:00.000Z"
      }
    ],
    "internalNotes": [
      {
        "id": 1,
        "content": "Network switch firmware on 3rd floor rack needs patch.",
        "author": { "id": 6, "name": "Wichai IT", "role": "IT_STAFF" },
        "createdAt": "2026-09-03T13:15:00.000Z"
      }
    ]
  }
}
```
* **Success Response `200 OK` (Requester View)**:
  - Exact same structure as above, but `"internalNotes"` is completely absent from the JSON object.

---

#### 2. Claim / Assign Ticket Ownership
`PATCH /api/v1/staff/tickets/:id/assignment`

* **Access Control**: Authenticated `IT_STAFF` or `ADMINISTRATOR` only. Requesters receive `403 Forbidden`.
* **Request Body**:
```json
{
  "ownerId": 6
}
```
*(To unassign ticket, send `"ownerId": null`)*.
* **Validation Rules**:
  - If `ownerId` is provided (not null): Must belong to an active user (`isActive === true`) with role `IT_STAFF` or `ADMINISTRATOR`. Assigning to an inactive user or a `REQUESTER` returns `400 Bad Request` (`INVALID_ASSIGNEE`).
  - Ticket ID must exist; returns `404 Not Found` if missing.
* **Success Response `200 OK`**:
```json
{
  "message": "Ownership updated successfully.",
  "owner": {
    "id": 6,
    "name": "Wichai IT",
    "email": "wichai.it@kmutt.ac.th"
  }
}
```

---

#### 3. Update IT Priority
`PATCH /api/v1/staff/tickets/:id/priority`

* **Access Control**: Authenticated `IT_STAFF` or `ADMINISTRATOR` only. Requesters receive `403 Forbidden`.
* **Request Body**:
```json
{
  "itPriority": "URGENT"
}
```
* **Validation Rules**:
  - `itPriority`: Required, must be one of `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Invalid values return `400 Bad Request` (`VALIDATION_FAILED`).
* **Success Response `200 OK`**:
```json
{
  "message": "IT Priority updated.",
  "itPriority": "URGENT"
}
```

---

#### 4. Transition Ticket Status
`PATCH /api/v1/staff/tickets/:id/status`

* **Access Control**: Authenticated `IT_STAFF` or `ADMINISTRATOR` only. Requesters receive `403 Forbidden`.
* **Request Body**:
```json
{
  "status": "IN_PROGRESS"
}
```
* **Status Transition Matrix & Validations**:
  Transitions must adhere strictly to the allowed targets based on current status:

| Current Status | Allowed Next Statuses | Validation / Business Rules |
| :--- | :--- | :--- |
| `NEW` | `OPEN`, `CANCELLED` | Manual opening or cancellation. |
| `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED` | Investigation begins or clarification needed. |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | Resolving marks technical fix verified. |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED` | Resumed when user provides response. |
| `RESOLVED` | `CLOSED`, `REOPENED` | Terminal closure or issue recurred. |
| `CLOSED` | `REOPENED` | Reopening closed ticket. |
| `REOPENED` | `IN_PROGRESS`, `CANCELLED` | Work resumed on recurring issue. |
| `CANCELLED` | *None (Terminal)* | Terminal state; no transitions permitted. |

* **Invalid Transition Behavior**:
  If a requested transition is not permitted (e.g. `NEW` $\rightarrow$ `CLOSED` or from terminal `CANCELLED`), the request is rejected with HTTP `400 Bad Request`:
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition ticket status from NEW to CLOSED.",
    "timestamp": "2026-09-16T10:00:00.000Z"
  }
}
```
* **Success Response `200 OK`**:
```json
{
  "message": "Ticket status transitioned.",
  "currentStatus": "IN_PROGRESS"
}
```

---

#### 5. Requester Indicate Problem Appears Resolved
`POST /api/v1/tickets/:id/resolve-request`

* **Access Control**: Authenticated `REQUESTER` owning the ticket (`ticket.requesterId === req.user.id`) (`BR-03`). Non-owners receive `403 Forbidden`.
* **Behavior & Safety Rule (`BR-05`)**:
  - Sets `ticket.requesterResolvedAt = NOW()`.
  - **Does NOT** alter `ticket.currentStatus` to `RESOLVED` or `CLOSED`. Formal status closure remains the sole authority of IT Staff and Administrators.
  - If the ticket is already in a terminal status (`CLOSED` or `CANCELLED`), returns `400 Bad Request`.
* **Success Response `200 OK`**:
```json
{
  "message": "Problem resolution recorded.",
  "requesterResolvedAt": "2026-09-16T14:30:00.000Z"
}
```

---

#### 6. Append Public Comment
`POST /api/v1/tickets/:id/comments`

* **Access Control**: Permitted for the ticket's owning Requester (`ticket.requesterId === req.user.id`), any active `IT_STAFF`, and any active `ADMINISTRATOR`. Non-owning Requesters receive `403 Forbidden`.
* **Request Body**:
```json
{
  "content": "Please verify if the connection is working on the 2nd floor as well."
}
```
* **Validation Rules (`BR-08`)**:
  - `content`: Required string, 1 to 2,000 characters after trimming whitespace. Empty or whitespace-only strings return `400 Bad Request` (`VALIDATION_FAILED`). Strings $> 2000$ characters return `400 Bad Request`.
* **Success Response `201 Created`**:
```json
{
  "comment": {
    "id": 14,
    "ticketId": 1,
    "content": "Please verify if the connection is working on the 2nd floor as well.",
    "author": {
      "id": 6,
      "name": "Wichai IT",
      "role": "IT_STAFF"
    },
    "createdAt": "2026-09-16T11:45:00.000Z"
  }
}
```

---

#### 7. Append Internal Note
`POST /api/v1/tickets/:id/notes`

* **Access Control (`BR-04`)**: Strictly restricted to `IT_STAFF` and `ADMINISTRATOR` roles.
  - Any request from a `REQUESTER` role is rejected with HTTP `403 Forbidden` (`FORBIDDEN`) without creating a record or exposing note counts.
* **Request Body**:
```json
{
  "content": "Discovered bad transceiver on core switch 2. Ordering replacement part."
}
```
* **Validation Rules (`BR-08`)**:
  - `content`: Required string, 1 to 2,000 characters after trimming whitespace. Empty or whitespace-only strings return `400 Bad Request`.
* **Success Response `201 Created`**:
```json
{
  "note": {
    "id": 8,
    "ticketId": 1,
    "content": "Discovered bad transceiver on core switch 2. Ordering replacement part.",
    "author": {
      "id": 6,
      "name": "Wichai IT",
      "role": "IT_STAFF"
    },
    "createdAt": "2026-09-16T11:46:00.000Z"
  }
}
```

---

## 4. UI Wireframe & State Contracts

All interfaces strictly adhere to the KMUTT IT Service Desk "Zen Green" design tokens (`docs/lab-03/ui-spec.md`).

### 4.1. IT Staff Ticket Detail Screen (`/staff/tickets/:id`)

#### Desktop Wireframe Layout ($\ge 1024\text{px}$)

```
+---------------------------------------------------------------------------------------------------------+
| [ < Back to Staff Queue ]    Ticket: TKT-2026-00001            Status: [OPEN]      IT Priority: [URGENT]|
+---------------------------------------------------------------------------------------------------------+
| [LEFT COLUMN: Ticket Information (60%)]          | [RIGHT COLUMN: Operational Management (40%)]         |
|                                                  |                                                      |
| Requester Information                            | Ticket Ownership                                     |
| Name: Sompong IT                                 | Assigned Owner: [ Wichai IT                     v ]  |
| Department: Computer Engineering                 | [ Claim Ticket (Assign to Me) ]                      |
| Email: sompong.it@kmutt.ac.th                    |                                                      |
|                                                  | IT Priority Setting                                  |
| Ticket Classification                            | Current: [ High                                 v ]  |
| Category: Network     System: Campus Wi-Fi       | [ Update Priority ]                                  |
| Req. Priority: [HIGH]   Created: 2026-09-03 10:14|                                                      |
|                                                  | Status Workflow Transition                           |
| Problem Summary                                  | Current Status: OPEN                                 |
| Wi-Fi disconnects frequently in CB2 3rd floor    | Next Allowed Status: [ In Progress              v ]  |
|                                                  | [ Transition Status ]                                |
| Problem Description                              |                                                      |
| Full problem narrative with whitespace and line  | Ticket Attachments (1)                               |
| breaks properly formatted...                     | [icon] wifi_error.png (200 KB)          [ Download ] |
|                                                  |                                                      |
| [* Alert: Requester indicated problem appears    |                                                      |
|   resolved on 2026-09-04 14:20 *]                |                                                      |
+--------------------------------------------------+------------------------------------------------------+
| [BOTTOM SECTION: Dual Collaboration Threads]                                                            |
|                                                                                                         |
| [ Tab 1: Public Comments (2) ]                   | [ Tab 2: Internal Notes (1) - CONFIDENTIAL 🔒 ]       |
|                                                                                                         |
| --- PUBLIC COMMENTS THREAD (Visible to Requester & Staff) ---------------------------------------------- |
| +-----------------------------------------------------------------------------------------------------+ |
| | Sompong IT (Requester) • 2026-09-03 11:00                                                           | |
| | The Wi-Fi dropped again during my 10 AM lecture.                                                    | |
| +-----------------------------------------------------------------------------------------------------+ |
| | Wichai IT (IT Staff) • 2026-09-03 13:30                                                             | |
| | Access point CB2-AP-04 has been rebooted. Please verify if signal stabilizes.                       | |
| +-----------------------------------------------------------------------------------------------------+ |
| [ Add a public reply (visible to requester)...                                                      ] |
| [ Post Public Comment ] (green primary button)                                                          |
|                                                                                                         |
| --- INTERNAL NOTES THREAD (Amber Warning Styling - IT STAFF ONLY 🔒) ---------------------------------- |
| +-----------------------------------------------------------------------------------------------------+ |
| | 🔒 Wichai IT (IT Staff) • 2026-09-03 13:15                       *STRICTLY CONFIDENTIAL STAFF NOTE* | |
| | Network switch firmware on 3rd floor rack needs patch. Scheduled maintenance Friday 10 PM.          | |
| +-----------------------------------------------------------------------------------------------------+ |
| [ Add confidential internal note (strictly invisible to requester)...                              ] |
| [ Post Internal Note 🔒 ] (amber solid button)                                                         |
+---------------------------------------------------------------------------------------------------------+
```

### 4.2. Operational Controls Panel Specification
1. **Ticket Ownership Control**:
   - Selector dropdown populated with all active `IT_STAFF` and `ADMINISTRATOR` users plus an option for `"Unassigned"`.
   - **"Claim Ticket" Shortcut Button**:
     - Label: `"Claim Ticket (Assign to Me)"`.
     - When clicked, immediately issues `PATCH .../assignment` with `ownerId = currentUserId`.
     - Disabled if the ticket is already assigned to the logged-in staff member.
2. **IT Priority Control**:
   - Dropdown with options: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
   - Visual priority badge reflecting currently active priority.
   - Update button disabled while update is in-flight.
3. **Ticket Status Workflow Transition Control**:
   - Current status badge rendered with accessible icon and color tokens.
   - Next status dropdown strictly filtered to valid next statuses permitted by the state machine for the current status.
   - For terminal statuses (`RESOLVED`, `CLOSED`, `CANCELLED`), prompts a modal/popover confirmation dialog explaining the transition impact.
4. **Attachments Panel**:
   - Lists all non-removed attachments linked to the ticket.
   - Provides filename, human-readable file size (KB/MB), and direct download button preserving Lab 2 security tokens.

### 4.3. Visual Differentiation & Leak Prevention Contract
To prevent accidental disclosure of confidential technical deliberations to requesters, the UI implements strict visual divergence:

| UI Attribute | Public Comments | Internal Notes |
| :--- | :--- | :--- |
| **Container Background** | `--zen-surface` (`#FFFFFF`) | `--zen-note-bg` (`#FFFBEB`) High-contrast warm amber |
| **Container Border** | `1px solid #C4E5D2` (Pale green) | `2px solid #F59E0B` (Prominent Amber Warning) |
| **Section Header** | Standard section heading (`#006B3C`) | Prominent Amber Banner with Lock Icon: `🔒 STRICTLY CONFIDENTIAL — IT STAFF ONLY` |
| **Note Header Badge** | Standard Role Badge (`Requester` / `IT Staff`) | Amber Tag: `CONFIDENTIAL INTERNAL NOTE` (`#FEF3C7` bg, `#92400E` text) |
| **Submit Button** | `.btn-zen-primary` (Zen Green `#006B3C`) | `.btn-zen-amber` (`#D97706` background, white text, lock icon) |
| **Textarea Prompt** | `"Add a public comment visible to requester..."` | `"Add a private internal note (never visible to requester)..."` |

### 4.4. Requester Ticket Detail Screen Update (`/tickets/:id`)
* **Retains**:
  - Full read-only view of ticket classification, requester summary, description, and attachments from Lab 2.
* **Adds**:
  - **Public Comments Thread**: Renders all public comments posted by requester and IT staff in chronological order, with an input form to append new comments.
  - **"Problem Appears Resolved" Action Button (`BR-05`)**:
    - Displayed prominently in the header if `requesterResolvedAt === null` and the ticket status is not `CLOSED` or `CANCELLED`.
    - Modal confirmation: *"Indicate that this problem appears resolved? (This notifies IT Staff that your issue is resolved, but does not immediately close the ticket)."*
    - Once submitted, transforms into a permanent green confirmation banner:
      *"✓ You indicated this problem appears resolved on [Formatted Timestamp]. IT Staff has been notified."*
* **Strict Exclusions (`BR-04`)**:
  - Internal Notes thread and textarea are **completely absent from the DOM tree**.
  - Internal Notes API calls are never dispatched by the client.
  - Operational controls (Owner dropdown, IT Priority dropdown, Status transition dropdown) are completely hidden.

### 4.5. Responsive Viewport Adaptations
* **Desktop ($\ge 1024\text{px}$)**: Side-by-side 2-column layout (Ticket info left 60%, Operational controls right 40%). Collaboration threads stacked or tabbed below.
* **Tablet ($768\text{px} - 1023\text{px}$)**: Single-column linear layout with operational controls placed immediately above collaboration threads.
* **Mobile ($< 768\text{px}$)**:
  - Linear single-column presentation.
  - Minimum `48px` tap targets for all buttons ("Claim Ticket", "Update Status", "Post Comment").
  - Dropdown controls expand to full width.
  - Zero horizontal scrolling across all cards, threads, and code snippets.

---

## 5. Test Workflow & Traceability Matrix (STS)

### 5.1. Mandatory Test Execution Rule
> [!IMPORTANT]
> **Mandatory Server Test Pre-Condition**: Always execute `npx prisma migrate reset --force` prior to running server test suites (`npm test` or `npx vitest run`) to ensure a clean database state, fresh migrations, and idempotent seed records. Neglecting this rule will lead to dirty database states and flaky test runs.

### 5.2. Acceptance Criteria Traceability Matrix

| Requirement ID | Acceptance Criterion | Test Tier | Designated Test File | Test Method & Assertion Description |
| :--- | :--- | :---: | :--- | :--- |
| **FR-04** | **AC-14.1**, **AC-09** | API | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `TKTOP-01`: IT Staff claims unassigned ticket; `ownerId` set to staff ID. |
| **FR-04** | **AC-14.1**, **AC-09** | API | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `TKTOP-02`: IT Staff reassigns ticket or unassigns with `null`. |
| **FR-04**, **BR-07** | **AC-14.1**, **AC-10** | API | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `TKTOP-03`: IT Staff updates `itPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`). |
| **FR-04** | **AC-14.1**, **AC-10** | API | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `TKTOP-04`: Valid status transition per matrix (e.g. `NEW` $\rightarrow$ `OPEN`). |
| **FR-04** | **AC-14.1**, **AC-10** | API | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `TKTOP-05`: Invalid status transition rejected with HTTP `400 Bad Request`. |
| **FR-04**, **BR-05** | **AC-14.4**, **AC-13** | API | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `TKTOP-06`: Requester records "Problem Appears Resolved"; status remains unchanged. |
| **FR-05**, **BR-04** | **AC-14.2**, **AC-11** | API | `server/tests/lab-03/comments-notes.api.test.ts` | `COMM-01`: Post Public Comment by Requester, IT Staff, Admin; returns 201. |
| **FR-05**, **BR-08** | **AC-14.2**, **AC-11** | API | `server/tests/lab-03/comments-notes.api.test.ts` | `COMM-02`: Whitespace-only or $> 2000$ character public comment rejected (400). |
| **FR-05**, **BR-04** | **AC-14.2**, **AC-12** | API | `server/tests/lab-03/comments-notes.api.test.ts` | `NOTE-01`: IT Staff posts Internal Note; returns 201 with staff author. |
| **FR-05**, **BR-04** | **AC-14.3**, **AC-12** | API | `server/tests/lab-03/authorization.api.test.ts` | `NOTE-02`: Requester posting Internal Note returns HTTP `403 Forbidden`. |
| **FR-05**, **BR-04** | **AC-14.3**, **AC-12** | API | `server/tests/lab-03/authorization.api.test.ts` | `NOTE-03`: Requester GET `/api/v1/tickets/:id` strictly omits `internalNotes`. |
| **FR-04**, **BR-03** | **AC-14.1** | API | `server/tests/lab-03/authorization.api.test.ts` | `AUTH-TKT-01`: Requester requesting non-owned ticket returns 403 or 404. |
| **FR-04**, **BR-06** | **AC-14.1** | API | `server/tests/lab-03/authorization.api.test.ts` | `AUTH-TKT-02`: Requester attempting operational PATCH endpoints returns 403. |
| **FR-04**, **FR-05** | **AC-14.1**, **AC-14.2** | UI | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | `UI-DET-01`: Renders ticket detail, claim button, priority, and status dropdowns. |
| **FR-05**, **BR-04** | **AC-14.2**, **AC-14.3** | UI | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | `UI-DET-02`: Verifies amber container, lock icon, and warning header on Internal Notes. |
| **FR-05** | **AC-14.2** | UI | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | `UI-DET-03`: Submits Public Comment and Internal Note, updating respective threads. |
| **FR-04**, **BR-05** | **AC-14.4** | UI | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | `UI-DET-04`: Requester view shows "Problem Appears Resolved", hides Internal Notes. |

---

### 5.3. Backend Test Suite Specifications

#### 1. `server/tests/lab-03/staff-ticket-detail.api.test.ts`
```typescript
describe("Staff Ticket Detail & Operational Controls API (Issue 14)", () => {
  // TKTOP-01: Claim Ticket
  it("TKTOP-01: permits IT_STAFF to claim unassigned ticket", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/assignment`)
      .set("Cookie", staffCookie)
      .send({ ownerId: staffUserId });

    expect(res.status).toBe(200);
    expect(res.body.owner.id).toBe(staffUserId);
  });

  // TKTOP-02: Reassign Ticket
  it("TKTOP-02: permits IT_STAFF to reassign ticket to another staff member or unassign", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/assignment`)
      .set("Cookie", staffCookie)
      .send({ ownerId: null });

    expect(res.status).toBe(200);
    expect(res.body.owner).toBeNull();
  });

  // TKTOP-03: Update IT Priority
  it("TKTOP-03: permits IT_STAFF to update itPriority", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/priority`)
      .set("Cookie", staffCookie)
      .send({ itPriority: "URGENT" });

    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe("URGENT");
  });

  // TKTOP-04: Permitted Status Transition
  it("TKTOP-04: permits valid status transition (NEW -> OPEN)", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${newTicketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "OPEN" });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("OPEN");
  });

  // TKTOP-05: Prohibited Status Transition
  it("TKTOP-05: rejects invalid status transition with 400 Bad Request", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${newTicketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "CLOSED" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  // TKTOP-06: Requester Resolution Indication (BR-05)
  it("TKTOP-06: records requester resolution indication without altering currentStatus", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/resolve-request`)
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("requesterResolvedAt");

    const check = await request(app)
      .get(`/api/v1/tickets/${ownedTicketId}`)
      .set("Cookie", requesterCookie);
    expect(check.body.ticket.currentStatus).not.toBe("RESOLVED");
    expect(check.body.ticket.currentStatus).not.toBe("CLOSED");
    expect(check.body.ticket.requesterResolvedAt).not.toBeNull();
  });
});
```

#### 2. `server/tests/lab-03/comments-notes.api.test.ts`
```typescript
describe("Public Comments & Internal Notes API (Issue 14)", () => {
  // COMM-01: Append Public Comment
  it("COMM-01: permits Requester and Staff to post public comments", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/comments`)
      .set("Cookie", requesterCookie)
      .send({ content: "Testing public response from user." });

    expect(res.status).toBe(201);
    expect(res.body.comment.content).toBe("Testing public response from user.");
    expect(res.body.comment.author.role).toBe("REQUESTER");
  });

  // COMM-02: Public Comment Content Validation
  it("COMM-02: rejects empty or whitespace-only comments with 400", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/comments`)
      .set("Cookie", requesterCookie)
      .send({ content: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  // NOTE-01: Append Internal Note
  it("NOTE-01: permits IT_STAFF to post internal notes", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/notes`)
      .set("Cookie", staffCookie)
      .send({ content: "Private internal note regarding hardware diagnostics." });

    expect(res.status).toBe(201);
    expect(res.body.note.content).toBe("Private internal note regarding hardware diagnostics.");
    expect(res.body.note.author.role).toBe("IT_STAFF");
  });
});
```

#### 3. `server/tests/lab-03/authorization.api.test.ts`
```typescript
describe("Role Boundary & Authorization Isolation API (Issue 14)", () => {
  // NOTE-02: Requester Post Internal Note Blocked (BR-04)
  it("NOTE-02: rejects Requester attempting to post internal note with 403 Forbidden", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/notes`)
      .set("Cookie", requesterCookie)
      .send({ content: "Sneaking in an internal note." });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // NOTE-03: Requester Ticket Detail Omits Internal Notes (BR-04)
  it("NOTE-03: completely strips internalNotes array when fetched by Requester", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ownedTicketId}`)
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(200);
    expect(res.body.ticket).toHaveProperty("publicComments");
    expect(res.body.ticket.internalNotes).toBeUndefined();
  });

  // AUTH-TKT-01: Non-Owner Requester Access Blocked
  it("AUTH-TKT-01: rejects Requester attempting to view another requester's ticket", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${unownedTicketId}`)
      .set("Cookie", requesterCookie);

    expect([403, 404]).toContain(res.status);
  });

  // AUTH-TKT-02: Operational Endpoints Blocked for Requester
  it("AUTH-TKT-02: rejects Requester attempting to update status or assignment", async () => {
    const resStatus = await request(app)
      .patch(`/api/v1/staff/tickets/${ownedTicketId}/status`)
      .set("Cookie", requesterCookie)
      .send({ status: "RESOLVED" });

    expect(resStatus.status).toBe(403);

    const resAssign = await request(app)
      .patch(`/api/v1/staff/tickets/${ownedTicketId}/assignment`)
      .set("Cookie", requesterCookie)
      .send({ ownerId: 1 });

    expect(resAssign.status).toBe(403);
  });
});
```

---

### 5.4. Frontend Component Test Specification (`client/src/tests/lab-03/StaffTicketDetail.test.tsx`)

```typescript
describe("StaffTicketDetail Component Suite (Issue 14)", () => {
  // UI-DET-01: Operational Controls Rendering
  it("UI-DET-01: renders ticket metadata, claim button, priority, and status dropdowns", async () => {
    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByText(/TKT-2026-00001/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /claim ticket/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/it priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status workflow/i)).toBeInTheDocument();
  });

  // UI-DET-02: Amber Internal Notes Visual Differentiation
  it("UI-DET-02: renders internal notes inside high-contrast amber container with lock icon", async () => {
    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    const notesContainer = await screen.findByTestId("internal-notes-container");
    expect(notesContainer).toHaveClass("zen-internal-notes-card");
    expect(screen.getByText(/strictly confidential/i)).toBeInTheDocument();
    expect(screen.getByText(/🔒/)).toBeInTheDocument();
  });

  // UI-DET-03: Comment & Note Posting
  it("UI-DET-03: allows posting a public comment and internal note", async () => {
    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    const commentInput = screen.getByPlaceholderText(/add a public comment/i);
    fireEvent.change(commentInput, { target: { value: "New public reply." } });
    fireEvent.click(screen.getByRole("button", { name: /post public comment/i }));

    await waitFor(() => {
      expect(mockPostPublicComment).toHaveBeenCalledWith(1, "New public reply.");
    });
  });

  // UI-DET-04: Requester View Isolation & "Problem Appears Resolved"
  it("UI-DET-04: renders problem resolution button for requester and hides internal notes", async () => {
    render(<RequesterTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByRole("button", { name: /problem appears resolved/i })).toBeInTheDocument();
    expect(screen.queryByTestId("internal-notes-container")).not.toBeInTheDocument();
    expect(screen.queryByText(/strictly confidential/i)).not.toBeInTheDocument();
  });
});
```

---

## 6. Review & Sign-Off Gate

| Gate Checklist Item | Status | Verification Criteria & Evidence |
| :--- | :---: | :--- |
| **No Application Code Pre-Written** | ✅ PASS | Strictly contract authored; zero application controllers, UI views, or database migrations created. |
| **Prisma Models Specified** | ✅ PASS | `PublicComment` and `InternalNote` models with relations, constraints, and cascading rules fully defined. |
| **Append-Only Lifecycle (`BR-08`)** | ✅ PASS | No update/delete mutations; immutable timestamp and author IDs specified. |
| **Dual-Thread Boundary Contract (`BR-04`)** | ✅ PASS | Complete specification of Public Comments vs Amber-tinted Internal Notes (`#FFFBEB`, `2px solid #F59E0B`, lock icons). |
| **Requester Information Barrier** | ✅ PASS | `GET /api/v1/tickets/:id` strips internal notes for requesters; `POST .../notes` rejects requesters with `403 Forbidden`. |
| **Operational Control Endpoints** | ✅ PASS | Complete DTOs and validation for ticket assignment, IT Priority update, and status workflow transitions. |
| **State Machine Transition Matrix** | ✅ PASS | Valid and invalid transitions documented with `400 Bad Request` (`INVALID_STATUS_TRANSITION`) behavior. |
| **Requester Resolution Indication (`BR-05`)** | ✅ PASS | Records `requesterResolvedAt` without altering status; confirmed with green banner on UI. |
| **Mandatory Test Pre-Condition Documented** | ✅ PASS | Prominently highlights running `npx prisma migrate reset --force` prior to `npm test`. |
| **Test Traceability Matrix (STS)** | ✅ PASS | Direct mappings from `AC-14.1` through `AC-14.4` to `staff-ticket-detail.api.test.ts`, `comments-notes.api.test.ts`, `authorization.api.test.ts`, and `StaffTicketDetail.test.tsx`. |
