# TokTickIT Sprint 2 (Lab 2) — Software Test Specification (STS) & Test Plan

**Document Status**: Official Software Test Plan Baseline  
**Target Milestone**: Lab 2 (Sprint 2) Requester Ticketing MVP  
**Test Frameworks**: Vitest 2.1.8, Supertest 7.0.0, React Testing Library 16.1.0, Playwright  
**Traceability Reference**: [specification.md](./specification.md), [api-spec.md](./api-spec.md)  

---

## 1. Test Strategy & Quality Gates

TokTickIT implements Test-Driven Development (TDD) and Spec-Driven Verification:
* **Unit Tests (Vitest)**: Validate pure utility logic, ticket number formatting, and input validators without network or database dependencies.
* **API Integration Tests (Supertest + Isolated PostgreSQL)**: Verify HTTP status codes, request validation, database transactions, and server-side cross-requester ownership boundaries.
* **UI Component Tests (Vitest + React Testing Library)**: Verify component rendering, inline validation errors, busy submitting states, empty vs. no-results cards, and user switching.
* **Browser E2E Tests (Playwright)**: Verify full end-to-end workflows (selecting requester $\rightarrow$ creating ticket $\rightarrow$ verifying in My Tickets $\rightarrow$ inspecting detail $\rightarrow$ uploading and soft-removing attachment).

---

## 2. Planned Test Catalog

| Test ID | Level | Mapped AC | Description / Scenario | Expected Result | Designated Test File Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | AC-07 | `GET /api/v1/requesters` filters inactive users | 200 OK; returns only active users; inactive user excluded | `server/tests/lab-02/requesters.api.test.ts` |
| **API-02** | API | AC-01 | `POST /api/v1/tickets` with valid payload | 201 Created; saved in DB with status `NEW` and `TKT-YYYY-NNNNN` | `server/tests/lab-02/create-ticket.api.test.ts` |
| **API-03** | API | AC-01 | `POST /api/v1/tickets` missing summary or description | 400 Bad Request; structured `fieldErrors` returned | `server/tests/lab-02/create-ticket.api.test.ts` |
| **API-04** | API | AC-03 | `GET /api/v1/tickets` lists only owned tickets | 200 OK; returns Requester A's tickets; Requester B's tickets omitted | `server/tests/lab-02/my-tickets.api.test.ts` |
| **API-05** | API | AC-03 | `GET /api/v1/tickets` search and category filtering | 200 OK; returns matching subset with correct pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` |
| **API-06** | API | AC-03, AC-04 | `GET /api/v1/tickets/:id` cross-requester access rejection | 403 Forbidden or 404 Not Found when requesting unowned ticket | `server/tests/lab-02/ticket-detail.api.test.ts` |
| **API-07** | API | AC-05 | `POST /api/v1/tickets/:id/attachments` upload valid file | 201 Created; metadata saved; file stored under UUID | `server/tests/lab-02/attachments.api.test.ts` |
| **API-08** | API | AC-05 | Upload file exceeding 5MB or invalid extension | 400 Bad Request; upload rejected | `server/tests/lab-02/attachments.api.test.ts` |
| **API-09** | API | AC-05 | Upload 6th active file to ticket | 400 Bad Request; limit error returned | `server/tests/lab-02/attachments.api.test.ts` |
| **API-10** | API | AC-06 | `DELETE /api/v1/attachments/:id` with valid reason | 200 OK; `deletedAt` set; binary deleted from storage | `server/tests/lab-02/attachments.api.test.ts` |
| **API-11** | API | AC-06 | `GET /api/v1/attachments/:id/download` for soft-deleted file | 404 Not Found or 410 Gone; download permanently blocked | `server/tests/lab-02/attachments.api.test.ts` |
| **API-12** | API | AC-06 | Cross-requester attachment download attempt | 403 Forbidden or 404 Not Found | `server/tests/lab-02/attachments.api.test.ts` |
| **UI-01** | UI | AC-02 | Requester Selector modal renders active users | Dropdown contains active users; displays disclaimer banner | `client/tests/lab-02/RequesterSelector.test.tsx` |
| **UI-02** | UI | AC-02 | Selecting user updates context and header | Header renders active user; enables ticketing navigation | `client/tests/lab-02/RequesterSelector.test.tsx` |
| **UI-03** | UI | AC-08 | Create Ticket submission with empty required fields | Submission blocked; inline red error messages render below fields | `client/tests/lab-02/CreateTicket.test.tsx` |
| **UI-04** | UI | AC-01 | Submit button transitions to busy state | Button disabled with spinner and "Submitting…" text | `client/tests/lab-02/CreateTicket.test.tsx` |
| **UI-05** | UI | AC-01 | Successful ticket creation renders Confirmation Card | Displays generated ticket number box with Copy and Detail links | `client/tests/lab-02/CreateTicket.test.tsx` |
| **UI-06** | UI | AC-03 | My Tickets renders table with badges | Displays ticket rows, status/priority badges, and pagination | `client/tests/lab-02/MyTickets.test.tsx` |
| **UI-07** | UI | AC-03 | Empty list vs. No results display | Centered empty card with action button renders appropriately | `client/tests/lab-02/MyTickets.test.tsx` |
| **UI-08** | UI | AC-04 | Ticket Detail displays read-only fields | All header fields rendered in read-only styled controls | `client/tests/lab-02/TicketDetail.test.tsx` |
| **UI-09** | UI | AC-06 | Attachment soft-removal modal flow | Modal prompts for reason; soft-removed file styled as tombstone | `client/tests/lab-02/AttachmentSection.test.tsx` |
| **E2E-01** | E2E | AC-01, AC-03 | Full Requester Lifecycle workflow | User selects requester $\rightarrow$ creates ticket $\rightarrow$ finds in My Tickets $\rightarrow$ views detail | `e2e/lab-02/requester-ticket-flow.spec.ts` |

---

## 3. Acceptance Criteria Traceability Matrix

| Acceptance Criterion | Mapped Automated Tests | Test Level | Verification Focus |
| :--- | :--- | :--- | :--- |
| **AC-01 (Ticket Creation)** | API-02, UI-04, UI-05, E2E-01 | API, UI, E2E | Atomicity, Ticket Number format `TKT-YYYY-NNNNN`, Success screen |
| **AC-02 (Requester Context)** | API-01, UI-01, UI-02 | API, UI | Active user selection, simulated identity context, header display |
| **AC-03 (Ownership Isolation)** | API-04, API-05, API-06, UI-06, E2E-01 | API, UI, E2E | Server-side query filtering, rejecting unauthorized ticket IDs |
| **AC-04 (Read-Only Detail)** | API-06, UI-08, E2E-01 | API, UI | Read-only presentation, absence of edit controls in Lab 2 |
| **AC-05 (Attachment Validation)** | API-07, API-08, API-09 | API | 5MB size limit, JPG/PNG/WEBP/PDF types, max 5 active files |
| **AC-06 (Soft-Removal Audit)** | API-10, API-11, API-12, UI-09 | API, UI | Mandatory reason, binary deleted, tombstone metadata, blocked download |
| **AC-07 (Inactive User Exclusion)** | API-01, UI-01 | API, UI | `WHERE isActive = true` strictly excludes inactive accounts |
| **AC-08 (Blur & Inline Errors)** | API-03, UI-03 | API, UI | Blur validation clears input; inline errors appear below controls |
| **AC-09 (Responsive Layouts)** | UI-06, E2E-01 | UI, Visual | Desktop table, mobile cards, 48px tap targets, zero horizontal scroll |

---

## 4. Test Commands & Quality Execution

All tests are executable via documented standard commands:

```bash
# Server API & Integration Tests
cd server
npm test

# Client UI Component Tests
cd ../client
npm test

# Browser End-to-End Tests
npx playwright test
```

---

## 5. Final Results Recording Template

*(To be filled upon completion of implementation issues in `lab2-staging`)*

| Test ID | Command / Runner | Outcome | Duration | Evidence Reference |
| :--- | :--- | :--- | :--- | :--- |
| API-01 to API-12 | `npm test` (server) | Pending Implementation | — | `server/tests/lab-02/` |
| UI-01 to UI-09 | `npm test` (client) | Pending Implementation | — | `client/tests/lab-02/` |
| E2E-01 | `npx playwright test` | Pending Implementation | — | `e2e/lab-02/` |
