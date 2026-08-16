# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Passed |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | Passed |
| 3 | Vitest | Heading renders | Passed |
| 4 | Vitest | Success state shows Online + category list | Passed |
| 5 | Vitest | Error state shows Offline + message | Passed |

Paste your passing terminal output / screenshot below.

## Supertest
```
npm test

> toktickit-server@1.0.0 test
> vitest run


 RUN  v2.1.9 C:/Users/Muhammad Asad Aziz/Downloads/CPE 334/toktickit/server

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  09:00:40
   Duration  754ms (transform 67ms, setup 0ms, collect 635ms, tests 82ms, environment 0ms, prepare 277ms)
```
<img width="980" height="394" alt="image" src="https://github.com/user-attachments/assets/a2dd24d2-e447-49c2-87d6-405b4b0ac11b" />

## Vitest
```
> toktickit-client@1.0.0 test
> vitest run


 RUN  v2.1.9 C:/Users/Muhammad Asad Aziz/Downloads/CPE 334/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3)
   ✓ App (3)
     ✓ renders the TokTickIT heading
     ✓ shows Online and the seeded categories on success
     ✓ shows an Offline error message when the API is unavailable

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  08:58:52
   Duration  1.98s (transform 69ms, setup 196ms, collect 279ms, tests 142ms, environment 973ms, prepare 132ms)
```
<img width="1026" height="474" alt="image" src="https://github.com/user-attachments/assets/4b8ca697-9627-40b7-b907-b2dba7ad5df3" />
