// ============================================================================
// FILE: components/profile/profile-page-wrapper.tsx
// Client wrapper for profile page with edit functionality
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EditIcon, UserIcon, HomeIcon, DollarSignIcon, TrendingUpIcon } from 'lucide-react';
import { ProfileEditForm } from './profile-edit-form';

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

interface ProfilePageWrapperProps {
  user: User;
}

export const ProfilePageWrapper: React.FC<ProfilePageWrapperProps> = ({ user: initialUser }) => {
  const [user, setUser] = useState<User>(initialUser);
  const [isEditing, setIsEditing] = useState(false);

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    setIsEditing(false);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCompletionPercentage = () => {
    const fields = [
      user.firstName, user.lastName, user.address, user.city, user.state, user.zipCode,
      user.phone, user.birthDate, user.housingType, user.monthlyIncome, user.employmentStatus,
      user.dependents, user.investmentGoals, user.riskTolerance, user.investmentExperience
    ];
    const completedFields = fields.filter(field => field !== null && field !== undefined && field !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };

  if (isEditing) {
    return (
      <ProfileEditForm 
        user={user} 
        onSave={handleProfileUpdate} 
        onCancel={() => setIsEditing(false)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal and financial information</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">Profile Completion</div>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${getCompletionPercentage()}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-700">{getCompletionPercentage()}%</span>
            </div>
          </div>
          <Button onClick={() => setIsEditing(true)} className="flex items-center space-x-2">
            <EditIcon className="h-4 w-4" />
            <span>Edit Profile</span>
          </Button>
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5" />
            <span>Personal Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">First Name</label>
              <p className="text-gray-900">{user.firstName || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Name</label>
              <p className="text-gray-900">{user.lastName || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-gray-900">{user.phone || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Birth Date</label>
              <p className="text-gray-900">{formatDate(user.birthDate)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Employment Status</label>
              <p className="text-gray-900 capitalize">{user.employmentStatus || 'Not specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HomeIcon className="h-5 w-5" />
            <span>Address & Housing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-gray-900">{user.address || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">City</label>
              <p className="text-gray-900">{user.city || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">State</label>
              <p className="text-gray-900">{user.state || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">ZIP Code</label>
              <p className="text-gray-900">{user.zipCode || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Housing Type</label>
              <div className="flex items-center space-x-2">
                <p className="text-gray-900 capitalize">{user.housingType || 'Not specified'}</p>
                {user.housingType && (
                  <Badge variant={user.housingType === 'own' ? 'success' : 'default'}>
                    {user.housingType === 'own' ? 'Homeowner' : 'Renter'}
                  </Badge>
                )}
              </div>
            </div>
            {user.housingType === 'own' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-500">Home Value</label>
                  <p className="text-gray-900">{formatCurrency(user.homeValue)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Monthly Mortgage</label>
                  <p className="text-gray-900">{formatCurrency(user.monthlyMortgage)}</p>
                </div>
              </>
            )}
            {user.housingType === 'rent' && (
              <div>
                <label className="text-sm font-medium text-gray-500">Monthly Rent</label>
                <p className="text-gray-900">{formatCurrency(user.monthlyRent)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSignIcon className="h-5 w-5" />
            <span>Financial Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Monthly Income</label>
              <p className="text-gray-900 font-semibold">{formatCurrency(user.monthlyIncome)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Dependents</label>
              <p className="text-gray-900">{user.dependents ?? 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Monthly Alimony</label>
              <p className="text-gray-900">{formatCurrency(user.monthlyAlimony)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Monthly Fixed Expenses</label>
              <p className="text-gray-900">{formatCurrency(user.monthlyFixedExpenses)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Emergency Fund</label>
              <p className="text-gray-900">{formatCurrency(user.emergencyFund)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Total Debt (excluding mortgage)</label>
              <p className="text-gray-900">{formatCurrency(user.totalDebt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Estimated Social Security at 65</label>
              <p className="text-gray-900">{formatCurrency(user.estimatedSocialSecurityAt65)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUpIcon className="h-5 w-5" />
            <span>Investment Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Investment Goals</label>
              <div className="flex items-center space-x-2">
                <p className="text-gray-900 capitalize">{user.investmentGoals || 'Not specified'}</p>
                {user.investmentGoals && (
                  <Badge variant="outline">{user.investmentGoals}</Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Risk Tolerance</label>
              <div className="flex items-center space-x-2">
                <p className="text-gray-900 capitalize">{user.riskTolerance || 'Not specified'}</p>
                {user.riskTolerance && (
                  <Badge 
                    variant={
                      user.riskTolerance === 'aggressive' ? 'destructive' : 
                      user.riskTolerance === 'moderate' ? 'warning' : 'success'
                    }
                  >
                    {user.riskTolerance}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Investment Experience</label>
              <div className="flex items-center space-x-2">
                <p className="text-gray-900 capitalize">{user.investmentExperience || 'Not specified'}</p>
                {user.investmentExperience && (
                  <Badge variant="outline">{user.investmentExperience}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Member Since</label>
              <p className="text-gray-900">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <p className="text-gray-900">{formatDate(user.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};