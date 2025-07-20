// ============================================================================
// FILE: components/ui/form-error.tsx
// Standardized form error display component
// ============================================================================

import React from 'react';

interface FormErrorProps {
  error: string | null;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ 
  error, 
  className = "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" 
}) => {
  if (!error) return null;
  
  return (
    <div className={className}>
      {error}
    </div>
  );
};