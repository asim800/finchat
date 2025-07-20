// ============================================================================
// FILE: tests/components/form-fields.test.ts
// Comprehensive test suite for reusable form field components
// ============================================================================

import { ValidationSystem, AuthValidationSchemas, ProfileValidationSchema } from '../../lib/validation';
import { getValidationState } from '../../components/ui/form-fields/index';

// Mock React for testing validation logic
const mockReact = {
  useState: (initial: any) => [initial, jest.fn()],
  useCallback: (fn: any) => fn,
  useMemo: (fn: any) => fn(),
  useEffect: jest.fn()
};

// Test utilities
const createMockEvent = (value: string) => ({
  target: { value },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn()
});

const createMockFieldProps = (overrides = {}) => ({
  label: 'Test Field',
  name: 'testField',
  value: '',
  onChange: jest.fn(),
  onBlur: jest.fn(),
  error: null,
  valid: true,
  touched: false,
  suggestions: [],
  required: false,
  disabled: false,
  placeholder: 'Enter value...',
  ...overrides
});

describe('Form Field Components', () => {
  
  describe('Validation State Helper', () => {
    
    test('should return correct validation state for untouched field', () => {
      const state = getValidationState(null, true, false, true);
      
      expect(state.hasError).toBe(false);
      expect(state.isValid).toBe(false);
      expect(state.showIcon).toBe(false);
      expect(state.iconType).toBe('none');
    });
    
    test('should return correct validation state for touched valid field', () => {
      const state = getValidationState(null, true, true, true);
      
      expect(state.hasError).toBe(false);
      expect(state.isValid).toBe(true);
      expect(state.showIcon).toBe(true);
      expect(state.iconType).toBe('success');
    });
    
    test('should return correct validation state for touched invalid field', () => {
      const state = getValidationState('Error message', false, true, true);
      
      expect(state.hasError).toBe(true);
      expect(state.isValid).toBe(false);
      expect(state.showIcon).toBe(true);
      expect(state.iconType).toBe('error');
    });
    
    test('should respect showValidationIcon flag', () => {
      const state = getValidationState('Error message', false, true, false);
      
      expect(state.hasError).toBe(true);
      expect(state.isValid).toBe(false);
      expect(state.showIcon).toBe(false);
      expect(state.iconType).toBe('error');
    });
  });

  describe('Email Field Validation', () => {
    
    test('should validate valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@test-domain.org'
      ];
      
      validEmails.forEach(email => {
        const error = ValidationSystem.validateField(email, AuthValidationSchemas.login.email);
        expect(error).toBeNull();
      });
    });
    
    test('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        'user@',
        '@domain.com',
        'user space@domain.com',
        'user@domain',
        ''
      ];
      
      invalidEmails.forEach(email => {
        const error = ValidationSystem.validateField(email, AuthValidationSchemas.login.email);
        expect(error).toBeTruthy();
      });
    });
    
    test('should provide helpful suggestions for common email mistakes', () => {
      const suggestions = ValidationSystem.getFieldSuggestions('email', 'user@domain', 'Invalid format');
      
      expect(suggestions).toContain('Email addresses need a domain (e.g., .com, .org)');
    });
  });

  describe('Password Field Validation', () => {
    
    test('should validate strong passwords', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure2024@',
        'Complex#Password1'
      ];
      
      strongPasswords.forEach(password => {
        const error = ValidationSystem.validateField(password, AuthValidationSchemas.register.password);
        expect(error).toBeNull();
      });
    });
    
    test('should reject weak passwords', () => {
      const weakPasswords = [
        'weak',
        'password',
        '12345678',
        'PASSWORD',
        'Pass123' // too short
      ];
      
      weakPasswords.forEach(password => {
        const error = ValidationSystem.validateField(password, AuthValidationSchemas.register.password);
        expect(error).toBeTruthy();
      });
    });
    
    test('should provide specific password improvement suggestions', () => {
      const testCases = [
        {
          password: 'short',
          expectedSuggestion: 'Try adding more characters to reach 8 minimum'
        },
        {
          password: 'nouppercase123',
          expectedSuggestion: 'Add at least one uppercase letter (A-Z)'
        },
        {
          password: 'NOLOWERCASE123',
          expectedSuggestion: 'Add at least one lowercase letter (a-z)'
        },
        {
          password: 'NoNumbers',
          expectedSuggestion: 'Add at least one number (0-9)'
        }
      ];
      
      testCases.forEach(({ password, expectedSuggestion }) => {
        const suggestions = ValidationSystem.getFieldSuggestions('password', password, 'Invalid');
        expect(suggestions.some(s => s.includes(expectedSuggestion.split(' ')[0]))).toBe(true);
      });
    });
  });

  describe('Number Field Validation', () => {
    
    test('should validate positive numbers', () => {
      const validNumbers = [1, 100, 50.5, 0.01, 999999];
      
      validNumbers.forEach(number => {
        const error = ValidationSystem.validateField(number, { min: 0, max: 1000000 });
        expect(error).toBeNull();
      });
    });
    
    test('should reject invalid numbers', () => {
      const invalidNumbers = [-1, 0, 1000001];
      
      invalidNumbers.forEach(number => {
        const error = ValidationSystem.validateField(number, { min: 0.01, max: 1000000 });
        expect(error).toBeTruthy();
      });
    });
    
    test('should validate decimal precision for quantities', () => {
      const validQuantities = [1, 10.5, 100.25, 50.1];
      const invalidQuantities = [10.123, 50.9999, 25.001];
      
      validQuantities.forEach(quantity => {
        const error = ValidationSystem.validateField(quantity, {
          min: 0.01,
          custom: (value: number) => {
            if (typeof value === 'number' && !Number.isInteger(value * 100)) {
              return 'Quantity can have at most 2 decimal places';
            }
            return null;
          }
        });
        expect(error).toBeNull();
      });
      
      invalidQuantities.forEach(quantity => {
        const error = ValidationSystem.validateField(quantity, {
          min: 0.01,
          custom: (value: number) => {
            if (typeof value === 'number' && !Number.isInteger(value * 100)) {
              return 'Quantity can have at most 2 decimal places';
            }
            return null;
          }
        });
        expect(error).toBeTruthy();
      });
    });
  });

  describe('Date Field Validation', () => {
    
    test('should validate future dates when required', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      
      const error = ValidationSystem.validateField(tomorrowString, {
        custom: (value: string) => {
          const date = new Date(value);
          const today = new Date();
          if (date <= today) return 'Date must be in the future';
          return null;
        }
      });
      
      expect(error).toBeNull();
    });
    
    test('should reject past dates when future required', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];
      
      const error = ValidationSystem.validateField(yesterdayString, {
        custom: (value: string) => {
          const date = new Date(value);
          const today = new Date();
          if (date <= today) return 'Date must be in the future';
          return null;
        }
      });
      
      expect(error).toBeTruthy();
    });
  });

  describe('Profile Field Validation', () => {
    
    test('should validate names with allowed characters', () => {
      const validNames = [
        'John',
        'Mary-Jane',
        "O'Connor",
        'Jean Pierre',
        'Anna-Maria'
      ];
      
      validNames.forEach(name => {
        const error = ValidationSystem.validateField(name, ProfileValidationSchema.firstName);
        expect(error).toBeNull();
      });
    });
    
    test('should reject names with invalid characters', () => {
      const invalidNames = [
        'John123',
        'Mary@Smith',
        'Test#Name',
        'User_Name'
      ];
      
      invalidNames.forEach(name => {
        const error = ValidationSystem.validateField(name, ProfileValidationSchema.firstName);
        expect(error).toBeTruthy();
      });
    });
    
    test('should validate phone numbers', () => {
      const validPhones = [
        '(555) 123-4567',
        '+1 555 123 4567',
        '555-123-4567',
        '5551234567'
      ];
      
      validPhones.forEach(phone => {
        const error = ValidationSystem.validateField(phone, ProfileValidationSchema.phone);
        expect(error).toBeNull();
      });
    });
    
    test('should validate ZIP codes', () => {
      const validZips = ['12345', '12345-6789', '90210'];
      const invalidZips = ['1234', '123456', 'ABCDE', '12345-67890'];
      
      validZips.forEach(zip => {
        const error = ValidationSystem.validateField(zip, ProfileValidationSchema.zipCode);
        expect(error).toBeNull();
      });
      
      invalidZips.forEach(zip => {
        const error = ValidationSystem.validateField(zip, ProfileValidationSchema.zipCode);
        expect(error).toBeTruthy();
      });
    });
    
    test('should validate financial amounts', () => {
      const validAmounts = [0, 1000, 50000.50, 999999];
      const invalidAmounts = [-100, -1];
      
      validAmounts.forEach(amount => {
        const error = ValidationSystem.validateField(amount, ProfileValidationSchema.monthlyIncome);
        expect(error).toBeNull();
      });
      
      invalidAmounts.forEach(amount => {
        const error = ValidationSystem.validateField(amount, ProfileValidationSchema.monthlyIncome);
        expect(error).toBeTruthy();
      });
    });
  });

  describe('Form Integration', () => {
    
    test('should validate entire form correctly', () => {
      const validFormData = {
        email: 'user@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const validationState = ValidationSystem.validateForm(validFormData, AuthValidationSchemas.register);
      const isFormValid = ValidationSystem.isFormValid(validationState);
      
      expect(isFormValid).toBe(true);
      Object.values(validationState).forEach(field => {
        expect(field.valid).toBe(true);
        expect(field.error).toBeNull();
      });
    });
    
    test('should detect form errors correctly', () => {
      const invalidFormData = {
        email: 'invalid-email',
        password: 'weak',
        firstName: '',
        lastName: 'Test123'
      };
      
      const validationState = ValidationSystem.validateForm(invalidFormData, AuthValidationSchemas.register);
      const isFormValid = ValidationSystem.isFormValid(validationState);
      
      expect(isFormValid).toBe(false);
      expect(validationState.email.error).toBeTruthy();
      expect(validationState.password.error).toBeTruthy();
      expect(validationState.firstName.error).toBeTruthy();
      expect(validationState.lastName.error).toBeTruthy();
    });
    
    test('should get form errors for touched fields only', () => {
      const formData = {
        email: 'invalid-email',
        password: 'weak'
      };
      
      const validationState = ValidationSystem.validateForm(formData, AuthValidationSchemas.login);
      
      // Mark only email as touched
      validationState.email.touched = true;
      
      const errors = ValidationSystem.getFormErrors(validationState);
      
      expect(errors.email).toBeTruthy();
      expect(errors.password).toBeUndefined(); // Not touched
    });
  });

  describe('Performance Tests', () => {
    
    test('should validate fields quickly', () => {
      const startTime = Date.now();
      
      // Run 1000 validations
      for (let i = 0; i < 1000; i++) {
        ValidationSystem.validateField('user@example.com', AuthValidationSchemas.login.email);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete 1000 validations in under 100ms
      expect(totalTime).toBeLessThan(100);
    });
    
    test('should validate forms quickly', () => {
      const formData = {
        email: 'user@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const startTime = Date.now();
      
      // Run 100 form validations
      for (let i = 0; i < 100; i++) {
        ValidationSystem.validateForm(formData, AuthValidationSchemas.register);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete 100 form validations in under 50ms
      expect(totalTime).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    
    test('should handle null and undefined values', () => {
      const testCases = [null, undefined, ''];
      
      testCases.forEach(value => {
        const error = ValidationSystem.validateField(value, { required: false });
        expect(error).toBeNull();
      });
      
      testCases.forEach(value => {
        const error = ValidationSystem.validateField(value, { required: true });
        expect(error).toBeTruthy();
      });
    });
    
    test('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const error = ValidationSystem.validateField(longString, { maxLength: 50 });
      
      expect(error).toBeTruthy();
      expect(error).toContain('50 characters or less');
    });
    
    test('should handle special characters in validation', () => {
      const specialChars = ['<script>', '&nbsp;', '"quotes"', "'apostrophe'"];
      
      specialChars.forEach(chars => {
        const error = ValidationSystem.validateField(chars, AuthValidationSchemas.register.firstName);
        expect(error).toBeTruthy(); // Should reject special characters in names
      });
    });
    
    test('should handle extreme numbers', () => {
      const extremeNumbers = [Number.MAX_VALUE, Number.MIN_VALUE, Infinity, -Infinity, NaN];
      
      extremeNumbers.forEach(number => {
        const error = ValidationSystem.validateField(number, { min: 0, max: 1000000 });
        if (isFinite(number)) {
          expect(typeof error).toBe('string'); // Should have validation error for extreme values
        } else {
          expect(error).toBeTruthy(); // Should reject infinite/NaN values
        }
      });
    });
  });
});

// Test utilities for component testing
export class FormFieldTestUtils {
  
  static createMockFormValidation = (overrides = {}) => ({
    values: {},
    validationState: {},
    errors: {},
    isValid: true,
    isDirty: false,
    setFieldValue: jest.fn(),
    setFieldTouched: jest.fn(),
    handleFieldChange: jest.fn(),
    handleFieldBlur: jest.fn(),
    getFieldProps: jest.fn(() => createMockFieldProps()),
    getFieldSuggestions: jest.fn(() => []),
    reset: jest.fn(),
    validateAll: jest.fn(() => true),
    setValues: jest.fn(),
    updateValidation: jest.fn(),
    ...overrides
  });
  
  static createMockStandardForm = (overrides = {}) => ({
    ...FormFieldTestUtils.createMockFormValidation(),
    loading: false,
    error: null,
    submitted: false,
    handleSubmit: jest.fn(),
    setError: jest.fn(),
    clearErrors: jest.fn(),
    resetForm: jest.fn(),
    canSubmit: true,
    hasErrors: false,
    ...overrides
  });
  
  // Generate test data for various field types
  static generateTestData = () => ({
    validEmails: [
      'user@example.com',
      'test.email+tag@domain.co.uk',
      'user123@test-domain.org'
    ],
    invalidEmails: [
      'invalid-email',
      'user@',
      '@domain.com',
      'user space@domain.com'
    ],
    strongPasswords: [
      'StrongPass123!',
      'MySecure2024@',
      'Complex#Password1'
    ],
    weakPasswords: [
      'weak',
      'password',
      '12345678',
      'PASSWORD'
    ],
    validPhones: [
      '(555) 123-4567',
      '+1 555 123 4567',
      '555-123-4567',
      '5551234567'
    ],
    validNumbers: [1, 100, 50.5, 0.01, 999999],
    invalidNumbers: [-1, 0, 1000001]
  });
}

export default FormFieldTestUtils;