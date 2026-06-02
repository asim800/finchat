// Monte Carlo sandbox page (Phase 4 Part C).
// Thin server wrapper. All work in MonteCarloPageClient (which calls /api/mc/simulate).

import { MonteCarloPageClient } from './_components/MonteCarloPageClient';

export const metadata = {
  title: 'Monte Carlo',
};

export default function MonteCarloPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">Monte Carlo Sandbox</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Probabilistic retirement projection. Uses your default portfolio&apos;s holdings
        and runs many simulated paths through accumulation and decumulation, with
        sequence-of-returns risk modeled honestly.
      </p>
      <MonteCarloPageClient />
    </div>
  );
}
