// Monte Carlo capability (Phase 4 Part B) — public surface.
//
// Server-side only: the client and config-mapper read env vars + Portfolio
// shape; page components should call /api/mc/simulate over HTTP.

export * from './types';
export { runSimulation, checkMcHealth, HttpError } from './mc-client';
export { portfolioToConfig, type LifecycleInputs } from './portfolio-to-config';
