// ============================================================================
// FILE: lib/chat-triage-processor.ts
// Main triage processor that routes queries between regexp and LLM
// ============================================================================

import { QueryTriage, TriageResult, RegexpMatch } from './query-triage';
import { PortfolioCrudHandler, CrudResult } from './portfolio-crud-handler';
import { llmService, LLMProvider, LLMResponse } from './llm-service';
import { FINANCIAL_SYSTEM_PROMPT, generateFinancialPrompt } from './financial-prompts';
import { logQueryStart, logTriage, logProcessingStart, logProcessingEnd, logResponse } from './chat-logger';
import { unifiedAnalysisService } from './unified-analysis-service';
import { backendConfig } from './backend-config';

export interface TriageProcessorResult {
  success: boolean;
  content: string;
  processingType: 'regexp' | 'llm' | 'hybrid';
  executionTimeMs: number;
  confidence: number;
  metadata?: {
    regexpMatch?: RegexpMatch;
    llmProvider?: LLMProvider;
    llmTokens?: number;
    dbOperations?: number;
    cacheHit?: boolean;
    portfolioModified?: boolean;
    assetsAffected?: string[];
    valueChanged?: number;
    analysisData?: unknown; // Raw analysis data for figure extraction
    backendUsed?: string; // Which backend was used for analysis
  };
  error?: string;
}

export interface ProcessingContext {
  userId?: string;
  sessionId?: string;
  guestSessionId?: string;
  isGuestMode?: boolean;
  portfolioData?: any;
  userPreferences?: any;
  provider?: LLMProvider;
}

export class ChatTriageProcessor {
  
  // Main entry point for processing chat queries
  static async processQuery(
    query: string,
    context: ProcessingContext = {}
  ): Promise<TriageProcessorResult> {
    const requestId = logQueryStart(
      query, 
      context.userId, 
      context.sessionId, 
      context.isGuestMode || false
    );
    
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [${requestId}] Processing query: "${query.substring(0, 100)}..."`);
      
      // Step 1: Analyze query with triage system
      const triageStartTime = Date.now();
      const triageResult = QueryTriage.analyzeQuery(query);
      const triageTimeMs = Date.now() - triageStartTime;
      
      logTriage(requestId, triageResult, triageTimeMs);
      
      console.log(`🎯 [${requestId}] Triage result: ${triageResult.processingType} (confidence: ${triageResult.confidence})`);
      
      // Step 2: Route to appropriate processor
      let result: TriageProcessorResult;
      
      switch (triageResult.processingType) {
        case 'regexp':
          result = await this.processRegexpQuery(requestId, query, triageResult, context);
          break;
        case 'llm':
          result = await this.processLLMQuery(requestId, query, triageResult, context);
          break;
        case 'hybrid':
          result = await this.processHybridQuery(requestId, query, triageResult, context);
          break;
        default:
          throw new Error(`Unknown processing type: ${triageResult.processingType}`);
      }
      
      // Step 3: Finalize result
      result.executionTimeMs = Date.now() - startTime;
      result.confidence = triageResult.confidence;
      
      // Log the final response
      logResponse(
        requestId,
        result.success,
        result.content.length,
        triageResult.regexpMatch?.action,
        result.metadata?.portfolioModified || false,
        result.metadata?.assetsAffected || [],
        result.metadata?.valueChanged,
        result.success ? undefined : 'processing',
        result.error
      );
      
      console.log(`✅ [${requestId}] Query processed successfully in ${result.executionTimeMs}ms`);
      return result;
      
    } catch (error) {
      const errorResult: TriageProcessorResult = {
        success: false,
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        processingType: 'llm',
        executionTimeMs: Date.now() - startTime,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      logResponse(
        requestId,
        false,
        errorResult.content.length,
        undefined,
        false,
        [],
        undefined,
        'processing',
        errorResult.error
      );
      
      console.error(`❌ [${requestId}] Error processing query:`, error);
      return errorResult;
    }
  }
  
  // Process queries with high-confidence regexp matches
  private static async processRegexpQuery(
    requestId: string,
    query: string,
    triageResult: TriageResult,
    context: ProcessingContext
  ): Promise<TriageProcessorResult> {
    logProcessingStart(requestId, 'regexp');
    
    if (!triageResult.regexpMatch) {
      throw new Error('Regexp match expected but not found');
    }
    
    try {
      console.log(`⚡ [${requestId}] Processing with regexp handler`);
      
      const crudResult = await PortfolioCrudHandler.processRegexpMatch(
        triageResult.regexpMatch,
        context.userId,
        context.guestSessionId,
        context.isGuestMode || false
      );
      
      logProcessingEnd(requestId, crudResult.success ? 1 : 0);
      
      // Generate user-friendly confirmation message
      const confirmationMessage = crudResult.success 
        ? crudResult.message
        : `Sorry, I couldn't ${triageResult.regexpMatch.action} ${triageResult.regexpMatch.symbol}. ${crudResult.error || 'Please try again.'}`;
      
      return {
        success: crudResult.success,
        content: confirmationMessage,
        processingType: 'regexp',
        executionTimeMs: crudResult.executionTimeMs,
        confidence: triageResult.confidence,
        metadata: {
          regexpMatch: triageResult.regexpMatch,
          dbOperations: crudResult.success ? 1 : 0,
          cacheHit: false,
          portfolioModified: crudResult.success && ['add', 'remove', 'update'].includes(triageResult.regexpMatch.action),
          assetsAffected: crudResult.success ? [triageResult.regexpMatch.symbol] : [],
          valueChanged: crudResult.data?.changes[0]?.newValue
        },
        error: crudResult.success ? undefined : crudResult.error
      };
      
    } catch (error) {
      logProcessingEnd(requestId, 0);
      throw new Error(`Regexp processing failed: ${error}`);
    }
  }
  
  // Process queries requiring full LLM analysis
  private static async processLLMQuery(
    requestId: string,
    query: string,
    triageResult: TriageResult,
    context: ProcessingContext
  ): Promise<TriageProcessorResult> {
    const provider = context.provider || 'openai';
    logProcessingStart(requestId, 'llm', provider);
    
    try {
      console.log(`🤖 [${requestId}] Processing with LLM (${provider})`);
      
      // Check if this query requires financial analysis backend
      const needsFinancialAnalysis = this.requiresFinancialAnalysis(query);
      
      if (needsFinancialAnalysis && context.userId) {
        console.log(`💰 [${requestId}] Query requires financial analysis - routing through unified analysis service`);
        
        try {
          // Route through unified analysis service (respects PRIMARY_ANALYSIS_BACKEND)
          const analysisResult = await unifiedAnalysisService.analyzeQuery(
            query,
            context.userId,
            context.portfolioData?.portfolios || []
          );
          
          logProcessingEnd(requestId, 0);
          
          return {
            success: true,
            content: analysisResult.content,
            processingType: 'llm',
            executionTimeMs: 0, // Will be calculated by caller
            confidence: triageResult.confidence,
            metadata: {
              llmProvider: provider,
              backendUsed: analysisResult.backend,
              dbOperations: 0,
              cacheHit: false,
              portfolioModified: false,
              assetsAffected: [],
              analysisData: analysisResult.rawAnalysisData, // Pass raw data for figure extraction
            },
          };
        } catch (analysisError) {
          console.warn(`⚠️ [${requestId}] Financial analysis failed, falling back to direct LLM:`, analysisError);
          // Fall through to direct LLM processing
        }
      }
      
      // Generate financial prompt with context
      const promptResult = generateFinancialPrompt(query, {
        isGuestMode: context.isGuestMode || false,
        portfolioData: context.portfolioData,
        userPreferences: context.userPreferences,
      });
      
      // Call LLM service directly
      const llmResponse: LLMResponse = await llmService.generateResponse(
        [{ role: 'user', content: promptResult.prompt }],
        {
          provider,
          systemPrompt: FINANCIAL_SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 1000,
        }
      );
      
      logProcessingEnd(requestId, 0, llmResponse.usage?.tokens);
      
      return {
        success: true,
        content: llmResponse.content,
        processingType: 'llm',
        executionTimeMs: 0, // Will be calculated by caller
        confidence: triageResult.confidence,
        metadata: {
          llmProvider: provider,
          llmTokens: llmResponse.usage?.tokens,
          dbOperations: 0,
          cacheHit: false,
          portfolioModified: false,
          assetsAffected: [],
        }
      };
      
    } catch (error) {
      logProcessingEnd(requestId, 0);
      throw new Error(`LLM processing failed: ${error}`);
    }
  }
  
  // Process ambiguous queries with both regexp and LLM
  private static async processHybridQuery(
    requestId: string,
    query: string,
    triageResult: TriageResult,
    context: ProcessingContext
  ): Promise<TriageProcessorResult> {
    const provider = context.provider || 'openai';
    logProcessingStart(requestId, 'hybrid', provider);
    
    try {
      console.log(`🔄 [${requestId}] Processing with hybrid approach`);
      
      if (!triageResult.regexpMatch) {
        // If no regexp match, fallback to pure LLM
        return this.processLLMQuery(requestId, query, triageResult, context);
      }
      
      const regexpMatch = triageResult.regexpMatch;
      
      // Identify what's missing from the regexp match
      const missingInfo = this.identifyMissingInfo(regexpMatch, query);
      
      if (missingInfo.length === 0) {
        // If nothing is missing, use regexp processing
        return this.processRegexpQuery(requestId, query, triageResult, context);
      }
      
      // Use LLM to fill in missing information
      const llmPrompt = this.buildHybridPrompt(regexpMatch, query, missingInfo);
      
      const llmResponse: LLMResponse = await llmService.generateResponse(
        [{ role: 'user', content: llmPrompt }],
        {
          provider,
          systemPrompt: `You are a helpful assistant that extracts missing information for portfolio operations. Always respond with valid JSON only.`,
          temperature: 0.3,
          maxTokens: 200,
        }
      );
      
      // Parse LLM response to complete the regexp match
      const enhancedMatch = this.enhanceRegexpMatch(regexpMatch, llmResponse.content);
      
      if (enhancedMatch) {
        // Process with enhanced regexp match
        const crudResult = await PortfolioCrudHandler.processRegexpMatch(
          enhancedMatch,
          context.userId,
          context.guestSessionId,
          context.isGuestMode || false
        );
        
        logProcessingEnd(requestId, crudResult.success ? 1 : 0, llmResponse.usage?.tokens);
        
        const confirmationMessage = crudResult.success 
          ? crudResult.message
          : `Sorry, I couldn't complete the ${enhancedMatch.action} operation. ${crudResult.error || 'Please try again.'}`;
        
        return {
          success: crudResult.success,
          content: confirmationMessage,
          processingType: 'hybrid',
          executionTimeMs: crudResult.executionTimeMs,
          confidence: triageResult.confidence,
          metadata: {
            regexpMatch: enhancedMatch,
            llmProvider: provider,
            llmTokens: llmResponse.usage?.tokens,
            dbOperations: crudResult.success ? 1 : 0,
            cacheHit: false,
            portfolioModified: crudResult.success && ['add', 'remove', 'update'].includes(enhancedMatch.action),
            assetsAffected: crudResult.success ? [enhancedMatch.symbol] : [],
            valueChanged: crudResult.data?.changes[0]?.newValue
          },
          error: crudResult.success ? undefined : crudResult.error
        };
      } else {
        // If enhancement failed, fallback to pure LLM
        logProcessingEnd(requestId, 0, llmResponse.usage?.tokens);
        return this.processLLMQuery(requestId, query, triageResult, context);
      }
      
    } catch (error) {
      logProcessingEnd(requestId, 0);
      throw new Error(`Hybrid processing failed: ${error}`);
    }
  }
  
  // Identify what information is missing from a regexp match
  private static identifyMissingInfo(regexpMatch: RegexpMatch, query: string): string[] {
    const missing: string[] = [];
    
    switch (regexpMatch.action) {
      case 'add':
        if (!regexpMatch.quantity || regexpMatch.quantity <= 0) {
          missing.push('quantity');
        }
        if (!regexpMatch.avgCost && query.toLowerCase().includes('at')) {
          missing.push('price');
        }
        break;
        
      case 'update':
        if (!regexpMatch.quantity && !regexpMatch.avgCost) {
          missing.push('quantity or price');
        }
        break;
        
      case 'remove':
      case 'show':
        // These typically don't need additional info
        break;
    }
    
    return missing;
  }
  
  // Build LLM prompt to extract missing information
  private static buildHybridPrompt(regexpMatch: RegexpMatch, originalQuery: string, missingInfo: string[]): string {
    return `Extract missing information from this portfolio query:

Original query: "${originalQuery}"
Detected action: ${regexpMatch.action}
Detected symbol: ${regexpMatch.symbol}
Missing information: ${missingInfo.join(', ')}

Please provide the missing information in JSON format:
{
  "quantity": number (if needed),
  "price": number (if needed),
  "confidence": number (0-1)
}

If you cannot determine the missing information, respond with {"confidence": 0}`;
  }
  
  // Enhance regexp match with LLM-extracted information
  private static enhanceRegexpMatch(regexpMatch: RegexpMatch, llmResponse: string): RegexpMatch | null {
    try {
      // Try to parse JSON response from LLM
      const enhancement = JSON.parse(llmResponse.trim());
      
      if (enhancement.confidence < 0.7) {
        return null; // Not confident enough
      }
      
      // Create enhanced match
      const enhanced: RegexpMatch = {
        ...regexpMatch,
        confidence: Math.min(regexpMatch.confidence + 0.1, 1.0) // Boost confidence slightly
      };
      
      if (enhancement.quantity && enhancement.quantity > 0) {
        enhanced.quantity = enhancement.quantity;
      }
      
      if (enhancement.price && enhancement.price > 0) {
        enhanced.avgCost = enhancement.price;
        enhanced.price = enhancement.price;
      }
      
      return enhanced;
      
    } catch (error) {
      console.error('Failed to parse LLM enhancement response:', error);
      return null;
    }
  }
  
  // Validate processing context
  private static validateContext(context: ProcessingContext): boolean {
    return !!(context.userId || context.guestSessionId);
  }
  
  // Check if query requires financial analysis backend
  private static requiresFinancialAnalysis(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    
    // Keywords that trigger financial analysis backend
    const financialAnalysisKeywords = [
      // Risk analysis
      'risk', 'volatility', 'var', 'value at risk', 'drawdown',
      'portfolio risk', 'analyze my portfolio', 'portfolio analysis',
      
      // Sharpe ratio
      'sharpe', 'sharpe ratio', 'risk adjusted', 'risk-adjusted',
      'performance ratio', 'return per risk',
      
      // Market data
      'market data', 'current price', 'stock price', 'market performance',
      'price change', 'market trend',
      
      // Sentiment analysis
      'sentiment', 'market sentiment', 'news sentiment', 'bullish', 'bearish',
      'market mood', 'investor sentiment', 'fear', 'greed',
      
      // Optimization
      'optimize', 'optimization', 'portfolio optimization', 'allocation',
      'diversification', 'rebalance', 'rebalancing',
      
      // Monte Carlo
      'monte carlo', 'simulation', 'monte carlo simulation', 'scenario analysis',
      
      // Performance metrics
      'performance', 'returns', 'analyze performance', 'portfolio performance',
      'calculate returns', 'total return', 'annualized return'
    ];
    
    return financialAnalysisKeywords.some(keyword => lowerQuery.includes(keyword));
  }
  
  // Get processing statistics for monitoring
  static getProcessingStats(): {
    regexpQueries: number;
    llmQueries: number;
    hybridQueries: number;
    averageLatency: number;
    successRate: number;
  } {
    // This would be implemented with actual metrics tracking
    return {
      regexpQueries: 0,
      llmQueries: 0,
      hybridQueries: 0,
      averageLatency: 0,
      successRate: 0
    };
  }
}