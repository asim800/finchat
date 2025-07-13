// ============================================================================
// FILE: lib/error-system.ts
// Comprehensive error system with recovery actions
// ============================================================================

export interface RecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'destructive';
  icon?: string;
}

export interface AppError {
  id: string;
  code: string;
  message: string;
  description?: string;
  context?: Record<string, any>;
  recoveryActions: RecoveryAction[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  userFriendly: boolean;
  persistent?: boolean; // Whether error should persist across page reloads
}

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_EXPIRED'
  | 'AUTH_FAILED'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'ASSET_ADD_FAILED'
  | 'ASSET_UPDATE_FAILED'
  | 'ASSET_DELETE_FAILED'
  | 'PORTFOLIO_LOAD_FAILED'
  | 'PRICE_FETCH_FAILED'
  | 'CHAT_API_FAILED'
  | 'CHAT_HISTORY_FAILED'
  | 'FILE_UPLOAD_FAILED'
  | 'EXPORT_FAILED'
  | 'GUEST_SESSION_EXPIRED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

class ErrorSystemClass {
  private errors: Map<string, AppError> = new Map();
  private listeners: Array<(errors: AppError[]) => void> = [];

  // Generate unique error ID
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create error with recovery actions
  createError(config: {
    code: ErrorCode;
    message: string;
    description?: string;
    context?: Record<string, any>;
    severity?: AppError['severity'];
    persistent?: boolean;
    customRecoveryActions?: RecoveryAction[];
  }): AppError {
    const { code, message, description, context, severity = 'medium', persistent = false, customRecoveryActions } = config;
    
    const error: AppError = {
      id: this.generateErrorId(),
      code,
      message,
      description,
      context,
      severity,
      timestamp: new Date(),
      userFriendly: true,
      persistent,
      recoveryActions: customRecoveryActions || this.getDefaultRecoveryActions(code, context)
    };

    return error;
  }

  // Get default recovery actions based on error code
  private getDefaultRecoveryActions(code: ErrorCode, context?: Record<string, any>): RecoveryAction[] {
    switch (code) {
      case 'NETWORK_ERROR':
        return [
          {
            label: 'Try Again',
            action: () => window.location.reload(),
            variant: 'primary',
            icon: '🔄'
          },
          {
            label: 'Check Connection',
            action: () => window.open('https://www.google.com', '_blank'),
            variant: 'secondary',
            icon: '🌐'
          }
        ];

      case 'AUTH_EXPIRED':
        return [
          {
            label: 'Sign In Again',
            action: () => window.location.href = '/login',
            variant: 'primary',
            icon: '🔑'
          },
          {
            label: 'Continue as Guest',
            action: () => window.location.href = '/dashboard/chat',
            variant: 'secondary',
            icon: '👤'
          }
        ];

      case 'AUTH_FAILED':
        return [
          {
            label: 'Try Again',
            action: () => window.location.reload(),
            variant: 'primary'
          },
          {
            label: 'Reset Password',
            action: () => window.location.href = '/reset-password',
            variant: 'secondary'
          },
          {
            label: 'Create Account',
            action: () => window.location.href = '/register',
            variant: 'secondary'
          }
        ];

      case 'ASSET_ADD_FAILED':
        return [
          {
            label: 'Try Again',
            action: context?.retryAction || (() => {}),
            variant: 'primary',
            icon: '🔄'
          },
          {
            label: 'Save as Draft',
            action: context?.saveDraftAction || (() => {
              const draftData = context?.assetData;
              if (draftData) {
                localStorage.setItem('asset_draft', JSON.stringify(draftData));
                this.showSuccess('Asset saved as draft. You can continue later.');
              }
            }),
            variant: 'secondary',
            icon: '💾'
          },
          {
            label: 'Contact Support',
            action: () => window.location.href = '/contact',
            variant: 'secondary',
            icon: '💬'
          }
        ];

      case 'PORTFOLIO_LOAD_FAILED':
        return [
          {
            label: 'Refresh',
            action: context?.retryAction || (() => window.location.reload()),
            variant: 'primary',
            icon: '🔄'
          },
          {
            label: 'View Cached Data',
            action: context?.viewCachedAction || (() => {}),
            variant: 'secondary',
            icon: '💾'
          },
          {
            label: 'Start Fresh',
            action: () => {
              localStorage.clear();
              window.location.href = '/dashboard/myportfolio';
            },
            variant: 'secondary'
          }
        ];

      case 'CHAT_API_FAILED':
        return [
          {
            label: 'Try Again',
            action: context?.retryAction || (() => {}),
            variant: 'primary',
            icon: '🔄'
          },
          {
            label: 'Switch Provider',
            action: context?.switchProviderAction || (() => {}),
            variant: 'secondary',
            icon: '🔀'
          },
          {
            label: 'View History',
            action: () => window.location.href = '/dashboard/chat',
            variant: 'secondary'
          }
        ];

      case 'GUEST_SESSION_EXPIRED':
        return [
          {
            label: 'Start New Session',
            action: () => {
              localStorage.removeItem('guest_portfolio');
              window.location.reload();
            },
            variant: 'primary'
          },
          {
            label: 'Create Account',
            action: () => window.location.href = '/register',
            variant: 'secondary',
            icon: '👤'
          }
        ];

      case 'RATE_LIMITED':
        return [
          {
            label: 'Try in 1 Minute',
            action: () => {
              setTimeout(() => {
                if (context?.retryAction) context.retryAction();
              }, 60000);
              this.showInfo('Will retry automatically in 1 minute...');
            },
            variant: 'primary',
            icon: '⏰'
          },
          {
            label: 'Upgrade Account',
            action: () => window.location.href = '/pricing',
            variant: 'secondary',
            icon: '⭐'
          }
        ];

      case 'FILE_UPLOAD_FAILED':
        return [
          {
            label: 'Try Again',
            action: context?.retryAction || (() => {}),
            variant: 'primary'
          },
          {
            label: 'Choose Different File',
            action: context?.chooseFileAction || (() => {}),
            variant: 'secondary'
          },
          {
            label: 'Manual Entry',
            action: context?.manualEntryAction || (() => {}),
            variant: 'secondary'
          }
        ];

      default:
        return [
          {
            label: 'Try Again',
            action: context?.retryAction || (() => window.location.reload()),
            variant: 'primary'
          },
          {
            label: 'Contact Support',
            action: () => window.location.href = '/contact',
            variant: 'secondary'
          }
        ];
    }
  }

  // Add error to system
  addError(error: AppError): void {
    this.errors.set(error.id, error);
    this.notifyListeners();
    
    // Auto-remove low severity errors after 10 seconds
    if (error.severity === 'low') {
      setTimeout(() => {
        this.removeError(error.id);
      }, 10000);
    }
  }

  // Remove error
  removeError(errorId: string): void {
    this.errors.delete(errorId);
    this.notifyListeners();
  }

  // Clear all errors
  clearErrors(): void {
    this.errors.clear();
    this.notifyListeners();
  }

  // Get all active errors
  getErrors(): AppError[] {
    return Array.from(this.errors.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  // Subscribe to error changes
  subscribe(listener: (errors: AppError[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    const errors = this.getErrors();
    this.listeners.forEach(listener => listener(errors));
  }

  // Convenience methods for common error scenarios
  showNetworkError(retryAction?: () => void): string {
    const error = this.createError({
      code: 'NETWORK_ERROR',
      message: 'Connection Problem',
      description: 'Unable to connect to our servers. Please check your internet connection and try again.',
      severity: 'high',
      context: { retryAction }
    });
    this.addError(error);
    return error.id;
  }

  showAssetAddError(assetData: any, retryAction?: () => void): string {
    const error = this.createError({
      code: 'ASSET_ADD_FAILED',
      message: "Couldn't Add Asset",
      description: `We couldn't add ${assetData.symbol} to your portfolio. Your data is safe and you can try again.`,
      severity: 'medium',
      context: { assetData, retryAction }
    });
    this.addError(error);
    return error.id;
  }

  showAuthError(): string {
    const error = this.createError({
      code: 'AUTH_EXPIRED',
      message: 'Session Expired',
      description: 'Your session has expired for security reasons. Please sign in again to continue.',
      severity: 'high',
      persistent: true
    });
    this.addError(error);
    return error.id;
  }

  showValidationError(message: string, field?: string): string {
    const error = this.createError({
      code: 'VALIDATION_ERROR',
      message: 'Invalid Input',
      description: message,
      severity: 'low',
      context: { field },
      customRecoveryActions: [
        {
          label: 'Dismiss',
          action: () => this.removeError(error.id),
          variant: 'secondary'
        }
      ]
    });
    this.addError(error);
    return error.id;
  }

  // Success and info messages
  showSuccess(message: string): void {
    // Could implement success notifications here
    console.log('Success:', message);
  }

  showInfo(message: string): void {
    // Could implement info notifications here
    console.log('Info:', message);
  }
}

export const ErrorSystem = new ErrorSystemClass();