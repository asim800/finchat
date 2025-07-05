// ============================================================================
// FILE: app/api/chat/sessions/route.ts
// Chat sessions API for managing chat history
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/chat/sessions - Get user's chat sessions or guest sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestSessionId = searchParams.get('guestSessionId');
    
    // Try to get authenticated user
    const user = await getUserFromRequest(request);
    
    if (user) {
      // Get user's chat history limit setting
      const userWithSettings = await prisma.user.findUnique({
        where: { id: user.id },
        select: { chatHistoryLimit: true }
      });
      
      const historyLimit = userWithSettings?.chatHistoryLimit || 5;
      
      // Get authenticated user's sessions with limit
      const sessions = await prisma.chatSession.findMany({
        where: { 
          userId: user.id,
          isGuestSession: false
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 1 // Just get first message for preview
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: historyLimit
      });

      return NextResponse.json({ sessions, historyLimit });
    } else if (guestSessionId) {
      // Get guest sessions with default limit of 5
      const guestHistoryLimit = 5;
      
      const sessions = await prisma.chatSession.findMany({
        where: { 
          guestSessionId,
          isGuestSession: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 1
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: guestHistoryLimit
      });

      return NextResponse.json({ sessions, historyLimit: guestHistoryLimit });
    } else {
      return NextResponse.json(
        { error: 'Authentication required or guest session ID missing' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Chat sessions GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load chat sessions' },
      { status: 500 }
    );
  }
}

// POST /api/chat/sessions - Create new chat session
export async function POST(request: NextRequest) {
  try {
    const { guestSessionId, title } = await request.json();
    
    // Try to get authenticated user
    const user = await getUserFromRequest(request);
    
    if (user) {
      // Create authenticated user session
      const session = await prisma.chatSession.create({
        data: {
          userId: user.id,
          title: title || null,
          isGuestSession: false
        }
      });

      return NextResponse.json({ session });
    } else if (guestSessionId) {
      // Create guest session with 7-day expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const session = await prisma.chatSession.create({
        data: {
          guestSessionId,
          title: title || null,
          isGuestSession: true,
          expiresAt
        }
      });

      return NextResponse.json({ session });
    } else {
      return NextResponse.json(
        { error: 'Authentication required or guest session ID missing' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Chat sessions POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/sessions - Delete a chat session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const guestSessionId = searchParams.get('guestSessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Try to get authenticated user
    const user = await getUserFromRequest(request);
    
    if (user) {
      // Delete authenticated user's session
      const deletedSession = await prisma.chatSession.deleteMany({
        where: {
          id: sessionId,
          userId: user.id,
          isGuestSession: false
        }
      });

      if (deletedSession.count === 0) {
        return NextResponse.json(
          { error: 'Session not found or unauthorized' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } else if (guestSessionId) {
      // Delete guest session
      const deletedSession = await prisma.chatSession.deleteMany({
        where: {
          id: sessionId,
          guestSessionId,
          isGuestSession: true
        }
      });

      if (deletedSession.count === 0) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Authentication required or guest session ID missing' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Chat sessions DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat session' },
      { status: 500 }
    );
  }
}