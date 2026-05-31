// HTTP face of lib/income — thin wrapper, no business logic.
// GET  /api/income?kind=Income|Expense&category=...&atDate=YYYY-MM-DD
// POST /api/income

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  listCashFlowsByUser,
  createCashFlow,
  type CashFlowCategory,
  type CashFlowKind,
  type CreateCashFlowInput,
} from '@/lib/income';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get('kind') ?? undefined) as CashFlowKind | undefined;
  const category = (searchParams.get('category') ?? undefined) as CashFlowCategory | undefined;
  const atDate = searchParams.get('atDate') ?? undefined;

  try {
    const cashFlows = await listCashFlowsByUser(user.id, { kind, category, atDate });
    return NextResponse.json({ cashFlows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to list cash flows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: CreateCashFlowInput;
  try {
    body = (await request.json()) as CreateCashFlowInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const cashFlow = await createCashFlow(body, user.id);
    return NextResponse.json({ cashFlow }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create cash flow';
    const status = /required|must be|does not match/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
