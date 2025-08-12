// ============================================================================
// FILE: app/learning/supported-assets/page.tsx
// Supported Assets page displaying all symbols and asset types from historical_prices
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchIcon, DatabaseIcon } from 'lucide-react';

interface SupportedAsset {
  symbol: string;
  assetType: string;
}

interface ApiResponse {
  success: boolean;
  data: SupportedAsset[];
  count: number;
  error?: string;
}

export default function SupportedAssetsPage() {
  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<SupportedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSupportedAssets = async () => {
      try {
        const response = await fetch('/api/supported-assets');
        const data: ApiResponse = await response.json();
        
        if (data.success) {
          setAssets(data.data);
          setFilteredAssets(data.data);
        } else {
          setError(data.error || 'Failed to fetch supported assets');
        }
      } catch (err) {
        setError('Failed to fetch supported assets');
        console.error('Error fetching supported assets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupportedAssets();
  }, []);

  useEffect(() => {
    const filtered = assets.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.assetType.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAssets(filtered);
  }, [searchTerm, assets]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <DatabaseIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading supported assets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <DatabaseIcon className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600 font-medium mb-2">Error loading assets</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Supported Assets</h1>
        <p className="text-muted-foreground">
          Browse all financial instruments available in our database. You can search by symbol or asset type.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5" />
            Asset Directory
          </CardTitle>
          <CardDescription>
            {filteredAssets.length} of {assets.length} assets displayed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by symbol or asset type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Symbol</TableHead>
                  <TableHead className="font-semibold">Asset Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset, index) => (
                    <TableRow key={`${asset.symbol}-${index}`}>
                      <TableCell className="font-medium">{asset.symbol}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {asset.assetType}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No assets match your search criteria.' : 'No assets available.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredAssets.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Showing {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}