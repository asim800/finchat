// ============================================================================
// FILE: lib/query-triage.ts
// Query triage system for routing between regexp CRUD and LLM processing
// ============================================================================

import { formatCurrency } from './number-utils';

export interface RegexpMatch {
  action: 'add' | 'remove' | 'update' | 'show';
  symbol: string;
  quantity?: number;
  price?: number;
  avgCost?: number;
  portfolioName?: string;
  confidence: number;
  rawMatch: string;
}

export interface TriageResult {
  isRegexpMatch: boolean;
  regexpMatch?: RegexpMatch;
  shouldUseLLM: boolean;
  confidence: number;
  processingType: 'regexp' | 'llm' | 'hybrid';
}

export class QueryTriage {
  // Regexp patterns for different CRUD operations
  private static readonly PATTERNS = {
    // ADD/BUY patterns
    add: [
      // "add 50 shares of TSLA at $200 per share"
      /(?:add|buy|purchase|bought|added)\s+(\d+)\s+(?:shares?\s+of\s+)?([A-Z]{1,5})(?:\s+at\s+\$?(\d+(?:\.\d+)?))?/i,
      // "I just added 11 stocks of SPY"
      /(?:i\s+(?:just\s+)?)?(?:added|bought|purchased)\s+(\d+)\s+(?:stocks?\s+of\s+|shares?\s+of\s+)?([A-Z]{1,5})/i,
      // "buy 100 AAPL at 150"
      /(?:buy|purchase)\s+(\d+)\s+([A-Z]{1,5})(?:\s+at\s+\$?(\d+(?:\.\d+)?))?/i,
      // "purchased 25 shares of GOOGL"
      /(?:purchased|bought)\s+(\d+)\s+(?:shares?\s+of\s+)?([A-Z]{1,5})/i,
      // "add some AAPL" - vague quantity (will trigger hybrid)
      /(?:add|buy|purchase)\s+(?:some|few|several|more)\s+(?:shares?\s+of\s+)?([A-Z]{1,5})/i,
      // "add AAPL" - no quantity specified
      /(?:add|buy|purchase)\s+([A-Z]{1,5})(?:\s+shares?|\s+stock)?/i,
      // Company name patterns - "add 5 Nvidia stocks"
      /(?:add|buy|purchase)\s+(\d+)\s+([A-Za-z\s]+)\s+(?:stocks?|shares?)/i,
      // "add Nvidia" - company name without quantity
      /(?:add|buy|purchase)\s+([A-Za-z\s]+)(?:\s+stocks?|\s+shares?)?$/i
    ],
    
    // REMOVE/SELL patterns
    remove: [
      // "delete 100 shares of AAPL" - partial quantity removal
      /(?:delete|remove|sell)\s+(\d+)\s+(?:shares?\s+of\s+)?([A-Z]{1,5})/i,
      // "sell 50 AAPL shares"
      /(?:sell|remove|delete)\s+(\d+)\s+([A-Z]{1,5})\s+(?:shares?|stocks?)/i,
      // "delete NFLX from my portfolio" - complete removal
      /(?:delete|remove|sell)\s+([A-Z]{1,5})\s+from\s+(?:my\s+)?portfolio/i,
      // "remove all my TSLA holdings" - must be a valid stock symbol, not common words
      /(?:remove|sell|delete)\s+(?:all\s+)?(?:my\s+)?([A-Z]{3,5})\s+(?:holdings?|shares?|stocks?|positions?)/i,
      // "sell all AAPL" - but not common English words like MY
      /(?:sell|remove|delete)\s+(?:all\s+)?([A-Z]{3,5})(?:\s|$)/i,
      // "get rid of my MSFT position"
      /(?:get\s+rid\s+of|remove|delete)\s+(?:my\s+)?([A-Z]{3,5})\s+positions?/i
    ],
    
    // UPDATE patterns
    update: [
      // "update avgCost of my SPY stock to 452"
      /(?:update|change|set)\s+(?:avgcost|avg\s+cost|price)\s+of\s+(?:my\s+)?([A-Z]{1,5})\s+(?:stock\s+)?to\s+\$?(\d+(?:\.\d+)?)/i,
      // "change my GOOGL position to 100 shares"
      /(?:update|change|set)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:position|quantity|shares?)\s+to\s+(\d+)/i,
      // "set TSLA quantity to 75"
      /(?:set|update|change)\s+([A-Z]{1,5})\s+(?:quantity|shares?)\s+to\s+(\d+)/i,
      // "update AAPL price to $145"
      /(?:update|change|set)\s+([A-Z]{1,5})\s+(?:price|avgcost|avg\s+cost)\s+to\s+\$?(\d+(?:\.\d+)?)/i
    ],
    
    // SHOW/VIEW patterns
    show: [
      // "show my AAPL position"
      /(?:show|display|tell\s+me|what'?s)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:position|holding|allocation|shares?)/i,
      // "what's my TSLA holding" or "what's my TSLA holdings"
      /(?:what'?s|how\s+much)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:holdings?|positions?|do\s+i\s+have)/i,
      // "display my SPY allocation" or "display my SPY allocations"
      /(?:display|show)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:allocations?|positions?|holdings?)/i,
      // "how much GOOGL do I have"
      /(?:how\s+much|how\s+many)\s+([A-Z]{1,5})\s+(?:do\s+i\s+have|shares?|stocks?)/i,
      // "what are my AAPL positions" - specific asset query (must not be just "my")
      /(?:what\s+are|what'?s)\s+(?:my\s+)?([A-Z]{2,5})\s+(?:positions?|holdings?)/i,
      // "show my AAPL and TSLA positions" - captures first symbol only
      /(?:show|display|tell\s+me)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:and|&)\s+[A-Z]{1,5}\s+(?:positions?|holdings?)/i,
      // "show all my positions" - portfolio overview
      /(?:show|display|list|tell\s+me)\s+(?:all\s+)?(?:my\s+)?(?:positions|holdings|stocks?|shares?|assets?|portfolio)/i,
      // "show me all my assets"
      /(?:show\s+me|tell\s+me)\s+(?:all\s+)?(?:my\s+)?(?:positions|holdings|stocks?|shares?|assets?|portfolio)/i,
      // "what are my holdings" - portfolio overview (not specific asset)
      /(?:what\s+are|what'?s\s+in)\s+(?:my\s+)(?:portfolio|holdings|positions)(?!\s+[A-Z]{1,5})/i,
      // "list my portfolio"
      /(?:list|show\s+me)\s+(?:my\s+)?portfolio/i,
      // "my portfolio overview"
      /(?:my\s+)?portfolio\s+(?:overview|summary|breakdown)/i
    ]
  };

  // Portfolio name patterns
  private static readonly PORTFOLIO_PATTERNS = [
    /(?:in|from|to)\s+(?:my\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*'?s?)\s+portfolio/i,
    /(?:in|from|to)\s+(main|default|primary|my|ours)\s+portfolio/i,
    /(?:in|from|to)\s+portfolio\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    // Handle "my portfolio" directly
    /(?:my|my\s+own)\s+portfolio/i
  ];

  // Company name to stock symbol mapping
  private static readonly COMPANY_TO_SYMBOL = {
    'nvidia': 'NVDA',
    'apple': 'AAPL',
    'microsoft': 'MSFT',
    'google': 'GOOGL',
    'alphabet': 'GOOGL',
    'amazon': 'AMZN',
    'tesla': 'TSLA',
    'meta': 'META',
    'facebook': 'META',
    'netflix': 'NFLX',
    'advanced micro devices': 'AMD',
    'intel': 'INTC',
    'walmart': 'WMT',
    'disney': 'DIS',
    'coca cola': 'KO',
    'pepsi': 'PEP',
    'mcdonalds': 'MCD',
    'starbucks': 'SBUX',
    'nike': 'NKE',
    'boeing': 'BA'
  };

  static analyzeQuery(query: string): TriageResult {
    const trimmedQuery = query.trim();
    
    // Check for regexp matches
    const regexpMatch = this.findRegexpMatch(trimmedQuery);
    
    if (regexpMatch && regexpMatch.confidence > 0.7) {
      return {
        isRegexpMatch: true,
        regexpMatch,
        shouldUseLLM: false,
        confidence: regexpMatch.confidence,
        processingType: 'regexp'
      };
    }
    
    // Check for hybrid scenarios (regexp match but missing info or low confidence)
    if (regexpMatch && (regexpMatch.confidence > 0.5 || this.needsHybridProcessing(regexpMatch, trimmedQuery))) {
      return {
        isRegexpMatch: true,
        regexpMatch,
        shouldUseLLM: true,
        confidence: regexpMatch.confidence,
        processingType: 'hybrid'
      };
    }
    
    // Default to LLM processing
    return {
      isRegexpMatch: false,
      shouldUseLLM: true,
      confidence: 0,
      processingType: 'llm'
    };
  }

  private static findRegexpMatch(query: string): RegexpMatch | null {
    // Special handling for show patterns - check portfolio overview patterns first
    if (this.PATTERNS.show) {
      // Check portfolio overview patterns first
      const portfolioOverviewPatterns = [
        /(?:show|display|list|tell\s+me)\s+(?:all\s+)?(?:my\s+)?(?:positions|holdings|stocks?|shares?|assets?|portfolio)/i,
        /(?:show\s+me|tell\s+me)\s+(?:all\s+)?(?:my\s+)?(?:positions|holdings|stocks?|shares?|assets?|portfolio)/i,
        /(?:what\s+are|what'?s\s+in)\s+my\s+(?:portfolio|holdings|positions)$/i, // Use $ to ensure end of string
        /(?:list|show\s+me)\s+(?:my\s+)?portfolio/i,
        /(?:my\s+)?portfolio\s+(?:overview|summary|breakdown)/i
      ];
      
      for (const pattern of portfolioOverviewPatterns) {
        const match = query.match(pattern);
        if (match) {
          const regexpMatch = this.buildRegexpMatch('show', match, query);
          if (regexpMatch) {
            return regexpMatch;
          }
        }
      }
      
      // Then check individual asset patterns
      const individualAssetPatterns = [
        /(?:show|display|tell\s+me|what'?s)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:positions?|holdings?|allocations?|shares?)/i,
        /(?:what'?s|how\s+much)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:holdings?|positions?|do\s+i\s+have)/i,
        /(?:display|show)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:allocations?|positions?|holdings?)/i,
        /(?:how\s+much|how\s+many)\s+([A-Z]{1,5})\s+(?:do\s+i\s+have|shares?|stocks?)/i,
        /(?:what\s+are|what'?s)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:positions?|holdings?)/i,
        /(?:show|display|tell\s+me)\s+(?:my\s+)?([A-Z]{1,5})\s+(?:and|&)\s+[A-Z]{1,5}\s+(?:positions?|holdings?)/i
      ];
      
      for (const pattern of individualAssetPatterns) {
        const match = query.match(pattern);
        if (match) {
          const regexpMatch = this.buildRegexpMatch('show', match, query);
          if (regexpMatch) {
            return regexpMatch;
          }
        }
      }
    }
    
    // Try other action types normally
    for (const [action, patterns] of Object.entries(this.PATTERNS)) {
      if (action === 'show') continue; // Already handled above
      
      for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match) {
          const regexpMatch = this.buildRegexpMatch(action as any, match, query);
          if (regexpMatch) {
            return regexpMatch;
          }
        }
      }
    }
    
    return null;
  }

  private static buildRegexpMatch(action: string, match: RegExpMatchArray, query: string): RegexpMatch | null {
    try {
      let symbol = '';
      let quantity: number | undefined;
      let price: number | undefined;
      let avgCost: number | undefined;
      let confidence = 0.8; // Base confidence
      
      // Extract portfolio name
      const portfolioName = this.extractPortfolioName(query);
      
      switch (action) {
        case 'add':
          // Handle different add pattern variations
          if (match[2] && /^[A-Z]{1,5}$/i.test(match[2])) {
            // Pattern: "add 50 AAPL" or "add 50 shares of AAPL"
            symbol = match[2].toUpperCase();
            quantity = parseInt(match[1]) || undefined;
            price = parseFloat(match[3]) || undefined;
          } else if (match[1] && /^[A-Z]{1,5}$/i.test(match[1])) {
            // Pattern: "add some AAPL" or "add AAPL"
            symbol = match[1].toUpperCase();
            quantity = undefined; // No numeric quantity for vague patterns
            price = undefined;
          } else if (match[2] && /^[A-Za-z\s]+$/.test(match[2])) {
            // Pattern: "add 5 Nvidia stocks" - company name with quantity
            symbol = this.convertCompanyToSymbol(match[2]);
            quantity = parseInt(match[1]) || undefined;
            price = parseFloat(match[3]) || undefined;
            confidence = 0.85; // Slightly lower confidence for company names
          } else if (match[1] && /^[A-Za-z\s]+$/.test(match[1])) {
            // Pattern: "add Nvidia" - company name without quantity
            symbol = this.convertCompanyToSymbol(match[1]);
            quantity = undefined;
            price = undefined;
            confidence = 0.7; // Lower confidence for company names without quantity
          }
          avgCost = price; // For add operations, price becomes avgCost
          if (confidence === 0.8) { // Only set default confidence if not already set
            confidence = quantity ? 0.9 : 0.6; // Lower confidence for vague quantities
          }
          break;
          
        case 'remove':
          // Handle different remove pattern variations
          if (match[1] && /^\d+$/.test(match[1]) && match[2]) {
            // Pattern: "delete 100 shares of AAPL" or "sell 50 AAPL shares"
            quantity = parseInt(match[1]);
            symbol = match[2].toUpperCase();
            confidence = 0.9;
          } else if (match[2] && /^[A-Z]{1,5}$/i.test(match[2])) {
            // Pattern: "sell 100 AAPL shares" (quantity first, symbol second)
            quantity = parseInt(match[1]);
            symbol = match[2].toUpperCase();
            confidence = 0.9;
          } else {
            // Pattern: "delete AAPL from portfolio" or "sell all AAPL"
            symbol = match[1]?.toUpperCase() || match[2]?.toUpperCase() || '';
            confidence = 0.9;
          }
          break;
          
        case 'update':
          symbol = match[1]?.toUpperCase() || '';
          // Determine if it's quantity or price update based on the match
          if (match[2] && !isNaN(parseInt(match[2]))) {
            const value = parseFloat(match[2]);
            if (query.toLowerCase().includes('price') || query.toLowerCase().includes('cost')) {
              avgCost = value;
            } else {
              quantity = parseInt(match[2]);
            }
          }
          confidence = 0.85;
          break;
          
        case 'show':
          // Check if this is a portfolio overview query (no specific symbol)
          if (!match[1] || !/^[A-Z]{1,5}$/i.test(match[1])) {
            // Portfolio overview query: "show all my positions", "list my portfolio", etc.
            symbol = 'ALL'; // Special symbol to indicate portfolio overview
            confidence = 0.95;
          } else {
            // Specific asset query: "show my AAPL position"
            symbol = match[1].toUpperCase();
            confidence = 0.9;
          }
          break;
      }
      
      // Validate symbol (basic check) - allow "ALL" for portfolio overview
      if (!symbol || (symbol !== 'ALL' && (symbol.length < 1 || symbol.length > 5))) {
        return null;
      }
      
      // Adjust confidence based on context
      if (portfolioName) confidence += 0.05;
      if (action === 'add' && quantity && price) confidence += 0.05;
      
      return {
        action: action as any,
        symbol,
        quantity,
        price,
        avgCost,
        portfolioName,
        confidence: Math.min(confidence, 1.0),
        rawMatch: match[0]
      };
    } catch (error) {
      console.error('Error building regexp match:', error);
      return null;
    }
  }

  private static extractPortfolioName(query: string): string | undefined {
    for (const pattern of this.PORTFOLIO_PATTERNS) {
      const match = query.match(pattern);
      if (match) {
        // Handle "my portfolio" and "ours portfolio" cases
        if (match[1] && (match[1].toLowerCase() === 'my' || match[1].toLowerCase() === 'ours')) {
          return 'Main Portfolio';
        }
        // Handle existing "my portfolio" pattern (standalone) - this pattern has no capture groups
        if (pattern.source.includes('(?:my|my\\s+own)')) {
          return 'Main Portfolio';
        }
        return match[1] || 'main';
      }
    }
    return undefined;
  }

  // Convert company name to stock symbol
  private static convertCompanyToSymbol(input: string): string {
    const cleanInput = input.toLowerCase().trim();
    return this.COMPANY_TO_SYMBOL[cleanInput] || input.toUpperCase();
  }

  // Check if a query needs hybrid processing (regexp + LLM)
  private static needsHybridProcessing(regexpMatch: RegexpMatch, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    
    switch (regexpMatch.action) {
      case 'add':
        // Need hybrid if missing quantity or vague quantity words
        if (!regexpMatch.quantity || regexpMatch.quantity <= 0) {
          return true;
        }
        // Check for vague quantity indicators
        if (lowerQuery.includes('some') || lowerQuery.includes('few') || lowerQuery.includes('several')) {
          return true;
        }
        break;
        
      case 'update':
        // Need hybrid if missing both quantity and price
        if (!regexpMatch.quantity && !regexpMatch.avgCost) {
          return true;
        }
        // Check for vague update requests
        if (lowerQuery.includes('positions') || lowerQuery.includes('holdings')) {
          return true;
        }
        break;
        
      case 'remove':
        // Check for vague removal requests
        if (lowerQuery.includes('underperforming') || lowerQuery.includes('losing') || lowerQuery.includes('bad')) {
          return true;
        }
        break;
        
      case 'show':
        // Most show operations are fine with regexp
        break;
    }
    
    return false;
  }

  // Helper method to generate user-friendly confirmation messages
  static generateConfirmationMessage(regexpMatch: RegexpMatch, success: boolean): string {
    const { action, symbol, quantity, avgCost, portfolioName } = regexpMatch;
    const portfolio = portfolioName || 'main';
    
    if (!success) {
      return `Failed to ${action} ${symbol} in ${portfolio} portfolio`;
    }
    
    switch (action) {
      case 'add':
        const shares = quantity ? `${quantity} shares of ` : '';
        const atPrice = avgCost ? ` at ${formatCurrency(avgCost)}` : '';
        return `Added ${shares}${symbol}${atPrice} to ${portfolio} portfolio`;
        
      case 'remove':
        return `Removed ${symbol} from ${portfolio} portfolio`;
        
      case 'update':
        if (quantity) {
          return `Updated ${symbol} quantity to ${quantity} shares in ${portfolio} portfolio`;
        } else if (avgCost) {
          return `Updated ${symbol} average cost to ${formatCurrency(avgCost)} in ${portfolio} portfolio`;
        }
        return `Updated ${symbol} in ${portfolio} portfolio`;
        
      case 'show':
        if (symbol === 'ALL') {
          return `Showing all positions from ${portfolio} portfolio`;
        }
        return `Showing ${symbol} position from ${portfolio} portfolio`;
        
      default:
        return `Processed ${symbol} in ${portfolio} portfolio`;
    }
  }
}