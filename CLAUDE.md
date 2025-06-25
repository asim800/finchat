# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev --turbopack` (uses Turbopack for faster builds)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`
- **Database operations**: Requires Prisma CLI - `npx prisma` commands for migrations and schema changes

## Tech Stack & Architecture

### Core Technologies

- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS v4
- **Authentication**: JWT tokens with bcryptjs for password hashing

### AI/LLM Integration

- **Providers**: OpenAI and Anthropic Claude APIs
- **Service Layer**: Centralized LLM service (`lib/llm-service.ts`) supports multiple providers
- **Chat System**: Real-time chat with financial context and chart generation capabilities

### Project Structure

```
app/
├── (auth)/          # Authentication routes (login, register)
├── api/             # API routes for chat, auth
├── dashboard/       # Protected dashboard pages
components/
├── auth/            # Authentication forms
├── chat/            # Chat interface and AI components
├── ui/              # Reusable UI components
lib/
├── auth.ts          # JWT and authentication utilities
├── db.ts            # Prisma database client
├── llm-service.ts   # Multi-provider LLM integration
├── financial-prompts.ts # Financial AI prompt engineering
```

### Database Schema

- **Users**: Authentication and profile data
- **Portfolio/Assets**: Investment tracking with multiple portfolios per user
- **Accounts**: Connected bank/financial accounts
- **ChatSessions/Messages**: Persistent chat history with metadata for charts
- **ApiKeys**: Encrypted storage of user's financial service API keys

### Authentication System

- JWT-based authentication with 7-day expiration
- Cookie and Bearer token support
- Guest mode for limited demo functionality
- Password hashing with configurable bcrypt rounds

### LLM Service Architecture

- Provider abstraction layer supports OpenAI and Anthropic
- Fallback mechanism if primary provider fails
- Financial context injection with portfolio data
- Automatic chart/visualization detection and generation

### Key Features

- **Guest Mode**: Limited functionality without registration
- **Multi-LLM Support**: User can switch between AI providers
- **Financial Context**: AI responses use portfolio/account data
- **Chart Generation**: Automatic visualization creation from AI responses
- **Secure API Key Storage**: Encrypted financial service credentials

## Environment Variables Required

### Core Application
- `JWT_SECRET`: JWT signing secret
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API access
- `ANTHROPIC_API_KEY`: Anthropic Claude API access
- `BCRYPT_ROUNDS`: Password hashing complexity (optional, defaults to 12)

### Analysis Backend Configuration
- `PRIMARY_ANALYSIS_BACKEND`: Choose 'mcp' or 'fastapi' (default: 'mcp')
- `ENABLE_BACKEND_FALLBACK`: Enable automatic fallback (default: 'false')
- `FASTAPI_SERVICE_URL`: FastAPI microservice URL (external service, deployed separately)

## Development Notes

- Uses Geist fonts (Sans and Mono) from Google Fonts
- All components use TypeScript with strict typing
- Database queries should use the shared Prisma client from `lib/db.ts`
- Authentication helpers available in `lib/auth.ts`
- Financial AI prompts should extend the system in `lib/financial-prompts.ts`

## Database & Prisma Notes

- **Prisma Client Generation**: The `postinstall` script automatically runs `prisma generate` after dependency installation
- **Migrations**: Use `npx prisma migrate dev` for development and `npx prisma migrate deploy` for production
- **Database Push**: Use `npx prisma db push` to sync schema changes without migrations
- **Studio**: Use `npx prisma studio` to open the database browser

## Deployment Notes

- **Vercel**: The `postinstall` script ensures Prisma Client is generated during deployment
- **Environment Variables**: Ensure `DATABASE_URL` is properly configured in your deployment environment
- **Build Process**: Prisma generation happens automatically via the postinstall hook

## Debugging Notes

- Please provide and explaination of the error and approach to resolve when prompted with error messages
