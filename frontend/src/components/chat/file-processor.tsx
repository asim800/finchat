// ============================================================================
// FILE: components/chat/file-processor.tsx
// Component to process uploaded files and extract data
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';

interface PortfolioEntry {
  symbol: string;
  quantity: number;
  price: number;
  percentage?: number;
  name?: string;
  [key: string]: string | number | undefined;
}

interface ExtractedData {
  type: 'portfolio' | 'preferences' | 'text' | 'generic';
  holdings?: PortfolioEntry[];
  totalValue?: number;
  settings?: Record<string, string>;
  keywords?: string[];
  headers?: string[];
  rows?: Record<string, string>[];
  totalRows?: number;
  content?: string;
  length?: number;
  [key: string]: unknown;
}

interface FileProcessorProps {
  onDataExtracted: (data: ExtractedData, summary: string) => void;
  isGuestMode?: boolean;
}

export const FileProcessor: React.FC<FileProcessorProps> = ({ 
  onDataExtracted, 
  isGuestMode = false 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setProcessing(true);
    
    try {
      // Read file content
      const content = await readFileContent(file);
      setPreview(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
      
      // Process the file based on type
      const processedData = await processFile(file, content);
      
      if (processedData) {
        onDataExtracted(processedData.data, processedData.summary);
      }
    } catch (error) {
      console.error('File processing error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const processFile = async (file: File, content: string) => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    switch (fileType) {
      case 'csv':
        return processCsvFile(content);
      case 'txt':
        return processTextFile(content);
      default:
        throw new Error('Unsupported file type');
    }
  };

  const processCsvFile = (content: string) => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Try to detect portfolio data
    if (headers.some(h => ['symbol', 'ticker', 'stock'].includes(h))) {
      return processPortfolioData(lines, headers);
    }
    
    // Try to detect preference data
    if (headers.some(h => ['preference', 'setting', 'goal'].includes(h))) {
      return processPreferenceData(lines, headers);
    }
    
    // Generic CSV processing
    return processGenericCsv(lines, headers);
  };

  const processPortfolioData = (lines: string[], headers: string[]) => {
    const portfolio = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const entry: PortfolioEntry = {
        symbol: '',
        quantity: 0,
        price: 0
      };
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        if (['symbol', 'ticker'].includes(header)) {
          entry.symbol = value.toUpperCase();
        } else if (['quantity', 'shares', 'amount'].includes(header)) {
          entry.quantity = parseFloat(value) || 0;
        } else if (['price', 'cost', 'value'].includes(header)) {
          entry.price = parseFloat(value) || 0;
        } else if (['percentage', 'percent', '%', 'allocation'].includes(header)) {
          entry.percentage = parseFloat(value) || 0;
        } else if (['name', 'company', 'description'].includes(header)) {
          entry.name = value;
        } else {
          entry[header] = value;
        }
      });
      
      if (entry.symbol) {
        portfolio.push(entry);
      }
    }
    
    const totalValue = portfolio.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    return {
      data: {
        type: 'portfolio' as const,
        holdings: portfolio,
        totalValue
      },
      summary: `Processed portfolio with ${portfolio.length} holdings worth $${totalValue.toLocaleString()}`
    };
  };

  const processPreferenceData = (lines: string[], headers: string[]) => {
    const preferences: Record<string, string> = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      headers.forEach((header, index) => {
        if (values[index]) {
          preferences[header] = values[index];
        }
      });
    }
    
    return {
      data: {
        type: 'preferences' as const,
        settings: preferences
      },
      summary: `Processed ${Object.keys(preferences).length} preference settings`
    };
  };

  const processGenericCsv = (lines: string[], headers: string[]) => {
    const data = [];
    
    for (let i = 1; i < Math.min(lines.length, 50); i++) { // Limit to 50 rows for demo
      const values = lines[i].split(',').map(v => v.trim());
      const entry: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        entry[header] = values[index] || '';
      });
      
      data.push(entry);
    }
    
    return {
      data: {
        type: 'generic' as const,
        headers,
        rows: data,
        totalRows: lines.length - 1
      },
      summary: `Processed CSV with ${headers.length} columns and ${lines.length - 1} rows`
    };
  };

  const processTextFile = (content: string) => {
    // Look for financial keywords
    const financialKeywords = ['portfolio', 'investment', 'stock', 'bond', 'goal', 'risk', 'return'];
    const foundKeywords = financialKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    return {
      data: {
        type: 'text' as const,
        content: content.substring(0, 2000), // Limit content length
        keywords: foundKeywords,
        length: content.length
      },
      summary: `Processed text file (${content.length} characters) with financial keywords: ${foundKeywords.join(', ')}`
    };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <h3 className="text-lg font-semibold">Upload Portfolio or Preferences</h3>
        <p className="text-sm text-gray-600">
          Upload a CSV or text file containing your portfolio holdings, investment preferences, or financial goals.
          {isGuestMode && " In demo mode, data is processed locally and not saved."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUpload
          onFileSelect={handleFileSelect}
          acceptedTypes={['.csv', '.txt']}
          maxSize={5}
          disabled={processing}
        />
        
        {processing && (
          <div className="flex items-center space-x-2 text-blue-600">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Processing file...</span>
          </div>
        )}
        
        {selectedFile && !processing && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-green-700">
                Successfully processed: {selectedFile.name}
              </span>
            </div>
          </div>
        )}
        
        {preview && (
          <div className="bg-gray-50 border rounded p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">File Preview:</h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">{preview}</pre>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          <p><strong>Supported formats:</strong></p>
          <ul className="mt-1 space-y-1">
            <li>• <strong>Portfolio CSV:</strong> Columns like Symbol, Quantity, Price, Percentage, Name</li>
            <li>• <strong>Preferences CSV:</strong> Settings like Risk Level, Goals, Time Horizon</li>
            <li>• <strong>Text files:</strong> Investment goals, notes, or preferences in plain text</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

