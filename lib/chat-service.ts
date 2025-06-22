// ============================================================================
// FILE: lib/chat-service.ts
// Chat service for managing chat sessions and messages
// ============================================================================

import { prisma } from './db';
import type { ChatSession as PrismaChatSession, Message as PrismaMessage, Prisma } from '@prisma/client';

export type ChatSession = PrismaChatSession & {
  messages?: PrismaMessage[];
  messageCount?: number;
  _count?: { messages: number };
};

export type ChatMessage = PrismaMessage;

export class ChatService {
  
  // Create or get existing chat session
  static async getOrCreateSession(
    userId?: string,
    guestSessionId?: string,
    title?: string
  ): Promise<ChatSession> {
    if (userId) {
      // For authenticated users, create a new session each time or get the latest
      let session = await prisma.chatSession.findFirst({
        where: {
          userId,
          isGuestSession: false
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Create new session if none exists or if the latest has messages
      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            userId,
            title,
            isGuestSession: false
          }
        });
      }

      return session;
    } else if (guestSessionId) {
      // For guests, try to find existing session first
      let session = await prisma.chatSession.findFirst({
        where: {
          guestSessionId,
          isGuestSession: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (!session) {
        // Create new guest session with 7-day expiration
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        session = await prisma.chatSession.create({
          data: {
            guestSessionId,
            title,
            isGuestSession: true,
            expiresAt
          }
        });
      }

      return session;
    } else {
      throw new Error('Either userId or guestSessionId must be provided');
    }
  }

  // Save a message to a session
  static async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    provider?: string,
    metadata?: Prisma.InputJsonValue
  ): Promise<ChatMessage> {
    const message = await prisma.message.create({
      data: {
        sessionId,
        role,
        content,
        provider,
        metadata
      }
    });

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    return message;
  }

  // Get session messages
  static async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });
  }

  // Generate session title from first message
  static generateSessionTitle(firstMessage: string): string {
    const words = firstMessage.trim().split(' ').slice(0, 6);
    let title = words.join(' ');
    
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    return title || 'New Chat';
  }

  // Update session title
  static async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { 
        title,
        updatedAt: new Date()
      }
    });
  }

  // Delete session and all messages
  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await prisma.chatSession.delete({
        where: { id: sessionId }
      });
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  // Clean up expired guest sessions
  static async cleanupExpiredGuestSessions(): Promise<number> {
    const result = await prisma.chatSession.deleteMany({
      where: {
        isGuestSession: true,
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  }

  // Get user's sessions
  static async getUserSessions(userId: string): Promise<ChatSession[]> {
    return await prisma.chatSession.findMany({
      where: {
        userId,
        isGuestSession: false
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
      orderBy: { updatedAt: 'desc' }
    });
  }

  // Get guest sessions
  static async getGuestSessions(guestSessionId: string): Promise<ChatSession[]> {
    return await prisma.chatSession.findMany({
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
      orderBy: { updatedAt: 'desc' }
    });
  }

  // Convert guest session to user session (when guest registers)
  static async convertGuestSessionToUser(
    guestSessionId: string,
    userId: string
  ): Promise<number> {
    const result = await prisma.chatSession.updateMany({
      where: {
        guestSessionId,
        isGuestSession: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      data: {
        userId,
        guestSessionId: null,
        isGuestSession: false,
        expiresAt: null
      }
    });

    return result.count;
  }
}