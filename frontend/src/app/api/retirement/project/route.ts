// HTTP face for lib/retirement (Phase 3). Thin: no business logic.
// POST /api/retirement/project  body: RetirementInputs → RetirementResult

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { projectRetirement, type RetirementInputs } from '@/lib/retirement';

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: RetirementInputs;
  try {
    body = (await request.json()) as RetirementInputs;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const result = await projectRetirement(user.id, body);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to project retirement';
    const status = /required|invalid|must be/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
