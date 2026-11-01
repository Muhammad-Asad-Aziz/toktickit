# Lab 4 — AI Use and Reflection

**Course**: CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Author:** Muhammad Asad Aziz — 67070503472  
**LLM/Agent Used:** Google Antigravity with Gemini 3.8 Flash (High)  

---

## 1. Selected Key Prompts (6–10)

| # | Prompt (Summarized) | What I Did With the Result |
|---|---------------------|----------------------------|
| 1 | How to diagnose and resolve PostgreSQL column drift where Prisma client expected `tickets.requesterResolvedAt` but the local database threw `column does not exist`. | Used `prisma db push --accept-data-loss` followed by idempotent database re-seeding (`npm run seed`) to synchronize database schemas deterministically across test runners. |
| 2 | Enforcing the Resolution Gate Invariant (BR-07) across both API and UI layers so tickets cannot be transitioned to RESOLVED without at least one recorded Action Taken. | Implemented database count check in `staffTickets.ts` returning HTTP 400 (`RESOLUTION_REQUIRES_ACTION_TAKEN`) and wired frontend state in `StaffTicketDetail.tsx` to display an amber warning and disable the transition button when actions count is 0. |
| 3 | Designing an automated Playwright E2E test to verify Optimistic Concurrency Control (BR-10) and 409 Conflict recovery without hardcoded race conditions. | Structured a test that opens a ticket in browser Tab A, uses a background API call to mutate the ticket and advance `updatedAt`, attempts status transition in Tab A, asserts the 409 Conflict banner, verifies draft note preservation, and confirms recovery via "Reload Ticket Data". |
| 4 | Resolving test interdependence and pagination flakiness in Playwright E2E suites where tickets shifted pages during sequential test runs. | Refactored `concurrency.spec.ts` and `ticket-resolution.spec.ts` to create dedicated, isolated tickets via API fixtures at test start, ensuring 100% test independence regardless of seed ticket ordering or previous test modifications. |
| 5 | Implementing WCAG 2.1 AA keyboard accessibility and visible focus indicators across custom Zen Green UI elements without relying on default browser outlines. | Added `:focus-visible` styles with 2px solid `--zen-primary-green` and 2px offset in `client/src/index.css`, added a skip link (`.skip-link`) in `App.tsx` targeting `<main id="main-content">`, and added `Escape` key event listeners to all modal dialogs. |
| 6 | Implementing 1-click drill-downs from role dashboard KPI cards into pre-filtered views (My Tickets and Staff Queue) while maintaining filter state upon navigation. | Wired card `onClick` handlers to navigate to the target view while setting initial filter state (`initialStatusFilter`, `initialOwnerFilter`), ensuring seamless drill-down transitions and URL/state consistency. |
| 7 | Addressing React Testing Library warning regarding state updates in `StaffTicketQueue` and `AuthProvider` not wrapped in `act(...)`. | Wrapped state-updating trigger handlers and async mock resolves inside `act(async () => ...)` to ensure all React virtual DOM updates committed before test assertions ran. |
| 8 | Ensuring Playwright screenshot captures save auxiliary visual verification evidence to `artifacts/lab-04/screenshots/` without polluting unit/API test specifications. | Enforced strict separation where screenshot specs (`actions-taken-screenshots.spec.ts` and `dashboard-screenshots.spec.ts`) output exclusively to `artifacts/lab-04/screenshots/`, while functional assertions remain tracked in `docs/lab-04/tests.md`. |

---

## 2. My Reflection

Sprint 4 was the culmination of everything we learned throughout the semester in CPE 334. Implementing complex service-desk workflows—such as Actions Taken auditing, the Resolution Gate invariant, Optimistic Concurrency Control (OCC), and role-specific dashboards—demonstrated why Spec-Driven Development (SDD) is essential when building enterprise-grade applications.

Working with AI coding agents in this sprint highlighted the importance of strict engineering contracts. When prompts are grounded with detailed schemas (`api-spec.md`, `ui-spec.md`, `specification.md`), the AI produces highly accurate, type-safe code that adheres to business invariants. However, I also experienced firsthand where human oversight is indispensable:
1. **Concurrency and State Synchronization**: When implementing OCC, understanding the exact timestamp comparison logic (`Math.abs(clientTime - serverTime) > 1000`) was crucial. Guiding the AI to account for client-side state preservation of uncommitted drafts while reloading server data required precise architectural reasoning.
2. **Test Isolation vs. Interdependence**: Early in the sprint, E2E tests occasionally failed because they relied on shared seed tickets that previous tests had mutated or closed. By directing the AI to use isolated API fixtures that dynamically instantiate fresh tickets, our test suites became 100% deterministic and repeatable.
3. **Accessibility and Polished UX**: Enforcing WCAG 2.1 AA compliance (visible focus rings, skip links, Escape key modal dismissals, and high-contrast Zen Green tokens) ensured that our application is not just functionally complete, but accessible, professional, and user-centric across desktop, tablet, and mobile devices.

Overall, Lab 4 solidified my understanding of the multi-tiered test pyramid, continuous verification, and how to effectively harness AI agents as disciplined pair-programming partners rather than unchecked code generators.
