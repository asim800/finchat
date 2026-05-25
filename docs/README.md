# Documentation

Project documentation, design notes, and analyses. (Component-specific READMEs live next to
their code — e.g. `frontend/prisma/`, `frontend/scripts/`, `services/fastapi-portfolio-service/`,
`pythonscripts/`.)

## Architecture & design
- [architecture.md](architecture.md) — overall system architecture
- [ARCHITECTURE-LLM-SERVICES.md](ARCHITECTURE-LLM-SERVICES.md) — LLM service layer architecture
- [MICROSERVICE_SEPARATION.md](MICROSERVICE_SEPARATION.md) — frontend ↔ Python service boundaries
- [LLM_interaction.md](LLM_interaction.md) — how the app interacts with LLM providers
- [FASTAPI_INTEGRATION.md](FASTAPI_INTEGRATION.md) — Next.js ↔ FastAPI analysis integration
- [CONVERSATION_ANALYTICS.md](CONVERSATION_ANALYTICS.md) — conversation analytics system
- [analytics-usage-guide.md](analytics-usage-guide.md) — using the analytics utilities
- [chart_design.md](chart_design.md) — chart / figure rendering design
- [CHAT_HISTORY_FEATURE.md](CHAT_HISTORY_FEATURE.md) — chat history feature notes
- [historical_prices_analysis.md](historical_prices_analysis.md) — historical price data handling

## Development & deployment
- [PYTHON_DEVELOPMENT.md](PYTHON_DEVELOPMENT.md) — Python services dev guide (use `uv`)
- [DEPLOYMENT_LOG.md](DEPLOYMENT_LOG.md) — deployment history/notes

## Analyses & UX
- [complexity_analysis_2025-08-13.md](complexity_analysis_2025-08-13.md) — code complexity analysis (2025-08-13)
- [USER_PAIN_POINTS_ANALYSIS.md](USER_PAIN_POINTS_ANALYSIS.md) — user pain-points analysis
- [UX_PAIN_POINTS_REPORT.md](UX_PAIN_POINTS_REPORT.md) — UX pain-points report
- [ux-audit-report.md](ux-audit-report.md) — UX audit
- [UX_TESTING_PLAN.md](UX_TESTING_PLAN.md) — UX testing plan

## Refactor (2026)
- [refactor-plan-2026-05-19.md](refactor-plan-2026-05-19.md) — clarity/modularity/DRY refactor plan
- [refactor-summary.md](refactor-summary.md) — summary of the refactor changes

## Misc / notes
- [claude_notes.md](claude_notes.md) — assistant working-style notes (overlaps the root CLAUDE.md)
- `tasks.md`, `todo.md`, `dev-notes.txt` — working/planning scratch logs (git-ignored)
