# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** <name> Google Antigravity with Gemini Flash 3.7 (Medium)

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Make a README.md file  | Removed any emojis and irrelevent details |
| 2 | Asked if the Lab1_starter_scaffold.zip met the requirements for issue 1 | Followed the instructions to install node modules to test out the app|
| 3 | Asked to make a plan and implement features for a working API | Tested it in many ways,. It passed all |
| 4 | Asked it about Prisma and how to setup PostgresSQL, I asked it to plan for category seeding | It told me to change the password in .env, but I instead changed the default settings in Postgres to match with the lab |
| 5 | Asked it my understanding of issue 4 | Got a better understanding of what to do |
| 6 | Asked it to plan for Displaying the IT request category list | Reviewed then implemented them |

## Reflection
I think what made my prompts better was asking for what asumptions it made, because then I can clear those asumptions by giving it more context. I did vibecoding before on personal projects, and many times the AI made mistakes because it assumed many things, such as versions of programs, what I had installed, how the code works, etc.

Another thing that improved my prompts was actually just asking for an implementation plan. In the past, I thought the plan was actually for the AI to use, for when I switch models or come back to projects after weeks of breaks. But knowing that it was actually for me to use, I was actually able to see what changing will be made before it even made them, which is very convenient as I wanted to make the changes as small as possible to make reviewing them easier.

One place I had to change or reject the agent's output was when it told me to change the .env file so that it would feature my PostgresSQL password instead of what was given. I rejected because if I didn't, then my peer would have trouble verifying that it worked on their side. And I don't want them to manually edit a file just to make things work. 