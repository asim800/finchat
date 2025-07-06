// ============================================================================
// FILE: app/admin/financial-terms/page.tsx
// Admin page for managing financial terms
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon } from 'lucide-react';

interface FinancialTerm {
  id: string;
  term: string;
  definition: string;
  category?: string;
  keywords: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TermFormData {
  term: string;
  definition: string;
  category: string;
  keywords: string[];
  isActive: boolean;
}

export default function FinancialTermsAdminPage() {
  const [terms, setTerms] = useState<FinancialTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<FinancialTerm | null>(null);
  const [formData, setFormData] = useState<TermFormData>({
    term: '',
    definition: '',
    category: '',
    keywords: [],
    isActive: true
  });
  const [keywordInput, setKeywordInput] = useState('');

  const categories = [
    'Investment Strategy',
    'Risk Metrics',
    'Financial Ratios',
    'Investment Costs',
    'Company Valuation',
    'Investment Psychology',
    'Investment Returns',
    'Investment Fundamentals',
    'Portfolio Management',
    'Investment Vehicles',
    'Market Conditions',
    'Asset Characteristics',
    'Credit Analysis'
  ];

  useEffect(() => {
    fetchTerms();
  }, []);

  useEffect(() => {
    // Check for edit parameter in URL after terms are loaded
    if (terms.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit');
      if (editId && !editingTerm) { // Only run if not already editing
        const termToEdit = terms.find(t => t.id === editId);
        if (termToEdit) {
          handleEdit(termToEdit);
          // Clear the URL parameter to avoid re-triggering
          window.history.replaceState({}, '', '/admin/financial-terms');
        }
      }
    }
  }, [terms, editingTerm]);

  const fetchTerms = async () => {
    try {
      const response = await fetch('/api/admin/financial-terms');
      if (response.ok) {
        const data = await response.json();
        setTerms(data.terms);
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingTerm ? 'PUT' : 'POST';
      const url = editingTerm 
        ? `/api/admin/financial-terms/${editingTerm.id}`
        : '/api/admin/financial-terms';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTerms();
        setIsDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Error saving term:', error);
      alert('An error occurred while saving the term');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this term?')) return;
    
    try {
      const response = await fetch(`/api/admin/financial-terms/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTerms();
      } else {
        const error = await response.json();
        alert(error.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Error deleting term:', error);
      alert('An error occurred while deleting the term');
    }
  };

  const handleEdit = (term: FinancialTerm) => {
    setEditingTerm(term);
    setFormData({
      term: term.term,
      definition: term.definition,
      category: term.category || '',
      keywords: term.keywords,
      isActive: term.isActive
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTerm(null);
    setFormData({
      term: '',
      definition: '',
      category: '',
      keywords: [],
      isActive: true
    });
    setKeywordInput('');
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const filteredTerms = terms.filter(term => {
    const matchesSearch = term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         term.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Financial Terms Management</h1>
          <p className="text-gray-600">Manage financial terms and definitions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Term
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTerm ? 'Edit Term' : 'Add New Term'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="term">Term</Label>
                  <Input
                    id="term"
                    value={formData.term}
                    onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="definition">Definition</Label>
                <Textarea
                  id="definition"
                  value={formData.definition}
                  onChange={(e) => setFormData(prev => ({ ...prev, definition: e.target.value }))}
                  rows={4}
                  required
                />
              </div>
              
              <div>
                <Label>Keywords</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add keyword"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.keywords.map(keyword => (
                    <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTerm ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search terms..."
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

      <div className="grid gap-4">
        {filteredTerms.map(term => (
          <Card key={term.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{term.term}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    {term.category && <Badge variant="outline">{term.category}</Badge>}
                    {!term.isActive && <Badge variant="destructive">Inactive</Badge>}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(term)}>
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(term.id)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-3">{term.definition}</p>
              {term.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {term.keywords.map(keyword => (
                    <Badge key={keyword} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredTerms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No terms found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}