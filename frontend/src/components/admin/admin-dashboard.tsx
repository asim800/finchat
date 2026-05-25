// Main admin dashboard with tabs for user management and database access

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
      <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/40">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <div>
              <p className="text-yellow-800 dark:text-yellow-300 font-medium">Administrative Access</p>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                You have full administrative privileges. Please use these tools responsibly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="database">Database Viewer</TabsTrigger>
          <TabsTrigger value="financial-terms">Financial Terms</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">System Overview</h2>
            <AdminStats />
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">User Management</h2>
            <UserManagement adminUser={user} />
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Database Viewer</h2>
            <DatabaseViewer />
          </div>
        </TabsContent>

        <TabsContent value="financial-terms" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Financial Terms Management</h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Manage Financial Terms</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Create, update, and manage financial terms and definitions used throughout the application.
                    </p>
                    <a 
                      href="/admin/financial-terms" 
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      Manage Financial Terms
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Admin Settings</h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Current Admin</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {user.firstName} {user.lastName} ({user.email})
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Security</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      All admin actions are logged and monitored for security.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Database</h3>
                    <p className="text-gray-600 dark:text-gray-400">
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
