# Lab 4 — AI Use and Reflection

**Course**: CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Author:** Muhammad Asad Aziz — 67070503472  
**LLM/Agent Used:** Google Antigravity with Gemini 3.8 Flash (High)  

---

## 1. Selected Key Prompts (6–10)

| # | Prompt (Summarized) | What I Did With the Result |
|---|---------------------|----------------------------|
| 1 | In the mobile and tablet UIs, the header becomes very jumbled. Use Good Mobile UX/UI protocols to fix this issue, and run the Playwright screenshots again. | Applied responsive flex-wrapping, spacing, and fluid widths to ticket action headers so metadata badges don't overflow on small screens, and verified the updated Playwright screenshots in `artifacts/lab-04/screenshots/actions-taken/`. |
| 2 | Asked how to do a forced API request to verify the 400 Bad Request error when trying to resolve a ticket with 0 Actions Taken, bypassing the frontend UI restriction. | Used the browser DevTools console to send a direct `PATCH` request with `status: "RESOLVED"`, verifying that the backend strictly returns HTTP 400 `RESOLUTION_REQUIRES_ACTION_TAKEN` even when the UI restriction is bypassed. |
| 3 | Pasted raw browser DevTools network logs (headers, URL, session cookie) showing a 404 Not Found error when attempting a manual PATCH to `/api/v1/staff/tickets/1418/status`. | Diagnosed that ticket ID 1418 was a non-existent or stale ID from an earlier test session; targeted a valid seeded ticket ID (1001), confirming the resolution gate logic and route handling work correctly. |
| 4 | Asked why option 2 didn't show the 400 Bad Request error in the browser console / IDE terminal when clicking the status button repeatedly, wanting error visibility across channels. | Improved error logging in the frontend API client and backend middleware so that business rule rejection errors are logged visibly in the console for better developer observability. |
| 5 | Inquired how to execute an Access Control Test by attempting to call `GET /api/v1/dashboards/staff` with a Requester session token to verify the server returns 403 Forbidden. | Executed the `fetch` call from the browser console while logged in as a Requester, confirming that role middleware strictly rejects unauthorized calls with HTTP 403 and blocks access to IT Staff queue metrics. |
| 6 | Pasted console logs showing a 304 Not Modified on `GET /api/v1/dashboards/staff` followed by a `SyntaxError: JSON.parse: unexpected character`, asking why the response failed to parse. | Understood that the browser's ETag cache returned a 304 with an empty body, causing `.json()` to fail; added a cache-busting header or disabled cache during manual API testing, successfully receiving and inspecting the JSON response. |

---

## 2. My Reflection

Looking back from Lab 1 to Lab 4, the difference in how I work with AI is huge. In this sprint, features like optimistic concurrency control and role-based access control were pretty complex, so I had to be very specific with my prompts and test everything manually to make sure the AI followed every requirement. Whenever a UI element broke on mobile or an API call didn't return what I expected, I learned to guide the AI with exact error logs instead of being vague. It feels great to finish the whole TokTickIT project, and this course really proved that AI is super helpful as long as you know how to review and test its work.
