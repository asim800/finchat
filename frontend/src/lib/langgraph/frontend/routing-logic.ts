// ============================================================================
// FILE: lib/langgraph/frontend/routing-logic.ts
// Smart routing logic for complexity detection
// ============================================================================

import { RoutingDecision, RoutingDecisionSchema } from '../shared/state-schemas';

export interface AnalysisContext {
  userId?: string;
  isGuestMode: boolean;
  hasPortfolioData: boolean;
  sessionHistory: string[];
  currentProvider?: string;
}

/**
 * Analyzes query complexity to determine if it should be handled 
 * on frontend (simple) or backend (complex)
 */
export const analyzeComplexity = async (
  input: string, 
  context: AnalysisContext
): Promise<RoutingDecision> => {
  const lowerInput = input.toLowerCase().trim();
  
  // Feature detection for complexity scoring
  const features = {
    // Portfolio operations that require backend processing
    hasPortfolioOperations: detectPortfolioOperations(lowerInput),
    
    // Queries that require LLM processing
    requiresLLM: detectLLMRequirement(lowerInput),
    
    // Queries that need external data sources
    needsExternalData: detectExternalDataNeeds(lowerInput),
    
    // Queries requiring complex calculations
    requiresCalculation: detectCalculationNeeds(lowerInput),
    
    // Multi-step or complex queries
    isMultiStep: detectMultiStepQuery(lowerInput),
    
    // File upload operations
    hasFileUpload: detectFileUpload(lowerInput),
    
    // Simple queries that can be handled locally
    isSimpleQuery: detectSimpleQuery(lowerInput)
  };

  // Calculate complexity score
  const complexityFactors = [
    features.hasPortfolioOperations ? 0.3 : 0,
    features.requiresLLM ? 0.25 : 0,
    features.needsExternalData ? 0.2 : 0,
    features.requiresCalculation ? 0.2 : 0,
    features.isMultiStep ? 0.15 : 0,
    features.hasFileUpload ? 0.1 : 0
  ];
  
  // Simple queries reduce complexity
  const complexityScore = features.isSimpleQuery 
    ? Math.max(0, complexityFactors.reduce((a, b) => a + b, 0) - 0.4)
    : complexityFactors.reduce((a, b) => a + b, 0);

  // Determine routing decision
  const threshold = context.isGuestMode ? 0.4 : 0.3; // Guest mode stays frontend more
  const routeTo = complexityScore > threshold ? 'backend' : 'frontend';
  
  // Confidence calculation
  const confidence = Math.abs(complexityScore - threshold) + 0.5;
  const clampedConfidence = Math.min(1, Math.max(0.1, confidence));

  const decision: RoutingDecision = {
    routeTo,
    confidence: clampedConfidence,
    reasoning: features,
    complexityScore
  };

  // Validate the decision
  return RoutingDecisionSchema.parse(decision);
};

/**
 * Detect portfolio operations (add, remove, update, show)
 */
function detectPortfolioOperations(input: string): boolean {
  const portfolioPatterns = [
    // Add/Buy operations
    /(?:add|buy|purchase)\s+.*?(?:shares?|stocks?|positions?)/i,
    /(?:bought|added|purchased)\s+\d+.*?(?:[A-Z]{1,5})/i,
    
    // Remove/Sell operations
    /(?:sell|remove|delete)\s+.*?(?:shares?|stocks?|positions?|holdings?)/i,
    /(?:sold|removed|deleted)\s+.*?(?:[A-Z]{1,5})/i,
    
    // Update operations
    /(?:update|change|set)\s+.*?(?:quantity|price|avgcost|position)/i,
    
    // Show specific positions (complex queries)
    /show\s+.*?(?:allocation|breakdown|analysis)/i
  ];
  
  return portfolioPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect if query requires LLM processing
 */
function detectLLMRequirement(input: string): boolean {
  const llmKeywords = [
    // Analysis and insights
    'analyze', 'analysis', 'recommend', 'suggestion', 'should i',
    'what do you think', 'opinion', 'strategy', 'plan',
    
    // Complex questions
    'why', 'how does', 'explain', 'compare', 'pros and cons',
    'best practices', 'optimize', 'improve',
    
    // Market insights
    'market sentiment', 'market outlook', 'economic impact',
    'investment thesis', 'future prospects'
  ];
  
  return llmKeywords.some(keyword => input.includes(keyword));
}

/**
 * Detect if query needs external data
 */
function detectExternalDataNeeds(input: string): boolean {
  const externalDataKeywords = [
    // Market data
    'current price', 'market price', 'stock price', 'latest price',
    'market data', 'real-time', 'live data',
    
    // News and sentiment
    'news', 'headlines', 'sentiment', 'market sentiment',
    'recent developments', 'latest updates',
    
    // Economic data
    'economic indicators', 'gdp', 'inflation', 'interest rates',
    'federal reserve', 'earnings', 'financial reports'
  ];
  
  return externalDataKeywords.some(keyword => input.includes(keyword));
}

/**
 * Detect if query requires complex calculations
 */
function detectCalculationNeeds(input: string): boolean {
  const calculationKeywords = [
    // Risk metrics
    'risk', 'volatility', 'var', 'value at risk', 'beta', 'alpha',
    'sharpe ratio', 'risk-adjusted', 'standard deviation',
    
    // Performance metrics
    'performance', 'returns', 'total return', 'annualized return',
    'cagr', 'compound annual growth',
    
    // Portfolio analysis
    'diversification', 'correlation', 'optimization', 'monte carlo',
    'backtesting', 'simulation', 'modeling'
  ];
  
  return calculationKeywords.some(keyword => input.includes(keyword));
}

/**
 * Detect multi-step or complex queries
 */
function detectMultiStepQuery(input: string): boolean {
  // Check for multiple sentences or complex structures
  const sentences = input.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) return true;
  
  // Check for multiple clauses
  const clauses = input.split(/\s+(?:and|then|also|additionally|furthermore)\s+/i);
  if (clauses.length > 1) return true;
  
  // Check for conditional language
  const conditionalPatterns = [
    /if\s+.*?then/i,
    /assuming\s+.*?what/i,
    /given\s+.*?how/i,
    /considering\s+.*?should/i
  ];
  
  return conditionalPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect file upload operations
 */
function detectFileUpload(input: string): boolean {
  const fileKeywords = [
    'upload', 'file', 'csv', 'excel', 'spreadsheet', 'document',
    'import', 'load data', 'attach', 'browse file'
  ];
  
  return fileKeywords.some(keyword => input.includes(keyword));
}

/**
 * Detect simple queries that can be handled on frontend
 */
function detectSimpleQuery(input: string): boolean {
  const simplePatterns = [
    // Simple greetings
    /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))\.?$/i,
    
    // Simple portfolio queries
    /^(?:show|display|list)\s+(?:my\s+)?portfolio$/i,
    /^(?:show|display)\s+(?:my\s+)?(?:[A-Z]{1,5})\s+(?:position|holding)$/i,
    
    // Basic UI interactions
    /^(?:help|clear|reset|refresh)$/i,
    
    // Simple definitions (cached responses)
    /^what\s+is\s+(?:a\s+)?(?:stock|bond|etf|mutual\s+fund|dividend)(?:\?)?$/i
  ];
  
  return simplePatterns.some(pattern => pattern.test(input));
}

/**
 * Get human-readable explanation of routing decision
 */
export const explainRoutingDecision = (decision: RoutingDecision): string => {
  const { routeTo, reasoning, complexityScore } = decision;
  
  const activeReasons = Object.entries(reasoning)
    .filter(([_, value]) => value)
    .map(([key, _]) => formatReason(key));
  
  if (routeTo === 'frontend') {
    return `Handling locally (complexity: ${(complexityScore * 100).toFixed(0)}%) - ${
      activeReasons.length > 0 
        ? `Quick response for: ${activeReasons.join(', ')}`
        : 'Simple query, instant response'
    }`;
  } else {
    return `Routing to backend (complexity: ${(complexityScore * 100).toFixed(0)}%) - ${
      activeReasons.join(', ')
    }`;
  }
};

function formatReason(key: string): string {
  const reasonMap: Record<string, string> = {
    hasPortfolioOperations: 'portfolio changes',
    requiresLLM: 'AI analysis',
    needsExternalData: 'market data',
    requiresCalculation: 'complex calculations',
    isMultiStep: 'multi-step workflow',
    hasFileUpload: 'file processing',
    isSimpleQuery: 'simple Q&A'
  };
  
  return reasonMap[key] || key;
}