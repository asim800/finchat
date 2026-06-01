// Types for the MC capability (Phase 4 Part B).
//
// TS mirror of the Python service's MCConfigRequest + MCSimulationResponse —
// only the fields we use. The Python service exposes ~15 optional config fields
// (sampling_method, sweep params, jobs, etc.); we don't surface most of them.
// When we need them, expand the shape here, not in the call sites.

// ---- request ----

export interface TickerWeight {
  symbol: string;
  /** 0..1; the request's tickers[].weight must sum to ~1.0 (server enforces). */
  weight: number;
}

export interface MCConfigRequest {
  /** Required: dollar value at simulation start (today). */
  initial_portfolio_value: number;
  /** Required: ISO date (YYYY-MM-DD) when accumulation flips to decumulation. */
  retirement_date: string;
  /** Required: years to project past retirement. Service caps at 50. */
  simulation_horizon_years: number;
  /** Required: 1+ holdings with weights summing to ~1.0. */
  tickers: TickerWeight[];

  // ---- optional knobs (sensible service defaults; expose only what the UI needs) ----
  /** Default 1000 in service; cap 50,000. Lower (100) for fast smoke tests. */
  num_simulations?: number;
  /** "parametric" | "bootstrap" | "both" (default). Bootstrap needs historical yfinance data. */
  sampling_method?: 'parametric' | 'bootstrap' | 'both';
  /** Default $40K. Annual withdrawal in retirement. */
  annual_withdrawal_amount?: number;
  /** Default 0.03 (3%). */
  inflation_rate?: number;
}

// ---- response (fan-chart shape; Recharts-ready) ----

export interface FanChartPoint {
  period: number;
  date: string; // YYYY-MM-DD
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  mean?: number;
}

export interface FanChartData {
  data: FanChartPoint[];
  phase: 'accumulation' | 'decumulation';
  sampling_method: 'parametric' | 'bootstrap';
}

export interface SimulationMetadata {
  num_simulations: number;
  simulation_horizon_years: number;
  total_periods: number;
  tickers: string[];
  weights: number[];
  exec_time_ms?: number | null;
}

export interface MCSimulationResponse {
  success: boolean;
  metadata: SimulationMetadata;
  /** Keyed by sampling_method ("parametric" or "bootstrap"). */
  accumulation: Record<string, FanChartData>;
  decumulation: Record<string, FanChartData>;
  /** 0..1 by sampling method. Probability the portfolio survives to end of horizon. */
  success_rates: Record<string, number>;
  /** Per-method percentile snapshots, e.g. `{ parametric: { '5': 100000, '50': 300000, '95': 800000 } }`. */
  percentiles_at_retirement: Record<string, Record<string, number>>;
  percentiles_at_horizon: Record<string, Record<string, number>>;
  status?: 'completed' | 'running' | 'failed' | 'cancelled';
  error?: string | null;
}
