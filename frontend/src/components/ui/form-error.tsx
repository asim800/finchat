// Standardized form error display component

import React from 'react';

interface FormErrorProps {
  error: string | null;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ 
  error, 
  className = "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded" 
}) => {
  if (!error) return null;
  
  return (
    <div className={className}>
      {error}
    </div>
  );
};
