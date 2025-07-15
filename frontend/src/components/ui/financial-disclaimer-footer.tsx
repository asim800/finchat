// ============================================================================
// FILE: components/ui/financial-disclaimer-footer.tsx
// Financial disclaimer footer component for regulatory compliance
// ============================================================================

'use client';

import React from 'react';

export const FinancialDisclaimerFooter: React.FC = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">
              Financial Disclaimer
            </p>
            <p className="max-w-4xl mx-auto">
              <strong>Investment Risk:</strong> All investments involve risk, including potential loss of principal. 
              Past performance does not guarantee future results. The value of investments and the income from them can fall as well as rise.
            </p>
            <p className="max-w-4xl mx-auto">
              <strong>Not Financial Advice:</strong> This application is for informational and educational purposes only. 
              The content provided does not constitute financial, investment, tax, or legal advice. 
              Always consult with qualified professionals before making investment decisions.
            </p>
            <p className="max-w-4xl mx-auto">
              <strong>Data Accuracy:</strong> While we strive to provide accurate information, market data and calculations 
              may contain errors or delays. Users should verify all information independently before making financial decisions.
            </p>
            <div className="pt-3 border-t border-gray-300 mt-4">
              <p className="text-xs text-gray-500">
                © 2025 MyStocks.ai Portfolio Management. This platform is for demonstration and educational purposes. 
                Not affiliated with any registered investment advisor or financial institution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};