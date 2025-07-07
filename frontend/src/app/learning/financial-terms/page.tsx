// ============================================================================
// FILE: app/learning/financial-terms/page.tsx
// Financial Terms Definitions Page
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, PencilIcon, SettingsIcon } from 'lucide-react';

interface FinancialTerm {
  id: string;
  term: string;
  definition: string;
  category?: string;
  keywords: string[];
}

export default function FinancialTermsPage() {
  const [terms, setTerms] = useState<FinancialTerm[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchTerms();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.user?.role === 'admin');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await fetch('/api/financial-terms');
      if (response.ok) {
        const data = await response.json();
        setTerms(data.terms);
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTerms = terms.filter(term => {
    const matchesSearch = term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         term.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         term.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading financial terms...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Terms Glossary</h1>
                <p className="text-gray-600 text-lg">
                  Essential financial and portfolio management terms to help you navigate the world of investing.
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Link href="/admin/financial-terms">
                    <Button variant="outline" size="sm">
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      Manage Terms
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search terms, definitions, or keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6">
            {filteredTerms.map((item) => (
              <div key={item.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">{item.term}</h2>
                  <div className="flex items-center gap-2">
                    {item.category && (
                      <Badge variant="outline">
                        {item.category}
                      </Badge>
                    )}
                    {isAdmin && (
                      <Link href={`/admin/financial-terms?edit=${item.id}`}>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-50 hover:opacity-100">
                          <PencilIcon className="w-3 h-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed mb-3">{item.definition}</p>
                {item.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.keywords.map(keyword => (
                      <Badge key={keyword} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTerms.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No terms found matching your search criteria.</p>
            </div>
          )}

          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Need More Help?</h3>
            <p className="text-blue-800">
              These terms are just the beginning. Use our AI chat feature to get personalized explanations 
              and ask questions about any financial concept you&apos;d like to understand better.
            </p>
          </div>
      </div>
    </div>
  );
}