// Retirement page — thin server wrapper (Phase 3).
// All workhorse logic lives in lib/retirement + /api/retirement/project.

import { RetirementPageClient } from './_components/RetirementPageClient';

export const metadata = {
  title: 'Retirement',
};

export default function RetirementPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Retirement</h1>
      <RetirementPageClient />
    </div>
  );
}
