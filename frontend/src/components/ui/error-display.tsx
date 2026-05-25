// Error display components with recovery actions

'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { AppError, ErrorSystem, RecoveryAction } from '@/lib/error-system';

interface ErrorDisplayProps {
  error: AppError;
  onDismiss?: () => void;
  variant?: 'alert' | 'card' | 'toast';
  className?: string;
}

const getSeverityColor = (severity: AppError['severity']) => {
  switch (severity) {
    case 'low': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900';
    case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-900';
    case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900';
    case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900';
    default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700';
  }
};

const getSeverityIcon = (severity: AppError['severity']) => {
  switch (severity) {
    case 'low': return <Info className="h-5 w-5" />;
    case 'medium': return <AlertCircle className="h-5 w-5" />;
    case 'high': return <AlertTriangle className="h-5 w-5" />;
    case 'critical': return <AlertTriangle className="h-5 w-5" />;
    default: return <AlertCircle className="h-5 w-5" />;
  }
};

const getActionVariantClass = (variant?: RecoveryAction['variant']) => {
  switch (variant) {
    case 'primary': return 'bg-blue-600 hover:bg-blue-700 text-white';
    case 'destructive': return 'bg-red-600 hover:bg-red-700 text-white';
    case 'secondary': 
    default: return 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700';
  }
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  variant = 'alert',
  className = ''
}) => {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

  const handleAction = async (action: RecoveryAction, actionId: string) => {
    setIsExecuting(actionId);
    try {
      await action.action();
    } catch (err) {
      console.error('Recovery action failed:', err);
    } finally {
      setIsExecuting(null);
    }
  };

  if (variant === 'card') {
    return (
      <Card className={`${getSeverityColor(error.severity)} ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {getSeverityIcon(error.severity)}
              <CardTitle className="text-lg">{error.message}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {error.severity.toUpperCase()}
              </Badge>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-auto p-1 hover:bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {error.description && (
            <p className="text-sm mb-4 opacity-80">{error.description}</p>
          )}
          
          {error.context && Object.keys(error.context).length > 0 && (
            <div className="mb-4 p-3 bg-white/50 rounded border text-xs">
              <div className="font-medium mb-1">Details:</div>
              {Object.entries(error.context).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {error.recoveryActions.map((action, index) => {
              const actionId = `${error.id}_${index}`;
              return (
                <Button
                  key={index}
                  onClick={() => handleAction(action, actionId)}
                  disabled={isExecuting === actionId}
                  className={`min-h-[44px] text-sm ${getActionVariantClass(action.variant)}`}
                  size="sm"
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {isExecuting === actionId ? 'Working...' : action.label}
                </Button>
              );
            })}
          </div>

          <div className="mt-3 text-xs opacity-60">
            {error.timestamp.toLocaleString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Alert variant (default)
  return (
    <Alert className={`${getSeverityColor(error.severity)} ${className}`}>
      <div className="flex items-start space-x-3">
        {getSeverityIcon(error.severity)}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <AlertDescription className="font-medium text-base">
              {error.message}
            </AlertDescription>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-auto p-1 hover:bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {error.description && (
            <AlertDescription className="text-sm opacity-80">
              {error.description}
            </AlertDescription>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {error.recoveryActions.map((action, index) => {
              const actionId = `${error.id}_${index}`;
              return (
                <Button
                  key={index}
                  onClick={() => handleAction(action, actionId)}
                  disabled={isExecuting === actionId}
                  variant={action.variant === 'primary' ? 'default' : 'outline'}
                  size="sm"
                  className="min-h-[44px] text-sm"
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {isExecuting === actionId ? 'Working...' : action.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </Alert>
  );
};

// Error container that shows all active errors
export const ErrorContainer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  useEffect(() => {
    const unsubscribe = ErrorSystem.subscribe(setErrors);
    setErrors(ErrorSystem.getErrors());
    return unsubscribe;
  }, []);

  if (errors.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {errors.map((error) => (
        <ErrorDisplay
          key={error.id}
          error={error}
          onDismiss={() => ErrorSystem.removeError(error.id)}
          variant="card"
        />
      ))}
    </div>
  );
};

// Hook for using the error system
export const useErrorSystem = () => {
  const [errors, setErrors] = useState<AppError[]>([]);

  useEffect(() => {
    const unsubscribe = ErrorSystem.subscribe(setErrors);
    setErrors(ErrorSystem.getErrors());
    return unsubscribe;
  }, []);

  return {
    errors,
    addError: ErrorSystem.addError.bind(ErrorSystem),
    removeError: ErrorSystem.removeError.bind(ErrorSystem),
    clearErrors: ErrorSystem.clearErrors.bind(ErrorSystem),
    createError: ErrorSystem.createError.bind(ErrorSystem),
    showNetworkError: ErrorSystem.showNetworkError.bind(ErrorSystem),
    showAssetAddError: ErrorSystem.showAssetAddError.bind(ErrorSystem),
    showAuthError: ErrorSystem.showAuthError.bind(ErrorSystem),
    showValidationError: ErrorSystem.showValidationError.bind(ErrorSystem)
  };
};

// Success notification component
interface SuccessNotificationProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  message,
  onDismiss,
  className = ''
}) => {
  return (
    <Alert className={`text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900 ${className}`}>
      <div className="flex items-center space-x-3">
        <CheckCircle className="h-5 w-5" />
        <AlertDescription className="font-medium flex-1">
          {message}
        </AlertDescription>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-1 hover:bg-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
};
