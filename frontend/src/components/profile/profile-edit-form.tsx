// ============================================================================
// FILE: components/profile/profile-edit-form.tsx
// Edit form for user profile with comprehensive validation
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SaveIcon, XIcon } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  birthDate?: Date | null;
  housingType?: string | null;
  homeValue?: number | null;
  monthlyRent?: number | null;
  monthlyMortgage?: number | null;
  monthlyIncome?: number | null;
  monthlyAlimony?: number | null;
  monthlyFixedExpenses?: number | null;
  employmentStatus?: string | null;
  dependents?: number | null;
  emergencyFund?: number | null;
  totalDebt?: number | null;
  estimatedSocialSecurityAt65?: number | null;
  investmentGoals?: string | null;
  riskTolerance?: string | null;
  investmentExperience?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfileEditFormProps {
  user: User;
  onSave: (user: User) => void;
  onCancel: () => void;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    address: user.address || '',
    city: user.city || '',
    state: user.state || '',
    zipCode: user.zipCode || '',
    phone: user.phone || '',
    birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
    housingType: user.housingType || '',
    homeValue: user.homeValue?.toString() || '',
    monthlyRent: user.monthlyRent?.toString() || '',
    monthlyMortgage: user.monthlyMortgage?.toString() || '',
    monthlyIncome: user.monthlyIncome?.toString() || '',
    monthlyAlimony: user.monthlyAlimony?.toString() || '',
    monthlyFixedExpenses: user.monthlyFixedExpenses?.toString() || '',
    employmentStatus: user.employmentStatus || '',
    dependents: user.dependents?.toString() || '',
    emergencyFund: user.emergencyFund?.toString() || '',
    totalDebt: user.totalDebt?.toString() || '',
    estimatedSocialSecurityAt65: user.estimatedSocialSecurityAt65?.toString() || '',
    investmentGoals: user.investmentGoals || '',
    riskTolerance: user.riskTolerance || '',
    investmentExperience: user.investmentExperience || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare data for API
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zipCode: formData.zipCode || null,
        phone: formData.phone || null,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
        housingType: formData.housingType || null,
        homeValue: formData.homeValue ? parseFloat(formData.homeValue) : null,
        monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : null,
        monthlyMortgage: formData.monthlyMortgage ? parseFloat(formData.monthlyMortgage) : null,
        monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
        monthlyAlimony: formData.monthlyAlimony ? parseFloat(formData.monthlyAlimony) : null,
        monthlyFixedExpenses: formData.monthlyFixedExpenses ? parseFloat(formData.monthlyFixedExpenses) : null,
        employmentStatus: formData.employmentStatus || null,
        dependents: formData.dependents ? parseInt(formData.dependents) : null,
        emergencyFund: formData.emergencyFund ? parseFloat(formData.emergencyFund) : null,
        totalDebt: formData.totalDebt ? parseFloat(formData.totalDebt) : null,
        estimatedSocialSecurityAt65: formData.estimatedSocialSecurityAt65 ? parseFloat(formData.estimatedSocialSecurityAt65) : null,
        investmentGoals: formData.investmentGoals || null,
        riskTolerance: formData.riskTolerance || null,
        investmentExperience: formData.investmentExperience || null,
      };

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      onSave(updatedUser.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-600 mt-1">Update your personal and financial information</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            <XIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <SaveIcon className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="employmentStatus">Employment Status</Label>
              <Select value={formData.employmentStatus} onValueChange={(value) => handleInputChange('employmentStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self-employed">Self-Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dependents">Number of Dependents</Label>
              <Input
                id="dependents"
                type="number"
                min="0"
                value={formData.dependents}
                onChange={(e) => handleInputChange('dependents', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle>Address & Housing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="12345"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="housingType">Housing Type</Label>
              <Select value={formData.housingType} onValueChange={(value) => handleInputChange('housingType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select housing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="own">Own</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.housingType === 'own' && (
              <>
                <div>
                  <Label htmlFor="homeValue">Home Value</Label>
                  <Input
                    id="homeValue"
                    type="number"
                    min="0"
                    value={formData.homeValue}
                    onChange={(e) => handleInputChange('homeValue', e.target.value)}
                    placeholder="500000"
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyMortgage">Monthly Mortgage Payment</Label>
                  <Input
                    id="monthlyMortgage"
                    type="number"
                    min="0"
                    value={formData.monthlyMortgage}
                    onChange={(e) => handleInputChange('monthlyMortgage', e.target.value)}
                    placeholder="2500"
                  />
                </div>
              </>
            )}
            {formData.housingType === 'rent' && (
              <div>
                <Label htmlFor="monthlyRent">Monthly Rent</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  min="0"
                  value={formData.monthlyRent}
                  onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
                  placeholder="2000"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Information */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthlyIncome">Monthly Income</Label>
              <Input
                id="monthlyIncome"
                type="number"
                min="0"
                value={formData.monthlyIncome}
                onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                placeholder="5000"
              />
            </div>
            <div>
              <Label htmlFor="monthlyAlimony">Monthly Alimony</Label>
              <Input
                id="monthlyAlimony"
                type="number"
                min="0"
                value={formData.monthlyAlimony}
                onChange={(e) => handleInputChange('monthlyAlimony', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="monthlyFixedExpenses">Monthly Fixed Expenses</Label>
              <Input
                id="monthlyFixedExpenses"
                type="number"
                min="0"
                value={formData.monthlyFixedExpenses}
                onChange={(e) => handleInputChange('monthlyFixedExpenses', e.target.value)}
                placeholder="1500"
              />
            </div>
            <div>
              <Label htmlFor="emergencyFund">Emergency Fund</Label>
              <Input
                id="emergencyFund"
                type="number"
                min="0"
                value={formData.emergencyFund}
                onChange={(e) => handleInputChange('emergencyFund', e.target.value)}
                placeholder="10000"
              />
            </div>
            <div>
              <Label htmlFor="totalDebt">Total Debt (excluding mortgage)</Label>
              <Input
                id="totalDebt"
                type="number"
                min="0"
                value={formData.totalDebt}
                onChange={(e) => handleInputChange('totalDebt', e.target.value)}
                placeholder="5000"
              />
            </div>
            <div>
              <Label htmlFor="estimatedSocialSecurityAt65">Estimated Social Security at 65</Label>
              <Input
                id="estimatedSocialSecurityAt65"
                type="number"
                min="0"
                value={formData.estimatedSocialSecurityAt65}
                onChange={(e) => handleInputChange('estimatedSocialSecurityAt65', e.target.value)}
                placeholder="1800"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="investmentGoals">Investment Goals</Label>
              <Select value={formData.investmentGoals} onValueChange={(value) => handleInputChange('investmentGoals', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investment goals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="wealth-building">Wealth Building</SelectItem>
                  <SelectItem value="income">Income Generation</SelectItem>
                  <SelectItem value="preservation">Capital Preservation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="riskTolerance">Risk Tolerance</Label>
              <Select value={formData.riskTolerance} onValueChange={(value) => handleInputChange('riskTolerance', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select risk tolerance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="investmentExperience">Investment Experience</Label>
              <Select value={formData.investmentExperience} onValueChange={(value) => handleInputChange('investmentExperience', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};