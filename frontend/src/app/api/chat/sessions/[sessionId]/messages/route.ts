// ============================================================================
// FILE: app/api/chat/sessions/[sessionId]/messages/route.ts
// API endpoint for loading more messages with pagination
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

// GET /api/chat/sessions/[sessionId]/messages - Load more messages with pagination
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const guestSessionId = searchParams.get('guestSessionId');
    const beforeMessageId = searchParams.get('before');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 10;
    
    if (!beforeMessageId) {
      return NextResponse.json(
        { error: 'before parameter is required' },
        { status: 400 }
      );
    }
    
    // Try to get authenticated user
    const user = await getUserFromRequest(request);
    
    const whereCondition: {
      sessionId: string;
      id: {
        lt: string;
      };
      userId?: string;
    } = {
      sessionId,
      id: {
        lt: beforeMessageId // Load messages before the given message ID
      }
    };
    
    // Verify session ownership
    if (user) {
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
          isGuestSession: false
        }
      });
      
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found or unauthorized' },
          { status: 404 }
        );
      }
    } else if (guestSessionId) {
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          guestSessionId,
          isGuestSession: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });
      
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found or expired' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Authentication required or guest session ID missing' },
        { status: 401 }
      );
    }
    
    // Load messages before the specified message ID
    const messages = await prisma.message.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    // Reverse to get chronological order (oldest first)
    const orderedMessages = messages.reverse();
    
    return NextResponse.json({ 
      messages: orderedMessages,
      hasMore: messages.length === limit // If we got the full limit, there might be more
    });
    
  } catch (error) {
    console.error('Load more messages error:', error);
    return NextResponse.json(
      { error: 'Failed to load more messages' },
      { status: 500 }
    );
  }
}