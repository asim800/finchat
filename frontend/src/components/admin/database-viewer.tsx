// ============================================================================
// FILE: components/admin/database-viewer.tsx
// Database viewer with read-only access to all tables
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface DatabaseViewerProps {
  // No props needed currently
}

const TABLES = [
  { name: 'users', label: 'Users' },
  { name: 'portfolios', label: 'Portfolios' },
  { name: 'assets', label: 'Assets' },
  { name: 'chat_sessions', label: 'Chat Sessions' },
  { name: 'messages', label: 'Messages' },
  { name: 'accounts', label: 'Accounts' },
  { name: 'historical_prices', label: 'Historical Prices' }
];

export const DatabaseViewer: React.FC<DatabaseViewerProps> = () => {
  const [selectedTable, setSelectedTable] = useState('users');
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableSchema, setTableSchema] = useState<Record<string, unknown> | null>(null);
  const [tableCount, setTableCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchTableData = async (table: string, action: string = 'list') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/db?table=${table}&action=${action}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (action === 'list') {
          setTableData(data || []);
        } else if (action === 'count') {
          setTableCount(data.count || 0);
        } else if (action === 'schema') {
          setTableSchema(data);
        }
      } else {
        console.error(`Failed to fetch ${action} for table ${table}`);
      }
    } catch (error) {
      console.error(`Error fetching ${action} for table ${table}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, 'list');
      fetchTableData(selectedTable, 'count');
      fetchTableData(selectedTable, 'schema');
    }
  }, [selectedTable]);

  const renderTableContent = () => {
    if (loading) {
      return (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Loading table data...</p>
        </div>
      );
    }

    if (!tableData || tableData.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          No data found in this table.
        </div>
      );
    }

    // Get column names from first row
    const columns = Object.keys(tableData[0] || {});

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="font-semibold">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column} className="max-w-xs">
                    {renderCellValue(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (obj._count && typeof obj._count === 'object') {
        // Handle count objects
        return Object.entries(obj._count as Record<string, unknown>)
          .map(([key, val]) => `${key}: ${val}`)
          .join(', ');
      }
      if (obj.email || obj.name || obj.title) {
        // Handle nested user/portfolio objects
        return String(obj.email || obj.name || obj.title) || JSON.stringify(value);
      }
      return JSON.stringify(value);
    }
    
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Table Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Selected Table</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {TABLES.find(t => t.name === selectedTable)?.label || selectedTable}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{tableCount.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Showing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {Math.min(50, tableData.length)} rows
            </p>
            {tableCount > 50 && (
              <p className="text-sm text-gray-500">Limited to 50 rows for performance</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTable} onValueChange={setSelectedTable}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
          {TABLES.map((table) => (
            <TabsTrigger key={table.name} value={table.name} className="text-xs">
              {table.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABLES.map((table) => (
          <TabsContent key={table.name} value={table.name} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{table.label} Data</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTableData(table.name, 'list')}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderTableContent()}
              </CardContent>
            </Card>

            {/* Schema Information */}
            {tableSchema && (
              <Card>
                <CardHeader>
                  <CardTitle>Table Schema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Fields</h4>
                      <ul className="text-sm space-y-1">
                        {Array.isArray((tableSchema as Record<string, unknown>)?.fields) && 
                         ((tableSchema as Record<string, unknown>).fields as string[]).map((field: string) => (
                          <li key={field} className="bg-gray-100 px-2 py-1 rounded">
                            {field}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Relations</h4>
                      <ul className="text-sm space-y-1">
                        {Array.isArray((tableSchema as Record<string, unknown>)?.relations) && 
                         ((tableSchema as Record<string, unknown>).relations as string[]).map((relation: string) => (
                          <li key={relation} className="bg-blue-100 px-2 py-1 rounded">
                            {relation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Security Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">🔒</span>
            <div>
              <p className="text-yellow-800 font-medium">Read-Only Access</p>
              <p className="text-yellow-700 text-sm">
                This interface provides read-only access to the database. 
                Use the User Management tab for safe CRUD operations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};