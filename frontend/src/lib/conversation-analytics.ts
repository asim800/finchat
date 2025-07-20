// ============================================================================
// FILE: lib/conversation-analytics.ts
// Comprehensive conversation analytics and event tracking system
// ============================================================================

// Generate UUID using crypto API (Node.js and modern browsers)
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Event Types for tracking the entire conversation flow
export type AnalyticsEventType = 
  | 'conversation_start'
  | 'user_message_sent'
  | 'message_processed'
  | 'llm_request_sent'
  | 'llm_response_received'
  | 'fastapi_request_sent'
  | 'fastapi_response_received'
  | 'backend_analysis_start'
  | 'backend_analysis_complete'
  | 'chat_response_displayed'
  | 'user_interaction'
  | 'error_occurred'
  | 'session_ended';

// Event severity levels
export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

// Backend types for tracking which services are used
export type BackendType = 'fastapi' | 'llm' | 'simulation';

// Core analytics event interface
export interface AnalyticsEvent {
  id: string;
  requestId: string;
  sessionId: string;
  userId?: string;
  guestSessionId?: string;
  timestamp: Date;
  eventType: AnalyticsEventType;
  severity: EventSeverity;
  
  // Event context
  message?: string;
  userMessage?: string;
  responseContent?: string;
  
  // Technical details
  duration?: number; // in milliseconds
  backend?: BackendType;
  provider?: string; // LLM provider
  endpoint?: string; // API endpoint called
  httpStatus?: number;
  
  // Performance metrics
  latency?: number;
  tokenCount?: number;
  
  // Error information
  error?: string;
  stackTrace?: string;
  
  // User behavior tracking
  userAction?: string;
  clickTarget?: string;
  scrollPosition?: number;
  
  // Context data
  metadata?: Record<string, any>;
}

// Conversation thread tracking
export interface ConversationThread {
  requestId: string;
  sessionId: string;
  userId?: string;
  guestSessionId?: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  
  // Message flow
  userMessage: string;
  finalResponse?: string;
  
  // Backend journey
  backendCalls: BackendCallInfo[];
  
  // Performance summary
  totalLatency: number;
  llmLatency?: number;
  fastapiLatency?: number;
  mcpLatency?: number;
  
  // Success/failure tracking
  success: boolean;
  errorCount: number;
  
  // Quality metrics
  userSatisfaction?: number;
  responseRelevance?: number;
  
  events: AnalyticsEvent[];
}

// Backend call tracking
export interface BackendCallInfo {
  id: string;
  backend: BackendType;
  endpoint?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  error?: string;
  requestSize?: number;
  responseSize?: number;
  retryCount?: number;
}

// User interaction patterns
export interface UserInteractionPattern {
  sessionId: string;
  userId?: string;
  guestSessionId?: string;
  
  // Session metrics
  messageCount: number;
  sessionDuration: number;
  averageResponseTime: number;
  
  // Engagement metrics
  clickCount: number;
  scrollEvents: number;
  featureUsage: string[];
  
  // Conversation quality
  completionRate: number;
  satisfactionScore?: number;
  
  // Technical performance
  errorRate: number;
  averageLatency: number;
  backendUsage: Record<BackendType, number>;
}

class ConversationAnalytics {
  private events: AnalyticsEvent[] = [];
  private activeThreads: Map<string, ConversationThread> = new Map();
  private userPatterns: Map<string, UserInteractionPattern> = new Map();
  
  /**
   * Generate a unique request ID for tracking
   */
  generateRequestId(): string {
    return generateUUID();
  }
  
  /**
   * Start tracking a new conversation thread
   */
  startConversationThread(
    requestId: string,
    sessionId: string,
    userMessage: string,
    userId?: string,
    guestSessionId?: string
  ): void {
    const thread: ConversationThread = {
      requestId,
      sessionId,
      userId,
      guestSessionId,
      startTime: new Date(),
      userMessage,
      backendCalls: [],
      totalLatency: 0,
      success: false,
      errorCount: 0,
      events: []
    };
    
    this.activeThreads.set(requestId, thread);
    
    this.logEvent({
      id: generateUUID(),
      requestId,
      sessionId,
      userId,
      guestSessionId,
      timestamp: new Date(),
      eventType: 'conversation_start',
      severity: 'info',
      userMessage,
      metadata: {
        messageLength: userMessage.length,
        isGuest: !userId
      }
    });
  }
  
  /**
   * Log an analytics event
   */
  logEvent(event: AnalyticsEvent): void {
    this.events.push(event);
    
    // Add to active thread if exists
    const thread = this.activeThreads.get(event.requestId);
    if (thread) {
      thread.events.push(event);
      
      // Update thread metrics
      if (event.eventType === 'error_occurred') {
        thread.errorCount++;
      }
      
      if (event.duration) {
        thread.totalLatency += event.duration;
      }
    }
    
    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [Analytics] ${event.eventType}:`, {
        requestId: event.requestId,
        duration: event.duration,
        backend: event.backend,
        error: event.error
      });
    }
    
    // Send to analytics service (implement as needed)
    this.sendToAnalyticsService(event);
  }
  
  /**
   * Track user message sent
   */
  trackUserMessage(
    requestId: string,
    sessionId: string,
    message: string,
    userId?: string,
    guestSessionId?: string
  ): void {
    this.logEvent({
      id: generateUUID(),
      requestId,
      sessionId,
      userId,
      guestSessionId,
      timestamp: new Date(),
      eventType: 'user_message_sent',
      severity: 'info',
      userMessage: message,
      metadata: {
        messageLength: message.length,
        wordCount: message.split(' ').length,
        hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(message)
      }
    });
  }
  
  /**
   * Track LLM request/response
   */
  trackLLMCall(
    requestId: string,
    provider: string,
    prompt: string,
    response?: string,
    duration?: number,
    tokenCount?: number,
    error?: string
  ): void {
    this.logEvent({
      id: generateUUID(),
      requestId,
      sessionId: this.activeThreads.get(requestId)?.sessionId || '',
      timestamp: new Date(),
      eventType: error ? 'error_occurred' : 'llm_response_received',
      severity: error ? 'error' : 'info',
      backend: 'llm',
      provider,
      duration,
      tokenCount,
      error,
      metadata: {
        promptLength: prompt.length,
        responseLength: response?.length || 0,
        tokensPerSecond: tokenCount && duration ? (tokenCount / (duration / 1000)) : undefined
      }
    });
  }
  
  /**
   * Track FastAPI request/response
   */
  trackFastAPICall(
    requestId: string,
    endpoint: string,
    method: string = 'POST',
    duration?: number,
    httpStatus?: number,
    error?: string
  ): void {
    const thread = this.activeThreads.get(requestId);
    if (thread) {
      const backendCall: BackendCallInfo = {
        id: generateUUID(),
        backend: 'fastapi',
        endpoint,
        startTime: new Date(Date.now() - (duration || 0)),
        endTime: new Date(),
        duration,
        success: !error && (httpStatus === undefined || httpStatus < 400),
        error
      };
      
      thread.backendCalls.push(backendCall);
      
      if (duration) {
        thread.fastapiLatency = (thread.fastapiLatency || 0) + duration;
      }
    }
    
    this.logEvent({
      id: generateUUID(),
      requestId,
      sessionId: thread?.sessionId || '',
      timestamp: new Date(),
      eventType: error ? 'error_occurred' : 'fastapi_response_received',
      severity: error ? 'error' : 'info',
      backend: 'fastapi',
      endpoint,
      httpStatus,
      duration,
      error,
      metadata: {
        method,
        success: !error && (httpStatus === undefined || httpStatus < 400)
      }
    });
  }
  
  /**
   * Track user interaction (clicks, scrolls, etc.)
   */
  trackUserInteraction(
    sessionId: string,
    action: string,
    target?: string,
    metadata?: Record<string, any>
  ): void {
    this.logEvent({
      id: generateUUID(),
      requestId: 'user_interaction',
      sessionId,
      timestamp: new Date(),
      eventType: 'user_interaction',
      severity: 'info',
      userAction: action,
      clickTarget: target,
      metadata
    });
  }
  
  /**
   * Complete a conversation thread
   */
  completeConversationThread(
    requestId: string,
    finalResponse: string,
    success: boolean = true
  ): void {
    const thread = this.activeThreads.get(requestId);
    if (!thread) return;
    
    thread.endTime = new Date();
    thread.totalDuration = thread.endTime.getTime() - thread.startTime.getTime();
    thread.finalResponse = finalResponse;
    thread.success = success;
    
    this.logEvent({
      id: generateUUID(),
      requestId,
      sessionId: thread.sessionId,
      userId: thread.userId,
      guestSessionId: thread.guestSessionId,
      timestamp: new Date(),
      eventType: 'chat_response_displayed',
      severity: 'info',
      responseContent: finalResponse,
      duration: thread.totalDuration,
      metadata: {
        success,
        errorCount: thread.errorCount,
        backendCallCount: thread.backendCalls.length,
        totalLatency: thread.totalLatency
      }
    });
    
    // Update user interaction patterns
    this.updateUserPattern(thread);
    
    // Remove from active threads
    this.activeThreads.delete(requestId);
  }
  
  /**
   * Update user interaction patterns
   */
  private updateUserPattern(thread: ConversationThread): void {
    const key = thread.userId || thread.guestSessionId || 'anonymous';
    let pattern = this.userPatterns.get(key);
    
    if (!pattern) {
      pattern = {
        sessionId: thread.sessionId,
        userId: thread.userId,
        guestSessionId: thread.guestSessionId,
        messageCount: 0,
        sessionDuration: 0,
        averageResponseTime: 0,
        clickCount: 0,
        scrollEvents: 0,
        featureUsage: [],
        completionRate: 0,
        errorRate: 0,
        averageLatency: 0,
        backendUsage: {
          mcp: 0,
          fastapi: 0,
          llm: 0,
          simulation: 0
        }
      };
    }
    
    // Update pattern metrics
    pattern.messageCount++;
    pattern.sessionDuration += thread.totalDuration || 0;
    pattern.averageResponseTime = pattern.sessionDuration / pattern.messageCount;
    
    if (!thread.success) {
      pattern.errorRate = (pattern.errorRate * (pattern.messageCount - 1) + 1) / pattern.messageCount;
    }
    
    pattern.averageLatency = (pattern.averageLatency * (pattern.messageCount - 1) + thread.totalLatency) / pattern.messageCount;
    
    // Track backend usage
    thread.backendCalls.forEach(call => {
      pattern!.backendUsage[call.backend]++;
    });
    
    this.userPatterns.set(key, pattern);
  }
  
  /**
   * Get analytics summary for a session
   */
  getSessionAnalytics(sessionId: string): {
    events: AnalyticsEvent[];
    messageCount: number;
    averageLatency: number;
    errorRate: number;
    backendUsage: Record<BackendType, number>;
  } {
    const sessionEvents = this.events.filter(e => e.sessionId === sessionId);
    const messageCount = sessionEvents.filter(e => e.eventType === 'user_message_sent').length;
    const errors = sessionEvents.filter(e => e.severity === 'error').length;
    const totalLatency = sessionEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    
    const backendUsage: Record<BackendType, number> = {
      fastapi: 0,
      llm: 0,
      simulation: 0
    };
    
    sessionEvents.forEach(event => {
      if (event.backend) {
        backendUsage[event.backend]++;
      }
    });
    
    return {
      events: sessionEvents,
      messageCount,
      averageLatency: messageCount > 0 ? totalLatency / messageCount : 0,
      errorRate: messageCount > 0 ? errors / messageCount : 0,
      backendUsage
    };
  }
  
  /**
   * Send event to analytics service (placeholder for future implementation)
   */
  private async sendToAnalyticsService(event: AnalyticsEvent): Promise<void> {
    // TODO: Implement actual analytics service integration
    // This could send to databases, analytics platforms, or monitoring services
    
    if (process.env.ANALYTICS_ENDPOINT) {
      try {
        await fetch(process.env.ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
      } catch (error) {
        console.warn('Failed to send analytics event:', error);
      }
    }
  }
  
  /**
   * Export analytics data for analysis
   */
  exportAnalytics(sessionId?: string): {
    events: AnalyticsEvent[];
    threads: ConversationThread[];
    userPatterns: UserInteractionPattern[];
  } {
    const filteredEvents = sessionId 
      ? this.events.filter(e => e.sessionId === sessionId)
      : this.events;
    
    const completedThreads = Array.from(this.activeThreads.values()).filter(t => t.endTime);
    const patterns = Array.from(this.userPatterns.values());
    
    return {
      events: filteredEvents,
      threads: completedThreads,
      userPatterns: patterns
    };
  }
}

// Export singleton instance
export const conversationAnalytics = new ConversationAnalytics();

// Utility functions for common tracking scenarios
export const trackChatMessage = (
  requestId: string,
  sessionId: string,
  message: string,
  userId?: string,
  guestSessionId?: string
) => {
  conversationAnalytics.startConversationThread(requestId, sessionId, message, userId, guestSessionId);
};

export const trackBackendCall = (
  requestId: string,
  backend: BackendType,
  endpoint: string,
  duration: number,
  success: boolean,
  error?: string
) => {
  if (backend === 'fastapi') {
    conversationAnalytics.trackFastAPICall(requestId, endpoint, 'POST', duration, success ? 200 : 500, error);
  } else {
    conversationAnalytics.logEvent({
      id: generateUUID(),
      requestId,
      sessionId: '',
      timestamp: new Date(),
      eventType: success ? 'backend_analysis_complete' : 'error_occurred',
      severity: success ? 'info' : 'error',
      backend,
      endpoint,
      duration,
      error
    });
  }
};

export const trackChatResponse = (
  requestId: string,
  response: string,
  success: boolean = true
) => {
  conversationAnalytics.completeConversationThread(requestId, response, success);
};