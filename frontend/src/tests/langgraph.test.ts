// ============================================================================
// FILE: tests/langgraph.test.ts
// Test suite for LangGraph integration
// ============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { langGraphFrontendService } from '@/lib/langgraph/services/langgraph-frontend-service';
import { langGraphBackendService } from '@/lib/langgraph/services/langgraph-backend-service';
import { langGraphUnifiedService } from '@/lib/langgraph/services/langgraph-unified-service';
import { analyzeComplexity } from '@/lib/langgraph/frontend/routing-logic';
import { getLangGraphFeatureFlags, shouldUseLangGraph } from '@/lib/langgraph/feature-flags';

// Mock environment variables for testing
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_LANGGRAPH_ENABLED: 'true',
    NEXT_PUBLIC_LANGGRAPH_ROLLOUT: '100',
    NEXT_PUBLIC_LANGGRAPH_DEBUG: 'true'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('LangGraph Feature Flags', () => {
  test('should read feature flags from environment', () => {
    const flags = getLangGraphFeatureFlags();
    
    expect(flags.enabled).toBe(true);
    expect(flags.rolloutPercentage).toBe(100);
    expect(flags.debugMode).toBe(true);
  });

  test('should determine rollout correctly', () => {
    // Test 100% rollout
    expect(shouldUseLangGraph('user123')).toBe(true);
    expect(shouldUseLangGraph(undefined, 'guest456')).toBe(true);
    
    // Test force enable
    process.env.NEXT_PUBLIC_LANGGRAPH_ENABLED = 'false';
    expect(shouldUseLangGraph('user123', undefined, true)).toBe(true);
  });

  test('should handle 0% rollout', () => {
    process.env.NEXT_PUBLIC_LANGGRAPH_ROLLOUT = '0';
    expect(shouldUseLangGraph('user123')).toBe(false);
  });
});

describe('Complexity Analysis', () => {
  test('should detect simple queries for frontend', async () => {
    const testCases = [
      'hello',
      'hi there',
      'show my portfolio',
      'what is a stock?',
      'help'
    ];

    for (const query of testCases) {
      const result = await analyzeComplexity(query, {
        userId: 'test-user',
        isGuestMode: false,
        hasPortfolioData: true,
        sessionHistory: []
      });

      expect(result.routeTo).toBe('frontend');
      expect(result.confidence).toBeGreaterThan(0.5);
    }
  });

  test('should detect complex queries for backend', async () => {
    const testCases = [
      'analyze my portfolio risk and recommend optimizations',
      'what is the current market sentiment for tech stocks?',
      'calculate the Sharpe ratio for my holdings',
      'add 100 shares of AAPL at $150 per share',
      'show me the Monte Carlo simulation for my portfolio'
    ];

    for (const query of testCases) {
      const result = await analyzeComplexity(query, {
        userId: 'test-user',
        isGuestMode: false,
        hasPortfolioData: true,
        sessionHistory: []
      });

      expect(result.routeTo).toBe('backend');
      expect(result.confidence).toBeGreaterThan(0.4);
    }
  });

  test('should provide detailed reasoning', async () => {
    const result = await analyzeComplexity('add 50 shares of TSLA and analyze the risk', {
      userId: 'test-user',
      isGuestMode: false,
      hasPortfolioData: true,
      sessionHistory: []
    });

    expect(result.reasoning.hasPortfolioOperations).toBe(true);
    expect(result.reasoning.requiresCalculation).toBe(true);
    expect(result.reasoning.isMultiStep).toBe(true);
  });
});

describe('Frontend Service', () => {
  test('should process simple messages locally', async () => {
    const result = await langGraphFrontendService.processMessage('hello', {
      portfolioContext: {
        isGuestMode: false,
        portfolios: []
      }
    });

    expect(result.processingType).toBe('frontend');
    expect(result.response).toBeDefined();
    expect(result.response?.content).toContain('Hello');
    expect(result.executionTimeMs).toBeGreaterThan(0);
  });

  test('should route complex queries to backend', async () => {
    const result = await langGraphFrontendService.processMessage(
      'analyze my portfolio risk and calculate Sharpe ratio',
      {
        portfolioContext: {
          isGuestMode: false,
          portfolios: [{ assets: [{ symbol: 'AAPL', quantity: 10 }] }]
        }
      }
    );

    expect(result.processingType).toBe('backend');
    expect(result.routingDecision?.routeTo).toBe('backend');
  });

  test('should handle streaming messages', async () => {
    const chunks: any[] = [];
    
    const stream = langGraphFrontendService.streamMessage('show my portfolio', {
      portfolioContext: {
        isGuestMode: false,
        portfolios: []
      }
    });

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1].response).toBeDefined();
  });
});

describe('Backend Service', () => {
  test('should get service status', async () => {
    const status = langGraphBackendService.getStatus();
    
    expect(status.isInitialized).toBe(true);
    expect(status.capabilities).toContain('complex_workflow_orchestration');
    expect(status.graphNodes).toContain('coordinator');
  });

  test('should check health status', async () => {
    const health = await langGraphBackendService.checkHealth();
    
    expect(health.status).toBeDefined();
    expect(health.components).toBeDefined();
    expect(health.components.graph).toBe('up');
  });
});

describe('Unified Service Integration', () => {
  test('should route simple queries to frontend', async () => {
    const result = await langGraphUnifiedService.processMessage('hello', {
      isGuestMode: false
    });

    expect(result.success).toBe(true);
    expect(result.processingType).toBe('frontend');
    expect(result.content).toBeDefined();
    expect(result.executionTimeMs).toBeGreaterThan(0);
  });

  test('should handle guest mode correctly', async () => {
    const result = await langGraphUnifiedService.processMessage('show portfolio chart', {
      isGuestMode: true,
      guestSessionId: 'guest-123'
    });

    expect(result.success).toBe(true);
    expect(result.chartData).toBeDefined();
    expect(result.chartData?.data[0].name).toBe('Add your assets');
  });

  test('should provide complexity analysis', async () => {
    const analysis = await langGraphUnifiedService.analyzeMessageComplexity(
      'calculate portfolio risk',
      { isGuestMode: false }
    );

    expect(analysis.routeTo).toBe('backend');
    expect(analysis.reasoning.requiresCalculation).toBe(true);
    expect(analysis.explanation).toContain('complexity');
  });

  test('should check local capability', async () => {
    const canHandleLocally = await langGraphUnifiedService.canHandleLocally(
      'hello world',
      { isGuestMode: false }
    );

    expect(canHandleLocally).toBe(true);
  });

  test('should get overall health status', async () => {
    const health = await langGraphUnifiedService.getHealthStatus();
    
    expect(health.unified).toBeDefined();
    expect(health.frontend).toBeDefined();
    expect(health.backend).toBeDefined();
    expect(health.unified.isInitialized).toBe(true);
  });

  test('should handle errors gracefully', async () => {
    // Test with invalid input
    const result = await langGraphUnifiedService.processMessage('', {
      isGuestMode: false
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.recoverable).toBe(true);
  });
});

describe('Performance Tests', () => {
  test('frontend processing should be fast', async () => {
    const start = Date.now();
    
    const result = await langGraphFrontendService.processMessage('hello', {
      portfolioContext: { isGuestMode: false }
    });

    const duration = Date.now() - start;
    
    expect(result.executionTimeMs).toBeLessThan(500); // Should be under 500ms
    expect(duration).toBeLessThan(1000); // Total time under 1 second
  });

  test('complexity analysis should be fast', async () => {
    const start = Date.now();
    
    const result = await analyzeComplexity('analyze my portfolio', {
      userId: 'test',
      isGuestMode: false,
      hasPortfolioData: true,
      sessionHistory: []
    });

    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100); // Should be under 100ms
    expect(result).toBeDefined();
  });
});

describe('Edge Cases', () => {
  test('should handle empty messages', async () => {
    const result = await langGraphUnifiedService.processMessage('', {
      isGuestMode: false
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('input');
  });

  test('should handle very long messages', async () => {
    const longMessage = 'analyze my portfolio '.repeat(100);
    
    const result = await langGraphUnifiedService.processMessage(longMessage, {
      isGuestMode: false
    });

    expect(result).toBeDefined();
    // Should either succeed or fail gracefully
    expect(typeof result.success).toBe('boolean');
  });

  test('should handle special characters', async () => {
    const specialMessage = 'what is my 🏠 portfolio allocation? 💰📈';
    
    const result = await langGraphUnifiedService.processMessage(specialMessage, {
      isGuestMode: false
    });

    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
  });
});

// Mock implementations for testing
jest.mock('@/lib/llm-service', () => ({
  llmService: {
    generateResponse: jest.fn().mockResolvedValue({
      content: 'Mocked LLM response',
      provider: 'openai',
      usage: { tokens: 100 }
    }),
    getAvailableProviders: jest.fn().mockReturnValue(['openai', 'anthropic'])
  }
}));

jest.mock('@/lib/portfolio-crud-handler', () => ({
  PortfolioCrudHandler: {
    processRegexpMatch: jest.fn().mockResolvedValue({
      success: true,
      message: 'Portfolio operation completed',
      executionTimeMs: 50
    })
  }
}));

jest.mock('@/lib/unified-analysis-service', () => ({
  unifiedAnalysisService: {
    analyzeQuery: jest.fn().mockResolvedValue({
      content: 'Analysis completed',
      backend: 'fastapi'
    }),
    calculatePortfolioRisk: jest.fn().mockResolvedValue({
      success: true,
      formattedData: 'Risk analysis: Low risk portfolio'
    })
  }
}));