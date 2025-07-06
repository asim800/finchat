// ============================================================================
// FILE: app/api/admin/financial-terms/[id]/route.ts
// API routes for individual financial term operations (admin only)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const term = await prisma.financialTerm.findUnique({
      where: { id: params.id }
    });

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    return NextResponse.json({ term });
  } catch (error) {
    console.error('Error fetching financial term:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      where: { id: params.id }
    });

    if (!existingTerm) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Check if term name is being changed and if it conflicts with existing terms
    if (term !== existingTerm.term) {
      const conflictingTerm = await prisma.financialTerm.findUnique({
        where: { term }
      });

      if (conflictingTerm) {
        return NextResponse.json({ error: 'Term name already exists' }, { status: 409 });
      }
    }

    const updatedTerm = await prisma.financialTerm.update({
      where: { id: params.id },
      data: {
        term,
        definition,
        category: category || null,
        keywords: keywords || [],
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({ term: updatedTerm });
  } catch (error) {
    console.error('Error updating financial term:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const existingTerm = await prisma.financialTerm.findUnique({
      where: { id: params.id }
    });

    if (!existingTerm) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    await prisma.financialTerm.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Term deleted successfully' });
  } catch (error) {
    console.error('Error deleting financial term:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}