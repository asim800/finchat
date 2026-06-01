// HTTP face for the pull-a-profile flow (Phase 3.5 Package B).
// POST /api/reference/copy  body: { sourceUserId, sections } → CopyResult

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { copyReferenceSections, type CopySections } from '@/lib/reference';

interface RequestBody {
  sourceUserId: string;
  sections: CopySections;
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

  if (!body.sourceUserId) {
    return NextResponse.json({ error: 'sourceUserId required' }, { status: 400 });
  }
  if (!body.sections || (!body.sections.portfolios && !body.sections.income && !body.sections.profile)) {
    return NextResponse.json({ error: 'at least one section must be selected' }, { status: 400 });
  }

  try {
    const result = await copyReferenceSections(body.sourceUserId, user.id, body.sections);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to copy reference profile';
    // 'source is not a reference profile' / 'source and target users must differ' → 400
    const status = /required|differ|not a reference/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
