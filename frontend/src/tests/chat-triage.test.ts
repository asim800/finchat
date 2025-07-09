// ============================================================================
// FILE: tests/chat-triage.test.ts
// Comprehensive test suite for chat triage and CRUD operations
// ============================================================================

import { QueryTriage, RegexpMatch } from '../lib/query-triage';
import { PortfolioCrudHandler, CrudResult } from '../lib/portfolio-crud-handler';
import { ChatTriageProcessor } from '../lib/chat-triage-processor';

// Mock data for testing
const mockUserId = 'test-user-123';
const mockGuestSessionId = 'guest-session-456';

// Test cases for different CRUD patterns
const testCases = {
  // ADD operations
  add: [
    {
      query: "add 50 shares of TSLA at $200 per share",
      expected: {
        action: 'add',
        symbol: 'TSLA',
        quantity: 50,
        avgCost: 200,
        confidence: 0.95
      }
    },
    {
      query: "I just added 11 stocks of SPY",
      expected: {
        action: 'add',
        symbol: 'SPY',
        quantity: 11,
        confidence: 0.9
      }
    },
    {
      query: "buy 100 AAPL at 150",
      expected: {
        action: 'add',
        symbol: 'AAPL',
        quantity: 100,
        avgCost: 150,
        confidence: 0.9
      }
    },
    {
      query: "purchased 25 shares of GOOGL",
      expected: {
        action: 'add',
        symbol: 'GOOGL',
        quantity: 25,
        confidence: 0.9
      }
    }
  ],

  // REMOVE operations
  remove: [
    {
      query: "delete NFLX from my portfolio",
      expected: {
        action: 'remove',
        symbol: 'NFLX',
        confidence: 0.9
      }
    },
    {
      query: "remove all my TSLA holdings",
      expected: {
        action: 'remove',
        symbol: 'TSLA',
        confidence: 0.9
      }
    },
    {
      query: "sell all AAPL",
      expected: {
        action: 'remove',
        symbol: 'AAPL',
        confidence: 0.9
      }
    },
    {
      query: "get rid of my MSFT position",
      expected: {
        action: 'remove',
        symbol: 'MSFT',
        confidence: 0.9
      }
    }
  ],

  // UPDATE operations
  update: [
    {
      query: "update avgCost of my SPY stock to 452",
      expected: {
        action: 'update',
        symbol: 'SPY',
        avgCost: 452,
        confidence: 0.85
      }
    },
    {
      query: "change my GOOGL position to 100 shares",
      expected: {
        action: 'update',
        symbol: 'GOOGL',
        quantity: 100,
        confidence: 0.85
      }
    },
    {
      query: "set TSLA quantity to 75",
      expected: {
        action: 'update',
        symbol: 'TSLA',
        quantity: 75,
        confidence: 0.85
      }
    },
    {
      query: "update AAPL price to $145",
      expected: {
        action: 'update',
        symbol: 'AAPL',
        avgCost: 145,
        confidence: 0.85
      }
    }
  ],

  // SHOW operations
  show: [
    {
      query: "show my AAPL position",
      expected: {
        action: 'show',
        symbol: 'AAPL',
        confidence: 0.9
      }
    },
    {
      query: "what's my TSLA holding",
      expected: {
        action: 'show',
        symbol: 'TSLA',
        confidence: 0.9
      }
    },
    {
      query: "display my SPY allocation",
      expected: {
        action: 'show',
        symbol: 'SPY',
        confidence: 0.9
      }
    },
    {
      query: "how much GOOGL do I have",
      expected: {
        action: 'show',
        symbol: 'GOOGL',
        confidence: 0.9
      }
    }
  ],

  // Complex queries that should use LLM
  llm: [
    {
      query: "What's the best way to diversify my portfolio?",
      expected: {
        processingType: 'llm',
        isRegexpMatch: false
      }
    },
    {
      query: "Analyze my portfolio risk",
      expected: {
        processingType: 'llm',
        isRegexpMatch: false
      }
    },
    {
      query: "Should I buy more tech stocks?",
      expected: {
        processingType: 'llm',
        isRegexpMatch: false
      }
    }
  ],

  // Ambiguous queries that should use hybrid
  hybrid: [
    {
      query: "add some AAPL",
      expected: {
        processingType: 'hybrid',
        isRegexpMatch: true,
        action: 'add',
        symbol: 'AAPL'
      }
    },
    {
      query: "update my tech positions",
      expected: {
        processingType: 'hybrid',
        isRegexpMatch: true
      }
    }
  ]
};

describe('Chat Triage System', () => {
  
  describe('QueryTriage Pattern Matching', () => {
    
    test('ADD operations should match correctly', () => {
      testCases.add.forEach(testCase => {
        const result = QueryTriage.analyzeQuery(testCase.query);
        
        expect(result.isRegexpMatch).toBe(true);
        expect(result.regexpMatch?.action).toBe(testCase.expected.action);
        expect(result.regexpMatch?.symbol).toBe(testCase.expected.symbol);
        
        if (testCase.expected.quantity) {
          expect(result.regexpMatch?.quantity).toBe(testCase.expected.quantity);
        }
        
        if (testCase.expected.avgCost) {
          expect(result.regexpMatch?.avgCost).toBe(testCase.expected.avgCost);
        }
        
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.processingType).toBe('regexp');
      });
    });

    test('REMOVE operations should match correctly', () => {
      testCases.remove.forEach(testCase => {
        const result = QueryTriage.analyzeQuery(testCase.query);
        
        expect(result.isRegexpMatch).toBe(true);
        expect(result.regexpMatch?.action).toBe(testCase.expected.action);
        expect(result.regexpMatch?.symbol).toBe(testCase.expected.symbol);
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.processingType).toBe('regexp');
      });
    });

    test('UPDATE operations should match correctly', () => {
      testCases.update.forEach(testCase => {
        const result = QueryTriage.analyzeQuery(testCase.query);
        
        expect(result.isRegexpMatch).toBe(true);
        expect(result.regexpMatch?.action).toBe(testCase.expected.action);
        expect(result.regexpMatch?.symbol).toBe(testCase.expected.symbol);
        
        if (testCase.expected.quantity) {
          expect(result.regexpMatch?.quantity).toBe(testCase.expected.quantity);
        }
        
        if (testCase.expected.avgCost) {
          expect(result.regexpMatch?.avgCost).toBe(testCase.expected.avgCost);
        }
        
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.processingType).toBe('regexp');
      });
    });

    test('SHOW operations should match correctly', () => {
      testCases.show.forEach(testCase => {
        const result = QueryTriage.analyzeQuery(testCase.query);
        
        expect(result.isRegexpMatch).toBe(true);
        expect(result.regexpMatch?.action).toBe(testCase.expected.action);
        expect(result.regexpMatch?.symbol).toBe(testCase.expected.symbol);
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.processingType).toBe('regexp');
      });
    });

    test('Complex queries should route to LLM', () => {
      testCases.llm.forEach(testCase => {
        const result = QueryTriage.analyzeQuery(testCase.query);
        
        expect(result.isRegexpMatch).toBe(false);
        expect(result.shouldUseLLM).toBe(true);
        expect(result.processingType).toBe('llm');
      });
    });

    test('Ambiguous queries should route to hybrid', () => {
      testCases.hybrid.forEach(testCase => {
        const result = QueryTriage.analyzeQuery(testCase.query);
        
        // Hybrid queries have low confidence regexp matches
        expect(result.confidence).toBeLessThan(0.7);
        expect(result.processingType).toBe('hybrid');
      });
    });
  });

  describe('Portfolio CRUD Handler', () => {
    
    // Mock portfolio data
    const mockRegexpMatch: RegexpMatch = {
      action: 'add',
      symbol: 'AAPL',
      quantity: 100,
      avgCost: 150,
      confidence: 0.9,
      rawMatch: 'add 100 shares of AAPL at $150'
    };

    test('Should handle ADD operations in guest mode', async () => {
      const result = await PortfolioCrudHandler.processRegexpMatch(
        mockRegexpMatch,
        undefined,
        mockGuestSessionId,
        true
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Added 100 shares of AAPL at $150 to main portfolio');
      expect(result.data?.action).toBe('add');
      expect(result.data?.symbol).toBe('AAPL');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    test('Should validate invalid quantities', async () => {
      const invalidMatch: RegexpMatch = {
        ...mockRegexpMatch,
        quantity: 0
      };

      const result = await PortfolioCrudHandler.processRegexpMatch(
        invalidMatch,
        undefined,
        mockGuestSessionId,
        true
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid quantity');
      expect(result.error).toContain('Quantity must be greater than 0');
    });

    test('Should handle REMOVE operations', async () => {
      const removeMatch: RegexpMatch = {
        action: 'remove',
        symbol: 'TSLA',
        confidence: 0.9,
        rawMatch: 'remove TSLA from my portfolio'
      };

      const result = await PortfolioCrudHandler.processRegexpMatch(
        removeMatch,
        undefined,
        mockGuestSessionId,
        true
      );

      expect(result.success).toBeDefined();
      expect(result.message).toContain('TSLA');
      expect(result.data?.action).toBe('remove');
    });

    test('Should generate proper confirmation messages', () => {
      const confirmationMessage = QueryTriage.generateConfirmationMessage(mockRegexpMatch, true);
      
      expect(confirmationMessage).toContain('Added 100 shares of AAPL at $150 to main portfolio');
    });
  });

  describe('End-to-End Triage Processing', () => {
    
    test('Should process simple ADD query end-to-end', async () => {
      const query = "add 50 shares of TSLA at $200 per share";
      
      const result = await ChatTriageProcessor.processQuery(query, {
        guestSessionId: mockGuestSessionId,
        isGuestMode: true
      });

      expect(result.success).toBe(true);
      expect(result.processingType).toBe('regexp');
      expect(result.content).toContain('Added 50 shares of TSLA at $200 to main portfolio');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.executionTimeMs).toBeGreaterThan(0);
      expect(result.metadata?.portfolioModified).toBe(true);
      expect(result.metadata?.assetsAffected).toContain('TSLA');
    });

    test('Should process SHOW query end-to-end', async () => {
      const query = "show my AAPL position";
      
      const result = await ChatTriageProcessor.processQuery(query, {
        guestSessionId: mockGuestSessionId,
        isGuestMode: true
      });

      expect(result.processingType).toBe('regexp');
      expect(result.content).toContain('AAPL');
      expect(result.metadata?.portfolioModified).toBe(false);
    });

    test('Should handle complex queries with LLM fallback', async () => {
      const query = "What's the best diversification strategy for my portfolio?";
      
      // Mock LLM service for testing
      const result = await ChatTriageProcessor.processQuery(query, {
        guestSessionId: mockGuestSessionId,
        isGuestMode: true
      });

      expect(result.processingType).toBe('llm');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Performance Benchmarks', () => {
    
    test('Regexp processing should be fast (<50ms)', async () => {
      const query = "add 100 shares of AAPL at $150";
      const startTime = Date.now();
      
      const result = await ChatTriageProcessor.processQuery(query, {
        guestSessionId: mockGuestSessionId,
        isGuestMode: true
      });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(result.processingType).toBe('regexp');
      expect(totalTime).toBeLessThan(50);
      expect(result.executionTimeMs).toBeLessThan(50);
    });

    test('Triage analysis should be very fast (<5ms)', () => {
      const queries = [
        "add 100 AAPL",
        "remove TSLA from portfolio",
        "update SPY quantity to 50",
        "show my GOOGL position"
      ];

      queries.forEach(query => {
        const startTime = Date.now();
        const result = QueryTriage.analyzeQuery(query);
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(5);
        expect(result.isRegexpMatch).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    
    test('Should handle invalid symbols gracefully', async () => {
      const query = "add 100 shares of INVALID123";
      
      const result = await ChatTriageProcessor.processQuery(query, {
        guestSessionId: mockGuestSessionId,
        isGuestMode: true
      });

      // Should still process but may fail at execution
      expect(result.processingType).toBe('regexp');
      expect(typeof result.success).toBe('boolean');
    });

    test('Should handle missing context gracefully', async () => {
      const query = "add 100 shares of AAPL";
      
      const result = await ChatTriageProcessor.processQuery(query, {
        // No user or guest session
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });
  });

  describe('Portfolio Name Detection', () => {
    
    test('Should detect portfolio names in queries', () => {
      const testCases = [
        {
          query: "add 100 AAPL to my retirement portfolio",
          expectedPortfolio: "retirement"
        },
        {
          query: "remove TSLA from John's portfolio",
          expectedPortfolio: "John's"
        },
        {
          query: "show GOOGL in main portfolio",
          expectedPortfolio: "main"
        }
      ];

      testCases.forEach(testCase => {
        const result = QueryTriage.analyzeQuery(testCase.query);
        
        expect(result.regexpMatch?.portfolioName).toBe(testCase.expectedPortfolio);
      });
    });
  });
});

// Additional test utilities
export class TestUtilities {
  
  // Generate test data for performance testing
  static generateTestQueries(count: number): string[] {
    const templates = [
      "add {quantity} shares of {symbol} at ${price}",
      "remove {symbol} from my portfolio",
      "update {symbol} quantity to {quantity}",
      "show my {symbol} position"
    ];
    
    const symbols = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'SPY', 'QQQ'];
    const queries: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const symbol = symbols[i % symbols.length];
      const quantity = Math.floor(Math.random() * 1000) + 1;
      const price = Math.floor(Math.random() * 500) + 50;
      
      const query = template
        .replace('{symbol}', symbol)
        .replace('{quantity}', quantity.toString())
        .replace('{price}', price.toString());
        
      queries.push(query);
    }
    
    return queries;
  }
  
  // Run performance benchmark
  static async runPerformanceBenchmark(queryCount: number = 100): Promise<{
    averageTime: number;
    regexpQueries: number;
    llmQueries: number;
    hybridQueries: number;
  }> {
    const queries = this.generateTestQueries(queryCount);
    const results = {
      totalTime: 0,
      regexpQueries: 0,
      llmQueries: 0,
      hybridQueries: 0
    };
    
    for (const query of queries) {
      const startTime = Date.now();
      const triageResult = QueryTriage.analyzeQuery(query);
      const endTime = Date.now();
      
      results.totalTime += (endTime - startTime);
      
      switch (triageResult.processingType) {
        case 'regexp':
          results.regexpQueries++;
          break;
        case 'llm':
          results.llmQueries++;
          break;
        case 'hybrid':
          results.hybridQueries++;
          break;
      }
    }
    
    return {
      averageTime: results.totalTime / queryCount,
      regexpQueries: results.regexpQueries,
      llmQueries: results.llmQueries,
      hybridQueries: results.hybridQueries
    };
  }
}

// Export test data for external testing
export { testCases };