# Conversation Analytics Usage Guide

## Quick Start

### 1. Basic Message Tracking
```typescript
import { conversationAnalytics, trackChatMessage, trackChatResponse } from '@/lib/conversation-analytics';

// Generate unique request ID
const requestId = conversationAnalytics.generateRequestId();

// Track user message
trackChatMessage(requestId, sessionId, userMessage, userId);

// Track response
trackChatResponse(requestId, responseMessage, true); // true = success
```

### 2. Retrieve Conversation Thread
```typescript
// Get all analytics data
const exportedData = conversationAnalytics.exportAnalytics();

// Find specific thread
const thread = exportedData.threads.find(t => t.requestId === requestId);

console.log('Thread details:', {
  userMessage: thread.userMessage,
  finalResponse: thread.finalResponse,
  totalDuration: thread.totalDuration,
  success: thread.success,
  backendCalls: thread.backendCalls.length
});
```

### 3. Session Analytics
```typescript
// Get session summary
const sessionAnalytics = conversationAnalytics.getSessionAnalytics(sessionId);

console.log('Session metrics:', {
  messageCount: sessionAnalytics.messageCount,
  averageLatency: sessionAnalytics.averageLatency,
  errorRate: sessionAnalytics.errorRate,
  backendUsage: sessionAnalytics.backendUsage
});
```

## Advanced Usage

### 1. Real-time Monitoring
```typescript
// Monitor active conversations
function monitorActiveConversations() {
  const exportedData = conversationAnalytics.exportAnalytics();
  const activeThreads = exportedData.threads.filter(t => !t.endTime);
  
  activeThreads.forEach(thread => {
    const duration = Date.now() - new Date(thread.startTime).getTime();
    console.log(`Active: ${thread.requestId} | Duration: ${duration}ms`);
  });
}
```

### 2. Performance Analysis
```typescript
// Analyze conversation performance
function analyzePerformance(requestId: string) {
  const thread = getConversationThread(requestId);
  
  return {
    responseTime: thread.totalDuration,
    backendCalls: thread.backendCalls.length,
    errors: thread.errorCount,
    success: thread.success,
    rating: calculatePerformanceRating(thread)
  };
}
```

### 3. Search and Filter
```typescript
// Search conversations
const filteredThreads = searchConversationThreads({
  sessionId: 'specific-session',
  success: true,
  minDuration: 1000,
  containsText: 'portfolio'
});
```

## Browser Console Usage

In development mode, you can use the analytics system directly in the browser console:

```javascript
// Basic analytics
window.conversationAnalytics.getSessionAnalytics('session-id');

// Export data
window.conversationAnalytics.exportAnalytics();

// Example functions
window.conversationAnalytics.examples.getDashboardData();
window.conversationAnalytics.examples.monitorActiveConversations();
```

## Integration Examples

### 1. In React Components
```typescript
import { useEffect, useState } from 'react';
import { conversationAnalytics } from '@/lib/conversation-analytics';

function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    const sessionAnalytics = conversationAnalytics.getSessionAnalytics('current-session');
    setAnalytics(sessionAnalytics);
  }, []);
  
  return (
    <div>
      <h2>Analytics Dashboard</h2>
      <p>Messages: {analytics?.messageCount}</p>
      <p>Avg Latency: {analytics?.averageLatency}ms</p>
      <p>Error Rate: {analytics?.errorRate}%</p>
    </div>
  );
}
```

### 2. In API Routes
```typescript
// In your API route
import { conversationAnalytics } from '@/lib/conversation-analytics';

export async function POST(request: Request) {
  const { message, requestId } = await request.json();
  
  // Track API processing
  conversationAnalytics.logEvent({
    id: conversationAnalytics.generateRequestId(),
    requestId,
    sessionId: 'api-session',
    timestamp: new Date(),
    eventType: 'message_processed',
    severity: 'info',
    message: 'API processing started'
  });
  
  // Process the message...
}
```

## Data Export

### JSON Export
```typescript
const jsonData = exportConversationData('json');
// Save to file or send to analytics service
```

### CSV Export
```typescript
const csvData = exportConversationData('csv');
// Use for spreadsheet analysis
```

## Performance Monitoring

### Dashboard Metrics
```typescript
const dashboardData = getDashboardData();

console.log('Dashboard metrics:', {
  totalConversations: dashboardData.totalConversations,
  successRate: dashboardData.successRate,
  averageResponseTime: dashboardData.averageResponseTime,
  errorRate: dashboardData.errorRate
});
```

### Error Analysis
```typescript
const topErrors = dashboardData.topErrors;
topErrors.forEach(error => {
  console.log(`Error: ${error.error} | Count: ${error.count}`);
});
```

## Best Practices

1. **Always generate unique request IDs** for each conversation
2. **Track both success and failure cases** for complete visibility
3. **Use meaningful event metadata** for better analysis
4. **Regularly export data** for long-term analysis
5. **Monitor performance metrics** for system optimization

## Troubleshooting

### Common Issues

1. **Missing request ID**: Ensure requestId is generated and passed through all layers
2. **Events not appearing**: Check console for analytics errors
3. **Performance impact**: Analytics are designed to be lightweight, but monitor in production

### Debug Mode

Enable debug logging:
```typescript
// In development
console.log('Analytics debug:', conversationAnalytics.exportAnalytics());
```

This guide provides comprehensive examples for using the conversation analytics system effectively in your application.