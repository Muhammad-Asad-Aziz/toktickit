# Lab 2 — Peer Review Record

**Author:** Muhammad Asad Aziz — 67070503472 — GitHub: @Muhammad-Asad-Aziz  
**Peer reviewer:** Al Xander James Codino Ybanez — 67070503450 — GitHub: @ShortXander101205  

---

## 1. Pull Requests I Authored (Reviewed by Peer Reviewer)

| PR # | Feature Branch | Target Branch | Linked Issue | Reviewer Verdict | Merged By |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [#16](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/16) | `feature/5-spec-and-tests` | `lab2-staging` | Issue 5: Sprint Spec & Test Planning | Approved | @ShortXander101205 |
| [#17](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/17) | `feature/6-data-and-requester` | `lab2-staging` | Issue 6: Requester Selector & Context | Approved | @ShortXander101205 |
| [#18](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/18) | `feature/7-create-ticket` | `lab2-staging` | Issue 7: Create Ticket Form & Validation | Approved | @ShortXander101205 |
| [#19](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/19) | `feature/8-my-tickets` | `lab2-staging` | Issue 8: My Tickets Page & Filtering | Approved | @ShortXander101205 |
| [#20](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/20) | `feature/9-ticket-detail-attachments` | `lab2-staging` | Issue 9: Ticket Details & Attachments | Approved | @ShortXander101205 |
| [#21](https://github.com/Muhammad-Asad-Aziz/toktickit/pull/21) | `feature/10-ui-polish-e2e` | `lab2-staging` | Issue 10: Zen Green UI Polish & E2E | Approved | @ShortXander101205 |

### Reviewer Comments Received & Author Responses

#### Issue 1 (Issue 5): Sprint Specification and Test Planning (PR #16)
* **Reviewer Comment (@ShortXander101205)**: "Everything is approved, only the small changes to the paths are needed." *(Inline review comment on docs: "Convert these paths for simplification.")*
* **Author Response (@Muhammad-Asad-Aziz)**: "I have changed my files to no longer use hardwired paths and be relative instead" / "I've changed it"

#### Issue 2 (Issue 6): Development Requester Selector & Context (PR #17)
* **Reviewer Comment (@ShortXander101205)**: "Test procedures were done on my computer, and all matched with expected results." *(Inline review comments on schema/migration/seed: "Database is synced.", "Database evenly matches mine.", "Made accordingly to match the database.")*
* **Author Response (@Muhammad-Asad-Aziz)**: "Testing on my side yielded passing results. Criteria has been met" / "ty, I tried my best, thank you"

#### Issue 3 (Issue 7): Create Ticket Form & Validation (PR #18)
* **Reviewer Comment (@ShortXander101205)**: "Implementations of Issue 7 was done accordingly, the backend validation, UI, and APIs were all covered."
* **Author Response (@Muhammad-Asad-Aziz)**: "Thank you very much!"

#### Issue 4 (Issue 8): My Tickets Page & Filtering (PR #19)
* **Reviewer Comment (@ShortXander101205)**: "This branch completely fulfills Issue 8. The My Tickets page works smoothly, working filters and paginations. It also keeps the tickets made."
* **Author Response (@Muhammad-Asad-Aziz)**: "Thank you for reviewing"

#### Issue 5 (Issue 9): Ticket Details & Attachment Management / Soft Removal (PR #20)
* **Reviewer Comment (@ShortXander101205)**: "Issue 9 implementation looks great. Backend isolation and soft-delete lifecycles work as expected, the UI stays strictly read-only, and test coverage is complete."
* **Author Response (@Muhammad-Asad-Aziz)**: "Thank you so much for reviewing!"

#### Issue 6 (Issue 10): Zen Green UI Polish & E2E Testing (PR #21)
* **Reviewer Comment (@ShortXander101205)**: "The branch cleanly applies the Zen Green theme across desktop, tablet, and mobile viewports, adds a solid end-to-end Playwright test suite for the full user flow, and saves complete screenshot evidence while staying strictly within the project scope."
* **Author Response (@Muhammad-Asad-Aziz)**: "Thanks for peer reviewing all of this for me, it means a lot."

---

## 2. Pull Requests I Reviewed for My Partner

| PR # | Partner's Branch | Target Branch | Partner's Issue | My Review Verdict | Merged By |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [#17](https://github.com/ShortXander101205/toktickit/pull/17) | `feature/5-spec-and-tests` | `lab2-staging` | Issue 5: Sprint 2 Engineering Spec & Test Plan | Changes Requested $\rightarrow$ Approved | @Muhammad-Asad-Aziz |
| [#18](https://github.com/ShortXander101205/toktickit/pull/18) | `feature/6-data-and-requester` | `lab2-staging` | Issue 6: Data Model Increment & Requester Context | Approved | @Muhammad-Asad-Aziz |
| [#19](https://github.com/ShortXander101205/toktickit/pull/19) | `feature/7-create-ticket` | `lab2-staging` | Issue 7: Create Ticket Workflow | Approved | @Muhammad-Asad-Aziz |
| [#20](https://github.com/ShortXander101205/toktickit/pull/20) | `feature/8-my-tickets` | `lab2-staging` | Issue 8: My Tickets Screen | Approved | @Muhammad-Asad-Aziz |
| [#21](https://github.com/ShortXander101205/toktickit/pull/21) | `feature/9-ticket-detail-attachments` | `lab2-staging` | Issue 9: Requester Ticket Detail & Attachments | Approved | @Muhammad-Asad-Aziz |
| [#22](https://github.com/ShortXander101205/toktickit/pull/22) | `feature/10-ui-polish-e2e` | `lab2-staging` | Issue 10: Zen Green UI Polish & E2E Testing | Approved | @Muhammad-Asad-Aziz |

### My Review Comments & Partner's Responses
1. **Issue 1 (Issue 5 - PR #17)**:
   * **My Review Comment**: "All seems good, but just some minor changes to reviewer.md" *(Inline comment on docs/lab-02/reviewer.md: "You accidentally put my name as the author and your name as the reviewer")*
   * **Partner's Response**: "Files have been approved, and small changes were made to complete Issue 5." / "I have now completed the subtle change."
2. **Issue 2 (Issue 6 - PR #18)**:
   * **My Review Comment**: "Everything works fine when running on my computer. All criteria has been met."
   * **Partner's Response**: "Tests were done, and all worked according to protocols."
3. **Issue 3 (Issue 7 - PR #19)**:
   * **My Review Comment**: "Everything looks alright. Manual testing shows that I can upload <5 MB files, bigger files are correctly ignored, and I get errors if the server is offline."
   * **Partner's Response**: "Thank you for the confirmation."
4. **Issue 4 (Issue 8 - PR #20)**:
   * **My Review Comment**: "OK, you quickly resolved the double + symbols in the create button, but I found another issue. When viewing the site in phone mode, every UI correctly shrinks except for the accounts icon near the top right." Following resolution: "I’ve completed a thorough review of Issue 8 and everything is fully verified. All tests passes. I confirmed that requester isolation is strictly enforced, and search debouncing correctly throttles database calls. Empty states, and no-results indicators work gracefully, and the entire layout collapses seamlessly into stacked cards on mobile. I’ve officially approved your PR and merged it into lab2-staging, so you are good to pull the updates and sync up!"
   * **Partner's Response**: "Thanks so much for the review."
5. **Issue 5 (Issue 9 - PR #21)**:
   * **My Review Comment**: "Everything is fully verified and working beautifully. All of our integration and component tests are passing. I confirmed that the ticket detail view remains strictly read-only, and our 5MB size and format validations are tightly enforced on both the client and server. Most importantly, the soft-removal confirmation modal and React state-update logic are fully stabilized, deleted files correctly transition into non-downloadable, grayed-out metadata rows, and successfully free up the active 5-file attachment limit."
   * **Partner's Response**: "I really appreciate the tests and review."
6. **Issue 6 (Issue 10 - PR #22)**:
   * **My Review Comment**: "Everything looks brilliant. I verified that the frontend matches the Zen Green Design System color tokens, all pages adapt down to mobile with zero horizontal overflow, and the Playwright automated E2E runs flawlessly."
   * **Partner's Response**: "Wonderful feedback, thanks so much for the review."
