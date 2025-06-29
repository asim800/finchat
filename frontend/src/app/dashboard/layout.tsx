// ============================================================================
// FILE: app/dashboard/layout.tsx
// Dashboard layout with templated TopBar
// ============================================================================

import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function DashboardLayoutWrapper({
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