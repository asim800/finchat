// ============================================================================
// FILE: components/portfolio/csv-upload-modal.tsx
// Modal wrapper for CSV upload component
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CsvUpload } from './csv-upload';

interface CsvUploadModalProps {
  isGuestMode?: boolean;
  onUploadComplete?: () => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ 
  isGuestMode = false,
  onUploadComplete 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleUploadComplete = () => {
    setIsOpen(false);
    if (onUploadComplete) {
      onUploadComplete();
    }
    // Refresh the page to show updated portfolio
    window.location.reload();
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        📁 Import CSV
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Import Portfolio from CSV</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <CsvUpload 
                onUploadComplete={handleUploadComplete}
                isGuestMode={isGuestMode}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};