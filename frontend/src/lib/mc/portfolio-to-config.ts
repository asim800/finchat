// Portfolio → MCConfigRequest converter. The "tweak for end user" piece:
// take a user's saved holdings and produce a valid MC config (weights sum to
// exactly 1.0; lifecycle params filled from the page knobs).

import type { Portfolio } from '@/lib/types/portfolio';
import type { MCConfigRequest, TickerWeight } from './types';

export interface LifecycleInputs {
  /** ISO date string YYYY-MM-DD. */
  retirementDate: string;
  /** Years to project past retirement (service caps at 50). */
  horizonYears: number;
  /** Annual withdrawal in retirement (today's dollars). Default $40K if omitted. */
  annualWithdrawal?: number;
  /** Per-call sim count override; service default is 1000. */
  numSimulations?: number;
  /** Sampling method; service default is "both". Bootstrap needs historical yfinance data. */
  samplingMethod?: 'parametric' | 'bootstrap' | 'both';
}

/**
 * Build an MCConfigRequest from a Portfolio.
 *
 * Edge cases:
 * - Assets without a price are skipped (the MC engine has no way to weight them).
 * - Cash & HSA-as-cash accounts contribute zero unless they have priced asset rows.
 *   v1 just skips; future improvement: map to a low-volatility proxy ticker.
 * - Empty / all-cash portfolio → throws (the MC engine requires ticker weights).
 * - Single-asset portfolio → still valid (one ticker, weight = 1.0).
 *
 * Weight rounding: we normalize to sum exactly 1.0 by adjusting the largest
 * weight by the residual (Python validator accepts |sum − 1| < 1e-6).
 */
export function portfolioToConfig(
  portfolio: Pick<Portfolio, 'assets'>,
  lifecycle: LifecycleInputs,
): MCConfigRequest {
  const priced = portfolio.assets.filter((a) => a.price != null && a.price > 0 && a.quantity > 0);
  const totalValue = priced.reduce((sum, a) => sum + a.quantity * (a.price as number), 0);

  if (totalValue <= 0 || priced.length === 0) {
    throw new Error('Portfolio has no priced assets — cannot build MC config');
  }

  const rawTickers: TickerWeight[] = priced.map((a) => ({
    symbol: a.symbol,
    weight: (a.quantity * (a.price as number)) / totalValue,
  }));

  // If the same symbol appears multiple times across accounts (e.g. VTI in two
  // accounts), the service requires unique symbols. Collapse duplicates by summing weights.
  const merged = new Map<string, number>();
  for (const t of rawTickers) {
    merged.set(t.symbol, (merged.get(t.symbol) ?? 0) + t.weight);
  }

  const tickers: TickerWeight[] = Array.from(merged.entries()).map(([symbol, weight]) => ({
    symbol,
    weight,
  }));

  // Normalize weights to sum exactly 1.0.
  const sum = tickers.reduce((s, t) => s + t.weight, 0);
  if (Math.abs(sum - 1) > 1e-6) {
    const largest = tickers.reduce((a, b) => (a.weight > b.weight ? a : b));
    largest.weight += 1 - sum;
  }

  return {
    initial_portfolio_value: totalValue,
    retirement_date: lifecycle.retirementDate,
    simulation_horizon_years: lifecycle.horizonYears,
    tickers,
    ...(lifecycle.annualWithdrawal != null && { annual_withdrawal_amount: lifecycle.annualWithdrawal }),
    ...(lifecycle.numSimulations != null && { num_simulations: lifecycle.numSimulations }),
    ...(lifecycle.samplingMethod != null && { sampling_method: lifecycle.samplingMethod }),
  };
}
