# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## standard Workflow

- Always think through the problem, read the codebase for relevant files, and write a plan to tasks.md.
- Always keep a history of my input prompts, datetime stamp and your high level approach and append to the todo.md file.
- Prefer proven libraries over custom implementations
- You do not need my permissions to update tasks.md and todo.md files.
- The plan shoudl have a list of todo items that you can check off as you complete them.
- Explain the functionality and the code you wish to build. Walk me through your thought process. Act like a senior engineer and teach me high level coding constructs so we can learn to work together and create the best code ever.
- Before you begin working, check in with me and I will verify the plan.
- Then, begin working on the todo items, marking them as complete as you go.
- Give me a high level explanantion of what changes you are make at each step.
- Make every task and code change as simple as possible. We want to avoid complex changes for little impact. Keep everything as simple as possible.
- Add a review section to the tasks.md file with a summary of the changes you've made any relevant information as to why that change was required and append the summary to summary.md file as well

## Development Commands

### Frontend (Next.js)

- **Start development server**: `npm run dev --turbopack` (uses Turbopack for faster builds)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`
- **Database operations**: Requires Prisma CLI - `npx prisma` commands for migrations and schema changes
- **Price management scripts**: `npm run update-prices`, `npm run check-prices`, `npm run clear-prices`

### Backend Services

- **FastAPI service**: `uvicorn main:app --reload --host 0.0.0.0 --port 8000` (in services/fastapi-portfolio-service/)
- **MCP server**: `python finance_mcp_server.py` (in mcp-server/)
- **Python package management**: Use `uv` consistently for all Python services (Python 3.12)

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
- **Query Triage**: Intelligent query routing system (`lib/query-triage.ts`) for processing user questions

### Financial Analysis Backend

The application supports **dual analysis backends** with automatic fallback:

#### MCP (Model Context Protocol) Server

- **Primary Backend**: Located in `mcp-server/` folder
- **Technology**: FastMCP framework with SQLAlchemy database integration
- **Features**: Real-time portfolio risk analysis, Sharpe ratio calculations, market data fetching
- **Dependencies**: pandas, numpy, yfinance, psycopg2-binary
- **Configuration**: Configurable via `PRIMARY_ANALYSIS_BACKEND=mcp` environment variable

#### FastAPI Microservice

- **Secondary Backend**: Located in `services/fastapi-portfolio-service/` folder
- **Technology**: FastAPI with comprehensive CORS configuration
- **Features**: Portfolio risk metrics, VaR calculations, market data analysis
- **Dependencies**: fastapi, uvicorn, yfinance, pandas, numpy
- **Deployment**: Vercel-ready with vercel.json configuration

#### Unified Analysis Service

- **Abstraction Layer**: `lib/unified-analysis-service.ts` provides seamless switching between backends
- **Fallback Logic**: Automatic health checks and failover between MCP and FastAPI
- **Configuration**: Backend selection via `lib/backend-config.ts`

### Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Authentication routes
│   │   ├── api/              # API routes for chat, auth, portfolio
│   │   ├── dashboard/        # Protected dashboard pages
│   │   ├── admin/            # Admin panel with analytics
│   │   └── learning/         # Financial terms learning system
│   ├── components/
│   │   ├── auth/             # Authentication forms
│   │   ├── chat/             # Chat interface and AI components
│   │   ├── portfolio/        # Portfolio management components
│   │   ├── admin/            # Admin dashboard components
│   │   └── ui/               # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts           # JWT and authentication utilities
│   │   ├── db.ts             # Prisma database client
│   │   ├── llm-service.ts    # Multi-provider LLM integration
│   │   ├── unified-analysis-service.ts # Backend abstraction layer
│   │   ├── mcp-client.ts     # MCP server client
│   │   ├── fastapi-client.ts # FastAPI service client
│   │   ├── backend-config.ts # Backend selection configuration
│   │   └── financial-prompts.ts # Financial AI prompt engineering
│   ├── hooks/
│   │   └── use-chat-api.ts   # Chat API hooks
│   └── middleware.ts         # Route protection middleware
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
└── scripts/                  # Price management and testing scripts

services/
├── fastapi-portfolio-service/
│   ├── main.py               # FastAPI application
│   ├── pyproject.toml        # Python dependencies
│   └── vercel.json           # Vercel deployment config

mcp-server/
├── finance_mcp_server.py     # MCP server implementation
├── analyzers/
│   └── finance_analyzer.py   # Pluggable finance analyzer
├── pyproject.toml            # Python dependencies
└── start.sh                  # Startup script
```

### Database Schema

- **Users**: Authentication and profile data with comprehensive financial profiles
- **Portfolio/Assets**: Investment tracking with multiple portfolios per user, including options support
- **Accounts**: Connected bank/financial accounts
- **ChatSessions/Messages**: Persistent chat history with metadata for charts
- **ApiKeys**: Encrypted storage of user's financial service API keys
- **HistoricalPrice**: Shared market data for all services
- **FinancialTerm**: Learning content management system

### Authentication System

- JWT-based authentication with 7-day expiration
- Cookie and Bearer token support
- Guest mode for limited demo functionality
- Password hashing with configurable bcrypt rounds
- Admin role system with protected routes

### LLM Service Architecture

- Provider abstraction layer supports OpenAI and Anthropic
- Fallback mechanism if primary provider fails
- Financial context injection with portfolio data
- Automatic chart/visualization detection and generation
- Chat triage system for intelligent query routing

### Key Features

- **Guest Mode**: Limited functionality without registration
- **Multi-LLM Support**: User can switch between AI providers
- **Financial Context**: AI responses use portfolio/account data
- **Chart Generation**: Automatic visualization creation from AI responses
- **Secure API Key Storage**: Encrypted financial service credentials
- **Admin Dashboard**: User management and analytics
- **Learning System**: Financial terms with CRUD operations
- **CSV Import/Export**: Portfolio data management
- **Real-time Chat**: Auto-scrolling chat interface with file uploads

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
- `RISK_FREE_RATE`: Risk-free rate for calculations (optional, defaults to 0.02)

## Development Notes

- Uses Geist fonts (Sans and Mono) from Google Fonts
- All components use TypeScript with strict typing
- Database queries should use the shared Prisma client from `lib/db.ts`
- Authentication helpers available in `lib/auth.ts`
- Financial AI prompts should extend the system in `lib/financial-prompts.ts`
- Backend selection managed through `lib/backend-config.ts`

## Database & Prisma Notes

- **Prisma Client Generation**: The `postinstall` script automatically runs `prisma generate` after dependency installation
- **Migrations**: Use `npx prisma migrate dev` for development and `npx prisma migrate deploy` for production
- **Database Push**: Use `npx prisma db push` to sync schema changes without migrations
- **Studio**: Use `npx prisma studio` to open the database browser
- **Shared Schema**: Database schema supports both frontend and backend services

## Deployment Notes

- **Vercel**: The `postinstall` script ensures Prisma Client is generated during deployment
- **Environment Variables**: Ensure `DATABASE_URL` is properly configured in your deployment environment
- **Build Process**: Prisma generation happens automatically via the postinstall hook
- **FastAPI Service**: Can be deployed separately on Vercel or other platforms
- **MCP Server**: Requires database access for portfolio analysis

## Backend Architecture Notes

### MCP Server

- Implements financial analysis tools through Model Context Protocol
- Uses SQLAlchemy for database connections
- Provides portfolio risk analysis, Sharpe ratio calculations, market data fetching
- Supports pluggable analyzer architecture

### FastAPI Service

- Microservice architecture with comprehensive CORS configuration
- Real-time market data via yfinance integration
- Portfolio risk metrics including VaR, volatility, and beta calculations
- Health check endpoints for monitoring

### Unified Service Layer

- Transparent backend switching with health checks
- Automatic fallback between MCP and FastAPI
- Consistent API interface regardless of backend
- Comprehensive error handling and logging

## Testing & Scripts

- **Chat Testing**: `src/scripts/test-chat-triage.ts` for query triage testing
- **Portfolio Testing**: `src/scripts/test-portfolio-overview.ts` for portfolio operations
- **Price Management**: Scripts for updating, checking, and clearing historical prices
- **Edge Case Testing**: Comprehensive test suite for various scenarios

## Debugging Notes

- Please provide an explanation of the error and approach to resolve when prompted with error messages
- Use backend configuration debug info via `backendConfig.getDebugInfo()`
- Check service health via unified analysis service

## Python Notes

- Please use uv as package manager and Python version 3.12
- Both MCP server and FastAPI service use consistent dependency management
- Environment variables required for database connections in Python services

## Mobile vs Desktop Design Decisions

### Responsive Design Philosophy

Our application follows a **mobile-first approach** with progressive enhancement for larger screens. This ensures optimal performance and user experience across all devices.

### Breakpoint Strategy

- **Primary Breakpoint**: `md:` (768px) - Transition point between mobile and desktop layouts
- **Mobile Target**: Devices ≤ 767px (phones, small tablets)
- **Desktop Target**: Devices ≥ 768px (tablets, laptops, desktops)

### Chart & Figure Display Guidelines

#### Height Constraints
- **Mobile**: Maximum 250px height for charts and figures
  - Prevents content from overwhelming small screens
  - Ensures chat interface remains accessible
- **Desktop**: Maximum 400px height
  - Takes advantage of larger screen real estate
  - Provides better detail visibility

#### Touch Interaction
- **Mobile Close Buttons**: Minimum 44px touch targets (8x8 md:6x6)
- **Desktop Close Buttons**: Standard 24px targets
- **Hover States**: Only enabled on desktop (`hover:` prefixes)

#### Component-Specific Decisions

##### PortfolioChartPanel
```css
/* Mobile: h-64 (256px), Desktop: h-80 (320px) */
.chart-container { @apply h-64 md:h-80; }

/* Mobile: p-2, Desktop: p-3/p-4 */
.chart-padding { @apply p-2 md:p-3; }
```

##### ChartDisplay (Recharts)
- **Pie Charts**: 200px height (mobile) vs 300px (desktop)
- **Bar Charts**: 200px height (mobile) vs 300px (desktop)
- **Legend**: Hidden on mobile, visible on desktop
- **Font Sizes**: 10px (mobile) vs 12px (desktop)

##### Figure SVG Handling
```javascript
// Responsive figure sizing
maxHeight: window.innerWidth < 768 ? '240px' : (figureHeight || 600)
```

### Spacing & Layout

#### Margin Strategy
- **Mobile**: Compact spacing (`mt-2`, `p-2`)
- **Desktop**: Generous spacing (`mt-4`, `p-3/p-4`)

#### Text Scaling
- **Mobile**: `text-xs` for secondary content
- **Desktop**: `text-sm` for better readability

### Implementation Patterns

#### Responsive Classes
```css
/* Preferred pattern for responsive design */
.responsive-element {
  @apply h-64 md:h-80 p-2 md:p-4 text-xs md:text-sm;
}
```

#### JavaScript Media Queries
```javascript
// Use for dynamic sizing in components
const isMobile = window.innerWidth < 768;
const chartHeight = isMobile ? 200 : 300;
```

### Accessibility Considerations

- **Touch Targets**: Minimum 44px for mobile interactions
- **Content Hierarchy**: Larger touch areas for primary actions
- **Visual Feedback**: Clear hover states for desktop, press states for mobile
- **Close Buttons**: Always visible and easily accessible

### Performance Optimization

- **Conditional Rendering**: Hide non-essential elements on mobile
- **Image Scaling**: Automatic figure scaling prevents overflow
- **Layout Shift**: Consistent height constraints prevent content jumping

## Chat Interface & Figure Integration

### Inline Charts Architecture

Our chat interface uses an **inline chart system** that integrates figures directly within the conversation flow for optimal user experience.

#### Design Philosophy
- **Contextual Integration**: Charts appear as part of the natural conversation flow
- **Mobile-First**: Optimized for mobile readability and touch interaction
- **Progressive Enhancement**: Enhanced experience on larger screens

#### Implementation Strategy

##### Inline vs External Charts
```typescript
// Inline Charts (Current Implementation)
<ChatInterface hideInlineCharts={false} />
// Charts render within MessageBubble components automatically

// External Charts (Previous Implementation - Deprecated)
<ChatInterface hideInlineCharts={true} onChartUpdate={handler} />
{chartData && <ExternalChartPanel />}
```

##### Chart Rendering Flow
1. **AI Response Generation**: LLM generates response with chart data
2. **Message Creation**: Chart data attached to message object
3. **Inline Rendering**: ChartDisplay component renders within MessageBubble
4. **Responsive Sizing**: Mobile-optimized dimensions applied automatically

#### Component Architecture

##### ChatInterface Integration
- **Message Flow**: Charts appear after relevant AI responses
- **Scroll Integration**: Charts scroll naturally with conversation history
- **Context Preservation**: Charts remain associated with generating messages

##### ChartDisplay Enhancements
```typescript
interface ChartDisplayProps {
  data: ChartData;
  onClose?: () => void; // Optional dismissal functionality
}
```

- **Responsive Design**: Mobile (200px) vs Desktop (300px) chart heights
- **Optional Dismissal**: Close button for user-controlled chart hiding
- **Touch Optimization**: Compact close button (24px mobile, 20px desktop)

#### Mobile Optimization Patterns

##### Height Management
```css
/* Inline charts use container-relative sizing */
.inline-chart {
  height: 200px; /* Mobile */
}

@media (min-width: 768px) {
  .inline-chart {
    height: 300px; /* Desktop */
  }
}
```

##### Touch Interactions
- **Close Buttons**: Minimum 24px touch targets for inline context
- **Chart Interaction**: Touch-friendly chart elements
- **Scroll Behavior**: Smooth scrolling within chat container

#### User Experience Benefits

##### Mobile Experience
- **Full Screen Usage**: Chat utilizes entire viewport without layout competition
- **Natural Reading Flow**: Figures appear contextually within conversation
- **Scroll Continuity**: Charts integrate seamlessly into chat history
- **Touch Accessibility**: All interactions optimized for mobile touch

##### Desktop Experience
- **Enhanced Sizing**: Larger charts with more detail on bigger screens
- **Hover Interactions**: Rich hover states for mouse users
- **Flexible Layout**: Charts can expand to use available space

#### Technical Implementation

##### Simplified Layout Architecture
```tsx
// ResponsiveChatLayout - Simplified Structure
<div className="h-full flex flex-col">
  <div className="flex-1 flex flex-col min-h-0">
    <ChatInterface hideInlineCharts={false} />
  </div>
</div>
```

##### Chart State Management
- **Stateless Design**: No external chart state management required
- **Message-Bound Data**: Chart data lives within message objects
- **Automatic Cleanup**: Charts removed when messages are cleared

#### Migration Considerations

##### From External to Inline Charts
1. **Layout Simplification**: Remove external chart panel containers
2. **State Cleanup**: Eliminate chart state management in parent components
3. **Prop Simplification**: Remove onChartUpdate and chart state props
4. **Mobile Testing**: Verify responsive behavior in inline context

##### Backward Compatibility
- **ChartDisplay API**: Maintains backward compatibility with optional onClose
- **Message Schema**: Chart data structure unchanged
- **Responsive Patterns**: All mobile optimizations preserved

This inline chart architecture provides a more integrated, mobile-friendly experience while simplifying the technical implementation and reducing layout complexity.
