// ============================================================================
// FILE: lib/chat-logger.ts
// Comprehensive logging system for chat query analysis and observability
// ============================================================================

import { RegexpMatch, TriageResult } from './query-triage';

export interface QueryLog {
  // Request metadata
  requestId: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  isGuestMode: boolean;
  
  // Input analysis
  input: {
    query: string;
    queryLength: number;
    queryType: 'simple' | 'complex' | 'ambiguous';
    containsNumbers: boolean;
    containsSymbols: boolean;
    language: 'english' | 'mixed' | 'other';
  };
  
  // Triage results
  triage: {
    processingType: 'regexp' | 'llm' | 'hybrid';
    confidence: number;
    regexpMatch?: RegexpMatch;
    triageTimeMs: number;
    patternsMatched: string[];
  };
  
  // Processing details
  processing: {
    method: 'regexp' | 'llm' | 'hybrid';
    startTime: string;
    endTime: string;
    durationMs: number;
    llmProvider?: 'openai' | 'anthropic';
    llmModel?: string;
    llmTokens?: number;
    dbOperations: number;
    cacheHit: boolean;
  };
  
  // Response analysis
  response: {
    success: boolean;
    errorType?: 'validation' | 'database' | 'llm' | 'network' | 'permission';
    errorMessage?: string;
    responseLength: number;
    actionType?: 'add' | 'remove' | 'update' | 'show' | 'analysis';
    portfolioModified: boolean;
    assetsAffected: string[];
    valueChanged?: number;
  };
  
  // Performance metrics
  performance: {
    totalLatencyMs: number;
    triageLatencyMs: number;
    processingLatencyMs: number;
    dbLatencyMs: number;
    llmLatencyMs?: number;
    cacheEfficiency: number;
  };
  
  // Business metrics
  business: {
    userEngagement: 'high' | 'medium' | 'low';
    queryComplexity: 'simple' | 'moderate' | 'complex';
    userSatisfaction?: 'satisfied' | 'neutral' | 'frustrated';
    featureUsed: string[];
  };
}

export interface LogAnalytics {
  // Query patterns
  queryPatterns: {
    regexpSuccessRate: number;
    llmFallbackRate: number;
    hybridUsageRate: number;
    mostCommonActions: Array<{ action: string; count: number; percentage: number }>;
    mostQueriedSymbols: Array<{ symbol: string; count: number; percentage: number }>;
  };
  
  // Performance insights
  performance: {
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    regexpAvgLatency: number;
    llmAvgLatency: number;
    hybridAvgLatency: number;
  };
  
  // Error patterns
  errors: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByProcessingType: Record<string, number>;
    errorTrends: Array<{ date: string; count: number }>;
  };
  
  // User behavior
  userBehavior: {
    sessionLength: number;
    queriesPerSession: number;
    repeatUsers: number;
    guestVsAuth: { guest: number; authenticated: number };
  };
}

export class ChatLogger {
  private static logs: QueryLog[] = [];
  private static readonly MAX_LOGS = 10000; // Keep last 10k logs in memory
  
  // Generate unique request ID
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Start logging a new query
  static startQuery(query: string, userId?: string, sessionId?: string, isGuestMode: boolean = false): string {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();
    
    const queryLog: Partial<QueryLog> = {
      requestId,
      timestamp,
      userId,
      sessionId,
      isGuestMode,
      input: {
        query,
        queryLength: query.length,
        queryType: this.classifyQueryType(query),
        containsNumbers: /\d/.test(query),
        containsSymbols: /[A-Z]{2,5}/.test(query),
        language: this.detectLanguage(query)
      }
    };
    
    // Store partial log
    this.logs.push(queryLog as QueryLog);
    
    console.log(`🔍 [${requestId}] Query started:`, {
      query: query.substring(0, 100),
      userId,
      sessionId,
      isGuestMode
    });
    
    return requestId;
  }
  
  // Log triage results
  static logTriage(requestId: string, triageResult: TriageResult, triageTimeMs: number, patternsMatched: string[] = []) {
    const logEntry = this.findLog(requestId);
    if (logEntry) {
      logEntry.triage = {
        processingType: triageResult.processingType,
        confidence: triageResult.confidence,
        regexpMatch: triageResult.regexpMatch,
        triageTimeMs,
        patternsMatched
      };
      
      console.log(`🎯 [${requestId}] Triage completed:`, {
        processingType: triageResult.processingType,
        confidence: triageResult.confidence,
        timeMs: triageTimeMs
      });
    }
  }
  
  // Log processing start
  static logProcessingStart(requestId: string, method: 'regexp' | 'llm' | 'hybrid', llmProvider?: string, llmModel?: string) {
    const logEntry = this.findLog(requestId);
    if (logEntry) {
      logEntry.processing = {
        method,
        startTime: new Date().toISOString(),
        endTime: '',
        durationMs: 0,
        llmProvider: llmProvider as any,
        llmModel,
        dbOperations: 0,
        cacheHit: false
      };
      
      console.log(`⚙️ [${requestId}] Processing started:`, {
        method,
        llmProvider,
        llmModel
      });
    }
  }
  
  // Log processing completion
  static logProcessingEnd(requestId: string, dbOperations: number, llmTokens?: number, cacheHit: boolean = false) {
    const logEntry = this.findLog(requestId);
    if (logEntry && logEntry.processing) {
      const endTime = new Date().toISOString();
      const startTime = new Date(logEntry.processing.startTime).getTime();
      const endTimeMs = new Date(endTime).getTime();
      
      logEntry.processing.endTime = endTime;
      logEntry.processing.durationMs = endTimeMs - startTime;
      logEntry.processing.dbOperations = dbOperations;
      logEntry.processing.llmTokens = llmTokens;
      logEntry.processing.cacheHit = cacheHit;
      
      console.log(`✅ [${requestId}] Processing completed:`, {
        durationMs: logEntry.processing.durationMs,
        dbOperations,
        llmTokens,
        cacheHit
      });
    }
  }
  
  // Log response details
  static logResponse(
    requestId: string,
    success: boolean,
    responseLength: number,
    actionType?: string,
    portfolioModified: boolean = false,
    assetsAffected: string[] = [],
    valueChanged?: number,
    errorType?: string,
    errorMessage?: string
  ) {
    const logEntry = this.findLog(requestId);
    if (logEntry) {
      logEntry.response = {
        success,
        errorType: errorType as any,
        errorMessage,
        responseLength,
        actionType: actionType as any,
        portfolioModified,
        assetsAffected,
        valueChanged
      };
      
      // Calculate performance metrics
      const totalLatency = Date.now() - new Date(logEntry.timestamp).getTime();
      logEntry.performance = {
        totalLatencyMs: totalLatency,
        triageLatencyMs: logEntry.triage?.triageTimeMs || 0,
        processingLatencyMs: logEntry.processing?.durationMs || 0,
        dbLatencyMs: 0, // Would be calculated separately
        llmLatencyMs: logEntry.processing?.method === 'llm' ? logEntry.processing.durationMs : undefined,
        cacheEfficiency: logEntry.processing?.cacheHit ? 1 : 0
      };
      
      // Calculate business metrics
      logEntry.business = {
        userEngagement: this.calculateEngagement(logEntry),
        queryComplexity: this.calculateComplexity(logEntry),
        featureUsed: this.extractFeaturesUsed(logEntry)
      };
      
      console.log(`📊 [${requestId}] Response logged:`, {
        success,
        totalLatencyMs: totalLatency,
        actionType,
        portfolioModified,
        assetsAffected: assetsAffected.length
      });
      
      // Persist to database if needed
      this.persistLog(logEntry);
    }
  }
  
  // Get analytics for dashboard
  static getAnalytics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): LogAnalytics {
    const cutoffTime = this.getCutoffTime(timeRange);
    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > cutoffTime
    );
    
    return {
      queryPatterns: this.analyzeQueryPatterns(recentLogs),
      performance: this.analyzePerformance(recentLogs),
      errors: this.analyzeErrors(recentLogs),
      userBehavior: this.analyzeUserBehavior(recentLogs)
    };
  }
  
  // Export logs for external analysis
  static exportLogs(format: 'json' | 'csv' = 'json', timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): string {
    const cutoffTime = this.getCutoffTime(timeRange);
    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > cutoffTime
    );
    
    if (format === 'json') {
      return JSON.stringify(recentLogs, null, 2);
    } else {
      return this.convertToCSV(recentLogs);
    }
  }
  
  // Private helper methods
  private static findLog(requestId: string): QueryLog | undefined {
    return this.logs.find(log => log.requestId === requestId);
  }
  
  private static classifyQueryType(query: string): 'simple' | 'complex' | 'ambiguous' {
    const words = query.split(' ').length;
    const hasNumbers = /\d/.test(query);
    const hasSymbols = /[A-Z]{2,5}/.test(query);
    
    if (words <= 5 && hasNumbers && hasSymbols) return 'simple';
    if (words > 10 || (!hasNumbers && !hasSymbols)) return 'complex';
    return 'ambiguous';
  }
  
  private static detectLanguage(query: string): 'english' | 'mixed' | 'other' {
    const englishWords = ['add', 'remove', 'update', 'show', 'my', 'portfolio', 'stock', 'share'];
    const matches = englishWords.filter(word => 
      query.toLowerCase().includes(word)
    ).length;
    
    if (matches >= 2) return 'english';
    if (matches >= 1) return 'mixed';
    return 'other';
  }
  
  private static calculateEngagement(log: QueryLog): 'high' | 'medium' | 'low' {
    const hasPortfolioModification = log.response?.portfolioModified || false;
    const isComplexQuery = log.input?.queryType === 'complex';
    const isLongSession = (log.performance?.totalLatencyMs || 0) > 1000;
    
    if (hasPortfolioModification && (isComplexQuery || isLongSession)) return 'high';
    if (hasPortfolioModification || isComplexQuery) return 'medium';
    return 'low';
  }
  
  private static calculateComplexity(log: QueryLog): 'simple' | 'moderate' | 'complex' {
    const processingType = log.triage?.processingType;
    const dbOperations = log.processing?.dbOperations || 0;
    const usedLLM = log.processing?.llmTokens && log.processing.llmTokens > 0;
    
    if (processingType === 'regexp' && dbOperations <= 2) return 'simple';
    if (processingType === 'hybrid' || dbOperations > 2) return 'moderate';
    if (processingType === 'llm' && usedLLM) return 'complex';
    return 'simple';
  }
  
  private static extractFeaturesUsed(log: QueryLog): string[] {
    const features: string[] = [];
    
    if (log.triage?.processingType === 'regexp') features.push('regexp-triage');
    if (log.triage?.processingType === 'llm') features.push('llm-processing');
    if (log.triage?.processingType === 'hybrid') features.push('hybrid-processing');
    if (log.response?.portfolioModified) features.push('portfolio-modification');
    if (log.processing?.cacheHit) features.push('cache-utilization');
    if (log.response?.actionType) features.push(`action-${log.response.actionType}`);
    
    return features;
  }
  
  private static getCutoffTime(timeRange: string): number {
    const now = Date.now();
    switch (timeRange) {
      case '1h': return now - (60 * 60 * 1000);
      case '24h': return now - (24 * 60 * 60 * 1000);
      case '7d': return now - (7 * 24 * 60 * 60 * 1000);
      case '30d': return now - (30 * 24 * 60 * 60 * 1000);
      default: return now - (24 * 60 * 60 * 1000);
    }
  }
  
  private static analyzeQueryPatterns(logs: QueryLog[]): LogAnalytics['queryPatterns'] {
    const totalQueries = logs.length;
    const regexpQueries = logs.filter(log => log.triage?.processingType === 'regexp').length;
    const llmQueries = logs.filter(log => log.triage?.processingType === 'llm').length;
    const hybridQueries = logs.filter(log => log.triage?.processingType === 'hybrid').length;
    
    // Count actions
    const actionCounts = new Map<string, number>();
    logs.forEach(log => {
      if (log.response?.actionType) {
        actionCounts.set(log.response.actionType, (actionCounts.get(log.response.actionType) || 0) + 1);
      }
    });
    
    // Count symbols
    const symbolCounts = new Map<string, number>();
    logs.forEach(log => {
      log.response?.assetsAffected?.forEach(symbol => {
        symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
      });
    });
    
    return {
      regexpSuccessRate: totalQueries > 0 ? (regexpQueries / totalQueries) * 100 : 0,
      llmFallbackRate: totalQueries > 0 ? (llmQueries / totalQueries) * 100 : 0,
      hybridUsageRate: totalQueries > 0 ? (hybridQueries / totalQueries) * 100 : 0,
      mostCommonActions: Array.from(actionCounts.entries())
        .map(([action, count]) => ({
          action,
          count,
          percentage: (count / totalQueries) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      mostQueriedSymbols: Array.from(symbolCounts.entries())
        .map(([symbol, count]) => ({
          symbol,
          count,
          percentage: (count / totalQueries) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }
  
  private static analyzePerformance(logs: QueryLog[]): LogAnalytics['performance'] {
    const latencies = logs.map(log => log.performance?.totalLatencyMs || 0).filter(l => l > 0);
    const regexpLatencies = logs.filter(log => log.triage?.processingType === 'regexp')
      .map(log => log.performance?.totalLatencyMs || 0);
    const llmLatencies = logs.filter(log => log.triage?.processingType === 'llm')
      .map(log => log.performance?.totalLatencyMs || 0);
    const hybridLatencies = logs.filter(log => log.triage?.processingType === 'hybrid')
      .map(log => log.performance?.totalLatencyMs || 0);
    
    return {
      averageLatency: this.calculateAverage(latencies),
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      regexpAvgLatency: this.calculateAverage(regexpLatencies),
      llmAvgLatency: this.calculateAverage(llmLatencies),
      hybridAvgLatency: this.calculateAverage(hybridLatencies)
    };
  }
  
  private static analyzeErrors(logs: QueryLog[]): LogAnalytics['errors'] {
    const errorLogs = logs.filter(log => !log.response?.success);
    const errorsByType = new Map<string, number>();
    const errorsByProcessingType = new Map<string, number>();
    
    errorLogs.forEach(log => {
      if (log.response?.errorType) {
        errorsByType.set(log.response.errorType, (errorsByType.get(log.response.errorType) || 0) + 1);
      }
      if (log.triage?.processingType) {
        errorsByProcessingType.set(log.triage.processingType, (errorsByProcessingType.get(log.triage.processingType) || 0) + 1);
      }
    });
    
    return {
      totalErrors: errorLogs.length,
      errorsByType: Object.fromEntries(errorsByType),
      errorsByProcessingType: Object.fromEntries(errorsByProcessingType),
      errorTrends: [] // Would calculate daily error trends
    };
  }
  
  private static analyzeUserBehavior(logs: QueryLog[]): LogAnalytics['userBehavior'] {
    const sessions = new Map<string, QueryLog[]>();
    const users = new Set<string>();
    let guestQueries = 0;
    let authQueries = 0;
    
    logs.forEach(log => {
      if (log.sessionId) {
        if (!sessions.has(log.sessionId)) {
          sessions.set(log.sessionId, []);
        }
        sessions.get(log.sessionId)!.push(log);
      }
      
      if (log.userId) {
        users.add(log.userId);
        authQueries++;
      } else {
        guestQueries++;
      }
    });
    
    const sessionLengths = Array.from(sessions.values()).map(sessionLogs => sessionLogs.length);
    
    return {
      sessionLength: this.calculateAverage(sessionLengths),
      queriesPerSession: this.calculateAverage(sessionLengths),
      repeatUsers: users.size,
      guestVsAuth: {
        guest: guestQueries,
        authenticated: authQueries
      }
    };
  }
  
  private static calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
  
  private static calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const sorted = numbers.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
  
  private static convertToCSV(logs: QueryLog[]): string {
    const headers = [
      'requestId', 'timestamp', 'userId', 'sessionId', 'isGuestMode',
      'query', 'processingType', 'confidence', 'success', 'totalLatencyMs',
      'actionType', 'portfolioModified', 'assetsAffected', 'errorType'
    ];
    
    const rows = logs.map(log => [
      log.requestId,
      log.timestamp,
      log.userId || '',
      log.sessionId || '',
      log.isGuestMode,
      log.input?.query || '',
      log.triage?.processingType || '',
      log.triage?.confidence || 0,
      log.response?.success || false,
      log.performance?.totalLatencyMs || 0,
      log.response?.actionType || '',
      log.response?.portfolioModified || false,
      log.response?.assetsAffected?.join(';') || '',
      log.response?.errorType || ''
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
  
  private static async persistLog(log: QueryLog) {
    // In a real implementation, you would save to database
    // For now, we'll just maintain in-memory logs with a limit
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift(); // Remove oldest log
    }
    
    // Example: Save to database
    // await prisma.queryLog.create({ data: log });
  }
}

// Export convenience methods for quick logging
export const logQueryStart = ChatLogger.startQuery.bind(ChatLogger);
export const logTriage = ChatLogger.logTriage.bind(ChatLogger);
export const logProcessingStart = ChatLogger.logProcessingStart.bind(ChatLogger);
export const logProcessingEnd = ChatLogger.logProcessingEnd.bind(ChatLogger);
export const logResponse = ChatLogger.logResponse.bind(ChatLogger);
export const getAnalytics = ChatLogger.getAnalytics.bind(ChatLogger);
export const exportLogs = ChatLogger.exportLogs.bind(ChatLogger);