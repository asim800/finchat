// ============================================================================
// FILE: components/ui/form-fields/password-form-field.tsx
// Enhanced password input with strength indicator and validation
// ============================================================================

'use client';

import React, { useState } from 'react';
import { StandardFormField } from './standard-form-field';
import { ValidationFieldProps } from './index';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFormFieldProps extends ValidationFieldProps {
  showStrengthIndicator?: boolean;
  showToggleVisibility?: boolean;
  confirmPassword?: boolean;
  originalPassword?: string;
}

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  requirements: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export const PasswordFormField: React.FC<PasswordFormFieldProps> = ({
  value,
  onChange,
  suggestions = [],
  showStrengthIndicator = true,
  showToggleVisibility = true,
  confirmPassword = false,
  originalPassword,
  helpText,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // Calculate password strength
  const passwordStrength = React.useMemo((): PasswordStrength => {
    const password = (value as string) || '';
    
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    
    let label = 'Very Weak';
    let color = 'bg-red-500';
    
    if (score >= 4) {
      label = 'Strong';
      color = 'bg-green-500';
    } else if (score >= 3) {
      label = 'Good';
      color = 'bg-yellow-500';
    } else if (score >= 2) {
      label = 'Fair';
      color = 'bg-orange-500';
    } else if (score >= 1) {
      label = 'Weak';
      color = 'bg-red-400';
    }

    return { score, label, color, requirements };
  }, [value]);

  // Enhanced suggestions based on password requirements
  const enhancedSuggestions = React.useMemo(() => {
    const baseSuggestions = [...suggestions];
    const password = (value as string) || '';
    
    if (password.length > 0 && showStrengthIndicator) {
      if (!passwordStrength.requirements.length) {
        baseSuggestions.push('Use at least 8 characters');
      }
      if (!passwordStrength.requirements.lowercase) {
        baseSuggestions.push('Add at least one lowercase letter (a-z)');
      }
      if (!passwordStrength.requirements.uppercase) {
        baseSuggestions.push('Add at least one uppercase letter (A-Z)');
      }
      if (!passwordStrength.requirements.number) {
        baseSuggestions.push('Add at least one number (0-9)');
      }
      if (!passwordStrength.requirements.special) {
        baseSuggestions.push('Add at least one special character (!@#$%^&*)');
      }
    }

    if (confirmPassword && originalPassword && password && password !== originalPassword) {
      baseSuggestions.push('Passwords must match');
    }
    
    return baseSuggestions;
  }, [suggestions, value, passwordStrength, confirmPassword, originalPassword, showStrengthIndicator]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const enhancedHelpText = React.useMemo(() => {
    if (confirmPassword) {
      return helpText || 'Re-enter your password to confirm';
    }
    if (showStrengthIndicator) {
      return helpText || 'Use at least 8 characters with a mix of letters, numbers, and symbols';
    }
    return helpText;
  }, [helpText, confirmPassword, showStrengthIndicator]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <StandardFormField
          {...props}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleInputChange}
          suggestions={enhancedSuggestions}
          helpText={enhancedHelpText}
          autoComplete={confirmPassword ? 'new-password' : 'current-password'}
          className={showToggleVisibility ? 'pr-12' : undefined}
        />
        
        {/* Password Toggle Button */}
        {showToggleVisibility && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-8 h-8 w-8 p-0 hover:bg-transparent"
            onClick={togglePasswordVisibility}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        )}
      </div>

      {/* Password Strength Indicator */}
      {showStrengthIndicator && !confirmPassword && value && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium text-gray-600 min-w-16">
              {passwordStrength.label}
            </span>
          </div>
          
          {/* Requirements Checklist */}
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(passwordStrength.requirements).map(([key, met]) => {
              const labels = {
                length: '8+ characters',
                lowercase: 'Lowercase',
                uppercase: 'Uppercase', 
                number: 'Number',
                special: 'Special char'
              };
              
              return (
                <div key={key} className={`flex items-center space-x-1 ${met ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${met ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>{labels[key as keyof typeof labels]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};