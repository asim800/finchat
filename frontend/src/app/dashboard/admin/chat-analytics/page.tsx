// ============================================================================
// FILE: app/dashboard/admin/chat-analytics/page.tsx
// Admin page for chat analytics dashboard
// ============================================================================

import { Metadata } from 'next';
import ChatAnalyticsDashboard from '@/components/admin/chat-analytics-dashboard';

export const metadata: Metadata = {
  title: 'Chat Analytics | Admin Dashboard',
  description: 'Real-time analytics for chat query processing and performance monitoring',
};

export default function ChatAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ChatAnalyticsDashboard />
    </div>
  );
}