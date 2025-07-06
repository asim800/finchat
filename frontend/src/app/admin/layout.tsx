// ============================================================================
// FILE: app/admin/layout.tsx
// Admin section layout with navigation
// ============================================================================

import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}