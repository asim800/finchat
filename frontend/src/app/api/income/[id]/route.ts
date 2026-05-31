// HTTP face of lib/income — thin wrapper, no business logic.
// GET    /api/income/[id]
// PUT    /api/income/[id]
// DELETE /api/income/[id]

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getCashFlow, updateCashFlow, deleteCashFlow, type UpdateCashFlowInput } from '@/lib/income';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const cashFlow = await getCashFlow(id, user.id);
    if (!cashFlow) return NextResponse.json({ error: 'Cash flow not found' }, { status: 404 });
    return NextResponse.json({ cashFlow });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to fetch cash flow' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: UpdateCashFlowInput;
  try {
    body = (await request.json()) as UpdateCashFlowInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const cashFlow = await updateCashFlow(id, body, user.id);
    return NextResponse.json({ cashFlow });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update cash flow';
    const status = /not found|not owned/i.test(msg) ? 404 : /must be|required|does not match/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await deleteCashFlow(id, user.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete cash flow';
    const status = /not found|not owned/i.test(msg) ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
