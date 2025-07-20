// ============================================================================
// FILE: lib/validation.ts
// Real-time form validation system with specific field errors
// ============================================================================

import { z } from 'zod';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
  dependencies?: string[]; // Fields this validation depends on
}

export interface FieldValidation {
  value: unknown;
  error: string | null;
  touched: boolean;
  valid: boolean;
  rules: ValidationRule;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export interface ValidationState {
  [fieldName: string]: FieldValidation;
}

// Pre-defined validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  stockSymbol: /^[A-Z]{1,5}$/,
  currency: /^\d+(\.\d{1,2})?$/,
  percentage: /^\d+(\.\d{1,4})?$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};

// Asset-specific validation schemas
export const AssetValidationSchemas = {
  basic: {
    assetType: {
      required: true,
      custom: (value: string) => {
        if (!value) return 'Please select an asset type';
        return null;
      }
    },
    symbol: {
      required: true,
      minLength: 1,
      maxLength: 5,
      pattern: ValidationPatterns.stockSymbol,
      custom: (value: string) => {
        if (!value) return null;
        const upper = value.toUpperCase();
        if (upper.length > 5) return 'Symbol must be 5 characters or less';
        if (!/^[A-Z]+$/.test(upper)) return 'Symbol must contain only letters';
        return null;
      }
    },
    quantity: {
      required: true,
      min: 0.01,
      custom: (value: number) => {
        if (!value || value <= 0) return 'Quantity must be greater than 0';
        if (value > 1000000) return 'Quantity seems unusually large';
        
        // Validate decimal precision (max 2 decimal places)
        if (typeof value === 'number' && !Number.isInteger(value * 100)) {
          return 'Quantity can have at most 2 decimal places';
        }
        
        return null;
      }
    },
    avgCost: {
      min: 0,
      custom: (value: number) => {
        if (value && value < 0) return 'Cost cannot be negative';
        if (value && value > 100000) return 'Cost seems unusually high';
        return null;
      }
    }
  },
  
  option: {
    optionType: {
      required: true,
      custom: (value: string) => {
        if (!value) return 'Please select Call or Put';
        if (!['call', 'put'].includes(value.toLowerCase())) {
          return 'Must be either Call or Put';
        }
        return null;
      }
    },
    strikePrice: {
      required: true,
      min: 0.01,
      custom: (value: number) => {
        if (!value || value <= 0) return 'Strike price must be greater than 0';
        if (value > 10000) return 'Strike price seems unusually high';
        return null;
      }
    },
    expirationDate: {
      required: true,
      custom: (value: string) => {
        if (!value) return 'Expiration date is required';
        const expDate = new Date(value);
        const today = new Date();
        if (expDate <= today) return 'Expiration date must be in the future';
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 5);
        if (expDate > maxDate) return 'Expiration date seems too far in the future';
        return null;
      }
    }
  },

  bond: {
    optionType: {
      required: true,
      custom: (value: string) => {
        if (!value) return 'Please select a bond type';
        return null;
      }
    },
    strikePrice: {
      required: true,
      min: 0,
      max: 50,
      custom: (value: number) => {
        if (!value && value !== 0) return 'Coupon rate is required';
        if (value < 0) return 'Coupon rate cannot be negative';
        if (value > 50) return 'Coupon rate seems unusually high (>50%)';
        return null;
      }
    },
    expirationDate: {
      required: true,
      custom: (value: string) => {
        if (!value) return 'Maturity date is required';
        const maturityDate = new Date(value);
        const today = new Date();
        if (maturityDate <= today) return 'Maturity date must be in the future';
        return null;
      }
    }
  }
};

// Authentication validation schemas
export const AuthValidationSchemas = {
  login: {
    email: {
      required: true,
      pattern: ValidationPatterns.email,
      custom: (value: string) => {
        if (!value) return 'Email is required';
        if (!ValidationPatterns.email.test(value)) {
          return 'Please enter a valid email address';
        }
        return null;
      }
    },
    password: {
      required: true,
      minLength: 1,
      custom: (value: string) => {
        if (!value) return 'Password is required';
        return null;
      }
    }
  },

  register: {
    email: {
      required: true,
      pattern: ValidationPatterns.email,
      custom: (value: string) => {
        if (!value) return 'Email is required';
        if (!ValidationPatterns.email.test(value)) {
          return 'Please enter a valid email address';
        }
        return null;
      }
    },
    password: {
      required: true,
      minLength: 8,
      custom: (value: string) => {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
        return null;
      }
    },
    firstName: {
      required: true,
      minLength: 1,
      maxLength: 50,
      custom: (value: string) => {
        if (!value) return 'First name is required';
        if (value.length > 50) return 'First name must be 50 characters or less';
        if (!/^[a-zA-Z\s-']+$/.test(value)) {
          return 'First name can only contain letters, spaces, hyphens, and apostrophes';
        }
        return null;
      }
    },
    lastName: {
      required: true,
      minLength: 1,
      maxLength: 50,
      custom: (value: string) => {
        if (!value) return 'Last name is required';
        if (value.length > 50) return 'Last name must be 50 characters or less';
        if (!/^[a-zA-Z\s-']+$/.test(value)) {
          return 'Last name can only contain letters, spaces, hyphens, and apostrophes';
        }
        return null;
      }
    }
  }
};

class ValidationSystemClass {
  // Validate a single field
  validateField(value: unknown, rules: ValidationRule, _allValues?: Record<string, unknown>): string | null {
    // Required validation
    if (rules.required && (value === null || value === undefined || value === '')) {
      return 'This field is required';
    }

    // Skip other validations if field is empty and not required
    if (!rules.required && (value === null || value === undefined || value === '')) {
      return null;
    }

    // String-based validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        return `Must be at least ${rules.minLength} characters`;
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return `Must be ${rules.maxLength} characters or less`;
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        return 'Invalid format';
      }
    }

    // Number-based validations
    if (typeof value === 'number' || !isNaN(parseFloat(value))) {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (rules.min !== undefined && numValue < rules.min) {
        return `Must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && numValue > rules.max) {
        return `Must be ${rules.max} or less`;
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) return customError;
    }

    return null;
  }

  // Validate entire form
  validateForm(values: Record<string, unknown>, schema: ValidationSchema): ValidationState {
    const state: ValidationState = {};

    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = values[fieldName];
      const error = this.validateField(value, rules, values);
      
      state[fieldName] = {
        value,
        error,
        touched: false,
        valid: error === null,
        rules
      };
    }

    return state;
  }

  // Get validation state for a specific field
  getFieldValidation(fieldName: string, value: unknown, schema: ValidationSchema, allValues?: Record<string, unknown>): FieldValidation {
    const rules = schema[fieldName];
    if (!rules) {
      return {
        value,
        error: null,
        touched: false,
        valid: true,
        rules: {}
      };
    }

    const error = this.validateField(value, rules, allValues);
    return {
      value,
      error,
      touched: false,
      valid: error === null,
      rules
    };
  }

  // Check if entire form is valid
  isFormValid(validationState: ValidationState): boolean {
    return Object.values(validationState).every(field => field.valid);
  }

  // Get all form errors
  getFormErrors(validationState: ValidationState): Record<string, string> {
    const errors: Record<string, string> = {};
    Object.entries(validationState).forEach(([fieldName, validation]) => {
      if (validation.error && validation.touched) {
        errors[fieldName] = validation.error;
      }
    });
    return errors;
  }

  // Get field suggestions for common errors
  getFieldSuggestions(fieldName: string, value: unknown, error: string | null): string[] {
    const suggestions: string[] = [];

    if (fieldName === 'symbol' && error) {
      if (typeof value === 'string') {
        if (value.length > 5) {
          suggestions.push('Try using the main ticker symbol (e.g., "AAPL" instead of "AAPL.US")');
        }
        if (/[a-z]/.test(value)) {
          suggestions.push('Stock symbols are typically in uppercase');
        }
        if (/\d/.test(value)) {
          suggestions.push('Most stock symbols don\'t contain numbers');
        }
      }
    }

    if (fieldName === 'email' && error) {
      if (typeof value === 'string') {
        if (!value.includes('@')) {
          suggestions.push('Email addresses need an @ symbol');
        }
        if (!value.includes('.')) {
          suggestions.push('Email addresses need a domain (e.g., .com, .org)');
        }
        if (value.includes(' ')) {
          suggestions.push('Email addresses cannot contain spaces');
        }
      }
    }

    if (fieldName === 'password' && error) {
      if (typeof value === 'string') {
        if (value.length < 8) {
          suggestions.push('Try adding more characters to reach 8 minimum');
        }
        if (!/(?=.*[a-z])/.test(value)) {
          suggestions.push('Add at least one lowercase letter (a-z)');
        }
        if (!/(?=.*[A-Z])/.test(value)) {
          suggestions.push('Add at least one uppercase letter (A-Z)');
        }
        if (!/(?=.*\d)/.test(value)) {
          suggestions.push('Add at least one number (0-9)');
        }
      }
    }

    return suggestions;
  }
}

// Zod schemas for API validation
export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .regex(/^[a-zA-Z\s-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
});

// Profile validation schema
export const ProfileValidationSchema = {
  firstName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    custom: (value: string) => {
      if (!value) return 'First name is required';
      if (!/^[a-zA-Z\s-']+$/.test(value)) {
        return 'First name can only contain letters, spaces, hyphens, and apostrophes';
      }
      return null;
    }
  },
  lastName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    custom: (value: string) => {
      if (!value) return 'Last name is required';
      if (!/^[a-zA-Z\s-']+$/.test(value)) {
        return 'Last name can only contain letters, spaces, hyphens, and apostrophes';
      }
      return null;
    }
  },
  phone: {
    pattern: ValidationPatterns.phone,
    custom: (value: string) => {
      if (value && !ValidationPatterns.phone.test(value)) {
        return 'Please enter a valid phone number';
      }
      return null;
    }
  },
  zipCode: {
    pattern: /^\d{5}(-\d{4})?$/,
    custom: (value: string) => {
      if (value && !/^\d{5}(-\d{4})?$/.test(value)) {
        return 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)';
      }
      return null;
    }
  },
  monthlyIncome: {
    min: 0,
    custom: (value: number) => {
      if (value && value < 0) return 'Income cannot be negative';
      if (value && value > 1000000) return 'Income seems unusually high';
      return null;
    }
  },
  homeValue: {
    min: 0,
    custom: (value: number) => {
      if (value && value < 0) return 'Home value cannot be negative';
      if (value && value > 50000000) return 'Home value seems unusually high';
      return null;
    }
  },
  emergencyFund: {
    min: 0,
    custom: (value: number) => {
      if (value && value < 0) return 'Emergency fund cannot be negative';
      return null;
    }
  },
  totalDebt: {
    min: 0,
    custom: (value: number) => {
      if (value && value < 0) return 'Debt cannot be negative';
      return null;
    }
  }
};

export const AssetSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(5, 'Symbol must be 5 characters or less')
    .regex(/^[A-Z]+$/, 'Symbol must contain only uppercase letters'),
  quantity: z.number()
    .min(0.01, 'Quantity must be greater than 0')
    .max(1000000, 'Quantity seems unusually large')
    .refine(val => Number.isInteger(val * 100), 'Quantity can have at most 2 decimal places'),
  avgCost: z.number()
    .min(0, 'Cost cannot be negative')
    .max(100000, 'Cost seems unusually high')
    .optional(),
  assetType: z.enum(['stock', 'etf', 'bond', 'crypto', 'mutual_fund', 'option', 'other']),
  purchaseDate: z.string().optional(),
  optionType: z.enum(['call', 'put']).optional(),
  strikePrice: z.number().min(0.01).optional(),
  expirationDate: z.string().optional()
});

// Quantity-specific utilities
export class QuantityValidationUtils {
  /**
   * Validates that a quantity has at most 2 decimal places
   */
  static validatePrecision(value: number): boolean {
    return Number.isInteger(value * 100);
  }

  /**
   * Formats a quantity to ensure exactly 2 decimal places when needed
   */
  static formatQuantity(value: number): string {
    // For whole numbers, don't show decimals
    if (Number.isInteger(value)) {
      return value.toString();
    }
    // For fractional numbers, show up to 2 decimal places
    return value.toFixed(2).replace(/\.?0+$/, '');
  }

  /**
   * Parses and validates quantity input, ensuring 2 decimal precision
   */
  static parseQuantity(input: string | number): { value: number; isValid: boolean; error?: string } {
    const numValue = typeof input === 'string' ? parseFloat(input) : input;
    
    if (isNaN(numValue) || !isFinite(numValue)) {
      return { value: 0, isValid: false, error: 'Invalid quantity format' };
    }
    
    if (numValue <= 0) {
      return { value: numValue, isValid: false, error: 'Quantity must be greater than 0' };
    }
    
    if (!this.validatePrecision(numValue)) {
      return { value: numValue, isValid: false, error: 'Quantity can have at most 2 decimal places' };
    }
    
    return { value: numValue, isValid: true };
  }

  /**
   * Rounds a quantity to 2 decimal places if needed
   */
  static roundToPrecision(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

export const ValidationSystem = new ValidationSystemClass();