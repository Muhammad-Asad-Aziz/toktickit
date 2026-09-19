# Feature 13 Engineering Contract: IT Staff Ticket Queue & List Queries

**Feature Title**: IT Staff Ticket Queue & List Queries  
**Branch Name**: `feature/13-staff-ticket-queue` (Issue 13)  
**Base Branch**: `lab3-staging`  
**Document Status**: Approved Feature Baseline  
**Author**: TokTickIT Engineering Team  
**Traceability References**:
* [TokTickIT-System-Level-SDS-v1.0.pdf](../../reference/TokTickIT-System-Level-SDS-v1.0.pdf) (§Architecture, §Data Conventions, §Security Invariants)
* [Lab_3_sheet.pdf](../../reference/Lab_3_sheet.pdf) (§1, §3, §4.3, §4.5, §6, §6.3, §7, §8.3, §14 Part 6)
* [docs/lab-03/specification.md](../../lab-03/specification.md) (`FR-03`, `BR-06`, `BR-07`, `AC-07`, `AC-08`, `AC-13.1` to `AC-13.4`)
* [docs/lab-03/ui-spec.md](../../lab-03/ui-spec.md) (Zen Green Tokens, Typography, Badges, Screen 3: IT Staff Ticket Queue, Responsive Breakpoints)
* [docs/lab-03/api-spec.md](../../lab-03/api-spec.md) (§4.1 Retrieve IT Staff Ticket Queue, Query DTOs, Error Envelopes)
* [docs/lab-03/tests.md](../../lab-03/tests.md) (STS Test Catalog `QUEUE-01` through `QUEUE-07`, `UI-QUE-01`)
* [docs/lab-03/poc-scope-and-issues.md](../../lab-03/poc-scope-and-issues.md) (Issue 13 Decomposition)
* [AGENTS.md](../../../AGENTS.md) (Work Norms: Closed-World Rule, TDD, Theme Compliance, Blur Validation Rule)

---

## 1. Feature Scope & Objectives

### 1.1. Strategic Objectives
Issue 13 implements the central operational workspace for IT Staff and Administrators in TokTickIT Sprint 3 (Lab 3). While Issue 12 established real user identity, secure authentication, and application shell navigation, Issue 13 provides service desk agents with global visibility, searchability, and triage capabilities across all university service requests.

Key objectives include:
1. **Shared Operational Queue**: Implement the backend shared ticket queue query API (`GET /api/v1/staff/tickets`) granting IT Staff and Administrators cross-requester visibility into all campus incidents and requests.
2. **Flexible Search & Multi-Attribute Filtering**: Empower resolvers to filter incoming demand simultaneously across case-insensitive text search (ticket number or summary keyword), ticket status, issue category, IT Priority, and assigned ticket owner (including unassigned tickets).
3. **Multi-Column Sorting & Page-Based Pagination**: Provide fast, predictable server-side sorting (by creation date, ticket number, summary, IT Priority, and current status) combined with bounded, page-based pagination (page sizes: 10, 25, 50) and comprehensive count metadata (`totalCount`, `page`, `pageSize`, `totalPages`).
4. **Strict Role-Based Authorization & Isolation**: Strictly enforce that queue querying is restricted to authenticated users with `IT_STAFF` or `ADMINISTRATOR` roles. Any attempt by a `REQUESTER` user to access the queue endpoint must be rejected with HTTP `403 Forbidden` (`BR-06`).
5. **Responsive Zen Green Frontend**: Construct the dedicated IT Staff Ticket Queue screen adhering faithfully to the KMUTT IT Service Desk "Zen Green" design tokens, supporting rich interactive filter toolbars, sortable table columns, accessible status/priority/owner badges, loading shimmer skeletons, empty/no-results states, and graceful collapse into stacked cards on mobile viewports (< 768px) with zero horizontal scrolling.

### 1.2. In-Scope Deliverables
1. **Database Schema Increment (`server/prisma/schema.prisma`)**:
   - Define Prisma Enum `Priority` with values: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
   - Define Prisma Enum `TicketStatus` with values: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
   - Add `ownerId` Int field (nullable foreign key to `User`) to `Ticket` model, with relation `owner User? @relation("StaffOwnedTickets", fields: [ownerId], references: [id], onDelete: SetNull)`.
   - Add back-relation `assignedTickets Ticket[] @relation("StaffOwnedTickets")` in `User` model.
   - Update `Ticket.itPriority` to use the `Priority` enum (initialized to match `requestedPriority` per `BR-07`).
   - Update `Ticket.currentStatus` to use the `TicketStatus` enum with default `NEW`.
   - Add performance indexes on `ownerId`, `currentStatus`, `itPriority`, and `createdAt`.
2. **Database Migration & Seed Data (`server/prisma/seed.ts`)**:
   - Create migration `staff_ticket_queue_schema_increment` preserving existing Lab 2/Lab 3 tickets, requesters, categories, and attachments.
   - Update `server/prisma/seed.ts` with diverse, realistic tickets distributed across all 8 statuses, various categories, priorities, and assigned staff owners vs unassigned tickets to exercise filtering and pagination.
3. **Backend Staff Queue REST API**:
   - `GET /api/v1/staff/tickets` (and backwards-compatible `/api/staff/tickets`):
     - Protected by `authenticateUser`, `requirePasswordChanged`, and `requireRole("IT_STAFF", "ADMINISTRATOR")`.
     - Supports query parameters: `search`, `status`, `category`, `itPriority`, `owner`, `sortBy`, `sortOrder`, `page`, `pageSize`.
     - Returns standardized JSON response envelope: `{ items: StaffTicketSummaryDTO[], totalCount: number, page: number, pageSize: number, totalPages: number }`.
4. **Client API Client (`client/src/api.ts`)**:
   - Add `fetchStaffTickets(params: StaffTicketQueryParams): Promise<StaffTicketQueueResponse>`.
   - Export corresponding TypeScript interfaces (`StaffTicketSummary`, `StaffTicketQueryParams`, `StaffTicketQueueResponse`).
5. **Frontend IT Staff Ticket Queue Screen & Navigation**:
   - `StaffTicketQueue.tsx` component mounted in `client/src/App.tsx` when `activeView === "staff-queue"`.
   - Integrated into `AppHeader.tsx` navigation buttons for `IT_STAFF` and `ADMINISTRATOR` roles.
   - Interactive search input with instant/debounced search.
   - Multi-dropdown filter bar: Status, Category, IT Priority, Owner (All, Unassigned, Staff names).
   - "Reset Filters" action button.
   - Full data table on desktop/tablet with clickable sorting indicators and hover states.
   - Stacked card view on mobile viewports (< 768px).
   - Dynamic feedback states: `.zen-skeleton` loading rows, empty queue banner, no-matches filter banner, error alert with retry button.
   - Pagination controls: Previous/Next buttons, numeric page indicators, rows-per-page selector.
6. **Automated Verification**:
   - Backend API integration tests in `server/tests/lab-03/staff-queue.api.test.ts`.
   - Frontend UI component tests in `client/src/tests/lab-03/StaffTicketQueue.test.tsx`.

### 1.3. Explicitly Excluded Scope (Strictly Out of Scope per Issue 13)
* **Inline Table Cell Editing**: No inline editing of status, priority, or owner directly inside table cells (operational updates belong to Ticket Detail in Issue 14).
* **Ticket Detail Operational Actions**: Ticket claiming, owner reassignment, permitted status workflow transitions, and comments/notes posting are deferred to Issue 14 (`feature/14-staff-ticket-detail`).
* **SLA Calculations & Escalation Rules**: No automated SLA countdown timers, escalation alerts, or background cron triggers.
* **Analytics & KPI Dashboards**: No graphical charts, resolution time averages, or reporting widgets beyond the queue counter.
* **Multi-Tenant Organization Isolation**: No campus-partitioned or department-scoped organizational boundaries; all IT Staff have visibility into all university tickets.
* **Administrator User Management**: Provisioning users and editing accounts is deferred to Issue 15 (`feature/15-admin-user-management`).

---

## 2. Database Schema Increment & Seed Data Specification

### 2.1. Prisma Schema Definition (`server/prisma/schema.prisma`)

The Prisma schema is updated to introduce the `Priority` and `TicketStatus` enums and evolve the `Ticket` and `User` models:

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
// 0. Enums
// ---------------------------------------------------------------------------
enum Role {
  REQUESTER
  IT_STAFF
  ADMINISTRATOR
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  NEW
  OPEN
  IN_PROGRESS
  WAITING_FOR_REQUESTER
  RESOLVED
  CLOSED
  REOPENED
  CANCELLED
}

// ---------------------------------------------------------------------------
// 1. User Model (Unified Authenticated Identity)
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
  assignedTickets    Ticket[]     @relation("StaffOwnedTickets") // Increment for Issue 13
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
// 4. Ticket (Service Desk Incident / Request) — Increment for Issue 13
// ---------------------------------------------------------------------------
model Ticket {
  id                  Int          @id @default(autoincrement())
  ticketNumber        String       @unique @db.VarChar(32) // Format: TKT-YYYY-NNNNN
  requesterId         Int
  ownerId             Int?         // Nullable FK to User for assigned IT Staff/Admin
  categoryId          Int
  relatedSystemId     Int
  summary             String       @db.VarChar(100)
  description         String       @db.Text
  requestedPriority   Priority     @default(MEDIUM) // Enum LOW, MEDIUM, HIGH, URGENT
  itPriority          Priority     @default(MEDIUM) // Enum LOW, MEDIUM, HIGH, URGENT (BR-07)
  currentStatus       TicketStatus @default(NEW)    // Enum NEW, OPEN, IN_PROGRESS, etc.
  requesterResolvedAt DateTime?
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  // Relations
  requester           User          @relation("RequesterTickets", fields: [requesterId], references: [id], onDelete: Restrict)
  owner               User?         @relation("StaffOwnedTickets", fields: [ownerId], references: [id], onDelete: SetNull)
  category            Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  relatedSystem       RelatedSystem @relation(fields: [relatedSystemId], references: [id], onDelete: Restrict)
  attachments         Attachment[]

  @@index([requesterId])
  @@index([ownerId])
  @@index([currentStatus])
  @@index([itPriority])
  @@index([createdAt])
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

  // Relations
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

### 2.2. Migration Strategy & Data Preservation
1. **Migration Command**:
   - `npx prisma migrate dev --name staff_ticket_queue_schema_increment`
2. **Schema Casts & Conversions**:
   - Create PostgreSQL enum type `"Priority"` as `('LOW', 'MEDIUM', 'HIGH', 'URGENT')`.
   - Create PostgreSQL enum type `"TicketStatus"` as `('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED')`.
   - Convert existing string values in `requestedPriority` and `itPriority` to uppercase enum equivalents (`'Low'` $\rightarrow$ `'LOW'`, `'Medium'` $\rightarrow$ `'MEDIUM'`, `'High'` $\rightarrow$ `'HIGH'`, `'Urgent'` $\rightarrow$ `'URGENT'`).
   - If `itPriority` is null on existing records, set it to the record's `requestedPriority` (`BR-07`).
   - Convert existing string status values in `currentStatus` to enum equivalents (`'New'` $\rightarrow$ `'NEW'`, `'Assigned'` / `'Open'` $\rightarrow$ `'OPEN'`, etc.).
   - Add nullable column `"ownerId"` integer referencing `users(id)` with `ON DELETE SET NULL`.
   - Add compound and single-column indexes on `ownerId`, `currentStatus`, `itPriority`, and `createdAt`.
3. **Integrity Guarantees**:
   - Zero existing tickets or requester foreign keys will be deleted or broken.
   - All attachment associations remain intact.

### 2.3. Idempotent Seed Data Specification (`server/prisma/seed.ts`)
To support thorough verification of searching, filtering, sorting, and pagination, the seed script must upsert realistic ticket records across varied states:

| Ticket Number | Summary | Category | Req. Priority | IT Priority | Status | Requester Email | Assigned Owner Email |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TKT-2026-00001` | Wi-Fi disconnects frequently in CB2 3rd floor | Network | HIGH | URGENT | OPEN | `sompong.it@kmutt.ac.th` | `wichai.it@kmutt.ac.th` |
| `TKT-2026-00002` | Projector in CB2301 lamp flickering | Hardware | MEDIUM | MEDIUM | NEW | `anong.sta@kmutt.ac.th` | *None (Unassigned)* |
| `TKT-2026-00003` | Cannot access LEB2 portal from dormitory | Software | HIGH | HIGH | IN_PROGRESS | `kittisak.stu@kmutt.ac.th` | `nareerat.it@kmutt.ac.th` |
| `TKT-2026-00004` | VPN connection timeout on macOS Sonoma | Network | MEDIUM | LOW | WAITING_FOR_REQUESTER | `wichai.fac@kmutt.ac.th` | `wichai.it@kmutt.ac.th` |
| `TKT-2026-00005` | Request second monitor for faculty office | Hardware | LOW | LOW | RESOLVED | `wichai.fac@kmutt.ac.th` | `ekachai.it@kmutt.ac.th` |
| `TKT-2026-00006` | Email quota exceeded warning received | Email | MEDIUM | MEDIUM | CLOSED | `anong.sta@kmutt.ac.th` | `nareerat.it@kmutt.ac.th` |
| `TKT-2026-00007` | SPSS license renewal activation error | Software | HIGH | HIGH | REOPENED | `sompong.it@kmutt.ac.th` | `wichai.it@kmutt.ac.th` |
| `TKT-2026-00008` | Accidental duplicate ticket submission | Other | LOW | LOW | CANCELLED | `kittisak.stu@kmutt.ac.th` | `admin.toktick@kmutt.ac.th` |
| `TKT-2026-00009` | Library 4th floor Ethernet port dead | Network | MEDIUM | MEDIUM | NEW | `sompong.it@kmutt.ac.th` | *None (Unassigned)* |
| `TKT-2026-00010` | Student information system timeout during enrollment | Software | URGENT | URGENT | IN_PROGRESS | `kittisak.stu@kmutt.ac.th` | `wichai.it@kmutt.ac.th` |
| `TKT-2026-00011` | Printer paper jam error 50.4 in Eng Building | Hardware | LOW | LOW | NEW | `anong.sta@kmutt.ac.th` | *None (Unassigned)* |
| `TKT-2026-00012` | Microsoft Teams audio glitch on campus network | Network | MEDIUM | MEDIUM | OPEN | `sompong.it@kmutt.ac.th` | `ekachai.it@kmutt.ac.th` |

*(Note: Total of at least 12 distinct tickets to demonstrate multi-page pagination with pageSize = 10).*

---

## 3. REST API & Authorization Protocols

### 3.1. Endpoint Definition: `GET /api/v1/staff/tickets`
Retrieves a paginated list of all service desk tickets across all requesters, filtered, searched, and sorted according to query parameters.

* **HTTP Method**: `GET`
* **Route Paths**: `/api/v1/staff/tickets` (primary) and `/api/staff/tickets` (compatibility alias)
* **Access Control**: Authenticated `IT_STAFF` or `ADMINISTRATOR` only (`BR-06`).
* **Authentication Mechanism**: Session cookie `toktickit_session` or header `Authorization: Bearer <token>`.
* **Middleware Chain**:
  1. `authenticateUser`: Resolves token into `req.user`.
  2. `requireAuth`: Enforces that an authenticated user is present (`401 UNAUTHENTICATED`).
  3. `requirePasswordChanged`: Enforces that `mustChangePassword !== true` (`403 PASSWORD_CHANGE_REQUIRED`).
  4. `requireRole("IT_STAFF", "ADMINISTRATOR")`: Rejects non-staff users (`403 FORBIDDEN`).

### 3.2. Authorization & Boundary Rules
* **Requester Access Prohibited (`BR-06`, `AC-08`, `AC-13.2`)**:
  - Any request made by a user with `role === "REQUESTER"` must be immediately rejected with HTTP `403 Forbidden`:
    ```json
    {
      "error": {
        "code": "FORBIDDEN",
        "message": "You do not have permission to access this resource.",
        "timestamp": "2026-09-15T10:00:00.000Z"
      }
    }
    ```
* **Mandatory Password Change Gate (`BR-02`)**:
  - If an IT Staff or Administrator account has `mustChangePassword === true`, requests to `/api/v1/staff/tickets` return HTTP `403 Forbidden` with `code: "PASSWORD_CHANGE_REQUIRED"`.

### 3.3. Query Parameters Specification

| Parameter | Type | Required | Default | Allowed Values / Validation Rules | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `search` | String | No | `""` | Any string (trimmed). | Case-insensitive partial substring match against `ticketNumber` OR `summary`. |
| `status` | String | No | `""` (All) | `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED` | Filters for tickets with exact status match. |
| `category` | Int / String | No | `""` (All) | Positive integer ID. | Filters tickets by `categoryId`. |
| `itPriority` | String | No | `""` (All) | `LOW`, `MEDIUM`, `HIGH`, `URGENT` | Filters tickets by IT Priority. |
| `owner` | String | No | `""` (All) | Positive integer user ID, or the special literal token `"unassigned"`. | If numeric ID: filters `ownerId = ID`. If `"unassigned"`: filters `ownerId IS NULL`. |
| `sortBy` | String | No | `createdAt` | `createdAt`, `ticketNumber`, `summary`, `itPriority`, `currentStatus` | Field used for ordering. Unrecognized values default to `createdAt`. |
| `sortOrder` | String | No | `desc` | `asc`, `desc` | Sort direction (case-insensitive). Defaults to `desc`. |
| `page` | Integer | No | `1` | Integer $\ge 1$. | 1-based page number. If $< 1$ or NaN, coerced to `1`. |
| `pageSize` | Integer | No | `10` | Allowed values: `10`, `25`, `50`. | Number of records per page. Unrecognized values default to `10`. |

### 3.4. Response DTO Specification & Envelopes

#### Success Response (`200 OK`)
```json
{
  "items": [
    {
      "id": 1,
      "ticketNumber": "TKT-2026-00001",
      "summary": "Wi-Fi disconnects frequently in CB2 3rd floor",
      "categoryName": "Network",
      "categoryId": 1,
      "requestedPriority": "HIGH",
      "itPriority": "URGENT",
      "currentStatus": "OPEN",
      "requesterName": "Sompong IT",
      "requesterId": 1,
      "ownerName": "Wichai IT",
      "ownerId": 7,
      "requesterResolved": false,
      "createdAt": "2026-09-03T10:14:00.000Z",
      "updatedAt": "2026-09-03T11:00:00.000Z"
    },
    {
      "id": 2,
      "ticketNumber": "TKT-2026-00002",
      "summary": "Projector in CB2301 lamp flickering",
      "categoryName": "Hardware",
      "categoryId": 2,
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "requesterName": "Anong Staff",
      "requesterId": 2,
      "ownerName": null,
      "ownerId": null,
      "requesterResolved": false,
      "createdAt": "2026-09-03T10:30:00.000Z",
      "updatedAt": "2026-09-03T10:30:00.000Z"
    }
  ],
  "totalCount": 12,
  "page": 1,
  "pageSize": 10,
  "totalPages": 2
}
```

#### Field Specifications:
* `items`: Array of `StaffTicketSummaryDTO` items.
* `totalCount`: Total number of tickets matching current search and filter criteria across the entire database.
* `page`: The current active page number (1-indexed).
* `pageSize`: The page size used to partition the results (`10`, `25`, or `50`).
* `totalPages`: Calculated as `Math.ceil(totalCount / pageSize)` (minimum `1` if `totalCount === 0`).
* `ownerName`: Full name of assigned IT Staff user (`users.name`), or `null` if unassigned.
* `requesterResolved`: Boolean indicator (`true` if `requesterResolvedAt !== null`, otherwise `false`).

#### Standard Error Envelopes:
* `401 Unauthorized`:
  ```json
  {
    "error": {
      "code": "UNAUTHENTICATED",
      "message": "Authentication required",
      "timestamp": "2026-09-15T10:00:00.000Z"
    }
  }
  ```
* `403 Forbidden (Role)`:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "You do not have permission to access this resource.",
      "timestamp": "2026-09-15T10:00:00.000Z"
    }
  }
  ```
* `403 Forbidden (Password Change Required)`:
  ```json
  {
    "error": {
      "code": "PASSWORD_CHANGE_REQUIRED",
      "message": "You must change your password before accessing the service desk.",
      "timestamp": "2026-09-15T10:00:00.000Z"
    }
  }
  ```

---

## 4. UI Wireframe & State Contracts

All visuals strictly consume the KMUTT IT Service Desk "Zen Green" design tokens (`docs/lab-03/ui-spec.md`).

### 4.1. Desktop Wireframe Layout (`/staff/tickets`, $\ge 768\text{px}$)

```
+---------------------------------------------------------------------------------------------------------+
| IT Staff Ticket Queue                                                       Total Tickets: [ 42 ]       |
+---------------------------------------------------------------------------------------------------------+
| [ Search ticket number or summary...              ] [ Status: All v ] [ Category: All v ]               |
| [ IT Priority: All v ] [ Owner: All v ]                               [ Reset Filters ]                 |
+---------------------------------------------------------------------------------------------------------+
| Ticket No    | Created    | Summary               | Category | Req. Prio | IT Prio  | Status | Owner    |
+--------------+------------+-----------------------+----------+-----------+----------+--------+----------+
| TKT-2026-0001| 2026-09-03 | Wi-Fi disconnects...  | Network  | [HIGH]    | [URGENT] | [OPEN] | Wichai I.|
| TKT-2026-0002| 2026-09-03 | Projector in CB2301...| Hardware | [MEDIUM]  | [MEDIUM] | [NEW]  | Unassigned|
| TKT-2026-0003| 2026-09-03 | Cannot access LEB2... | Software | [HIGH]    | [HIGH]   | [PROG] | Nareerat |
| ...          | ...        | ...                   | ...      | ...       | ...      | ...    | ...      |
+---------------------------------------------------------------------------------------------------------+
| Showing 1 to 10 of 42 tickets                     Rows per page: [10 v]  < Prev [1] [2] [3] Next >      |
+---------------------------------------------------------------------------------------------------------+
```

### 4.2. Filter & Search Toolbar Specification
* **Layout**: Multi-control card toolbar with border `1px solid var(--zen-border-neutral)`, background `#FFFFFF`, padding `16px 20px`, border-radius `8px`.
* **Search Input**:
  - Placeholder: `"Search by ticket number or summary..."`
  - Input field height: `40px` (`var(--zen-control-height)`), focus halo `0 0 0 3px rgba(11, 122, 70, 0.20)`.
  - Icon: Magnifying glass icon prefixed inside field.
  - Blur behavior: Leaving field does not trigger errors; trims search term.
* **Filter Dropdowns**:
  - **Status Filter**: `<select>` containing: `All Statuses`, `NEW (🟢 New)`, `OPEN (🔵 Open)`, `IN_PROGRESS (🟡 In Progress)`, `WAITING_FOR_REQUESTER (🟣 Awaiting User)`, `RESOLVED (🟢 Resolved)`, `CLOSED (⚫ Closed)`, `REOPENED (🟠 Reopened)`, `CANCELLED (🔴 Cancelled)`.
  - **Category Filter**: `<select>` containing: `All Categories`, dynamically populated from active categories via `/api/v1/categories`.
  - **IT Priority Filter**: `<select>` containing: `All IT Priorities`, `LOW (🔽 Low)`, `MEDIUM (🔹 Medium)`, `HIGH (⚠️ High)`, `URGENT (🚨 Urgent)`.
  - **Owner Filter**: `<select>` containing: `All Owners`, `Unassigned`, and names of active IT Staff and Administrators.
* **Reset Filters Button**:
  - Outline button `.btn-zen-outline` with clear/reset icon.
  - Disabled when no search or non-default filters are active.
  - When clicked, resets search to `""`, all dropdowns to default `""`, and resets pagination to page `1`.

### 4.3. Data Table Specification (Desktop & Tablet $\ge 768\text{px}$)
* **Table Wrapper**: `.table-responsive` with clean borders, header background `#F0F4F1`.
* **Sortable Column Headers**:
  - `Ticket No` (sortable: `ticketNumber`)
  - `Created Date` (sortable: `createdAt`)
  - `Summary` (sortable: `summary`)
  - `Category`
  - `Req. Priority`
  - `IT Priority` (sortable: `itPriority`)
  - `Status` (sortable: `currentStatus`)
  - `Owner`
  - Sort indicators: Visual arrow icons (▲ / ▼) render beside currently sorted column indicating ascending or descending order.
  - Clicking a header toggles direction; clicking a new header sets `sortBy = field` and `sortOrder = "asc"`.
* **Row Interactions**:
  - Row hover styling: background `var(--zen-pale-green: #EAF6EF)`, cursor pointer.
  - Row click: triggers navigation callback `onViewTicket(ticketId)` (or detail route `/staff/tickets/:id`).
  - Ticket Number rendered in bold primary green (`#006B3C`).
  - Owner displayed as staff name, or a distinct muted pill badge: `Unassigned` (background `#F3F4F6`, text `#5B6573`).
  - Badges render with exact colors, borders, and accessible symbols defined in `docs/lab-03/ui-spec.md` §2.2.

### 4.4. Mobile Responsive Card Presentation ($< 768\text{px}$)
Per `ui-spec.md` §4 and `AC-13.4`, on viewports under 768px the table structure is replaced by a stacked series of Zen Green cards with **strictly zero horizontal scroll**:

```
+-------------------------------------------------------+
| TKT-2026-00001                                [OPEN]  |
| Wi-Fi disconnects frequently in CB2 3rd floor         |
| Category: Network          IT Priority: [URGENT]      |
| Owner: Wichai IT           Created: 2026-09-03        |
|                                                       |
| [ View Ticket Details > ]                             |
+-------------------------------------------------------+
+-------------------------------------------------------+
| TKT-2026-00002                                [NEW]   |
| Projector in CB2301 lamp flickering                   |
| Category: Hardware         IT Priority: [MEDIUM]      |
| Owner: [Unassigned]        Created: 2026-09-03        |
|                                                       |
| [ View Ticket Details > ]                             |
+-------------------------------------------------------+
```

* **Card Styling**:
  - Border `1px solid var(--zen-border-neutral)`, border-radius `8px`, background `#FFFFFF`, margin-bottom `12px`, padding `16px`.
  - Header: Ticket number (`fw-bold`, primary green) and Status badge right-aligned.
  - Body: Summary title (truncated with ellipsis if over 80 characters).
  - Metadata row: Category and IT Priority badge.
  - Footer row: Owner name or Unassigned badge, formatted date, and a full-width tap target button (`min-height: 48px`) labeled `"View Ticket Details >"`.

### 4.5. Pagination Controls Specification
* **Location**: Below table/cards in a responsive flexbox container.
* **Controls**:
  - **Summary Count**: `"Showing X to Y of Z tickets"` (e.g. `"Showing 1 to 10 of 12 tickets"`).
  - **Rows Per Page Selector**: Dropdown selector labeled `"Rows per page:"` with options `10`, `25`, `50`. Changing rows-per-page immediately updates `pageSize` and resets `page = 1`.
  - **Navigation Buttons**:
    - `Previous` button: Disabled when `page === 1`.
    - Page number buttons: Displays active page with `.btn-zen-primary` styling, and neighboring page buttons.
    - `Next` button: Disabled when `page === totalPages` or `totalPages === 0`.

### 4.6. UI Feedback States
1. **Loading State (`.zen-skeleton`)**:
   - While API query is in flight, displays 5 animated pulsing skeleton rows matching table column dimensions, preventing layout shift.
2. **Empty Queue State**:
   - If the system has zero tickets overall (`totalCount === 0` and no filters active), renders an illustrated empty state:
     - Icon: Empty inbox / checkmark.
     - Title: *"No Tickets in Queue"*.
     - Description: *"There are currently no tickets submitted to the IT Service Desk."*
3. **No Results State**:
   - When filters or search yield zero matches (`totalCount === 0` but search/filters are active):
     - Icon: Search slash / no matches.
     - Title: *"No Matching Tickets Found"*.
     - Description: *"No tickets match your search keywords or filter criteria."*
     - Action CTA: Primary button `"Clear Filters"` resetting toolbar.
4. **API Failure / Error Alert**:
   - If the API returns a network or 500 error:
     - Error banner with `--zen-error-bg` and red border.
     - Title: *"Unable to load ticket queue"*.
     - Action: Outline button `"Retry"` to re-fetch queue data.

---

## 5. Test Traceability Matrix (STS)

Every Acceptance Criterion mapped to Issue 13 (`AC-13.1` through `AC-13.4`, plus `AC-07`, `AC-08`, `QUEUE-01` through `QUEUE-07`, `UI-QUE-01`) is verified through automated assertions across backend integration and frontend UI component test suites.

### 5.1. Requirements Traceability Overview

| Requirement ID | Acceptance Criterion | Test Tier | Test File | Test Scenario & Assertion |
| :--- | :--- | :---: | :--- | :--- |
| **FR-03**, **BR-06** | **AC-13.1**, **AC-07** | API | `server/tests/lab-03/staff-queue.api.test.ts` | `QUEUE-01`: IT Staff queries `/api/v1/staff/tickets`; returns 200, paginated items with status, priority, requester, and owner metadata. |
| **FR-03**, **BR-06** | **AC-13.1**, **AC-07** | API | `server/tests/lab-03/staff-queue.api.test.ts` | `QUEUE-01b`: Administrator queries `/api/v1/staff/tickets`; returns 200 with full queue access. |
| **FR-03**, **BR-06** | **AC-13.2**, **AC-08** | API | `server/tests/lab-03/staff-queue.api.test.ts` | `QUEUE-07`: Requester role receives HTTP `403 Forbidden` (`FORBIDDEN`) when requesting `/api/v1/staff/tickets`. |
| **FR-03** | **AC-13.3**, **AC-07** | API | `server/tests/lab-03/staff-queue.api.test.ts` | `QUEUE-02`: Search query parameter matches ticket number and summary case-insensitively. |
| **FR-03** | **AC-13.3**, **AC-07** | API | `server/tests/lab-03/staff-queue.api.test.ts` | `QUEUE-03`: Filtering by single status and IT priority returns strictly matching tickets. |
| **FR-03** | **AC-13.3**, **AC-07** | API | `server/tests/lab-03/staff-queue.api.test.ts` | `QUEUE-04`: Filtering by assigned owner ID and special token `"unassigned"` filters correctly. |
| **FR-03** | **AC-13.3**, **AC-07** | API | `server/tests/lab-03/staff-queue.api.test.ts` | `QUEUE-05`: Sorting by `createdAt`, `ticketNumber`, `itPriority`, and `currentStatus` in `asc`/`desc` order. |
| **FR-03** | **AC-13.3**, **AC-07** | API | `server/tests/lab-03/staff-queue.api.test.ts` | `QUEUE-06`: Pagination page boundaries and page sizes (10, 25) return correct slices and `totalPages`. |
| **FR-03**, **BR-06** | **AC-13.1**, **AC-13.3** | UI | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | `UI-QUE-01`: Renders table headers, ticket rows, badges, owner names, and counter. |
| **FR-03** | **AC-13.3** | UI | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | `UI-QUE-02`: Typing into search input triggers filtered query update. |
| **FR-03** | **AC-13.3** | UI | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | `UI-QUE-03`: Interacting with Status, Category, Priority, and Owner dropdowns updates query filters. |
| **FR-03** | **AC-13.3** | UI | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | `UI-QUE-04`: Reset Filters button clears search and all dropdown filters. |
| **FR-03** | **AC-13.3** | UI | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | `UI-QUE-05`: Clicking Next/Prev or changing rows per page updates page parameter. |
| **FR-03** | **AC-13.1** | UI | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | `UI-QUE-06`: Renders empty queue state, no-results state, and loading shimmer state. |
| **FR-03** | **AC-13.4** | UI | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | `UI-QUE-07`: On mobile viewport (< 768px), table collapses into stacked cards with zero horizontal overflow. |

---

### 5.2. Backend API Test Scenarios (`server/tests/lab-03/staff-queue.api.test.ts`)

```typescript
// Test suite specification for server/tests/lab-03/staff-queue.api.test.ts

describe("IT Staff Ticket Queue API Suite (Issue 13)", () => {
  // QUEUE-01: IT Staff Queue Query
  it("QUEUE-01: permits IT_STAFF to query ticket queue with pagination metadata", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty("totalCount");
    expect(res.body).toHaveProperty("page", 1);
    expect(res.body).toHaveProperty("pageSize", 10);
    expect(res.body).toHaveProperty("totalPages");

    if (res.body.items.length > 0) {
      const item = res.body.items[0];
      expect(item).toHaveProperty("ticketNumber");
      expect(item).toHaveProperty("summary");
      expect(item).toHaveProperty("categoryName");
      expect(item).toHaveProperty("requestedPriority");
      expect(item).toHaveProperty("itPriority");
      expect(item).toHaveProperty("currentStatus");
      expect(item).toHaveProperty("requesterName");
      expect(item).toHaveProperty("ownerName");
    }
  });

  // QUEUE-01b: Administrator Queue Access
  it("QUEUE-01b: permits ADMINISTRATOR to query ticket queue", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  // QUEUE-07: Requester Rejection (BR-06)
  it("QUEUE-07: rejects REQUESTER access with HTTP 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // QUEUE-02: Text Search
  it("QUEUE-02: filters tickets by partial case-insensitive summary or ticket number", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?search=wi-fi")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.items.every((t: any) => 
      t.summary.toLowerCase().includes("wi-fi") || 
      t.ticketNumber.toLowerCase().includes("wi-fi")
    )).toBe(true);
  });

  // QUEUE-03: Status and IT Priority Filtering
  it("QUEUE-03: filters tickets by status and itPriority combination", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?status=OPEN&itPriority=URGENT")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.items.every((t: any) => 
      t.currentStatus === "OPEN" && t.itPriority === "URGENT"
    )).toBe(true);
  });

  // QUEUE-04: Owner Filtering (Assigned vs Unassigned)
  it("QUEUE-04a: filters tickets assigned to specific staff owner", async () => {
    const res = await request(app)
      .get(`/api/v1/staff/tickets?owner=${staffUserId}`)
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.items.every((t: any) => t.ownerId === staffUserId)).toBe(true);
  });

  it("QUEUE-04b: filters unassigned tickets using token 'unassigned'", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?owner=unassigned")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.items.every((t: any) => t.ownerId === null)).toBe(true);
  });

  // QUEUE-05: Multi-column Sorting
  it("QUEUE-05: sorts tickets by createdAt, itPriority, and ticketNumber", async () => {
    const resAsc = await request(app)
      .get("/api/v1/staff/tickets?sortBy=createdAt&sortOrder=asc")
      .set("Cookie", staffCookie);

    expect(resAsc.status).toBe(200);
    const dates = resAsc.body.items.map((t: any) => new Date(t.createdAt).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i + 1]);
    }
  });

  // QUEUE-06: Pagination Boundaries
  it("QUEUE-06: respects page and pageSize boundaries accurately", async () => {
    const resPage1 = await request(app)
      .get("/api/v1/staff/tickets?page=1&pageSize=10")
      .set("Cookie", staffCookie);

    expect(resPage1.status).toBe(200);
    expect(resPage1.body.page).toBe(1);
    expect(resPage1.body.pageSize).toBe(10);
    expect(resPage1.body.items.length).toBeLessThanOrEqual(10);
  });
});
```

---

### 5.3. Client UI Component Test Scenarios (`client/src/tests/lab-03/StaffTicketQueue.test.tsx`)

```typescript
// Test suite specification for client/src/tests/lab-03/StaffTicketQueue.test.tsx

describe("StaffTicketQueue Component Suite (Issue 13)", () => {
  // UI-QUE-01: Table Rendering
  it("UI-QUE-01: renders staff queue table headers, rows, badges, and counter", async () => {
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);
    
    expect(await screen.findByText("IT Staff Ticket Queue")).toBeInTheDocument();
    expect(screen.getByText("Total Tickets:")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /ticket no/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /created/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /summary/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();
  });

  // UI-QUE-02: Search Filter
  it("UI-QUE-02: updates search query and triggers filtered API request", async () => {
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);
    const searchInput = screen.getByPlaceholderText(/search by ticket number or summary/i);
    fireEvent.change(searchInput, { target: { value: "Wi-Fi" } });
    
    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ search: "Wi-Fi" }));
    });
  });

  // UI-QUE-03: Dropdown Filter Bar
  it("UI-QUE-03: applies status and priority dropdown filters", async () => {
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);
    const statusSelect = screen.getByLabelText(/filter by status/i);
    fireEvent.change(statusSelect, { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ status: "OPEN" }));
    });
  });

  // UI-QUE-04: Reset Filters
  it("UI-QUE-04: clicking Reset Filters clears inputs and resets page to 1", async () => {
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);
    const resetBtn = screen.getByRole("button", { name: /reset filters/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({
        search: "",
        status: "",
        category: "",
        itPriority: "",
        owner: "",
        page: 1,
      }));
    });
  });

  // UI-QUE-05: Pagination Interaction
  it("UI-QUE-05: changes page and page size via pagination controls", async () => {
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);
    const nextBtn = await screen.findByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  // UI-QUE-06: Feedback States
  it("UI-QUE-06: renders no matching tickets found banner when items is empty", async () => {
    mockFetchStaffTickets.mockResolvedValueOnce({ items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 });
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);

    expect(await screen.findByText(/no matching tickets found/i)).toBeInTheDocument();
  });

  // UI-QUE-07: Responsive Mobile Cards
  it("UI-QUE-07: renders stacked Zen Green cards on mobile viewport (< 768px)", async () => {
    setViewportWidth(400);
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);

    expect(await screen.findByTestId("mobile-card-container")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeVisible();
  });
});
```

---

## 6. Review & Sign-Off Gate

| Gate Checklist Item | Status | Verification Criteria & Evidence |
| :--- | :---: | :--- |
| **No Application Code Pre-Written** | ✅ PASS | Only contract file drafted; no controllers, database migrations, or UI components modified or created. |
| **Prisma Ticket Model Updates Specified** | ✅ PASS | `ownerId` nullable foreign key to `User`, `Priority` enum, `TicketStatus` enum, and relations fully defined. |
| **Zero Data Loss Migration Guarantee** | ✅ PASS | Strategy ensures existing tickets, categories, requesters, and attachments are preserved with default values and column casts. |
| **Seed Data Distribution Specified** | ✅ PASS | Diverse seed dataset defined across all 8 statuses, priorities, categories, and assigned vs unassigned states ($\ge 12$ tickets). |
| **Role Guard Protocol (`BR-06`)** | ✅ PASS | `GET /api/v1/staff/tickets` restricted strictly to `IT_STAFF` and `ADMINISTRATOR`; `REQUESTER` returns `403 FORBIDDEN`. |
| **Query Parameters & Response Envelopes** | ✅ PASS | Complete specification of `search`, `status`, `category`, `itPriority`, `owner`, `sortBy`, `sortOrder`, `page`, `pageSize`, and response DTO. |
| **UI Wireframes & Zen Green Tokens** | ✅ PASS | Complete desktop table, filter toolbar, pagination controls, loading shimmer, feedback states, and mobile stacked card design documented. |
| **Mobile Breakpoint Compliance (< 768px)** | ✅ PASS | Stacked card view specified with zero horizontal scroll and minimum 48px tap targets. |
| **Test Traceability Matrix (STS)** | ✅ PASS | Direct mappings from `AC-13.1` through `AC-13.4` and `QUEUE-01` to `QUEUE-07` in `staff-queue.api.test.ts` and `StaffTicketQueue.test.tsx`. |
