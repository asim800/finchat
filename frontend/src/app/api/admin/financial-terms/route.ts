// ============================================================================
// FILE: app/api/admin/financial-terms/route.ts
// API routes for financial terms CRUD operations (admin only)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const isActive = searchParams.get('active');

    const where: Record<string, unknown> = {};
    
    if (category) {
      where.category = category;
    }
    
    if (keyword) {
      where.keywords = {
        has: keyword
      };
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const terms = await prisma.financialTerm.findMany({
      where,
      orderBy: { term: 'asc' }
    });

    return NextResponse.json({ terms });
  } catch (error) {
    console.error('Error fetching financial terms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { term, definition, category, keywords, isActive } = body;

    if (!term || !definition) {
      return NextResponse.json({ error: 'Term and definition are required' }, { status: 400 });
    }

    const existingTerm = await prisma.financialTerm.findUnique({
      where: { term }
    });

    if (existingTerm) {
      return NextResponse.json({ error: 'Term already exists' }, { status: 409 });
    }

    const newTerm = await prisma.financialTerm.create({
      data: {
        term,
        definition,
        category: category || null,
        keywords: keywords || [],
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({ term: newTerm }, { status: 201 });
  } catch (error) {
    console.error('Error creating financial term:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}