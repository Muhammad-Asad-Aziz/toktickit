# Lab 1 — Peer Review Record  (fill this in)

**Author:** Muhammad Asad Aziz — 67070503472 — GitHub: @Muhammad-Asad-Aziz

**Peer reviewer:** Al Xander James Codino Ybanez — 67070503450 — GitHub: @ShortXander101205

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
|  1  | feature/1-project-foundation | Approved |
|  2  | feature/2-health-check | Approved |
|  3  | feature/3-category-seed | Approved |
|  4  | feature/4-category-list | Approved |

Reviewer comment I received: 
1. The foundation requirements have been set, I verified the files. It fits well within Issue 1's criteria.
2. The overall implementation of Issue 2 is complete.
    - Endpoint looks good, adn returns the exact json format.
    - API calls look clean and handle errors correctly.
    - Success states display "Online".
    - Nice, the offline error message shows up when the server is down.
3. I have taken the time to manually test the requirements, I see no problems with the implementations for Issue 3.
    - Category models correctly defined.
    - Properly creates the Category Table
    - Seeder is safe and idempotent.
4. The overall completion of Issue 4 has been tested and verified, all is ready to be merged.
    - Categories are fetched from the API and rendered right.
    - Loading and error is handled properly.
    - API calls and error throws are handled cleanly here.
    - API and checking category rendering was done right.

How I responded: 
1. Thank you, I will remember to do ai_use.md and reviewer.md for issues 2 onwards
2. (forgot to reply to main comment)
    - Thank you, this was the simplest one to implement!
    - Thanks for reviewing!
    - It worked on my computer as well
    - Not as flashy, but it gets the job done
3. (Just thanking them for reviewing)
4. (Just thanking them for reviewing)

## Pull Requests I reviewed for my partner
My comment: 
1. Everything is perfect, I think we just forgot to do ai_use.md and reviewer.md
2. Your implementation is fine, but I want you to revert changes made to App.test.tsx, as that is for issue 4
3. Everything works out just fine. Running the code on my PC gives passing results.
4. Overall, everything is fine, and It passes my manual checks when I ran your app on my computer. I just want you to remove the extra .js files you made and commited. The lab instruction states: "Do not substitute another framework, database, ORM, or UI library." So please stick with TypeScript and remove your JavaScript code.

Partner's response: 
1. (They actually made many responses, as I have made many comments, but it's mostly just thanking me for reviewing)
2. I will now undo these changes.
3. Glad to hear my implementations are complete.
4. Resolved issues of additional js or jsx files, and tested to verify it still works