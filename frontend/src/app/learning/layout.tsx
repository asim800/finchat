// ============================================================================
// FILE: app/learning/layout.tsx
// Learning section layout with navigation
// ============================================================================

import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function LearningLayout({
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