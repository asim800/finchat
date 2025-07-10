// ============================================================================
// FILE: examples/conversation-thread-example.ts
// Example showing how to retrieve and analyze conversation threads
// ============================================================================

import { conversationAnalytics } from '@/lib/conversation-analytics';

/**
 * Example 1: Retrieve a specific conversation thread
 */
export async function getConversationThread(requestId: string) {
  console.log('🔍 Retrieving conversation thread:', requestId);
  
  // Get all analytics data
  const exportedData = conversationAnalytics.exportAnalytics();
  
  // Find the specific thread
  const thread = exportedData.threads.find(t => t.requestId === requestId);
  
  if (!thread) {
    console.log('❌ Thread not found:', requestId);
    return null;
  }
  
  console.log('📊 Found conversation thread:', {
    requestId: thread.requestId,
    sessionId: thread.sessionId,
    userMessage: thread.userMessage,
    finalResponse: thread.finalResponse,
    totalDuration: thread.totalDuration,
    success: thread.success,
    backendCalls: thread.backendCalls.length,
    events: thread.events.length
  });
  
  return thread;
}

/**
 * Example 2: Analyze conversation performance
 */
export function analyzeConversationPerformance(requestId: string) {
  console.log('📈 Analyzing conversation performance:', requestId);
  
  const thread = getConversationThread(requestId);
  if (!thread) return null;
  
  // Performance analysis
  const analysis = {
    // Basic metrics
    totalTime: thread.totalDuration,
    messageLength: thread.userMessage.length,
    responseLength: thread.finalResponse?.length || 0,
    success: thread.success,
    errorCount: thread.errorCount,
    
    // Backend performance
    backendCalls: thread.backendCalls.length,
    fastApiLatency: thread.fastapiLatency || 0,
    llmLatency: thread.llmLatency || 0,
    
    // Event breakdown
    eventTypes: thread.events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    
    // Error analysis
    errors: thread.events.filter(e => e.severity === 'error'),
    
    // Performance rating
    performanceRating: calculatePerformanceRating(thread)
  };
  
  console.log('📊 Performance Analysis:', analysis);
  return analysis;
}

/**
 * Example 3: Get all conversation threads for a session
 */
export function getSessionConversationThreads(sessionId: string) {
  console.log('🔍 Getting all threads for session:', sessionId);
  
  const exportedData = conversationAnalytics.exportAnalytics(sessionId);
  const threads = exportedData.threads;
  
  console.log(`📊 Found ${threads.length} conversation threads`);
  
  // Sort by start time
  const sortedThreads = threads.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  
  // Summary statistics
  const summary = {
    totalThreads: threads.length,
    successfulThreads: threads.filter(t => t.success).length,
    averageDuration: threads.reduce((sum, t) => sum + (t.totalDuration || 0), 0) / threads.length,
    totalErrors: threads.reduce((sum, t) => sum + t.errorCount, 0),
    backendCallsTotal: threads.reduce((sum, t) => sum + t.backendCalls.length, 0)
  };
  
  console.log('📈 Session Summary:', summary);
  
  return {
    threads: sortedThreads,
    summary
  };
}

/**
 * Example 4: Real-time conversation monitoring
 */
export function monitorActiveConversations() {
  console.log('👀 Monitoring active conversations...');
  
  const exportedData = conversationAnalytics.exportAnalytics();
  
  // Find active threads (no end time)
  const activeThreads = exportedData.threads.filter(t => !t.endTime);
  
  console.log(`🔄 Found ${activeThreads.length} active conversations`);
  
  activeThreads.forEach(thread => {
    const duration = Date.now() - new Date(thread.startTime).getTime();
    console.log(`📝 Active: ${thread.requestId} | Duration: ${duration}ms | Message: "${thread.userMessage}"`);
  });
  
  return activeThreads;
}

/**
 * Example 5: Conversation thread search and filtering
 */
export function searchConversationThreads(filters: {
  sessionId?: string;
  userId?: string;
  dateRange?: { start: Date; end: Date };
  success?: boolean;
  minDuration?: number;
  maxDuration?: number;
  containsText?: string;
}) {
  console.log('🔍 Searching conversation threads with filters:', filters);
  
  const exportedData = conversationAnalytics.exportAnalytics();
  let threads = exportedData.threads;
  
  // Apply filters
  if (filters.sessionId) {
    threads = threads.filter(t => t.sessionId === filters.sessionId);
  }
  
  if (filters.userId) {
    threads = threads.filter(t => t.userId === filters.userId);
  }
  
  if (filters.dateRange) {
    threads = threads.filter(t => {
      const threadTime = new Date(t.startTime).getTime();
      return threadTime >= filters.dateRange!.start.getTime() && 
             threadTime <= filters.dateRange!.end.getTime();
    });
  }
  
  if (filters.success !== undefined) {
    threads = threads.filter(t => t.success === filters.success);
  }
  
  if (filters.minDuration) {
    threads = threads.filter(t => (t.totalDuration || 0) >= filters.minDuration!);
  }
  
  if (filters.maxDuration) {
    threads = threads.filter(t => (t.totalDuration || 0) <= filters.maxDuration!);
  }
  
  if (filters.containsText) {
    const searchText = filters.containsText.toLowerCase();
    threads = threads.filter(t => 
      t.userMessage.toLowerCase().includes(searchText) ||
      (t.finalResponse && t.finalResponse.toLowerCase().includes(searchText))
    );
  }
  
  console.log(`📊 Found ${threads.length} matching threads`);
  return threads;
}

/**
 * Example 6: Export conversation data for analysis
 */
export function exportConversationData(format: 'json' | 'csv' = 'json') {
  console.log('📤 Exporting conversation data in format:', format);
  
  const exportedData = conversationAnalytics.exportAnalytics();
  
  if (format === 'json') {
    const jsonData = JSON.stringify(exportedData, null, 2);
    console.log('📄 JSON Export ready:', jsonData.length, 'characters');
    return jsonData;
  }
  
  if (format === 'csv') {
    // Convert threads to CSV format
    const csvHeaders = [
      'RequestID',
      'SessionID',
      'UserID',
      'StartTime',
      'EndTime',
      'Duration',
      'UserMessage',
      'FinalResponse',
      'Success',
      'ErrorCount',
      'BackendCalls',
      'FastAPILatency',
      'LLMLatency'
    ];
    
    const csvRows = exportedData.threads.map(thread => [
      thread.requestId,
      thread.sessionId,
      thread.userId || '',
      thread.startTime.toISOString(),
      thread.endTime?.toISOString() || '',
      thread.totalDuration || 0,
      `"${thread.userMessage.replace(/"/g, '""')}"`,
      `"${(thread.finalResponse || '').replace(/"/g, '""')}"`,
      thread.success,
      thread.errorCount,
      thread.backendCalls.length,
      thread.fastapiLatency || 0,
      thread.llmLatency || 0
    ]);
    
    const csvData = [csvHeaders, ...csvRows]
      .map(row => row.join(','))
      .join('\n');
    
    console.log('📊 CSV Export ready:', csvData.length, 'characters');
    return csvData;
  }
  
  return null;
}

/**
 * Helper function to calculate performance rating
 */
function calculatePerformanceRating(thread: any): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!thread.success) return 'poor';
  
  const duration = thread.totalDuration || 0;
  const errorCount = thread.errorCount || 0;
  
  if (duration < 1000 && errorCount === 0) return 'excellent';
  if (duration < 3000 && errorCount === 0) return 'good';
  if (duration < 5000 && errorCount <= 1) return 'fair';
  return 'poor';
}

/**
 * Example 7: Real-time analytics dashboard data
 */
export function getDashboardData() {
  const exportedData = conversationAnalytics.exportAnalytics();
  
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Filter recent data
  const recentThreads = exportedData.threads.filter(t => 
    new Date(t.startTime) >= last24Hours
  );
  
  const recentEvents = exportedData.events.filter(e => 
    new Date(e.timestamp) >= last24Hours
  );
  
  return {
    // Overview metrics
    totalConversations: recentThreads.length,
    successRate: recentThreads.length > 0 ? 
      (recentThreads.filter(t => t.success).length / recentThreads.length) * 100 : 0,
    averageResponseTime: recentThreads.length > 0 ?
      recentThreads.reduce((sum, t) => sum + (t.totalDuration || 0), 0) / recentThreads.length : 0,
    
    // Error analysis
    errorRate: recentEvents.filter(e => e.severity === 'error').length,
    
    // Backend performance
    backendUsage: recentEvents.reduce((acc, event) => {
      if (event.backend) {
        acc[event.backend] = (acc[event.backend] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    
    // Hourly breakdown
    hourlyStats: generateHourlyStats(recentThreads),
    
    // Top errors
    topErrors: getTopErrors(recentEvents),
    
    // Performance distribution
    performanceDistribution: getPerformanceDistribution(recentThreads)
  };
}

function generateHourlyStats(threads: any[]) {
  const hourlyStats = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    conversations: 0,
    averageTime: 0,
    errors: 0
  }));
  
  threads.forEach(thread => {
    const hour = new Date(thread.startTime).getHours();
    hourlyStats[hour].conversations++;
    hourlyStats[hour].averageTime += thread.totalDuration || 0;
    hourlyStats[hour].errors += thread.errorCount || 0;
  });
  
  // Calculate averages
  hourlyStats.forEach(stat => {
    if (stat.conversations > 0) {
      stat.averageTime = stat.averageTime / stat.conversations;
    }
  });
  
  return hourlyStats;
}

function getTopErrors(events: any[]) {
  const errorEvents = events.filter(e => e.severity === 'error');
  const errorCounts = errorEvents.reduce((acc, event) => {
    const error = event.error || 'Unknown error';
    acc[error] = (acc[error] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));
}

function getPerformanceDistribution(threads: any[]) {
  const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
  
  threads.forEach(thread => {
    const rating = calculatePerformanceRating(thread);
    distribution[rating]++;
  });
  
  return distribution;
}

// Example usage functions for development
export const exampleUsage = {
  // Basic usage
  async basicExample() {
    console.log('🚀 Basic Analytics Example');
    
    // Get session analytics
    const sessionAnalytics = conversationAnalytics.getSessionAnalytics('test-session');
    console.log('Session Analytics:', sessionAnalytics);
    
    // Search for conversations
    const recentThreads = searchConversationThreads({
      dateRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }
    });
    
    console.log('Recent threads:', recentThreads.length);
    
    // Export data
    const jsonData = exportConversationData('json');
    console.log('Exported data size:', jsonData.length);
  },
  
  // Performance monitoring
  async performanceExample() {
    console.log('📊 Performance Monitoring Example');
    
    const dashboardData = getDashboardData();
    console.log('Dashboard Data:', dashboardData);
    
    // Monitor active conversations
    const activeThreads = monitorActiveConversations();
    console.log('Active conversations:', activeThreads.length);
  }
};

// Make available in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).conversationAnalytics = {
    ...conversationAnalytics,
    examples: {
      getConversationThread,
      analyzeConversationPerformance,
      getSessionConversationThreads,
      searchConversationThreads,
      exportConversationData,
      getDashboardData,
      exampleUsage
    }
  };
}