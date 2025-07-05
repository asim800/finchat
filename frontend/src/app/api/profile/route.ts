// ============================================================================
// FILE: app/api/profile/route.ts
// API endpoint for user profile management
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user profile with all fields
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
        birthDate: true,
        housingType: true,
        homeValue: true,
        monthlyRent: true,
        monthlyMortgage: true,
        monthlyIncome: true,
        monthlyAlimony: true,
        monthlyFixedExpenses: true,
        employmentStatus: true,
        dependents: true,
        emergencyFund: true,
        totalDebt: true,
        estimatedSocialSecurityAt65: true,
        investmentGoals: true,
        riskTolerance: true,
        investmentExperience: true,
        chatHistoryLimit: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: userProfile });

  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    const numericFields = [
      'homeValue', 'monthlyRent', 'monthlyMortgage', 'monthlyIncome',
      'monthlyAlimony', 'monthlyFixedExpenses', 'emergencyFund', 
      'totalDebt', 'estimatedSocialSecurityAt65'
    ];

    for (const field of numericFields) {
      if (body[field] !== null && body[field] !== undefined) {
        const value = parseFloat(body[field]);
        if (isNaN(value) || value < 0) {
          return NextResponse.json(
            { error: `${field} must be a valid positive number` },
            { status: 400 }
          );
        }
      }
    }

    // Validate dependents
    if (body.dependents !== null && body.dependents !== undefined) {
      const dependents = parseInt(body.dependents);
      if (isNaN(dependents) || dependents < 0) {
        return NextResponse.json(
          { error: 'Dependents must be a valid non-negative integer' },
          { status: 400 }
        );
      }
    }

    // Validate chat history limit
    if (body.chatHistoryLimit !== null && body.chatHistoryLimit !== undefined) {
      const chatHistoryLimit = parseInt(body.chatHistoryLimit);
      if (isNaN(chatHistoryLimit) || chatHistoryLimit < 1 || chatHistoryLimit > 50) {
        return NextResponse.json(
          { error: 'Chat history limit must be between 1 and 50' },
          { status: 400 }
        );
      }
    }

    // Validate birth date
    if (body.birthDate) {
      const birthDate = new Date(body.birthDate);
      const now = new Date();
      if (birthDate > now) {
        return NextResponse.json(
          { error: 'Birth date cannot be in the future' },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zipCode: body.zipCode || null,
        phone: body.phone || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        housingType: body.housingType || null,
        homeValue: body.homeValue ? parseFloat(body.homeValue) : null,
        monthlyRent: body.monthlyRent ? parseFloat(body.monthlyRent) : null,
        monthlyMortgage: body.monthlyMortgage ? parseFloat(body.monthlyMortgage) : null,
        monthlyIncome: body.monthlyIncome ? parseFloat(body.monthlyIncome) : null,
        monthlyAlimony: body.monthlyAlimony ? parseFloat(body.monthlyAlimony) : null,
        monthlyFixedExpenses: body.monthlyFixedExpenses ? parseFloat(body.monthlyFixedExpenses) : null,
        employmentStatus: body.employmentStatus || null,
        dependents: body.dependents ? parseInt(body.dependents) : null,
        emergencyFund: body.emergencyFund ? parseFloat(body.emergencyFund) : null,
        totalDebt: body.totalDebt ? parseFloat(body.totalDebt) : null,
        estimatedSocialSecurityAt65: body.estimatedSocialSecurityAt65 ? parseFloat(body.estimatedSocialSecurityAt65) : null,
        investmentGoals: body.investmentGoals || null,
        riskTolerance: body.riskTolerance || null,
        investmentExperience: body.investmentExperience || null,
        chatHistoryLimit: body.chatHistoryLimit ? parseInt(body.chatHistoryLimit) : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
        birthDate: true,
        housingType: true,
        homeValue: true,
        monthlyRent: true,
        monthlyMortgage: true,
        monthlyIncome: true,
        monthlyAlimony: true,
        monthlyFixedExpenses: true,
        employmentStatus: true,
        dependents: true,
        emergencyFund: true,
        totalDebt: true,
        estimatedSocialSecurityAt65: true,
        investmentGoals: true,
        riskTolerance: true,
        investmentExperience: true,
        chatHistoryLimit: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ 
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}