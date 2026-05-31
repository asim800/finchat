// HTTP face of lib/accounts — thin wrapper, no business logic.
// GET    /api/accounts/[id]   → fetch a single account
// PUT    /api/accounts/[id]   → update an account (optionally with realEstate in one call)
// DELETE /api/accounts/[id]   → delete an account

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  getAccount,
  updateAccount,
  deleteAccount,
  upsertRealEstateDetails,
  type UpdateAccountInput,
  type RealEstateDetailsInput,
} from '@/lib/accounts';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const account = await getAccount(id, user.id);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    return NextResponse.json({ account });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to fetch account' }, { status: 500 });
  }
}

type UpdateAccountBody = UpdateAccountInput & { realEstate?: RealEstateDetailsInput };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: UpdateAccountBody;
  try {
    body = (await request.json()) as UpdateAccountBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { realEstate, ...accountInput } = body;
    let account = await updateAccount(id, accountInput, user.id);

    if (realEstate && account.accountType === 'RealEstate') {
      account = await upsertRealEstateDetails(id, realEstate, user.id);
    }

    return NextResponse.json({ account });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update account';
    const status = /not found|not owned/i.test(msg) ? 404 : /invalid|required/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await deleteAccount(id, user.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete account';
    const status = /not found|not owned/i.test(msg) ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
