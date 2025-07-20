// ============================================================================
// FILE: lib/backend-config.ts
// Configuration management for choosing between MCP and FastAPI backends
// ============================================================================

export type BackendType = 'fastapi';

export interface BackendConfig {
  type: BackendType;
  enabled: boolean;
  healthCheckUrl?: string;
  fallbackEnabled: boolean;
}

class BackendConfigManager {
  private config: {
    primary: BackendConfig;
    fallback: BackendConfig;
  };

  constructor() {
    // Get configuration from environment variables
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';
    
    // Default to FastAPI in all environments unless explicitly set
    const defaultBackend = 'fastapi';
    const primaryBackend = (process.env.PRIMARY_ANALYSIS_BACKEND || defaultBackend) as BackendType;
    const fallbackEnabled = process.env.ENABLE_BACKEND_FALLBACK === 'true';
    const fastApiUrl = process.env.FASTAPI_SERVICE_URL || 'http://localhost:8000';
    
    // Log configuration for debugging
    console.log('🔧 Backend Configuration:', {
      environment: process.env.NODE_ENV,
      isVercel,
      primaryBackend,
      fallbackEnabled,
      fastApiUrl: isProduction ? '[REDACTED]' : fastApiUrl
    });

    this.config = {
      primary: {
        type: primaryBackend,
        enabled: true,
        healthCheckUrl: primaryBackend === 'fastapi' ? `${fastApiUrl}/health` : undefined,
        fallbackEnabled
      },
      fallback: {
        type: primaryBackend === 'mcp' ? 'fastapi' : 'mcp',
        enabled: fallbackEnabled,
        healthCheckUrl: primaryBackend === 'mcp' ? `${fastApiUrl}/health` : undefined,
        fallbackEnabled: false
      }
    };
  }

  /**
   * Get the primary backend configuration
   */
  getPrimaryBackend(): BackendConfig {
    return this.config.primary;
  }

  /**
   * Get the fallback backend configuration
   */
  getFallbackBackend(): BackendConfig {
    return this.config.fallback;
  }

  /**
   * Check if fallback is enabled
   */
  isFallbackEnabled(): boolean {
    return this.config.primary.fallbackEnabled && this.config.fallback.enabled;
  }

  /**
   * Get configuration for debugging
   */
  getDebugInfo() {
    return {
      primaryBackend: this.config.primary.type,
      fallbackEnabled: this.isFallbackEnabled(),
      fallbackBackend: this.config.fallback.type,
      environment: {
        PRIMARY_ANALYSIS_BACKEND: process.env.PRIMARY_ANALYSIS_BACKEND,
        ENABLE_BACKEND_FALLBACK: process.env.ENABLE_BACKEND_FALLBACK,
        FASTAPI_SERVICE_URL: process.env.FASTAPI_SERVICE_URL
      }
    };
  }
}

// Export singleton instance
export const backendConfig = new BackendConfigManager();

// Utility function to log backend selection
export const logBackendSelection = (backend: BackendType, reason: string) => {
  console.log(`🔧 Using ${backend.toUpperCase()} backend: ${reason}`);
};