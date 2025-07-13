// ============================================================================
// FILE: lib/langgraph/feature-flags.ts
// Feature flags for LangGraph gradual rollout
// ============================================================================

export interface LangGraphFeatureFlags {
  enabled: boolean;
  frontendProcessing: boolean;
  backendProcessing: boolean;
  streamingSupport: boolean;
  complexityAnalysis: boolean;
  agentCoordination: boolean;
  rolloutPercentage: number;
  debugMode: boolean;
}

/**
 * Get LangGraph feature flags from environment variables
 */
export const getLangGraphFeatureFlags = (): LangGraphFeatureFlags => {
  // Default configuration
  const defaults: LangGraphFeatureFlags = {
    enabled: false,
    frontendProcessing: true,
    backendProcessing: true,
    streamingSupport: true,
    complexityAnalysis: true,
    agentCoordination: true,
    rolloutPercentage: 0,
    debugMode: false
  };

  // Override with environment variables
  return {
    enabled: process.env.NEXT_PUBLIC_LANGGRAPH_ENABLED === 'true',
    frontendProcessing: process.env.NEXT_PUBLIC_LANGGRAPH_FRONTEND !== 'false',
    backendProcessing: process.env.NEXT_PUBLIC_LANGGRAPH_BACKEND !== 'false',
    streamingSupport: process.env.NEXT_PUBLIC_LANGGRAPH_STREAMING !== 'false',
    complexityAnalysis: process.env.NEXT_PUBLIC_LANGGRAPH_COMPLEXITY !== 'false',
    agentCoordination: process.env.NEXT_PUBLIC_LANGGRAPH_AGENTS !== 'false',
    rolloutPercentage: parseInt(process.env.NEXT_PUBLIC_LANGGRAPH_ROLLOUT || '0', 10),
    debugMode: process.env.NEXT_PUBLIC_LANGGRAPH_DEBUG === 'true'
  };
};

/**
 * Check if LangGraph should be used for a specific user/session
 */
export const shouldUseLangGraph = (
  userId?: string,
  guestSessionId?: string,
  forceEnable = false
): boolean => {
  const flags = getLangGraphFeatureFlags();
  
  // Always enabled if forced
  if (forceEnable) {
    return true;
  }
  
  // Not enabled globally
  if (!flags.enabled) {
    return false;
  }
  
  // 100% rollout
  if (flags.rolloutPercentage >= 100) {
    return true;
  }
  
  // 0% rollout
  if (flags.rolloutPercentage <= 0) {
    return false;
  }
  
  // Percentage-based rollout using deterministic hash
  const identifier = userId || guestSessionId || 'anonymous';
  const hash = simpleHash(identifier);
  const userPercentage = hash % 100;
  
  return userPercentage < flags.rolloutPercentage;
};

/**
 * Check if a specific LangGraph feature is enabled
 */
export const isLangGraphFeatureEnabled = (feature: keyof LangGraphFeatureFlags): boolean => {
  const flags = getLangGraphFeatureFlags();
  return flags.enabled && flags[feature] === true;
};

/**
 * Get debug information about LangGraph configuration
 */
export const getLangGraphDebugInfo = () => {
  const flags = getLangGraphFeatureFlags();
  
  return {
    flags,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      LANGGRAPH_ENABLED: process.env.NEXT_PUBLIC_LANGGRAPH_ENABLED,
      LANGGRAPH_ROLLOUT: process.env.NEXT_PUBLIC_LANGGRAPH_ROLLOUT,
      LANGGRAPH_DEBUG: process.env.NEXT_PUBLIC_LANGGRAPH_DEBUG
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Simple hash function for deterministic percentage rollout
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Feature flag middleware for API routes
 */
export const withLangGraphFeatureFlag = (
  handler: Function,
  fallbackHandler: Function
) => {
  return async (request: any, ...args: any[]) => {
    const flags = getLangGraphFeatureFlags();
    
    // Extract user identifier from request
    const userId = request.userId || request.body?.userId;
    const guestSessionId = request.body?.guestSessionId;
    const forceEnable = request.body?.forceLangGraph || 
                       request.headers?.['x-force-langgraph'] === 'true';
    
    if (shouldUseLangGraph(userId, guestSessionId, forceEnable)) {
      if (flags.debugMode) {
        console.log('🔧 Using LangGraph for request:', {
          userId,
          guestSessionId,
          forceEnable,
          rolloutPercentage: flags.rolloutPercentage
        });
      }
      return handler(request, ...args);
    } else {
      if (flags.debugMode) {
        console.log('📞 Using legacy chat for request:', {
          userId,
          guestSessionId,
          rolloutPercentage: flags.rolloutPercentage
        });
      }
      return fallbackHandler(request, ...args);
    }
  };
};

/**
 * React hook for feature flag checking
 */
export const useLangGraphFeatureFlags = () => {
  const flags = getLangGraphFeatureFlags();
  
  return {
    flags,
    isEnabled: flags.enabled,
    shouldUseLangGraph: (userId?: string, guestSessionId?: string, forceEnable = false) =>
      shouldUseLangGraph(userId, guestSessionId, forceEnable),
    isFeatureEnabled: isLangGraphFeatureEnabled,
    debugInfo: flags.debugMode ? getLangGraphDebugInfo() : null
  };
};