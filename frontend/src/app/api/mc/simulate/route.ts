// HTTP face for the MC capability (Phase 4 Part B). Thin — no business logic.
// POST /api/mc/simulate  body: { portfolioId?, lifecycle: {...} }
// Resolves the user's portfolio → MC config → calls the Python service → returns response.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PortfolioService } from '@/lib/portfolio-service';
import { runSimulation, portfolioToConfig, type LifecycleInputs } from '@/lib/mc';

interface RequestBody {
  /** If omitted, uses the user's default portfolio. */
  portfolioId?: string;
  lifecycle: LifecycleInputs;
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.lifecycle?.retirementDate || !body.lifecycle?.horizonYears) {
    return NextResponse.json(
      { error: 'lifecycle.retirementDate and lifecycle.horizonYears required' },
      { status: 400 },
    );
  }

  // Resolve the portfolio (specific if provided, else first/default).
  let portfolioId = body.portfolioId;
  if (!portfolioId) {
    const portfolios = await PortfolioService.getUserPortfolios(user.id);
    if (portfolios.length === 0) {
      return NextResponse.json({ error: 'User has no portfolios' }, { status: 400 });
    }
    portfolioId = portfolios[0].id;
  }

  const portfolio = await PortfolioService.getPortfolioWithMarketValues(user.id, portfolioId);
  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  let config;
  try {
    config = portfolioToConfig(portfolio, body.lifecycle);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to build MC config';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const result = await runSimulation(config);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'MC service call failed';
    // Network errors → 502 (service down); other errors → 500.
    const status = /unavailable|fetch|network|ECONN|timed out/i.test(msg) ? 502 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
