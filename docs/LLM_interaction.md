# LLM Interaction Architecture

## Detailed Chat Page and LLM Interaction Flow

### ASCII Architecture Diagram - Chat & LLM Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    CHAT PAGE COMPONENT TREE                            │   │
│  │                                                                         │   │
│  │  /dashboard/chat/page.tsx (Server Component)                           │   │
│  │              │                                                          │   │
│  │              ▼                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │              ChatPageClient (Client Component)                  │   │   │
│  │  │                            │                                    │   │   │
│  │  │  ┌─────────────────────────┼─────────────────────────────────┐  │   │   │
│  │  │  │        Chat UI Components                                  │  │   │   │
│  │  │  │                         │                                  │  │   │   │
│  │  │  │  ┌──────────────────────┼──────────────────────────────┐   │  │   │   │
│  │  │  │  │    ResponsiveChatLayout                              │   │  │   │   │
│  │  │  │  │                      │                              │   │  │   │   │
│  │  │  │  │  ┌───────────────────┼───────────────────────────┐  │   │  │   │   │
│  │  │  │  │  │      ChatInterface (Main Component)          │  │   │  │   │   │
│  │  │  │  │  │                   │                          │  │   │  │   │   │
│  │  │  │  │  │  ┌────────────────┼────────────────────────┐ │  │   │  │   │   │
│  │  │  │  │  │  │   UI Elements  │                        │ │  │   │  │   │   │
│  │  │  │  │  │  │                │                        │ │  │   │  │   │   │
│  │  │  │  │  │  │ MessageBubble  │  Input Field          │ │  │   │  │   │   │
│  │  │  │  │  │  │ ChartDisplay   │  Send Button          │ │  │   │  │   │   │
│  │  │  │  │  │  │ FileProcessor  │  Provider Selector    │ │  │   │  │   │   │
│  │  │  │  │  │  └────────────────┼────────────────────────┘ │  │   │  │   │   │
│  │  │  │  │  │                   │                          │  │   │  │   │   │
│  │  │  │  │  │  ┌────────────────┼────────────────────────┐ │  │   │  │   │   │
│  │  │  │  │  │  │    React Hooks │                        │ │  │   │  │   │   │
│  │  │  │  │  │  │                │                        │ │  │   │  │   │   │
│  │  │  │  │  │  │ useChatAPI     │  useChatHistory       │ │  │   │  │   │   │
│  │  │  │  │  │  │ useScrollMgr   │  useState/useEffect   │ │  │   │  │   │   │
│  │  │  │  │  │  └────────────────┼────────────────────────┘ │  │   │  │   │   │
│  │  │  │  │  └───────────────────┼───────────────────────────┘  │   │  │   │   │
│  │  │  │  └────────────────────────┼──────────────────────────────┘   │  │   │   │
│  │  │  └─────────────────────────────┼─────────────────────────────────┘  │   │   │
│  │  └──────────────────────────────────┼────────────────────────────────────┘   │   │
│  │                                     │                                        │   │
│  └─────────────────────────────────────┼────────────────────────────────────────┘   │
│                                        │                                            │
│  ┌─────────────────────────────────────┼────────────────────────────────────────┐   │
│  │                   HTTP REQUESTS     │                                        │   │
│  │                                     ▼                                        │   │
│  │     POST /api/chat                                                           │   │
│  │     {                                                                        │   │
│  │       message: "user input",                                                │   │
│  │       provider: "openai|anthropic",                                         │   │
│  │       sessionId: "session_id",                                              │   │
│  │       portfolioData: {...},                                                 │   │
│  │       userPreferences: {...}                                                │   │
│  │     }                                                                        │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            NEXT.JS API LAYER                                       │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                        /api/chat/route.ts                                    │ │
│  │                                                                               │ │
│  │  1. Request Validation & Authentication                                       │ │
│  │     ├─ Extract message, provider, sessionId                                  │ │
│  │     ├─ Validate user authentication (JWT)                                    │ │
│  │     └─ Handle guest mode with guestSessionId                                 │ │
│  │                               │                                               │ │
│  │  2. Session Management        ▼                                               │ │
│  │     ├─ Load existing session messages for context                            │ │
│  │     ├─ Create new session if needed                                          │ │
│  │     └─ Generate session title from message                                   │ │
│  │                               │                                               │ │
│  │  3. Portfolio Context         ▼                                               │ │
│  │     ├─ Load user portfolios (authenticated users)                            │ │
│  │     ├─ Load guest portfolios (guest mode)                                    │ │
│  │     └─ Prepare portfolio data for LLM context                                │ │
│  │                               │                                               │ │
│  │  4. Provider Selection        ▼                                               │ │
│  │     ├─ Validate LLM provider availability                                    │ │
│  │     ├─ Default to OpenAI if not specified                                    │ │
│  │     └─ Check API keys for selected provider                                  │ │
│  └─────────────────────────────┼─────────────────────────────────────────────────┘ │
│                                │                                                   │
└────────────────────────────────┼───────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────┼───────────────────────────────────────────────────┐
│                    PROCESSING LAYER                                               │
│                                │                                                   │
│  ┌─────────────────────────────┼─────────────────────────────────────────────────┐ │
│  │               ChatTriageProcessor.processQuery()                             │ │
│  │                             │                                                 │ │
│  │  ┌──────────────────────────┼──────────────────────────────────────────────┐  │ │
│  │  │         STEP 1: Query Analysis & Triage                                 │  │ │
│  │  │                          │                                              │  │ │
│  │  │  ┌───────────────────────┼──────────────────────────────────────┐      │  │ │
│  │  │  │     QueryTriage.analyzeQuery()                               │      │  │ │
│  │  │  │                       │                                      │      │  │ │
│  │  │  │  ┌────────────────────┼──────────────────────────────────┐   │      │  │ │
│  │  │  │  │   Pattern Matching │                                  │   │      │  │ │
│  │  │  │  │                    ▼                                  │   │      │  │ │
│  │  │  │  │  • Portfolio CRUD patterns                           │   │      │  │ │
│  │  │  │  │    (/buy|sell|add|remove/ + symbol)                  │   │      │  │ │
│  │  │  │  │  • Financial analysis patterns                       │   │      │  │ │
│  │  │  │  │    (/analyze|risk|performance/)                      │   │      │  │ │
│  │  │  │  │  • General chat patterns                             │   │      │  │ │
│  │  │  │  │    (everything else)                                 │   │      │  │ │
│  │  │  │  └──────────────────────────────────────────────────────┘   │      │  │ │
│  │  │  └─────────────────────────────────────────────────────────────┘      │  │ │
│  │  └────────────────────────────────────────────────────────────────────────┘  │ │
│  │                             │                                                 │ │
│  │  ┌──────────────────────────┼──────────────────────────────────────────────┐  │ │
│  │  │         STEP 2: Route to Appropriate Handler                            │  │ │
│  │  │                          │                                              │  │ │
│  │  │                          ▼                                              │  │ │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │  │ │
│  │  │  │   CRUD Pattern  │  │ Analysis Pattern │  │    General Chat        │  │  │ │
│  │  │  │                 │  │                  │  │                        │  │  │ │
│  │  │  │ PortfolioCrud   │  │ UnifiedAnalysis  │  │    LLM Service         │  │  │ │
│  │  │  │ Handler         │  │ Service          │  │    Direct Call         │  │  │ │
│  │  │  │                 │  │                  │  │                        │  │  │ │
│  │  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │  │ │
│  │  │          │                       │                        │             │  │ │
│  │  └──────────┼───────────────────────┼────────────────────────┼─────────────┘  │ │
│  └─────────────┼───────────────────────┼────────────────────────┼────────────────┘ │
└─────────────────┼───────────────────────┼────────────────────────┼──────────────────┘
                  │                       │                        │
                  ▼                       ▼                        ▼
┌─────────────────┼───────────────────────┼────────────────────────┼──────────────────┐
│                 │        SPECIALIZED SERVICES LAYER             │                  │
│                 │                       │                        │                  │
│  ┌──────────────┼─────────────────┐    │    ┌───────────────────┼────────────────┐ │
│  │      DATABASE OPERATIONS        │    │    │       LLM SERVICE LAYER           │ │
│  │              │                  │    │    │                   │               │ │
│  │  ┌───────────┼────────────────┐ │    │    │  ┌────────────────┼─────────────┐ │ │
│  │  │ Portfolio │CRUD Operations │ │    │    │  │  Provider      │Selection    │ │ │
│  │  │           │                │ │    │    │  │                │             │ │ │
│  │  │ • Add/    │• Database      │ │    │    │  │  ┌─────────────┼───────────┐ │ │ │
│  │  │   Remove  │  transactions  │ │    │    │  │  │    OpenAI   │API        │ │ │ │
│  │  │ • Update  │• Validation    │ │    │    │  │  │    Client   │           │ │ │ │
│  │  │   Quantities              │ │    │    │  │  │             │           │ │ │ │
│  │  │ • Price   │• Error         │ │    │    │  │  │  ┌──────────┼─────────┐ │ │ │ │
│  │  │   Updates │  handling      │ │    │    │  │  │  │   GPT-4.1│-nano    │ │ │ │ │
│  │  └───────────────────────────┘ │    │    │  │  │  │   Model  │         │ │ │ │ │
│  │              │                  │    │    │  │  │  └──────────┼─────────┘ │ │ │ │
│  │              ▼                  │    │    │  │  └─────────────┼───────────┘ │ │ │
│  │  ┌───────────────────────────┐  │    │    │  │                │             │ │ │
│  │  │     PostgreSQL Database   │  │    │    │  │  ┌─────────────┼───────────┐ │ │ │
│  │  │                           │  │    │    │  │  │  Anthropic  │API        │ │ │ │
│  │  │ • Users/Portfolios        │  │    │    │  │  │  Client     │           │ │ │ │
│  │  │ • Assets/Transactions     │  │    │    │  │  │             │           │ │ │ │
│  │  │ • Chat Sessions/Messages  │  │    │    │  │  │  ┌──────────┼─────────┐ │ │ │ │
│  │  │ • Guest Session Storage   │  │    │    │  │  │  │  Claude 3│Sonnet   │ │ │ │ │
│  │  └───────────────────────────┘  │    │    │  │  │  │  Model   │         │ │ │ │ │
│  └──────────────────────────────────┘    │    │  │  │  └──────────┼─────────┘ │ │ │ │
│                                          │    │  │  └─────────────┼───────────┘ │ │ │
│                                          │    │  └────────────────┼─────────────┘ │ │
│                                          │    └───────────────────┼───────────────┘ │
└──────────────────────────────────────────┼────────────────────────┼─────────────────┘
                                           │                        │
                                           ▼                        ▼
┌──────────────────────────────────────────┼────────────────────────┼─────────────────┐
│                  EXTERNAL ANALYSIS SERVICES                       │                 │
│                                          │                        │                 │
│  ┌───────────────────────────────────────┼──────────────────────┐ │                 │
│  │           UNIFIED ANALYSIS SERVICE    │                      │ │                 │
│  │                                       │                      │ │                 │
│  │  ┌─────────────────────────────────────┼────────────────────┐ │ │                 │
│  │  │        Query Analysis & Routing     │                    │ │ │                 │
│  │  │                                     ▼                    │ │ │                 │
│  │  │  • Risk analysis keywords         ┌──────────────────┐   │ │ │                 │
│  │  │  • Sharpe ratio keywords          │   FastAPI        │   │ │ │                 │
│  │  │  • Portfolio optimization         │   Service        │   │ │ │                 │
│  │  │  • Monte Carlo simulation         │   (Python)       │   │ │ │                 │
│  │  │  • Market sentiment analysis      │                  │   │ │ │                 │
│  │  │                                   │  ┌─────────────┐ │   │ │ │                 │
│  │  │  Route to appropriate endpoint:   │  │ Portfolio   │ │   │ │ │                 │
│  │  │  • /portfolio-risk                │  │ Risk        │ │   │ │ │                 │
│  │  │  • /sharpe-ratio                  │  │ Analysis    │ │   │ │ │                 │
│  │  │  • /portfolio-optimization        │  └─────────────┘ │   │ │ │                 │
│  │  │  • /monte-carlo                   │                  │   │ │ │                 │
│  │  │  • /market-sentiment              │  ┌─────────────┐ │   │ │ │                 │
│  │  └─────────────────────────────────────┼─ │ Market Data │ │   │ │ │                 │
│  │                                       │  │ Integration │ │   │ │ │                 │
│  │  ┌─────────────────────────────────────┼─ │ (yfinance)  │ │   │ │ │                 │
│  │  │        Response Processing          │  └─────────────┘ │   │ │ │                 │
│  │  │                                     │                  │   │ │ │                 │
│  │  │  • Format analysis results         │  ┌─────────────┐ │   │ │ │                 │
│  │  │  • Generate charts/figures         │  │ Chart       │ │   │ │ │                 │
│  │  │  • Extract key metrics             │  │ Generation  │ │   │ │ │                 │
│  │  │  • Standardize response format     │  │ (matplotlib)│ │   │ │ │                 │
│  │  └─────────────────────────────────────┼─ └─────────────┘ │   │ │ │                 │
│  │                                       └──────────────────┘   │ │ │                 │
│  └─────────────────────────────────────────────────────────────┘ │ │                 │
│                                                                   │ │                 │
│                                                                   │ │                 │
│                                    MCP Server (DISABLED)         │ │                 │
│                                    ┌─────────────────────┐        │ │                 │
│                                    │  Alternative        │        │ │                 │
│                                    │  Analysis Backend   │        │ │                 │
│                                    │  (Not Active)       │        │ │                 │
│                                    └─────────────────────┘        │ │                 │
└────────────────────────────────────────────────────────────────────┼─────────────────┘
                                                                     │
                              ┌──────────────────────────────────────┼─────────────────┐
                              │              LLM PROVIDERS           │                 │
                              │                                      │                 │
                              │  ┌─────────────────┐  ┌──────────────┼───────────────┐ │
                              │  │    OpenAI API   │  │  Anthropic   │API            │ │
                              │  │                 │  │              │               │ │
                              │  │ ┌─────────────┐ │  │ ┌────────────┼─────────────┐ │ │
                              │  │ │   Context   │ │  │ │  Context   │Formation   │ │ │
                              │  │ │  Formation  │ │  │ │  Formation │            │ │ │
                              │  │ └─────────────┘ │  │ └────────────┼─────────────┘ │ │
                              │  │                 │  │              │               │ │
                              │  │ ┌─────────────┐ │  │ ┌────────────┼─────────────┐ │ │
                              │  │ │   Message   │ │  │ │   Message  │Processing  │ │ │
                              │  │ │ Processing  │ │  │ │  Processing│            │ │ │
                              │  │ └─────────────┘ │  │ └────────────┼─────────────┘ │ │
                              │  │                 │  │              │               │ │
                              │  │ ┌─────────────┐ │  │ ┌────────────┼─────────────┐ │ │
                              │  │ │  Response   │ │  │ │  Response  │Generation  │ │ │
                              │  │ │ Generation  │ │  │ │ Generation │            │ │ │
                              │  │ └─────────────┘ │  │ └────────────┼─────────────┘ │ │
                              │  └─────────────────┘  └──────────────┼───────────────┘ │
                              └───────────────────────────────────────┼─────────────────┘
                                                                      │
                      ┌───────────────────────────────────────────────┼─────────────────┐
                      │                    RESPONSE FLOW              │                 │
                      │                                               ▼                 │
                      │  ┌─────────────────────────────────────────────────────────────┐ │
                      │  │              RESPONSE AGGREGATION                           │ │
                      │  │                                                             │ │
                      │  │  ┌─────────────────────────────────────────────────────────┐ │ │
                      │  │  │            LLM Response Processing                      │ │ │
                      │  │  │                                                         │ │ │
                      │  │  │  • Combine LLM response with analysis data             │ │ │
                      │  │  │  • Extract chart generation instructions               │ │ │
                      │  │  │  • Format financial metrics                            │ │ │
                      │  │  │  • Add portfolio context                               │ │ │
                      │  │  │  • Handle error responses                               │ │ │
                      │  │  └─────────────────────────────────────────────────────────┘ │ │
                      │  │                                                             │ │
                      │  │  ┌─────────────────────────────────────────────────────────┐ │ │
                      │  │  │            Message Storage                              │ │ │
                      │  │  │                                                         │ │ │
                      │  │  │  • Save user message to database                       │ │ │
                      │  │  │  • Save AI response to database                        │ │ │
                      │  │  │  • Store metadata (provider, tokens, charts)          │ │ │
                      │  │  │  • Update session information                          │ │ │
                      │  │  └─────────────────────────────────────────────────────────┘ │ │
                      │  └─────────────────────────────────────────────────────────────┘ │
                      │                                               │                 │
                      └───────────────────────────────────────────────┼─────────────────┘
                                                                      │
                                                                      ▼
                      ┌───────────────────────────────────────────────┼─────────────────┐
                      │                   HTTP RESPONSE               │                 │
                      │                                               ▼                 │
                      │     {                                                           │
                      │       "content": "AI response text...",                        │
                      │       "sessionId": "session_123",                              │
                      │       "provider": "openai",                                    │
                      │       "chartData": {                                           │
                      │         "type": "pie|bar|figure",                              │
                      │         "title": "Chart Title",                                │
                      │         "data": [...] or "figureData": {...}                  │
                      │       },                                                        │
                      │       "metadata": {                                            │
                      │         "tokens": 150,                                         │
                      │         "processingTime": 1250,                                │
                      │         "confidence": 0.95,                                    │
                      │         "backendUsed": "fastapi"                               │
                      │       }                                                         │
                      │     }                                                           │
                      └─────────────────────────────────────────────────────────────────┘
                                                                      │
                                                                      ▼
                      ┌───────────────────────────────────────────────┼─────────────────┐
                      │                    CLIENT RESPONSE HANDLING   │                 │
                      │                                               ▼                 │
                      │  ┌─────────────────────────────────────────────────────────────┐ │
                      │  │              useChatAPI Hook                                │ │
                      │  │                                                             │ │
                      │  │  • Receive response from API                               │ │
                      │  │  • Update messages state                                   │ │
                      │  │  • Trigger chart rendering if chartData present            │ │
                      │  │  • Handle error states                                     │ │
                      │  │  • Update loading states                                   │ │
                      │  └─────────────────────────────────────────────────────────────┘ │
                      │                                               │                 │
                      │  ┌─────────────────────────────────────────────────────────────┐ │
                      │  │              React Component Updates                        │ │
                      │  │                                                             │ │
                      │  │  • Add new message bubbles to chat                         │ │
                      │  │  • Render chart components                                  │ │
                      │  │  • Auto-scroll to bottom                                   │ │
                      │  │  • Update chat history                                     │ │
                      │  │  • Reset input field                                       │ │
                      │  └─────────────────────────────────────────────────────────────┘ │
                      └─────────────────────────────────────────────────────────────────┘
```

## Essential Architectural Interactions

### 1. **Component Hierarchy and State Management**

#### Frontend Component Flow
```
/dashboard/chat/page.tsx (Server)
├── Authentication & Guest Mode Detection
└── ChatPageClient (Client)
    ├── Guest Portfolio Loading
    └── ResponsiveChatLayout
        └── ChatInterface (Main Component)
            ├── useChatAPI (API communication)
            ├── useChatHistory (Navigation)
            ├── useScrollManager (UI behavior)
            ├── MessageBubble[] (Message display)
            ├── ChartDisplay (Visualization)
            └── FileProcessor (File uploads)
```

#### Key State Management
- **Messages State**: Array of chat messages with metadata
- **Session Management**: Current session ID for message persistence
- **Provider Selection**: OpenAI/Anthropic selection with fallback
- **Portfolio Context**: User/guest portfolio data for financial context
- **Loading States**: Multiple loading indicators for different operations

### 2. **API Request Flow**

#### Request Structure
```typescript
POST /api/chat
{
  message: string,           // User input
  provider: 'openai'|'anthropic', // LLM provider selection
  sessionId?: string,        // Existing session ID
  guestSessionId?: string,   // Guest mode session
  portfolioData?: object,    // Portfolio context
  userPreferences?: object,  // User financial preferences
  requestId?: string        // Request tracking
}
```

#### Request Processing Pipeline
1. **Authentication Layer**: JWT validation or guest mode detection
2. **Session Management**: Load/create chat session with context
3. **Portfolio Context**: Fetch user portfolios or guest data
4. **Provider Validation**: Ensure selected LLM provider is available
5. **Query Routing**: Determine processing path via ChatTriageProcessor

### 3. **Query Triage and Processing**

#### Query Analysis Process
```typescript
QueryTriage.analyzeQuery(message) → TriageResult
├── Pattern Matching (RegExp)
│   ├── Portfolio CRUD: /buy|sell|add|remove/ + symbol
│   ├── Financial Analysis: /risk|sharpe|optimize|simulate/
│   └── General Chat: Everything else
├── Confidence Scoring (0.0 - 1.0)
└── Routing Decision
```

#### Processing Routes
1. **Portfolio CRUD Route** (`PortfolioCrudHandler`)
   - Direct database operations
   - Real-time portfolio updates
   - Transaction logging

2. **Financial Analysis Route** (`UnifiedAnalysisService`)
   - FastAPI service integration
   - Complex mathematical calculations
   - Chart generation

3. **General Chat Route** (`LLMService`)
   - Direct LLM provider communication
   - Financial context injection
   - Conversational responses

### 4. **LLM Service Integration**

#### Multi-Provider Architecture
```typescript
LLMService
├── Provider Management
│   ├── OpenAI Client (GPT-4.1-nano)
│   ├── Anthropic Client (Claude 3 Sonnet)
│   └── Availability Checking
├── Context Formation
│   ├── Financial system prompts
│   ├── Portfolio data injection
│   ├── User preference context
│   └── Session history
└── Response Processing
    ├── Content extraction
    ├── Token usage tracking
    └── Error handling
```

#### Context Injection Process
1. **System Prompt**: Financial advisory role definition
2. **Portfolio Context**: Current holdings, values, performance
3. **User Preferences**: Risk tolerance, investment goals
4. **Session History**: Previous conversation context
5. **Market Data**: Current prices, market conditions

### 5. **FastAPI Integration for Financial Analysis**

#### Analysis Service Communication
```typescript
UnifiedAnalysisService
├── Query Classification
│   ├── Risk analysis patterns
│   ├── Performance optimization patterns
│   ├── Monte Carlo simulation patterns
│   └── Market sentiment patterns
├── FastAPI Client Communication
│   ├── HTTP requests to Python service
│   ├── Portfolio data serialization
│   ├── Response deserialization
│   └── Error handling
└── Response Formatting
    ├── Text description generation
    ├── Chart data extraction
    └── Metric highlighting
```

#### Available Analysis Endpoints
- `/portfolio-risk`: VaR, volatility, drawdown analysis
- `/sharpe-ratio`: Risk-adjusted return calculations
- `/portfolio-optimization`: Efficient frontier analysis
- `/monte-carlo`: Future performance simulations
- `/market-sentiment`: News and sentiment analysis

### 6. **Chart Generation and Visualization**

#### Chart Data Flow
```typescript
Analysis Response → Chart Detection → Chart Generation
├── FastAPI generates matplotlib figures
├── Base64 encoding for transport
├── Frontend ChartDisplay component
├── SVG/Interactive rendering
└── Chart metadata storage
```

#### Chart Types
- **Portfolio Pie Charts**: Asset allocation visualization
- **Performance Line Charts**: Historical performance tracking  
- **Risk Analysis Charts**: VaR distributions, volatility
- **Interactive Figures**: Complex analysis visualizations

### 7. **Session and Message Persistence**

#### Database Integration
```typescript
ChatService
├── Session Management
│   ├── Create/retrieve chat sessions
│   ├── Generate session titles
│   └── Handle guest session expiration
├── Message Storage
│   ├── User messages with metadata
│   ├── AI responses with provider info
│   ├── Chart data persistence
│   └── Token usage tracking
└── Context Loading
    ├── Session history retrieval
    ├── Message pagination
    └── Context window management
```

#### Guest Mode Handling
- **Local Storage**: Guest portfolio persistence
- **Session IDs**: Generated client-side identifiers
- **Temporary Sessions**: Auto-expiring database entries
- **Data Migration**: Guest-to-user account conversion

### 8. **Error Handling and Fallback Logic**

#### Multi-Level Error Handling
1. **Provider Fallback**: OpenAI ↔ Anthropic switching
2. **Service Degradation**: FastAPI unavailable → LLM-only responses
3. **Network Resilience**: Retry logic with exponential backoff
4. **User Communication**: Graceful error messaging
5. **Session Recovery**: Maintain context during failures

#### Monitoring and Logging
- **Request Tracking**: Unique request IDs for debugging
- **Performance Metrics**: Response times, token usage
- **Error Logging**: Detailed error context and stack traces
- **Analytics Integration**: Chat interaction tracking

### 9. **Security and Authentication**

#### Security Layers
1. **JWT Authentication**: Token-based user identification
2. **Request Validation**: Input sanitization and validation
3. **Rate Limiting**: Prevent API abuse
4. **CORS Configuration**: Secure cross-origin requests
5. **API Key Security**: Encrypted storage of LLM provider keys

#### Guest Mode Security
- **Data Isolation**: Guest sessions separated from user data
- **Limited Functionality**: Restricted feature access
- **Session Expiration**: Automatic cleanup of guest data
- **No Persistent Storage**: Guest data not permanently stored

### 10. **Performance Optimizations**

#### Frontend Optimizations
- **Message Virtualization**: Efficient rendering of long chat histories
- **Lazy Loading**: Load messages on demand
- **Chart Caching**: Cache generated visualizations
- **Debounced Input**: Prevent excessive API calls

#### Backend Optimizations
- **Connection Pooling**: Database connection reuse
- **Response Caching**: Cache analysis results
- **Streaming Responses**: Real-time message delivery
- **Background Processing**: Async heavy computations

This architecture provides a robust, scalable chat interface with sophisticated LLM integration, financial analysis capabilities, and comprehensive error handling while maintaining security and performance standards.