# Feature 17 Engineering Contract: Sprint 4 Engineering Contract & Software Test Planning

**Feature Title**: Sprint 4 Engineering Contract & Software Test Planning  
**Branch Name**: `feature/17-spec-and-tests` (Issue 17)  
**Base Branch**: `lab4-staging`  
**Document Status**: Approved Feature Baseline  
**Author**: TokTickIT Engineering Team  
**Traceability References**:
* [TokTickIT-System-Level-SDS-v1.0.pdf](../../reference/TokTickIT-System-Level-SDS-v1.0.pdf) (System Architecture, DB Design, Invariants)
* [Lab_04_labsheet.pdf](../../reference/Lab_04_labsheet.pdf) (§1–§14)
* [docs/lab-04/specification.md](../../lab-04/specification.md) (Feature SDS: Actions Taken, Ticket Workflow, Dashboards)
* [docs/lab-04/ui-spec.md](../../lab-04/ui-spec.md) (UI Specification & Zen Green Design Tokens)
* [docs/lab-04/api-spec.md](../../lab-04/api-spec.md) (REST API Contract & DTO Schemas)
* [docs/lab-04/tests.md](../../lab-04/tests.md) (Software Test Specification Template)
* [docs/lab-04/poc-scope-and-issues.md](../../lab-04/poc-scope-and-issues.md) (Sprint 4 Issue Decomposition)
* [AGENTS.md](../../../AGENTS.md) (Work Norms: Closed-World Rule, Spec-DD, Test-DD)

---

## 1. Feature Scope & Objectives

### 1.1. Strategic Objectives
Issue 17 establishes the authoritative specification baseline, UI/API contracts, and software test planning for TokTickIT Sprint 4 (Lab 4). It defines the complete contracts for:
1. **Actions Taken Subsystem**: Parent-child relationship under tickets with auto-derived performer attribution and conditional follow-up note rules.
2. **Definitive Ticket Workflow & Resolution Gate**: Complete 8-state transition matrix and strict resolution gate blocking status closure on tickets with zero actions taken.
3. **Role-Appropriate Dashboards**: Scoped, authoritative operational summaries for Requesters, IT Staff, and Administrators.
4. **Scaffolding Infrastructure**: Scaffolding test directories and visual screenshot artifact directories.

### 1.2. Scope Exclusions
In accordance with SDD Step 6 and Issue 17 bounds:
* **No Application Code**: Zero backend Express routes, controllers, or services.
* **No Database Migrations**: Zero Prisma schema modifications or migration executions.
* **No UI Component Implementation**: Zero React view components or CSS stylesheet changes.
* **No Test Assertion Scripts**: Zero executable Vitest or Playwright test files authored.

---

## 2. Deliverables Checklist

* [x] `docs/lab-04/specification.md` (Feature SDS: FR-01–FR-06, BR-01–BR-14, 3 DB Decisions, Migration Strategy, AC-01–AC-16, DoD)
* [x] `docs/lab-04/ui-spec.md` (Zen Green tokens, screen wireframes, responsive breakpoints, feedback & a11y checklist)
* [x] `docs/lab-04/api-spec.md` (REST API contracts for Actions Taken, Dashboards, and Status Patching)
* [x] `docs/lab-04/tests.md` (Software Test Specification with AC traceability matrix and test catalog)
* [x] `docs/lab-04/poc-scope-and-issues.md` (Sprint 4 six-issue decomposition: Issues 17 to 22)
* [x] `docs/lab-04/reviewer.md` (Peer review record template)
* [x] `docs/lab-04/ai-use.md` (AI prompt log and reflection essay template)
* [x] `docs/features/17-spec-and-tests/plan.md` (Technical implementation plan)
* [x] Directory scaffolding:
  - `server/tests/lab-04/`
  - `client/src/tests/lab-04/`
  - `e2e/lab-04/`
  - `artifacts/lab-04/screenshots/staff-dashboard/`
  - `artifacts/lab-04/screenshots/requester-dashboard/`
  - `artifacts/lab-04/screenshots/actions-taken/`

---

## 3. Acceptance Criteria (Issue 17 Deliverables)

* **AC-17.1**: Sprint 4 Feature Engineering Specification authored and compliant with §4, §5, §6 of `Lab_04_labsheet.pdf`.
* **AC-17.2**: UI Design Specification authored with Zen Green tokens, screen wireframes, and responsive breakpoints.
* **AC-17.3**: REST API Specification authored with exact endpoint schemas, DTOs, and HTTP status codes (`200`, `201`, `400`, `401`, `403`, `404`, `409 Conflict`).
* **AC-17.4**: Software Test Specification template and directory scaffolding created across server, client, e2e, and auxiliary screenshot paths.

