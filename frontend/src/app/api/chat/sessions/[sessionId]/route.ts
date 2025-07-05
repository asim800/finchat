// ============================================================================
// FILE: app/api/chat/sessions/[sessionId]/route.ts
// Get specific chat session with messages
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

// GET /api/chat/sessions/[sessionId] - Get specific session with messages
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const guestSessionId = searchParams.get('guestSessionId');
    const messageLimit = searchParams.get('messageLimit');
    
    // Try to get authenticated user
    const user = await getUserFromRequest(request);
    
    let session;
    
    if (user) {
      // Get user's chat history limit setting
      const userWithSettings = await prisma.user.findUnique({
        where: { id: user.id },
        select: { chatHistoryLimit: true }
      });
      
      const historyLimit = messageLimit ? parseInt(messageLimit) : (userWithSettings?.chatHistoryLimit || 5);
      
      // Get authenticated user's session
      session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
          isGuestSession: false
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: historyLimit
          }
        }
      });
      
      // Reverse messages to show oldest first (conversation order)
      if (session?.messages) {
        session.messages = session.messages.reverse();
      }
    } else if (guestSessionId) {
      // Default limit for guest sessions
      const guestHistoryLimit = messageLimit ? parseInt(messageLimit) : 5;
      
      // Get guest session
      session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          guestSessionId,
          isGuestSession: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: guestHistoryLimit
          }
        }
      });
      
      // Reverse messages to show oldest first (conversation order)
      if (session?.messages) {
        session.messages = session.messages.reverse();
      }
    } else {
      return NextResponse.json(
        { error: 'Authentication required or guest session ID missing' },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Chat session GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load chat session' },
      { status: 500 }
    );
  }
}

// PUT /api/chat/sessions/[sessionId] - Update session (e.g., title)
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params;
    const { title, guestSessionId } = await request.json();
    
    // Try to get authenticated user
    const user = await getUserFromRequest(request);
    
    let updatedSession;
    
    if (user) {
      // Update authenticated user's session
      updatedSession = await prisma.chatSession.updateMany({
        where: {
          id: sessionId,
          userId: user.id,
          isGuestSession: false
        },
        data: {
          title,
          updatedAt: new Date()
        }
      });
    } else if (guestSessionId) {
      // Update guest session
      updatedSession = await prisma.chatSession.updateMany({
        where: {
          id: sessionId,
          guestSessionId,
          isGuestSession: true
        },
        data: {
          title,
          updatedAt: new Date()
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Authentication required or guest session ID missing' },
        { status: 401 }
      );
    }

    if (updatedSession.count === 0) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat session PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update chat session' },
      { status: 500 }
    );
  }
}