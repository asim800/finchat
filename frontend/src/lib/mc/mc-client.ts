// Typed client for the in-repo Monte Carlo simulation service (Phase 4 Part B).
//
// Server-side only — uses MC_SERVICE_URL env var (default http://localhost:8001).
// Page consumers should NOT import this directly; call /api/mc/simulate instead.
// Server-side reuse (Part D when it ships: lib/retirement) imports this directly.

import { httpPost, HttpError } from '@/lib/http';
import type { MCConfigRequest, MCSimulationResponse } from './types';

const MC_BASE_URL = process.env.MC_SERVICE_URL ?? 'http://localhost:8001';

/**
 * POST /api/mc/simulate against the Python service. Default sim timeout 60s —
 * the service is fast for 100-1000 sims, slower for 10k+. Bump per-call if needed.
 */
export async function runSimulation(
  config: MCConfigRequest,
  opts: { timeoutMs?: number } = {},
): Promise<MCSimulationResponse> {
  return httpPost<MCSimulationResponse>(
    `${MC_BASE_URL}/api/mc/simulate`,
    config,
    {
      timeoutMs: opts.timeoutMs ?? 60_000,
      networkErrorLabel: 'MC service unavailable',
    },
  );
}

/** Health check helper (used by diagnostic + future readiness gates). */
export async function checkMcHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const res = await fetch(`${MC_BASE_URL}/health`, { signal: AbortSignal.timeout(5_000) });
    return { healthy: res.ok };
  } catch (e) {
    return { healthy: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

export { HttpError };
