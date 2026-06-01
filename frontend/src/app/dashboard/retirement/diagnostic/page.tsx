// Retirement diagnostic — thin server wrapper (Phase 3.5 Package D).
// All workhorse logic lives in lib/retirement (extended with override + SS-toggle).

import { RetirementDiagnosticClient } from './_components/RetirementDiagnosticClient';

export const metadata = {
  title: 'Retirement diagnostic',
};

export default function RetirementDiagnosticPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">Retirement diagnostic</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Per-account breakdown of how the investable balance is computed, plus controls to
        toggle Social Security and override your monthly income/expenses. Useful for
        cross-checking against the Portfolio + Income pages.
      </p>
      <RetirementDiagnosticClient />
    </div>
  );
}
