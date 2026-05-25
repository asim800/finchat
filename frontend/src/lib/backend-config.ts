// Configuration for the FastAPI analysis backend.
// (A second MCP backend was removed; FastAPI is now the only analysis backend.)

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
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';

    const primaryBackend: BackendType = 'fastapi';
    const fallbackEnabled = process.env.ENABLE_BACKEND_FALLBACK === 'true';
    const fastApiUrl = process.env.FASTAPI_SERVICE_URL || 'http://localhost:8000';

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
        healthCheckUrl: `${fastApiUrl}/health`,
        fallbackEnabled
      },
      fallback: {
        type: 'fastapi',
        enabled: fallbackEnabled,
        healthCheckUrl: `${fastApiUrl}/health`,
        fallbackEnabled: false
      }
    };
  }

  getPrimaryBackend(): BackendConfig {
    return this.config.primary;
  }

  getFallbackBackend(): BackendConfig {
    return this.config.fallback;
  }

  isFallbackEnabled(): boolean {
    return this.config.primary.fallbackEnabled && this.config.fallback.enabled;
  }

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

export const backendConfig = new BackendConfigManager();

export const logBackendSelection = (backend: BackendType, reason: string) => {
  console.log(`🔧 Using ${backend.toUpperCase()} backend: ${reason}`);
};
