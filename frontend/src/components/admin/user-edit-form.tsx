// ============================================================================
// FILE: components/admin/user-edit-form.tsx
// User edit form for admin user management
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface UserEditFormProps {
  user: User;
  onSuccess: () => void;
  adminUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export const UserEditForm: React.FC<UserEditFormProps> = ({ user, onSuccess, adminUser }) => {
  const [formData, setFormData] = useState({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updateData: Record<string, unknown> = {
        id: user.id,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role
      };

      // Only include password if it's provided
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Error updating user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const canChangeRole = adminUser.role === 'admin' && user.id !== adminUser.id;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleInputChange}
          disabled={!canChangeRole}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        {!canChangeRole && (
          <p className="text-xs text-gray-500 mt-1">
            {user.id === adminUser.id ? 'Cannot change your own role' : 'Insufficient permissions'}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="password">New Password (optional)</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Leave blank to keep current password"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update User'}
        </Button>
      </div>
    </form>
  );
};