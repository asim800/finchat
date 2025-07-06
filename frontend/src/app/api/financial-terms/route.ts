// ============================================================================
// FILE: app/api/financial-terms/route.ts
// Public API route for financial terms (read-only)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {
      isActive: true // Only return active terms for public API
    };
    
    if (category) {
      where.category = category;
    }
    
    if (keyword) {
      where.keywords = {
        has: keyword
      };
    }
    
    if (search) {
      where.OR = [
        { term: { contains: search, mode: 'insensitive' } },
        { definition: { contains: search, mode: 'insensitive' } },
        { keywords: { hasSome: [search] } }
      ];
    }

    const terms = await prisma.financialTerm.findMany({
      where,
      select: {
        id: true,
        term: true,
        definition: true,
        category: true,
        keywords: true
      },
      orderBy: { term: 'asc' }
    });

    // Get unique categories for filtering
    const categories = await prisma.financialTerm.findMany({
      where: { 
        isActive: true,
        category: { not: null }
      },
      select: { category: true },
      distinct: ['category']
    });

    return NextResponse.json({ 
      terms,
      categories: categories.map(c => c.category).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching financial terms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}