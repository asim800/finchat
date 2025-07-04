// ============================================================================
// FILE: components/admin/admin-dashboard.tsx
// Main admin dashboard with tabs for user management and database access
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from './user-management';
import { DatabaseViewer } from './database-viewer';
import { AdminStats } from './admin-stats';
import { Card, CardContent } from '@/components/ui/card';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AdminDashboardProps {
  user: AdminUser;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <div>
              <p className="text-yellow-800 font-medium">Administrative Access</p>
              <p className="text-yellow-700 text-sm">
                You have full administrative privileges. Please use these tools responsibly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="database">Database Viewer</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Overview</h2>
            <AdminStats />
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">User Management</h2>
            <UserManagement adminUser={user} />
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Database Viewer</h2>
            <DatabaseViewer />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Settings</h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Current Admin</h3>
                    <p className="text-gray-600">
                      {user.firstName} {user.lastName} ({user.email})
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Security</h3>
                    <p className="text-gray-600">
                      All admin actions are logged and monitored for security.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Database</h3>
                    <p className="text-gray-600">
                      Database operations are read-only for security. Use the API for modifications.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};