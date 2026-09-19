# Lab 3 — AI Use and Reflection

**Course**: CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**LLM/Agent Used:** Google Antigravity with Gemini 3.8 Flash (High)  
**Author:** Muhammad Asad Aziz — 67070503472  

---

## 1. Selected Key Prompts (6–10)

| # | Prompt (Summarized) | What I Did With the Result |
|---|---------------------|----------------------------|
| 1 | How to manually test unauthorized direct route protection when the application runs as a single-page app on a static URL without browser route changes. | Understood that the UI manages view switching via React state (`activeView`) while backend APIs enforce 403 Forbidden; tested role isolation by making direct API calls via curl/fetch as a Requester to verify unauthorized access is strictly blocked. |
| 2 | Investigating missing seeded user records in Prisma Studio that caused ticket creation API tests to fail. | Pinpointed that tests hardcoded `requesterId: 1`, but previous test runs had incremented auto-increment IDs to start at `id: 2`; ran `npx prisma migrate reset --force` to restore deterministic baseline seed IDs so all ticket API tests passed. |
| 3 | Troubleshooting pagination controls overflowing off-screen on mobile viewports under 375px wide. | Implemented windowed page numbers and responsive CSS flex wrapping for mobile viewports (< 768px), eliminating horizontal overflow and ensuring clean pagination down to 375px. |
| 4 | Troubleshooting server test failures throwing 404 errors while peer reviewing a teammate's repository. | Diagnosed that the peer's database lacked seed user records, causing ticket creation routes to fail with 404; provided clear, actionable feedback in reviewer.md to help them resolve test environment state. |
| 5 | Inquiring whether local database state disparities across developer machines cause server test suites to fail. | Confirmed that PostgreSQL migrations ran cleanly on both machines, but differing seed records and unhashed passwords caused auth tests to fail; guided the teammate to re-seed using the project's standard script. |
| 6 | Clarifying technical scenarios where the browser throws a network error instead of returning an HTTP response code. | Understood that "Failed to fetch" represents browser-level network disconnects, server downtime, or CORS errors before an HTTP response is received; verified frontend error states properly distinguish connection loss from HTTP 401/403 auth errors. |

---

## 2. My Reflection

Lab 3 looks smaller in comparison to lab 2, but it took just as long. Even though we know the workflow now, we got unlucky that Google's flagship model (Gemini 3.8 Flash High) was experiencing major traffic and even crashing at times during our development. However, we made it through and was able to finish before the weekends. I guess this also made me learn or realize the downsides of free models.