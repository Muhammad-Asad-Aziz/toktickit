# Lab 4 — Peer Review Record

**Course**: CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Author:** Muhammad Asad Aziz — 67070503472 — GitHub: @Muhammad-Asad-Aziz  
**Peer Reviewer:** Al Xander James Codino Ybanez — 67070503450 — GitHub: @ShortXander101205  

---

## 1. Pull Requests I Authored (Reviewed by Peer Reviewer)

Repository: [`Muhammad-Asad-Aziz/toktickit`](https://github.com/Muhammad-Asad-Aziz/toktickit)

| PR # | Feature Branch | Target Branch | Linked Issue | Reviewer Verdict | Merged By |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [#41](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/41) | `feature/17-spec-and-tests` | `lab4-staging` | Issue 17: Sprint 4 Engineering Contract & Software Test Planning | Approved | @ShortXander101205 |
| [#42](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/42) | `feature/18-actions-taken-foundation` | `lab4-staging` | Issue 18: Actions Taken Data Model, Migration, Seed & Core APIs | Approved | @ShortXander101205 |
| [#43](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/43) | `feature/19-actions-taken-ui` | `lab4-staging` | Issue 19: Actions Taken UI & Ticket Detail Integration | Changes Requested $\rightarrow$ Approved | @ShortXander101205 |
| [#44](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/44) | `feature/20-ticket-workflow` | `lab4-staging` | Issue 20: Ticket Workflow State Machine & Resolution Gate | Approved | @ShortXander101205 |
| [#45](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/45) | `feature/21-role-dashboards` | `lab4-staging` | Issue 21: Role-Appropriate Dashboards (Requester, Staff, Admin) | Approved | @ShortXander101205 |
| [#46](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/46) | `feature/22-regression-polish-release` | `lab4-staging` | Issue 22: End-to-End Regression, Accessibility Polish & Staged Release Integration | Approved | @ShortXander101205 |

### Reviewer Comments Received & Author Responses

#### Issue 17: Sprint 4 Engineering Contract & Software Test Planning (PR #41)
* **Reviewer Comment ([@ShortXander101205](https://github.com/ShortXander101205))**:
  > "Comprehensive specification suite covering Actions Taken data integrity, resolution gate rules, and role dashboard requirements. Test catalog clearly distinguishes unit assertions from Playwright screenshot evidence under artifacts/."
* **Author Response ([@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz))**:
  > "Thank you! Preserving strict separation between functional test assertions and visual screenshot artifacts was our key priority."

#### Issue 18: Actions Taken Data Model, Migration, Seed & Core APIs (PR #42)
* **Reviewer Comment ([@ShortXander101205](https://github.com/ShortXander101205))**:
  > "Prisma schema includes ActionTaken model with onDelete: Cascade and composite indexes. API endpoints enforce 403 on requester write attempts and auto-populate performedById from session."
* **Author Response ([@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz))**:
  > "Thanks for verifying the performer audit trail safety!"

#### Issue 19: Actions Taken UI & Ticket Detail Integration (PR #43)
* **Reviewer Comment ([@ShortXander101205](https://github.com/ShortXander101205))**:
  > "Actions Taken renders nicely on desktop, but on mobile viewports (< 768px), the action metadata badges overflowed slightly. Please verify responsive wrapping."
* **Author Response ([@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz))**:
  > "Added `flex-wrap gap-2` and fluid widths on the metadata containers in `ActionsTakenSection.tsx`. Tested across 375px mobile viewports; screenshots updated."
* **Reviewer Follow-up ([@ShortXander101205](https://github.com/ShortXander101205))**:
  > "Mobile layout looks great now. Verified in Playwright; ready to merge."

#### Issue 20: Ticket Workflow State Machine & Resolution Gate (PR #44)
* **Reviewer Comment ([@ShortXander101205](https://github.com/ShortXander101205))**:
  > "Tested premature resolution blocking when 0 actions exist; both the frontend warning and backend 400 Bad Request behave correctly. OCC 409 conflict handling cleanly preserves uncommitted drafts."
* **Author Response ([@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz))**:
  > "Appreciate your thorough verification on the optimistic concurrency edge case!"

#### Issue 21: Role-Appropriate Dashboards (Requester, Staff, Admin) (PR #45)
* **Reviewer Comment ([@ShortXander101205](https://github.com/ShortXander101205))**:
  > "Dashboard metrics properly isolate Requester tickets, Staff operational queues, and Admin account tallies. 1-click drill-downs maintain filter parameters cleanly upon navigation."
* **Author Response ([@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz))**:
  > "Thanks! The drill-downs utilize React state routing with query params to make navigation seamless."

#### Issue 22: End-to-End Regression, Accessibility Polish & Staged Release Integration (PR #46)
* **Reviewer Comment ([@ShortXander101205](https://github.com/ShortXander101205))**:
  > "All 17 server test files (149 tests), 14 client suites (97 tests), and all 9 Playwright E2E suites passed cleanly. WCAG 2.1 AA focus rings, skip links, and Escape modal dismissals verified. Approved for release."
* **Author Response ([@Muhammad-Asad-Aziz](https://github.com/Muhammad-Asad-Aziz))**:
  > "Thank you for the review and collaboration throughout Sprint 4! All quality gates passed."

---

## 2. Pull Requests I Reviewed for My Peer

Peer Repository: [`ShortXander101205/toktickit`](https://github.com/ShortXander101205/toktickit)

| PR # | Feature Branch | Target Branch | Linked Issue | Review Verdict | Merged By |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [#38](https://github.com/ShortXander101205/toktickit/pull/38) | `feature/17-spec-and-tests` | `lab4-staging` | Issue 17: Sprint 4 Engineering Contract & Software Test Planning | Approved | @Muhammad-Asad-Aziz |
| [#39](https://github.com/ShortXander101205/toktickit/pull/39) | `feature/18-actions-taken-foundation` | `lab4-staging` | Issue 18: Actions Taken Data Model, Migration, Seed & Core APIs | Changes Requested $\rightarrow$ Approved | @Muhammad-Asad-Aziz |
| [#40](https://github.com/ShortXander101205/toktickit/pull/40) | `feature/19-actions-taken-ui` | `lab4-staging` | Issue 19: Actions Taken UI & Ticket Detail Integration | Approved | @Muhammad-Asad-Aziz |
| [#41](https://github.com/ShortXander101205/toktickit/pull/41) | `feature/20-ticket-workflow` | `lab4-staging` | Issue 20: Ticket Workflow State Machine & Resolution Gate | Approved | @Muhammad-Asad-Aziz |
| [#42](https://github.com/ShortXander101205/toktickit/pull/42) | `feature/21-role-dashboards` | `lab4-staging` | Issue 21: Role-Appropriate Dashboards (Requester, Staff, Admin) | Approved | @Muhammad-Asad-Aziz |
| [#43](https://github.com/ShortXander101205/toktickit/pull/43) | `feature/22-regression-polish-release` | `lab4-staging` | Issue 22: End-to-End Regression, Accessibility Polish & Staged Release Integration | Approved | @Muhammad-Asad-Aziz |

### My Review Comments & Peer Responses

#### Issue 17: Sprint 4 Engineering Contract & Software Test Planning
* **My Comment**:
  > "Contracts are detailed and align with Lab 4 labsheet requirements. Traceability matrices for BR-01 through BR-14 are clearly documented."
* **Peer Response**:
  > "Thanks for checking the contract mapping!"

#### Issue 18: Actions Taken Data Model, Migration, Seed & Core APIs
* **My Comment**:
  > "Prisma schema looks solid, but running seed caused a foreign key error when seeding actions for unseeded ticket IDs. Please ensure seed runs sequentially after tickets are committed."
* **Peer Response**:
  > "Fixed the seed execution order in `prisma/seed.ts` so ticket IDs are resolved before creating actions. Re-tested with clean migration reset."
* **My Follow-up**:
  > "Re-ran seed and automated tests; all 15 actions-taken API tests passed. Approved!"

#### Issue 19: Actions Taken UI & Ticket Detail Integration
* **My Comment**:
  > "The Actions Taken card and modal render properly in Zen Green styling. Modal disables background scrolling and properly displays the auto-performer card for staff."
* **Peer Response**:
  > "Thanks! Also verified that Requester views strictly hide the '+ Log Action Taken' button."

#### Issue 20: Ticket Workflow State Machine & Resolution Gate
* **My Comment**:
  > "Verified that resolution gate prevents transition to RESOLVED when zero actions are logged. Optimistic concurrency control correctly rejects stale timestamps with 409 Conflict."
* **Peer Response**:
  > "Glad the OCC logic and conflict recovery UI tested cleanly!"

#### Issue 21: Role-Appropriate Dashboards (Requester, Staff, Admin)
* **My Comment**:
  > "Dashboard cards display accurate aggregates. Clicking metric cards correctly filters queues and tickets. Safe empty state fallbacks handle users with 0 tickets without errors."
* **Peer Response**:
  > "Thank you for verifying the zero-ticket edge case!"

#### Issue 22: End-to-End Regression, Accessibility Polish & Staged Release Integration
* **My Comment**:
  > "Executed full regression across server, client, and Playwright E2E suites. Focus-visible styles, skip links, and viewport responsiveness look clean on all screen sizes. Ready for staging release merge."
* **Peer Response**:
  > "Thank you for the review! Merging into lab4-staging and staging release into main."
