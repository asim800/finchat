# Conversation Analytics System

## Overview
A comprehensive conversation analytics engine that tracks the entire flow from user chat through to the FastAPI backend and back, providing complete visibility into frontend-backend interactions.

## Architecture

### 1. Core Analytics Engine (`conversation-analytics.ts`)
- **Event Tracking**: Comprehensive event types for the entire conversation lifecycle
- **Thread Management**: Tracks complete conversation threads with timing and performance metrics
- **User Patterns**: Analyzes user behavior patterns and engagement metrics
- **Request ID Generation**: Unique identifier that follows requests through the entire system

### 2. Event Types Tracked
- `conversation_start` - User initiates a conversation
- `user_message_sent` - User sends a message
- `message_processed` - Message processed by triage system
- `llm_request_sent` - LLM service called
- `llm_response_received` - LLM response received
- `fastapi_request_sent` - FastAPI backend called
- `fastapi_response_received` - FastAPI response received
- `backend_analysis_start` - Backend analysis begins
- `backend_analysis_complete` - Backend analysis completes
- `chat_response_displayed` - Response shown to user
- `user_interaction` - User clicks, scrolls, etc.
- `error_occurred` - Any error in the flow
- `session_ended` - Conversation session ends

### 3. Frontend Integration

#### Chat Interface (`chat-interface.tsx`)
- **Request ID Generation**: Each message gets a unique tracking ID
- **Message Tracking**: Tracks user messages and responses
- **Error Tracking**: Captures API failures and fallbacks
- **Performance Metrics**: Measures response times and latency

#### FastAPI Client (`fastapi-client.ts`)
- **Request Timing**: Measures HTTP request duration
- **Success/Failure Tracking**: Tracks response status codes
- **Error Capture**: Detailed error logging with context
- **Request ID Propagation**: Passes request IDs to backend

#### Chat API Hook (`use-chat-api.ts`)
- **Request ID Support**: Accepts and forwards request IDs
- **Error Handling**: Comprehensive error tracking and reporting

### 4. Backend Integration

#### FastAPI Service (`main.py`)
- **Request Logging Middleware**: Logs all incoming requests with timing
- **Request ID Extraction**: Extracts and tracks request IDs from request bodies
- **Performance Headers**: Adds timing information to responses
- **Endpoint Logging**: Detailed logging for each analysis endpoint

#### Request Models
All FastAPI request models now include optional `requestId` field:
- `PortfolioRequest`
- `RiskRequest` 
- `OptimizationRequest`
- `MonteCarloRequest`
- `SentimentRequest`
- `MarketDataRequest`

## Data Schema

### AnalyticsEvent
```typescript
interface AnalyticsEvent {
  id: string;
  requestId: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  eventType: AnalyticsEventType;
  severity: EventSeverity;
  message?: string;
  duration?: number;
  backend?: BackendType;
  provider?: string;
  endpoint?: string;
  httpStatus?: number;
  latency?: number;
  tokenCount?: number;
  error?: string;
  userAction?: string;
  metadata?: Record<string, any>;
}
```

### ConversationThread
```typescript
interface ConversationThread {
  requestId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  userMessage: string;
  finalResponse?: string;
  backendCalls: BackendCallInfo[];
  totalLatency: number;
  llmLatency?: number;
  fastapiLatency?: number;
  success: boolean;
  errorCount: number;
  events: AnalyticsEvent[];
}
```

### UserInteractionPattern
```typescript
interface UserInteractionPattern {
  sessionId: string;
  messageCount: number;
  sessionDuration: number;
  averageResponseTime: number;
  clickCount: number;
  scrollEvents: number;
  featureUsage: string[];
  completionRate: number;
  errorRate: number;
  averageLatency: number;
  backendUsage: Record<BackendType, number>;
}
```

## Usage Examples

### Basic Tracking
```typescript
// Generate request ID
const requestId = conversationAnalytics.generateRequestId();

// Start conversation thread
conversationAnalytics.startConversationThread(
  requestId,
  sessionId,
  userMessage,
  userId
);

// Track backend call
conversationAnalytics.trackFastAPICall(
  requestId,
  '/portfolio/risk',
  'POST',
  1500, // duration
  200   // status
);

// Complete conversation
conversationAnalytics.completeConversationThread(
  requestId,
  response,
  true // success
);
```

### Analytics Retrieval
```typescript
// Get session analytics
const analytics = conversationAnalytics.getSessionAnalytics(sessionId);

// Export all data
const exportedData = conversationAnalytics.exportAnalytics();
```

## Key Features

### 1. End-to-End Tracking
- Tracks complete user journey from chat input to backend response
- Maintains request correlation across all system components
- Provides full visibility into system performance

### 2. Performance Monitoring
- Measures response times at each layer
- Tracks backend call durations
- Monitors LLM token usage and performance

### 3. Error Tracking
- Captures errors with full context
- Tracks fallback mechanisms
- Provides detailed error analytics

### 4. User Behavior Analysis
- Tracks user interaction patterns
- Monitors engagement metrics
- Analyzes conversation completion rates

### 5. Backend Visibility
- FastAPI request/response logging
- Middleware-level performance tracking
- Request ID correlation across services

## Testing

### Analytics Test Suite (`analytics-test.ts`)
- **testAnalyticsFlow()** - Tests end-to-end conversation tracking
- **testUserInteractionTracking()** - Tests user behavior tracking
- **testLLMTracking()** - Tests LLM call tracking

### Development Testing
In development mode, test functions are available in browser console:
```javascript
// Test full analytics flow
window.testAnalytics.testAnalyticsFlow();

// Test user interactions
window.testAnalytics.testUserInteractionTracking();

// Test LLM tracking
window.testAnalytics.testLLMTracking();
```

## Benefits

### 1. Complete Visibility
- Full request tracing from frontend to backend
- Performance bottleneck identification
- Error source tracking

### 2. User Experience Insights
- Conversation completion rates
- User engagement patterns
- Feature usage analytics

### 3. System Performance
- Backend response time monitoring
- LLM token usage tracking
- Error rate analysis

### 4. Data-Driven Improvements
- Identify slow endpoints
- Optimize user flows
- Improve error handling

## Next Steps

1. **Database Integration**: Store analytics data in persistent storage
2. **Real-time Dashboard**: Create analytics visualization dashboard
3. **Alerting System**: Set up alerts for performance issues
4. **User Segmentation**: Analyze patterns by user groups
5. **Predictive Analytics**: Use data for user behavior prediction

## Environment Variables

```bash
# Optional: Analytics endpoint for external service
ANALYTICS_ENDPOINT=https://your-analytics-service.com/events

# Development mode enables console logging
NODE_ENV=development
```

This system provides comprehensive conversation analytics that enables data-driven improvements to the user experience and system performance.