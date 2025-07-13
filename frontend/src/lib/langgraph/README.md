# LangGraph Integration for Finance App

This document explains the LangGraph hybrid architecture implementation for the finance app chat interface.

## Architecture Overview

The implementation follows a **hybrid client-server approach** with intelligent routing:

- **Frontend LangGraph**: Handles UI orchestration, simple queries, and local processing
- **Backend LangGraph**: Manages complex workflows, multi-agent coordination, and external integrations
- **Smart Routing**: Automatically determines whether to process queries locally or on the server
- **Backward Compatibility**: All existing functionality is preserved

## Directory Structure

```
lib/langgraph/
├── frontend/
│   ├── ui-orchestration-graph.ts       # Client-side graph for UI flow
│   ├── local-processing-nodes.ts       # Simple query handlers
│   └── routing-logic.ts                # Complexity analysis
├── backend/
│   ├── main-workflow-graph.ts          # Server-side orchestration
│   └── agents/                         # Specialized financial agents
├── shared/
│   ├── state-schemas.ts                # Shared state definitions
│   └── communication.ts               # Frontend ↔ Backend protocols
├── services/
│   ├── langgraph-frontend-service.ts   # Frontend service manager
│   ├── langgraph-backend-service.ts    # Backend service manager
│   └── langgraph-unified-service.ts    # Orchestrates both services
└── feature-flags.ts                   # Gradual rollout system
```

## Key Features

### 1. Smart Routing

The system automatically analyzes query complexity and routes accordingly:

```typescript
// Examples of frontend-handled queries
"hello"                    // Greetings
"show my portfolio"        // Simple portfolio display
"what is a stock?"         // Basic definitions
"help"                     // UI commands

// Examples of backend-handled queries
"analyze my portfolio risk and suggest optimizations"
"calculate Sharpe ratio for my holdings"
"add 100 shares of AAPL at $150"
"current market sentiment for tech stocks"
```

### 2. Multi-Agent Coordination

The backend uses specialized agents:

- **Portfolio Agent**: Handles CRUD operations on user portfolios
- **Market Agent**: Fetches and analyzes market data
- **Risk Agent**: Performs risk calculations and assessments
- **Coordinator Agent**: Orchestrates LLM responses with agent results

### 3. Backward Compatibility

All existing functionality is preserved:
- Existing API endpoints continue to work
- Chat sessions and message history are maintained
- Current UI components work without modification
- MCP and FastAPI backends remain functional

## Environment Configuration

Enable LangGraph with environment variables:

```bash
# Enable LangGraph globally
NEXT_PUBLIC_LANGGRAPH_ENABLED=true

# Gradual rollout (0-100%)
NEXT_PUBLIC_LANGGRAPH_ROLLOUT=10

# Enable specific features
NEXT_PUBLIC_LANGGRAPH_FRONTEND=true
NEXT_PUBLIC_LANGGRAPH_BACKEND=true
NEXT_PUBLIC_LANGGRAPH_STREAMING=true

# Debug mode
NEXT_PUBLIC_LANGGRAPH_DEBUG=true
```

## Usage Examples

### Basic Usage

```typescript
import { useLangGraphChat } from '@/hooks/use-langgraph-chat';

const ChatComponent = () => {
  const { sendMessage, isLoading, canHandleLocally } = useLangGraphChat();

  const handleSend = async (message: string) => {
    const response = await sendMessage(message, {
      provider: 'openai',
      enableStreaming: true,
      portfolioData: { portfolios: userPortfolios }
    });
    
    console.log('Response:', response);
  };
};
```

### Complexity Analysis

```typescript
import { langGraphUnifiedService } from '@/lib/langgraph/services/langgraph-unified-service';

const analysis = await langGraphUnifiedService.analyzeMessageComplexity(
  "analyze my portfolio risk",
  { isGuestMode: false }
);

console.log('Route to:', analysis.routeTo);        // 'backend'
console.log('Confidence:', analysis.confidence);   // 0.85
console.log('Reasoning:', analysis.reasoning);     // { requiresCalculation: true, ... }
```

### Streaming Responses

```typescript
const stream = langGraphUnifiedService.streamMessage(
  "calculate portfolio optimization",
  { userId: 'user123' }
);

for await (const chunk of stream) {
  console.log('Streaming update:', chunk.content);
  updateUI(chunk);
}
```

## Migration Strategy

### Phase 1: Testing (Current)
- LangGraph runs alongside existing system
- Feature flags control rollout percentage
- A/B testing with subset of users

### Phase 2: Gradual Rollout
- Increase rollout percentage gradually (10% → 50% → 100%)
- Monitor performance metrics and user feedback
- Fallback to legacy system if issues arise

### Phase 3: Full Migration
- LangGraph becomes primary system
- Legacy endpoints remain for backward compatibility
- Performance optimization and monitoring

## Performance Benefits

### Frontend Processing
- **Instant responses** for simple queries (< 100ms)
- **Offline capability** for basic portfolio operations
- **Reduced server load** for common interactions

### Backend Processing
- **Intelligent agent coordination** for complex workflows
- **Optimized resource usage** only for queries that need it
- **Better scalability** with smart workload distribution

## Monitoring and Debugging

### Health Checks

```typescript
const health = await langGraphUnifiedService.getHealthStatus();
console.log('System status:', health);
```

### Debug Information

```typescript
import { getLangGraphDebugInfo } from '@/lib/langgraph/feature-flags';

const debug = getLangGraphDebugInfo();
console.log('LangGraph config:', debug);
```

### Performance Metrics

The system tracks:
- Response times for frontend vs backend processing
- Routing accuracy (correct complexity assessment)
- Agent coordination efficiency
- User satisfaction scores

## Testing

Run the test suite:

```bash
npm run test -- tests/langgraph.test.ts
```

The tests cover:
- Complexity analysis accuracy
- Frontend/backend routing
- Service integration
- Error handling
- Performance benchmarks

## API Endpoints

### LangGraph Endpoint
```
POST /api/chat/langgraph
```

Enhanced with LangGraph features while maintaining backward compatibility.

### Health Check
```
GET /api/chat/langgraph
```

Returns service health and configuration status.

## Troubleshooting

### Common Issues

1. **LangGraph not enabled**
   - Check `NEXT_PUBLIC_LANGGRAPH_ENABLED=true`
   - Verify rollout percentage > 0

2. **Slow responses**
   - Check if queries are properly routed (frontend vs backend)
   - Monitor agent coordination efficiency

3. **Feature flags not working**
   - Ensure environment variables are set correctly
   - Check browser cache and restart development server

### Debug Mode

Enable debug logging:
```bash
NEXT_PUBLIC_LANGGRAPH_DEBUG=true
```

This provides detailed logs for:
- Routing decisions
- Agent coordination
- Performance metrics
- Error details

## Future Enhancements

- **WebSocket support** for real-time updates
- **Advanced RAG** with financial knowledge base
- **Custom agent creation** for specialized workflows
- **Performance optimization** based on usage patterns

## Contributing

When extending LangGraph functionality:

1. Add new features to appropriate service layer
2. Update state schemas if needed
3. Add comprehensive tests
4. Update this documentation
5. Ensure backward compatibility