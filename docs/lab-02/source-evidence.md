# TokTickIT Sprint 2 (Lab 2) — Source Evidence Dossier

**Document Status**: Official Source Evidence Baseline  
**Project**: TokTickIT — CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Target Milestone**: Lab 2 (Sprint 2) Requester Ticketing MVP with UI Foundation  
**Branch**: `feature/5-spec-and-tests` (derived from `lab2-staging`)  

---

## 1. Reference Requirements Documents & Authority Baseline

This dossier consolidates the engineering requirements, architectural constraints, business invariants, security controls, and UI design rules for Sprint 2, rigorously grounded in the course reference materials:

1. **[Lab 2 Labsheet] `docs/reference/Lab_02_labsheet.md`**  
   *Authoritative course assignment specification, functional scope, business rules, grading rubric (60 points total), and delivery requirements.*
2. **[System-Level SDS v1.0] `docs/reference/TokTickIT-System-Level-SDS-v1.0.md`**  
   *Document ID: SDS-SYS-001 (Version 1.0 Approved, 17 August 2026). Approved system-wide architecture, technology stack, data dictionary, cross-cutting rules, and Decision Register (D-01 through D-12).*
3. **[GitHub Workflow Guide] `docs/reference/TokTickIT_GitHub_Workflow_Guide_TH_EN.pdf`**  
   *Course-mandated Git, GitHub Projects, Kanban board (6 columns), issue linking, peer review agreement, and staged integration workflow.*

---

## 2. Baseline Architecture & Technology Stack Verification

Citations: *SDS v1.0* §"Design Basis" (p. 4), §"Architecture Style" (p. 4-5), §"Technology Stack" (p. 6), Decisions `D-06`, `D-08`, `D-12`; *Lab 2 Labsheet* §5, §6.

| Tier / Component | Technology | Version / Configuration in Codebase | Source Requirement & Constraint |
| :--- | :--- | :--- | :--- |
| **Presentation Tier** | React + TypeScript + Vite | React `18.3.1`, Vite `6.0.5`, TS `5.7.2` | Single Page Application (SPA). Communicates strictly through published REST API endpoints. Never accesses DB directly. (*SDS v1.0* §"Technology Stack", p. 6) |
| **Styling Framework** | Bootstrap + Zen Green CSS Tokens | Bootstrap `5.3.3` + custom CSS variables | Bootstrap responsive layout grid paired with source-mandated Zen Green design language tokens. Raw Bootstrap color overrides prohibited. (*Lab 2 Labsheet* §7) |
| **Application Tier** | Node.js + Express + TypeScript | Express `4.21.2`, TS `5.7.2`, `cors` `2.8.5` | REST API routes mounted under `/api/v1` (with `/api` compatibility). Decoupled controller layer handling DTO validation; business logic isolated in domain services. (*SDS v1.0* §"Deployment Units", p. 6) |
| **Persistence Tier** | PostgreSQL + Prisma ORM | Prisma Client & CLI `5.22.0` | Relational integrity, foreign keys, unique constraints, and schema migrations. All mutations use Prisma transactions. Direct string SQL concatenation prohibited. (*SDS v1.0* §"Domain Data Model", p. 7; *Lab 2 Labsheet* §5) |
| **Storage Tier** | Local Storage Adapter / SeaweedFS | Abstracted Storage Service (Local `./uploads` in dev; SeaweedFS S3-compatible in prod) | Object storage for attachment binaries. Database stores metadata only. Client never receives internal storage keys. (*SDS v1.0* Decision `D-06`, p. 2, 6, 14) |
| **Testing Pipeline** | Vitest + Supertest + Playwright | Vitest `2.1.8`, Supertest `7.0.0`, RTL `16.1.0` | Vitest for domain logic/validators; Supertest for API routes with isolated test DB; Playwright for responsive browser E2E flows. (*SDS v1.0* §"Testing Architecture", p. 17; *Lab 2 Labsheet* §9) |
| **Deployment Topology** | Single Local Server | One host running Node.js Express, PostgreSQL, and file storage | Local server deployment for course labs. Express serves compiled SPA and API endpoints. (*SDS v1.0* Decision `D-08`, p. 2, 5) |

---

## 3. Requirement Inventory & Traceability Baseline

### 3.1. Functional Requirements (FR)
Citations: *Lab 2 Labsheet* §1, §3, §4.1, §4.4, §6, §8; *SDS v1.0* §"System Scope" (p. 3-4), §"Authorization Model" (p. 10).

* **FR-01: Development Requester Context Selection (Simulated Login)**  
  The system must provide a simulated login screen allowing the user to select an active Development Requester from PostgreSQL. The selection establishes the active testing context for all subsequent ticket creation, list viewing, ticket inspection, and attachment actions. (*Lab 2 Labsheet* §3, §8.1)
* **FR-02: Ticket Creation**  
  An active Requester can create a new IT support ticket by specifying Category, Related System, Requested Priority, Ticket Summary, Detailed Description, and optional initial Attachments. The system saves the record atomically and issues a unique official Ticket Number. (*Lab 2 Labsheet* §3, §4.4, §8.2; *SDS v1.0* p. 10)
* **FR-03: My Tickets Listing & History**  
  The system provides a dedicated list view displaying all tickets owned by the currently selected Requester. The list supports free-text search across Summary and Ticket Number, multi-attribute filtering (Category, Status), column sorting, and bounded pagination. (*Lab 2 Labsheet* §3, §6.1, §8.4)
* **FR-04: Requester Ticket Detail Inspection**  
  The system provides a read-only Ticket Detail view displaying all core metadata of an owned ticket. Requesters can inspect ticket status and view active/removed attachment lists. (*Lab 2 Labsheet* §3, §8.5)
* **FR-05: Attachment Lifecycle Management**  
  Requesters can upload permitted attachments during ticket creation or add them to an existing owned ticket in the Detail view, download active attachment binaries, and soft-remove an attachment with a mandatory removal reason. (*Lab 2 Labsheet* §4.5, §8.5; *SDS v1.0* §"Attachment Architecture", p. 14-15)

### 3.2. Business Rules (BR)
Citations: *Lab 2 Labsheet* §4.3, §4.4, §4.5, §5.3; *SDS v1.0* Decisions `D-02`, `D-03`, `D-10`, `D-11`, §"Cross-Feature Workflow Rules" (p. 11-12).

* **BR-01: Official Ticket Number Generation**  
  The official Ticket Number must follow the format `TKT-YYYY-NNNNN`. It is generated by the backend inside a serializable database transaction with an annual sequence counter reset. The field is read-only and immutable. (*SDS v1.0* Decision `D-10`, p. 2, 9; *Lab 2 Labsheet* §4.3, §4.4)
* **BR-02: Initial Ticket Status Lifecycle**  
  Every newly created ticket begins in status `New`. In Sprint 2, Requesters cannot transition status to `Assigned`, `In Progress`, `Resolved`, or `Closed`. (*SDS v1.0* Decision `D-02`, p. 2, 11; *Lab 2 Labsheet* §4.3)
* **BR-03: Simulated Development Context Boundary**  
  Lab 2 uses a temporary Development Requester Selector. Passwords, password hashing (Argon2id), session cookies, and login/logout screens are strictly out of scope and deferred to Lab 3. The selected `requesterId` represents the actor identity. (*Lab 2 Labsheet* §4.2, §4.3, §8.1; *SDS v1.0* Decision `D-04`)
* **BR-04: Ticket Ownership Isolation**  
  A Requester may only view, search, and list tickets where `ticket.requesterId == currentRequesterId`. Requests to retrieve tickets owned by another requester must be rejected at the API boundary (HTTP 403 or 404). (*Lab 2 Labsheet* §3, §8.11 `AC-03`, §14 Part 7; *SDS v1.0* §"Authorization Model", p. 10)
* **BR-05: Read-Only Detail View in Sprint 2**  
  In Lab 2, the Ticket Detail view is strictly read-only for ticket header attributes. Ticket editing, IT Staff queue claiming, Public Comments, Internal Notes, Actions Taken, and resolution flows are excluded. (*Lab 2 Labsheet* §4.2, §8.5)
* **BR-06: Attachment Validation Constraints**  
  Allowed file extensions and MIME types: strictly `.jpg`/`.jpeg` (`image/jpeg`), `.png` (`image/png`), `.webp` (`image/webp`), and `.pdf` (`application/pdf`). Maximum file size: **5 MB** ($5,242,880$ bytes). Maximum active attachments per ticket: **5 files**. (*SDS v1.0* §"Attachment Architecture", p. 14; *Lab 2 Labsheet* §4.5)
* **BR-07: Attachment Soft-Removal & Audit Tombstone**  
  Attachment removal is implemented as a soft removal. The database row is retained with `deletedAt = NOW()`, `deletedById = currentRequesterId`, and a non-empty `removalReason`. The binary file in storage is deleted. Removed attachments cannot be previewed or downloaded (HTTP 404/410). (*SDS v1.0* Decision `D-11`, p. 2, 14-15; *Lab 2 Labsheet* §4.5)
* **BR-08: Attachment Ownership & Access Control**  
  Requesters may only download attachments belonging to tickets they own. Direct access by an unauthorized user to an attachment ID must return HTTP 403 or 404. Requesters may only soft-remove attachments they uploaded on tickets that are not closed. (*SDS v1.0* §"Authorization Model", p. 10; *Lab 2 Labsheet* §4.5, §14 Part 8)
* **BR-09: Active User Selector Filtering**  
  The Development Requester selector must query and display only active users (`WHERE isActive = true`). Inactive users must never appear in the dropdown. (*Lab 2 Labsheet* §5.3, §8.1)
* **BR-10: Form Blur Validation Behavior**  
  Field inputs with invalid format/data do not show premature error messages while typing; validation errors appear only upon blur or upon explicit form submission. Submission validation errors must appear directly beneath the invalid input control. (*Lab 2 Labsheet* §8.3; *AGENTS.md* §4)

---

## 4. UI Specification Baseline ("Zen Green" Design System)

Citations: *Lab 2 Labsheet* §7 ("Zen Green Theme UI Specification", p. 4-5), §8.2, §8.3, §8.7; *SDS v1.0* Decision `D-09` (p. 2, 13).

### 4.1. Color Tokens

```css
:root {
  /* Brand Green Core Palette (Lab 2 Labsheet §7) */
  --zen-primary-green:    #006B3C; /* App header, primary buttons, strong emphasis */
  --zen-secondary-green:  #0B7A46; /* Active tabs, hover states, focus accents, links */
  --zen-pale-green:       #EAF6EF; /* Selected card/table row, success callout surface */
  --zen-page-bg:          #F5F7F6; /* Application-wide background */
  --zen-surface:          #FFFFFF; /* Card, modal, and panel background */
  
  /* Text & Typography */
  --zen-text-primary:     #1C2826; /* Dark charcoal-green text (never pure #000) */
  --zen-text-muted:       #5B6573; /* Secondary labels, timestamps, hints */
  
  /* Controls & Borders */
  --zen-border-neutral:   #D1D5DB; /* Standard editable field border */
  --zen-field-readonly:   #F0F4F1; /* Shaded background for read-only controls */
  
  /* Feedback States */
  --zen-error:            #B3261E; /* Error text, error border, required asterisk */
  --zen-warning:          #D97706; /* Amber warning callout/badge */
  --zen-success:          #2E7D32; /* Success confirmation icon and text */
}
```

### 4.2. Component Rules & Interaction States
* **Labels**: Rendered above controls with consistent medium weight (`500`) and standard bottom margin (`0.25rem`).
* **Required Indicators**: Marked with a red asterisk (`<span class="text-danger">*</span>`). Asterisk supplements explicit inline validation errors.
* **Input Consistency**: Uniform height (`38px` / Bootstrap form-control default). Description textarea is taller (min 4 rows, `120px`), vertically resizable only.
* **Buttons**:
  * Primary action: Solid Zen Primary Green (`#006B3C`), hover `#0B7A46`, white text.
  * Secondary / Cancel: Outlined neutral or subtle surface with visible border.
  * Submitting state: Disabled, showing inline spinner with "Submitting…" text.
* **Inline Validation Placement**: Red validation error text rendered directly below the corresponding input control (`.invalid-feedback` or `.zen-field-error`). Form input data is preserved upon validation or API failure.
* **Empty & No-Results States**:
  * Requester Selector: "No active requesters available. Contact administrator."
  * My Tickets (Zero Total): "You have not submitted any IT tickets yet. Click 'Create Ticket' to get started."
  * My Tickets (Filter Yields Zero): "No tickets match your search or filter criteria. Try adjusting your filters or search term."

### 4.3. Responsive Breakpoints
* **Desktop ($\ge 992\text{px}$)**: Centered container (max-width $1140\text{px}$); two-column layout for ticket creation form (Category + System left, Summary + Description right); full tabular grid for My Tickets.
* **Tablet ($768\text{px} - 991\text{px}$)**: Fluid container; two-column layout preserved where possible; ticket table with horizontal scrolling or condensed columns.
* **Mobile ($< 768\text{px}$)**: Strict single-column stack; full-width touch-friendly buttons ($\ge 44\text{px}$ tap height); ticket list transforms into stacked cards; no horizontal page scrolling.

---

## 5. Course Delivery & Git Engineering Workflow

Citations: *TokTickIT_GitHub_Workflow_Guide_TH_EN.pdf* (p. 1-14); *Lab 2 Labsheet* §10, §14.

* **Branching Strategy**:
  * Staging branch: `lab2-staging` (branched from `main` after Lab 1 completion).
  * Feature branches: Each issue developed on its designated feature branch (e.g. `feature/5-spec-and-tests`, `feature/2-requester-context`).
  * PR Workflow: Feature branches merge into `lab2-staging` via peer-reviewed Pull Requests.
  * Release PR: Final PR from `lab2-staging` to `main`.
* **Kanban Statuses (Exact 6 Columns)**:
  1. `Backlog`
  2. `Specified`
  3. `Started`
  4. `PR Review`
  5. `Fixing`
  6. `Done`
* **Workflow Agreements (*Guide* Part 9, p. 14)**:
  * Every Pull Request must be linked to its corresponding GitHub Issue via the Development panel.
  * The **reviewer**, not the author, merges the Pull Request after formal approval.
  * The PR author must reply to every review comment before merge.
  * Every merged issue card is moved to `Done`.

---

## 6. Discrepancy & Conflict Analysis

| Item | Source Document Statement | Conflicting Document Statement | Grounded Resolution for Lab 2 |
| :--- | :--- | :--- | :--- |
| **1. Legacy ERP Template Drift** | `docs/spec-core.md`, `style-contract.md`, `AGENTS.md` describe an ASP.NET Core Razor Pages, C#, EF Core, SQL Server 2025, VB6 migration system. | `TokTickIT-System-Level-SDS-v1.0.md` and `Lab_02_labsheet.md` mandate Node.js, Express, TypeScript, Prisma, PostgreSQL, React (Vite). | **Resolution**: The legacy C# / Razor Pages text is unpurged starter-template boilerplate. TokTickIT Sprint 2 is strictly governed by `Lab_02_labsheet.md` and `TokTickIT-System-Level-SDS-v1.0.md`. |
| **2. Brand Color: Corporate vs. Zen Green** | `SDS v1.0` Decision `D-09` defines KMUTT Corporate Orange (`#FA4616`) and Yellow (`#FFC72C`). | `Lab 2 Labsheet` §3, §7, §14 mandate the **Zen Green Theme** (`#006B3C`, `#0B7A46`, `#EAF6EF`, `#F5F7F6`). | **Resolution**: The Labsheet defines the specific IT Service Desk theme tokens. Zen Green is mandatory for Lab 2. |
| **3. API Route Prefix: `/api` vs `/api/v1`** | `SDS v1.0` §"API Design Standards" mandates `/api/v1`. | `Lab 2 Labsheet` §6 and existing Lab 1 endpoints use `/api/health`, `/api/categories`. | **Resolution**: Mount Sprint 2 endpoints under `/api/v1` and provide backward-compatible `/api` aliases for Lab 1 endpoints. |
| **4. Authentication: Full Auth vs. Simulated Selector** | `SDS v1.0` Decisions `D-04`, `D-05` describe Argon2id password hashing, server sessions, and CSRF cookies. | `Lab 2 Labsheet` §1, §4.2, §4.3 (`BR-03`) explicitly excludes real auth and mandates the Development Requester Selector. | **Resolution**: Implement simulated identity context passing `requesterId` in Lab 2. Real auth is deferred to Lab 3. |
| **5. Attachment Storage: SeaweedFS vs. Local Adapter** | `SDS v1.0` Decision `D-06` mandates SeaweedFS with S3 client. | Codebase currently contains no SeaweedFS binary or S3 client package. | **Resolution**: Abstract storage operations behind an `AttachmentStorageService`. Implement a local filesystem adapter (`server/uploads/`) for dev/testing that conforms to the S3-compatible interface. |
