// HTTP face of lib/accounts — thin wrapper, no business logic.
// GET  /api/accounts            → list current user's accounts
// POST /api/accounts            → create an account (optionally with realEstate in one call)

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  listAccountsByUser,
  createAccount,
  upsertRealEstateDetails,
  type CreateAccountInput,
  type RealEstateDetailsInput,
} from '@/lib/accounts';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get('portfolioId') ?? undefined;
  const isRetirementParam = searchParams.get('isRetirement');
  const isRetirement = isRetirementParam === null ? undefined : isRetirementParam === 'true';

  try {
    const accounts = await listAccountsByUser(user.id, { portfolioId, isRetirement });
    return NextResponse.json({ accounts });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to list accounts' }, { status: 500 });
  }
}

type CreateAccountBody = CreateAccountInput & { realEstate?: RealEstateDetailsInput };

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: CreateAccountBody;
  try {
    body = (await request.json()) as CreateAccountBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { realEstate, ...accountInput } = body;
    let account = await createAccount(accountInput, user.id);

    // If RealEstate type and details supplied, attach in same request.
    if (realEstate && account.accountType === 'RealEstate') {
      account = await upsertRealEstateDetails(account.id, realEstate, user.id);
    }

    return NextResponse.json({ account }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create account';
    const status = /required|invalid|not found/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
