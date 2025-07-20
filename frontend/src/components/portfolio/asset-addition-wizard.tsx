// ============================================================================
// FILE: components/portfolio/asset-addition-wizard.tsx
// Wizard-style asset addition form to reduce cognitive load
// ============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ValidatedFormField } from '@/components/ui/validated-form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useErrorSystem, ErrorContainer } from '@/components/ui/error-display';
import { useFormValidation } from '@/hooks/use-form-validation';
import { AssetValidationSchemas, ValidationSchema, QuantityValidationUtils } from '@/lib/validation';

interface NewAsset {
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  assetType: string;
  purchaseDate?: string;
  optionType?: string;
  expirationDate?: string;
  strikePrice?: number;
}

interface AssetAdditionWizardProps {
  onSubmit: (asset: NewAsset) => void;
  onCancel: () => void;
  loading?: boolean;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Asset Type', description: 'What type of asset are you adding?' },
  { id: 2, title: 'Basic Info', description: 'Enter the basic details' },
  { id: 3, title: 'Additional Details', description: 'Optional information' },
  { id: 4, title: 'Review', description: 'Confirm your details' }
];

const ASSET_TYPES = [
  { value: 'stock', label: 'Stock', description: 'Individual company shares' },
  { value: 'etf', label: 'ETF', description: 'Exchange-traded fund' },
  { value: 'mutual_fund', label: 'Mutual Fund', description: 'Professionally managed fund' },
  { value: 'bond', label: 'Bond', description: 'Government or corporate debt' },
  { value: 'crypto', label: 'Cryptocurrency', description: 'Digital currency' },
  { value: 'option', label: 'Option', description: 'Derivative contract' },
  { value: 'other', label: 'Other', description: 'Other investment type' }
];

export const AssetAdditionWizard: React.FC<AssetAdditionWizardProps> = ({
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [assetType, setAssetType] = useState('');
  const { clearErrors } = useErrorSystem();

  // Dynamic validation schema based on asset type
  const validationSchema = useMemo((): ValidationSchema => {
    const baseSchema = { ...AssetValidationSchemas.basic };
    
    // Add type-specific validations
    if (assetType === 'option') {
      Object.assign(baseSchema, AssetValidationSchemas.option);
    } else if (assetType === 'bond') {
      Object.assign(baseSchema, AssetValidationSchemas.bond);
    }
    
    return baseSchema;
  }, [assetType]);

  // Initialize form validation
  const formValidation = useFormValidation({
    schema: validationSchema,
    initialValues: {
      symbol: '',
      quantity: 0,
      avgCost: undefined,
      assetType: '',
      purchaseDate: undefined,
      optionType: undefined,
      expirationDate: undefined,
      strikePrice: undefined
    },
    validateOnChange: true,
    validateOnBlur: true
  });

  // Legacy asset state for compatibility
  const asset = formValidation.values as NewAsset;

  // Helper functions for step validation
  const getStepFields = (step: number): string[] => {
    const stepFieldsMap: Record<number, string[]> = {
      1: ['assetType'],
      2: ['symbol', 'quantity'],
      3: getStep3RequiredFields(),
    };
    return stepFieldsMap[step] || [];
  };

  const getStep3RequiredFields = (): string[] => {
    if (isAssetType('option') || isAssetType('bond')) {
      return ['optionType', 'strikePrice', 'expirationDate'];
    }
    return [];
  };

  const validateStep = (step: number): boolean => {
    const fieldsToValidate = getStepFields(step);

    // Mark relevant fields as touched and validate
    fieldsToValidate.forEach(fieldName => {
      formValidation.setFieldTouched(fieldName, true, true);
    });

    // Check if all relevant fields are valid
    return fieldsToValidate.every(fieldName => {
      const fieldValidation = formValidation.validationState[fieldName];
      return fieldValidation ? fieldValidation.valid : true;
    });
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      clearErrors(); // Clear any validation errors when successfully moving to next step
      if (currentStep < WIZARD_STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (formValidation.validateAll()) {
      onSubmit(asset);
    }
  };

  const getStepIcon = (stepNumber: number) => {
    if (stepNumber < currentStep) {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    if (stepNumber === currentStep) {
      return <div className="h-4 w-4 bg-blue-600 rounded-full"></div>;
    }
    return <div className="h-4 w-4 bg-gray-300 rounded-full"></div>;
  };

  const selectedAssetType = ASSET_TYPES.find(type => type.value === asset.assetType);

  // Helper functions for asset type specific rendering
  const isAssetType = (type: string) => asset.assetType === type;
  
  const renderValidationError = (fieldName: string) => {
    const field = formValidation.validationState[fieldName];
    return field?.touched && field?.error ? (
      <p className="text-sm text-red-600 mt-1">{field.error}</p>
    ) : null;
  };

  const renderSpecialFieldsSection = () => {
    if (isAssetType('option')) {
      return renderOptionFields();
    }
    if (isAssetType('bond')) {
      return renderBondFields();
    }
    return null;
  };

  const renderOptionFields = () => (
    <div className="mt-6 p-4 bg-blue-50 rounded-lg border">
      <h5 className="font-medium text-blue-800 mb-3">Option Details</h5>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderTypeSelector('Option Type', 'optionType', [
          { value: 'call', label: 'Call' },
          { value: 'put', label: 'Put' }
        ])}
        {renderNumberField('Strike Price', 'strikePrice', '100.00', true)}
        {renderDateField('Expiration Date', 'expirationDate', true)}
      </div>
    </div>
  );

  const renderBondFields = () => (
    <div className="mt-6 p-4 bg-green-50 rounded-lg border">
      <h5 className="font-medium text-green-800 mb-3">Bond Details</h5>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderTypeSelector('Bond Type', 'optionType', [
          { value: 'usd', label: 'US Treasury' },
          { value: 'corporate', label: 'Corporate' },
          { value: 'municipal', label: 'Municipal' },
          { value: 'dem', label: 'Germany (Bundesanleihe)' },
          { value: 'gbp', label: 'UK (Gilt)' },
          { value: 'jpy', label: 'Japan Government' }
        ])}
        {renderNumberField('Coupon Rate (%)', 'strikePrice', '4.5', true)}
        {renderDateField('Maturity Date', 'expirationDate', true)}
      </div>
    </div>
  );

  const renderTypeSelector = (label: string, fieldName: string, options: Array<{value: string, label: string}>) => (
    <div>
      <label className="block text-sm font-medium mb-2">{label} *</label>
      <Select
        value={asset[fieldName as keyof NewAsset] as string || ''}
        onValueChange={(value) => formValidation.setFieldValue(fieldName, value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {renderValidationError(fieldName)}
    </div>
  );

  const renderNumberField = (label: string, fieldName: string, placeholder: string, required = false) => (
    <div>
      <ValidatedFormField
        label={`${label}${required ? ' *' : ''}`}
        type="number"
        {...formValidation.getFieldProps(fieldName)}
        onChange={(e) => formValidation.handleFieldChange(fieldName, parseFloat(e.target.value) || undefined)}
        placeholder={placeholder}
        min="0"
        step="0.01"
        suggestions={formValidation.getFieldSuggestions(fieldName)}
        required={required}
      />
    </div>
  );

  const renderDateField = (label: string, fieldName: string, required = false) => (
    <div>
      <ValidatedFormField
        label={`${label}${required ? ' *' : ''}`}
        type="date"
        {...formValidation.getFieldProps(fieldName)}
        onChange={(e) => formValidation.handleFieldChange(fieldName, e.target.value)}
        suggestions={formValidation.getFieldSuggestions(fieldName)}
        required={required}
      />
    </div>
  );

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add New Asset</h3>
          <Badge variant="secondary">{currentStep} of {WIZARD_STEPS.length}</Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center space-x-2">
          {WIZARD_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center space-x-2">
                {getStepIcon(step.id)}
                <span className={`text-sm font-medium ${
                  step.id === currentStep ? 'text-blue-600' : 
                  step.id < currentStep ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${
                  step.id < currentStep ? 'bg-green-600' : 'bg-gray-200'
                }`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        <p className="text-sm text-gray-600">{WIZARD_STEPS[currentStep - 1].description}</p>
      </div>

      {/* Error Display */}
      <ErrorContainer />

      {/* Step Content */}
      <div className="min-h-[300px]">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Choose Asset Type</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ASSET_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    formValidation.setFieldValue('assetType', type.value);
                    setAssetType(type.value);
                  }}
                  className={`p-4 text-left border rounded-lg transition-colors ${
                    asset.assetType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-500">{type.description}</div>
                </button>
              ))}
            </div>
            {renderValidationError('assetType')}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <h4 className="font-medium text-gray-900">Basic Information</h4>
              {selectedAssetType && (
                <Badge variant="secondary">{selectedAssetType.label}</Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <ValidatedFormField
                  label="Symbol *"
                  type="text"
                  {...formValidation.getFieldProps('symbol')}
                  onChange={(e) => formValidation.handleFieldChange('symbol', e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL, TSLA"
                  suggestions={formValidation.getFieldSuggestions('symbol')}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the ticker symbol</p>
              </div>
              
              <div>
                <ValidatedFormField
                  label="Quantity *"
                  type="number"
                  {...formValidation.getFieldProps('quantity')}
                  onChange={(e) => {
                    const parseResult = QuantityValidationUtils.parseQuantity(e.target.value);
                    formValidation.handleFieldChange('quantity', parseResult.value);
                  }}
                  placeholder="100"
                  min="0"
                  step="0.01"
                  suggestions={formValidation.getFieldSuggestions('quantity')}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Number of shares/units</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Additional Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <ValidatedFormField
                  label="Average Cost"
                  type="number"
                  {...formValidation.getFieldProps('avgCost')}
                  onChange={(e) => formValidation.handleFieldChange('avgCost', parseFloat(e.target.value) || undefined)}
                  placeholder="150.00"
                  min="0"
                  step="0.01"
                  suggestions={formValidation.getFieldSuggestions('avgCost')}
                />
                <p className="text-xs text-gray-500 mt-1">Cost per share (optional)</p>
              </div>
              
              <div>
                <ValidatedFormField
                  label="Purchase Date"
                  type="date"
                  {...formValidation.getFieldProps('purchaseDate')}
                  onChange={(e) => formValidation.handleFieldChange('purchaseDate', e.target.value)}
                  suggestions={formValidation.getFieldSuggestions('purchaseDate')}
                />
                <p className="text-xs text-gray-500 mt-1">When you bought this asset</p>
              </div>
            </div>

            {/* Special fields for options and bonds */}
            {renderSpecialFieldsSection()}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Review Your Asset</h4>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Asset Type:</span>
                <Badge variant="secondary">{selectedAssetType?.label}</Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-700">Symbol:</span>
                <span className="font-medium">{asset.symbol}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-700">Quantity:</span>
                <span className="font-medium">{QuantityValidationUtils.formatQuantity(asset.quantity)}</span>
              </div>
              
              {asset.avgCost && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Average Cost:</span>
                  <span className="font-medium">${asset.avgCost.toFixed(2)}</span>
                </div>
              )}
              
              {asset.purchaseDate && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Purchase Date:</span>
                  <span className="font-medium">{asset.purchaseDate}</span>
                </div>
              )}

              {asset.assetType === 'option' && asset.optionType && (
                <div className="border-t pt-3 space-y-2">
                  <div className="text-sm font-medium text-blue-800">Option Details</div>
                  <div className="flex justify-between text-sm">
                    <span>Type:</span>
                    <span>{asset.optionType.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Strike:</span>
                    <span>${asset.strikePrice?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Expiration:</span>
                    <span>{asset.expirationDate}</span>
                  </div>
                </div>
              )}

              {asset.assetType === 'bond' && asset.optionType && (
                <div className="border-t pt-3 space-y-2">
                  <div className="text-sm font-medium text-green-800">Bond Details</div>
                  <div className="flex justify-between text-sm">
                    <span>Type:</span>
                    <span>{asset.optionType.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Coupon:</span>
                    <span>{asset.strikePrice}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Maturity:</span>
                    <span>{asset.expirationDate}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="min-h-[44px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          
          {currentStep < WIZARD_STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!asset.assetType && currentStep === 1}
              className="min-h-[44px]"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="min-h-[44px] bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Adding...' : 'Add Asset'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};