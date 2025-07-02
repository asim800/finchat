// ============================================================================
// FILE: components/portfolio/csv-manager.tsx
// Consolidated CSV import/export management component
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CsvUpload } from './csv-upload';
import { CsvExport } from './csv-export';

interface CsvManagerProps {
  isGuestMode?: boolean;
  guestAssets?: Array<{
    symbol: string;
    quantity: number;
    avgPrice?: number | null;
    assetType: string;
  }>;
  onUploadComplete?: () => void;
}

export const CsvManager: React.FC<CsvManagerProps> = ({ 
  isGuestMode = false,
  guestAssets = [],
  onUploadComplete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

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
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>📊 CSV</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Portfolio CSV Management</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 pt-4">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('import')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'import'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📁 Import CSV
                </button>
                <button
                  onClick={() => setActiveTab('export')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'export'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📄 Export CSV
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'import' ? (
                <CsvUpload 
                  onUploadComplete={handleUploadComplete}
                  isGuestMode={isGuestMode}
                />
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Export your portfolio data as a CSV file for backup or analysis.
                  </div>
                  <CsvExport 
                    isGuestMode={isGuestMode}
                    guestAssets={guestAssets}
                  />
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <strong>Exported data includes:</strong> Symbol, Quantity, Price, Percentage, Total Value, Asset Type
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};