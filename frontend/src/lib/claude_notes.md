## standard Workflow

1. Always think through the problem, read the codebase for relevant files, and write a plan to tasks.md.
2. The plan should have a list of todo items that you can check off as you complete them.
   You do not need my permissions to update tasks.md and todo.md files
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Give me a high level explanantion of what changes you are make at each step.
6. Make every task and code change as simple as possible. We want to avoid complex changes for little impact. Keep everything as simple as possible.
7. Add a review section to the tasks.md file wit a summary of the changes you've made any relevant information as to why that change was required.

## standard Workflow

1. Always think through the problem, read the codebase for relevant files, and write a plan to tasks.md.
2. The plan shoudl have a list of todo items that you can check off as you complete them.
3. Explain the functionality and the code you wish to build. Walk me through your thought process. Act like a senior engineer teaching me coding.
4. Before you begin working, check in with me and I will verify the plan.
5. Then, begin working on the todo items, marking them as complete as you go.
6. Give me a high level explanantion of what changes you are make at each step.
7. Make every task and code change as simple as possible. We want to avoid complex changes for little impact. Keep everything as simple as possible.
8. Add a review section to the tasks.md file wit a summary of the changes you've made any relevant information as to why that change was required.

when I am coding with AI there are long breaks into between me giving me commands to th eAI. Typically I spend that time doom scrolling wihch istracts me and puts me ina a bad metntal state. I'd like to use that time now to chat with you and generate new ideas, and also reflect onm y other ideas and buisinesses and content. I am not aure how I'd like to user this chat or what role I'd like you to play, but I think it could be much more useful thatn me doom scrolling. Wha t do you thinkk? what could be the best way for to use this time?

Check through all the code you just wrote and make sure it follows security best practices. Make sure no sensitive information is in the frontend and there are no know vulnerabilities people can exploit.

---

I need to enhance LLM-chat interface.

I want to triage chat query in next.js app between regexp based code and full LLM processing. I want to build regexp based processing to support basic CRUD operations relatd to named or main portfolio. Some
examples from the user may be: "delete NFLX from my portfolio", "I just added 11
stocks of SPY", "Can you update avgCost of my SPY stock to 452", "Add 50 shares of
TSLA at $200 per share", "Show my AAPL position", "Remove all my TSLA holdings",
"Update my GOOGL position to 100 shares"
feel free to add few more CRUD patterns. Please echo back to customer their request
in a simple form - like "removed NFLX from main portfolio". I want regexp based
queries to connect to primasql to update portfolio db.
please provide architectural approach in words and ascii graphics, and steps required
to implement function.

│ > I want to pivot towards LLM-chat interface. This is the most critical for user  
│ interactions and retention. We do not have all the answers to make the interactions  
│ super useful and sticky. We'd like to enhance our design to facilitate data collection  
│ for post processing of user dialog that enable us to learn as much as possible about  
│ the needs and wants of our user community. We want to leverage data collect to  
│ generate better prompts and/or fine-tuning an LLM model later.\  
Python microservices will do the heavy lifting of analysis and number crunching at the backend. We need to define more elaborate endpoints for FastAPI to interact with LLM model that mediates user request in chat and Python functions.
We have already defined a few Python microservices and we'd like to extend those services extensively to meet our user demands.

Let's strategies over multiple dev approach for chatbox -> LLM - backend/MCP -> LLM -> chatbox thread. Here a user starts with a financial query that is routed to backend / MCP via LLM and back to the user. Here are a few things to consider

- LLM technology is rapidly improving and our plan should embrace and plan toleverage potential future improvements in LLM world
- We need LLM to help understand user's request and distill them into structured output to help leverage complex backend algorithms
- We need LLMs to consider user profile, language and tone to help infer and drive towards the solution
- We need LLMs to make user interaction sticky
- You are welcome to add a few more considerations here
- - translating complex chat query into structured response and going back to the user for missing information
- a lot of user's query can be translated into a mathematical optimzation problem - we can leverage Python based solvers for them. How can LLM help us a natural language query and user information into a mathematical statement
- pay special attention to the learning loop - what are we collecting and tracking that allows us to improve overall user experience. What are metrics?
  I want you to include an admin analyitics and test page that allows to see and query key
  performance metrics
  Thoughs?

Let's strategies and consider dev approaches and plans available for chatbox-LLM-backend-LLM-chatbox path. More specifically,
we want to interact with a user that starts

I want to add a field that indicates if a given stock long-term or short-term for tax purposes.
Please provide a plan to add the field to db table, portfolio UI and CSV import and export. Also the new field is optional in db.

---

I want to invext $1000 to my portfolio

I want to maximize long term growth
I want to maximize income
I want lower risk profile

---

I want you to run tests on app to identify specific pain points for the user and suggest potential solutions

---
