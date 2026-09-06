# Lab 2 — AI Use and Reflection

**LLM/Agent Used:** Google Antigravity with Gemini 3.8 Flash (High)  
**Author:** Muhammad Asad Aziz — 67070503472  

---

## 1. Selected Key Prompts (6–10)

| # | Prompt (Summarized) | What I Did With the Result |
|---|---------------------|----------------------------|
| 1 | Asked why `npm test` was failing on the server when transitioning from Lab 1 baseline into Lab 2 | Analyzed the root cause of the regression, and fixed the broken test dependency before writing any new code. |
| 2 | Inquired whether the screen displayed upon running `npm run dev` matched expected specs | Verified that the screen was the intended initial baseline according to the System SDS before implementing the active requester context dropdown. |
| 3 | Questioned if table naming conventions caused migration failures | Confirmed the naming discrepancy (`ticket_number` vs `ticketNumber` `@map` annotations) and standardized schema naming conventions across migrations. |
| 4 | Asked what files were needed to diagnose why pulling peer code fails to run locally due to database schema differences | Provided `schema.prisma` and SQL migration files to reconcile differences without breaking existing local database state during peer review. |
| 5 | Asked what caused a blank white screen in React when confirming attachment deletion even though PostgreSQL successfully soft-deleted it | Found that the modal state update crashed when accessing properties of an undefined return value; added defensive fallbacks and clean modal state reset. |
| 6 | Asked why the Playwright E2E test failed during the requester ticket lifecycle test | Triaged the failure logs, fixed the asynchronous element wait and selector timing for attachment handling, and verified all E2E tests passed. |

---

## 2. My Reflection
Now that we're taught how to use AI properly, I am surprised how the whole process just works. I never thought about context refreshing or making many .md files to properly communicate with AI. Overall, I think it's a good skill to have. Also, getting to use Gemini 3.8 Flash (High) makes a HUGE difference! I had to help my friend once and I told them to switch to this model as I have seen the benchmark results and how it ties with claude-opus-5 (MAX) and gpt-6-astra (xhigh). It's incredible how far AI has come.