// ============================================================================
// FILE: app/api/admin/users/route.ts
// Admin API for user management (CRUD operations)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ADMIN_UNAUTHORIZED } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/admin/users - Get all users with pagination and search
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          // Profile fields for admin view
          phone: true,
          city: true,
          state: true,
          employmentStatus: true,
          // Count related data
          _count: {
            select: {
              portfolio: true,
              chatSessions: true,
              accounts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(ADMIN_UNAUTHORIZED, { status: 403 });
    }
    
    console.error('Admin users GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);
    
    const body = await request.json();
    const { email, password, firstName, lastName, role = 'user' } = body;
    
    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, password, firstName, and lastName are required' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });
    
    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(ADMIN_UNAUTHORIZED, { status: 403 });
    }
    
    console.error('Admin users POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users - Update user
export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);
    
    const body = await request.json();
    const { id, email, firstName, lastName, role, password } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Build update data
    const updateData: any = {};
    
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (role) updateData.role = role;
    
    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    
    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(ADMIN_UNAUTHORIZED, { status: 403 });
    }
    
    console.error('Admin users PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users - Delete user
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Prevent admin from deleting themselves
    if (userId === admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own admin account' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Delete user (cascading deletes will handle related data)
    await prisma.user.delete({
      where: { id: userId }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${user.email} deleted successfully` 
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(ADMIN_UNAUTHORIZED, { status: 403 });
    }
    
    console.error('Admin users DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}