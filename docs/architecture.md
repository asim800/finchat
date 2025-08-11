# Finance App Architecture

## ASCII Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                      │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Web Browser   │  │   Mobile App    │  │   Desktop App   │                │
│  │                 │  │   (Future)      │  │   (Future)      │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│            │                    │                    │                         │
└────────────┼────────────────────┼────────────────────┼─────────────────────────┘
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────────────────────┐
│                    FRONTEND LAYER (Next.js 15.3.3)                             │
│                                 │                                               │
│  ┌──────────────────────────────┼───────────────────────────────────────┐      │
│  │             PRESENTATION LAYER                                        │      │
│  │                              │                                        │      │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │      │
│  │  │    Auth     │ │  Dashboard  │ │  Portfolio  │ │    Chat     │     │      │
│  │  │   Pages     │ │   Pages     │ │   Pages     │ │   Pages     │     │      │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │      │
│  │         │              │              │              │               │      │
│  └─────────┼──────────────┼──────────────┼──────────────┼───────────────┘      │
│            │              │              │              │                      │
│  ┌─────────┼──────────────┼──────────────┼──────────────┼───────────────┐      │
│  │                    COMPONENT LAYER                                   │      │
│  │         │              │              │              │               │      │
│  │  ┌──────┴──────┐┌──────┴──────┐┌──────┴──────┐┌──────┴──────┐       │      │
│  │  │ Auth Forms  ││ Admin Panel ││ Portfolio   ││ Chat        │       │      │
│  │  │ Components  ││ Components  ││ Management  ││ Interface   │       │      │
│  │  └─────────────┘└─────────────┘└─────────────┘└─────────────┘       │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                 │                                               │
│  ┌─────────────────────────────┼─────────────────────────────────────────┐     │
│  │                        API ROUTES LAYER                                │     │
│  │                             │                                          │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─┴────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │     │
│  │  │ /auth   │ │/portfolio│ │/chat │ │/fastapi │ │/profile │ │ /admin  │ │     │
│  │  │ routes  │ │ routes   │ │routes│ │ proxy   │ │ routes  │ │ routes  │ │     │
│  │  └─────────┘ └─────────┘ └──────┘ └─────────┘ └─────────┘ └─────────┘ │     │
│  └─────────┬───────────┬────────┬─────────────┬─────────┬─────────┬─────┘     │
│            │           │        │             │         │         │           │
│  ┌─────────┼───────────┼────────┼─────────────┼─────────┼─────────┼─────┐     │
│  │                         SERVICE LAYER                                 │     │
│  │         │           │        │             │         │         │     │     │
│  │  ┌──────┴──┐ ┌──────┴──┐ ┌───┴───┐ ┌───────┴──┐ ┌────┴──┐ ┌────┴──┐  │     │
│  │  │  Auth   │ │Portfolio│ │  LLM  │ │ Unified  │ │Profile│ │ Admin │  │     │
│  │  │ Service │ │ Service │ │Service│ │ Analysis │ │Service│ │Service│  │     │
│  │  └─────────┘ └─────────┘ └───────┘ └──────────┘ └───────┘ └───────┘  │     │
│  │                              │                                        │     │
│  └──────────────────────────────┼────────────────────────────────────────┘     │
└─────────────────────────────────┼─────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────────────────────┐
│                     MIDDLEWARE LAYER                                           │
│                                 │                                               │
│  ┌─────────────────────┐       │       ┌─────────────────────┐                │
│  │   Authentication    │       │       │      CORS           │                │
│  │     Middleware      │       │       │    Middleware       │                │
│  │   (JWT Validation)  │       │       │                     │                │
│  └─────────────────────┘       │       └─────────────────────┘                │
│                                │                                               │
└─────────────────────────────────┼─────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                                        │
│                                 │                                               │
│  ┌─────────────────────────────┴─────────────────────────────────────────┐     │
│  │                        PRISMA ORM                                      │     │
│  │                                                                         │     │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │     │
│  │  │    User     │ │ Portfolio   │ │ ChatSession │ │ AssetMetrics│      │     │
│  │  │   Models    │ │   Models    │ │   Models    │ │   Models    │      │     │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │     │
│  └─────────────────────────────────────────────────────────────────────────┘     │
│                                 │                                               │
└─────────────────────────────────┼─────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────────────────────┐
│                        DATABASE LAYER                                          │
│                                 │                                               │
│                    ┌─────────────────────────────────┐                         │
│                    │        PostgreSQL Database      │                         │
│                    │                                 │                         │
│                    │  ┌───────────┐ ┌───────────┐   │                         │
│                    │  │   Users   │ │Portfolios │   │                         │
│                    │  │   Table   │ │  Table    │   │                         │
│                    │  └───────────┘ └───────────┘   │                         │
│                    │                                 │                         │
│                    │  ┌───────────┐ ┌───────────┐   │                         │
│                    │  │   Assets  │ │ Messages  │   │                         │
│                    │  │   Table   │ │  Table    │   │                         │
│                    │  └───────────┘ └───────────┘   │                         │
│                    └─────────────────────────────────┘                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES LAYER                               │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │    LLM PROVIDERS    │  │  FINANCIAL SERVICES │  │   ANALYSIS BACKENDS │    │
│  │                     │  │                     │  │    (ALTERNATIVES)   │    │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │                     │    │
│  │  │   OpenAI      │  │  │  │   Yahoo       │  │  │  ┌───────────────┐  │    │
│  │  │   GPT-4.1     │  │  │  │   Finance     │  │  │  │   FastAPI     │  │    │
│  │  └───────────────┘  │  │  │  (yfinance)   │  │  │  │   Service     │  │    │
│  │                     │  │  └───────────────┘  │  │  │  (ACTIVE)     │  │    │
│  │  ┌───────────────┐  │  │                     │  │  └───────────────┘  │    │
│  │  │  Anthropic    │  │  │  ┌───────────────┐  │  │                     │    │
│  │  │  Claude 3     │  │  │  │   Market      │  │  │  ┌───────────────┐  │    │
│  │  │  Sonnet       │  │  │  │   Data APIs   │  │  │  │   MCP Server  │  │    │
│  │  └───────────────┘  │  │  │               │  │  │  │  (DISABLED)   │  │    │
│  └─────────────────────┘  │  └───────────────┘  │  │  └───────────────┘  │    │
│            │              └─────────────────────┘  │                     │    │
│            │                         │             └─────────────────────┘    │
│            │                         │                        │                │
└────────────┼─────────────────────────┼────────────────────────┼────────────────┘
             │                         │                        │
             └─────────────────────────┼────────────────────────┘
                                       │        (Alternative backends -
                                       │         only FastAPI active)
┌─────────────────────────────────────┼─────────────────────────────────────────────┐
│                         INTEGRATION LAYER                                      │
│                                     │                                           │
│  ┌─────────────────────────────────┴─────────────────────────────────┐         │
│  │                    UNIFIED ANALYSIS SERVICE                        │         │
│  │                                                                     │         │
│  │  • Query Triage & Routing (to FastAPI only)                       │         │
│  │  • Backend Health Monitoring (FastAPI service)                     │         │
│  │  • Backend Abstraction Layer (MCP support disabled)               │         │
│  │  • Response Formatting & Standardization                           │         │
│  └─────────────────────────────────────────────────────────────────────┘         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW DIAGRAM                                   │
│                                                                                 │
│   User Request                                                                  │
│        │                                                                       │
│        ▼                                                                       │
│   [Frontend Pages] ──► [React Components] ──► [API Routes]                    │
│                                                     │                          │
│                                                     ▼                          │
│   [Service Layer] ◄─── [Middleware] ◄─── [Route Handlers]                     │
│        │                                                                       │
│        ├──► [Authentication Service] ──► [JWT Validation]                      │
│        │                                                                       │
│        ├──► [Portfolio Service] ──► [Prisma ORM] ──► [PostgreSQL]             │
│        │                                                                       │
│        └──► [LLM Service] ──┬──► [OpenAI API]                                 │
│                             │                                                  │
│                             ├──► [Anthropic API]                              │
│                             │                                                  │
│                             └──► [Unified Analysis] ──► [FastAPI Service]     │
│                                       │                                        │
│                                       X [MCP Server - Disabled]               │
│                                                                                │
│   Response ◄─── [Frontend] ◄─── [API Response] ◄─── [Service Response]        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Architecture Overview

### Core Architecture Principles

1. **Layered Architecture**: Clear separation of concerns across presentation, business logic, data access, and external service layers
2. **Single Backend Strategy**: Currently uses FastAPI service exclusively for financial analysis
3. **Multi-LLM Support**: Provider abstraction allowing seamless switching between OpenAI and Anthropic
4. **Unified Analysis Layer**: Abstraction service designed for multiple backends but currently only supports FastAPI
5. **Real-time Capabilities**: WebSocket support for chat interfaces and live data updates

### Technology Stack

#### Frontend Layer
- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript with strict typing
- **Styling**: Tailwind CSS v4
- **State Management**: React hooks with custom portfolio state management
- **Authentication**: JWT tokens with bcryptjs for password hashing

#### Backend Services
- **Primary API**: Next.js API Routes (integrated backend)
- **Analysis Service**: FastAPI microservice (Python 3.12) - **ACTIVE**
- **MCP Server**: Model Context Protocol server - **DISABLED**
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with 7-day expiration

#### AI/LLM Integration
- **Providers**: OpenAI (GPT-4.1-nano) and Anthropic (Claude 3 Sonnet)
- **Service Layer**: Centralized LLM service with provider fallback
- **Chat System**: Real-time chat with financial context injection
- **Query Triage**: Intelligent routing system for financial analysis queries

### Key Components

#### 1. Frontend Components
- **Authentication**: Login/register forms with validation
- **Dashboard**: Protected routes with role-based access
- **Portfolio Management**: Asset tracking, CSV import/export, multi-portfolio support
- **Chat Interface**: AI-powered financial advisory with chart generation
- **Admin Panel**: User management and system analytics

#### 2. API Layer
- **Authentication Routes**: `/api/auth/*` - User registration, login, profile management
- **Portfolio Routes**: `/api/portfolio/*` - Asset CRUD, portfolio management, CSV operations
- **Chat Routes**: `/api/chat/*` - AI chat interface, session management
- **FastAPI Proxy**: `/api/fastapi/*` - Proxy to external analysis service
- **Admin Routes**: `/api/admin/*` - System administration and analytics

#### 3. Service Layer
- **LLM Service**: Multi-provider AI integration with fallback logic
- **Unified Analysis**: Backend abstraction layer (designed for multiple backends, currently FastAPI only)
- **Portfolio Service**: Business logic for portfolio operations
- **Authentication Service**: JWT handling and user management
- **Chat Service**: Message processing and session management

#### 4. External Integrations
- **FastAPI Service**: **ACTIVE** - Independent microservice for complex financial analysis
  - Portfolio risk analysis (VaR, Sharpe ratio, volatility)
  - Monte Carlo simulations
  - Portfolio optimization
  - Market sentiment analysis
- **MCP Server**: **DISABLED** - Model Context Protocol server (legacy/future use)
- **Financial Data**: Yahoo Finance API via yfinance library
- **AI Providers**: OpenAI and Anthropic APIs for chat functionality

### Backend Architecture Status

#### Current State
- **Primary Backend**: FastAPI service (Python microservice)
- **Backend Selection**: Hardcoded to FastAPI only in `backend-config.ts`
- **MCP Integration**: Disabled - exists in codebase but not functional
- **Fallback Logic**: Designed but not implemented (fallback would be to MCP if enabled)

#### Design Intent vs Reality
- **Design**: The Unified Analysis Service was built to support multiple backends with automatic switching
- **Reality**: Only FastAPI backend is implemented and active
- **MCP Server**: Present in codebase but not integrated with current analysis flow

### Database Schema

#### Core Entities
- **Users**: Authentication, profile data, financial information
- **Portfolios**: Investment portfolios with multi-portfolio support per user
- **Assets**: Individual holdings including stocks, options, and other securities
- **ChatSessions/Messages**: Persistent chat history with metadata
- **HistoricalPrices**: Shared market data cache
- **AssetMetrics**: Financial metrics and company information
- **FinancialTerms**: Learning content management system

### Security Architecture

1. **Authentication**: JWT-based with secure cookie storage
2. **Authorization**: Role-based access control (user/admin)
3. **API Security**: Request validation, rate limiting, CORS configuration
4. **Data Protection**: Encrypted API key storage, secure password hashing
5. **Guest Mode**: Limited functionality without full registration

### Deployment Architecture

#### Production Environment
- **Frontend**: Vercel deployment with Edge runtime
- **Database**: PostgreSQL (managed service)
- **FastAPI Service**: Independent deployment (Vercel/Railway/Docker)
- **Environment Variables**: Secure configuration management

#### Development Environment
- **Frontend**: Local Next.js development server with Turbopack
- **Database**: Local PostgreSQL or cloud connection
- **FastAPI Service**: Local development server (uvicorn)
- **Hot Reload**: Full-stack development with automatic code reloading

### Scalability Considerations

1. **Horizontal Scaling**: Stateless API design enables easy scaling
2. **Database Optimization**: Indexed queries, connection pooling
3. **Caching Strategy**: Historical price data caching, API response caching
4. **CDN Integration**: Static asset optimization via Vercel
5. **Microservice Architecture**: Independent scaling of analysis services

### Future Architecture Roadmap

1. **MCP Server Integration**: Potential activation of Model Context Protocol server
2. **Multiple Backend Support**: Full implementation of backend switching logic
3. **Mobile Applications**: React Native or native mobile apps
4. **Real-time WebSocket**: Live portfolio updates and chat notifications
5. **Advanced Analytics**: Machine learning models for predictive analysis
6. **Third-party Integrations**: Brokerage APIs, bank connections
7. **Enhanced Security**: Multi-factor authentication, audit logging

## Component Dependencies

### Frontend Dependencies
```
Pages → Components → Services → API Routes → External Services
  ↓         ↓          ↓           ↓             ↓
Auth ←→ Portfolio ←→ Chat ←→ Analysis ←→ LLM Providers
                           ↓
                    FastAPI (Active)
                    MCP Server (Disabled)
```

### Data Flow
```
User Action → React Component → API Route → Service Layer → Database/External API
    ↓
Response ← UI Update ← JSON Response ← Processed Data ← Raw Data
```

### Service Integration (Current State)
```
Frontend Service ←→ Unified Analysis ─── FastAPI Service (Active)
                                   ─ X ─ MCP Server (Disabled)
                                   ←──► LLM Providers
                                   ←──► Financial APIs
```

This architecture provides a robust foundation with the flexibility to activate additional backends in the future, though currently operates with a single FastAPI backend for all financial analysis operations.