// ============================================================================
// FILE: app/api/chat/langgraph/route.ts
// LangGraph-enabled chat API endpoint
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { langGraphUnifiedService } from '@/lib/langgraph/services/langgraph-unified-service';
import { getUserFromRequest } from '@/lib/auth';
import { ChatService } from '@/lib/chat-service';
import { PortfolioService } from '@/lib/portfolio-service';
import { GuestPortfolioService } from '@/lib/guest-portfolio';
import { conversationAnalytics, trackChatMessage, trackChatResponse } from '@/lib/conversation-analytics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message, 
      provider, 
      portfolioData, 
      userPreferences, 
      sessionId, 
      guestSessionId, 
      requestId,
      enableStreaming = false,
      forceBackend = false
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 LangGraph API processing: "${message.substring(0, 100)}..."`);

    // Check if user is authenticated
    const user = await getUserFromRequest(request);
    const isGuestMode = !user;

    // Generate unique request ID for tracking
    const trackingRequestId = requestId || conversationAnalytics.generateRequestId();
    const sessionIdForTracking = sessionId || guestSessionId;

    // Track the start of this conversation
    trackChatMessage(
      trackingRequestId,
      sessionIdForTracking,
      message.trim(),
      user?.id,
      isGuestMode ? guestSessionId : undefined
    );

    // Get or create chat session for persistence
    let chatSession;
    try {
      if (sessionId) {
        const existingMessages = await ChatService.getSessionMessages(sessionId);
        chatSession = { id: sessionId, existingMessages };
      } else {
        const sessionTitle = ChatService.generateSessionTitle(message);
        chatSession = await ChatService.getOrCreateSession(
          user?.id,
          guestSessionId,
          sessionTitle
        );
      }
    } catch (sessionError) {
      console.error('Session management error:', sessionError);
      chatSession = null;
    }

    // Get user's portfolios for context
    let userPortfolios: any[] = [];
    if (user?.id && !isGuestMode) {
      try {
        userPortfolios = await PortfolioService.getUserPortfolios(user.id);
      } catch (error) {
        console.error('Error fetching user portfolios:', error);
      }
    } else if (isGuestMode && guestSessionId) {
      try {
        const guestData = GuestPortfolioService.getGuestPortfolio(guestSessionId);
        if (guestData?.assets) {
          userPortfolios = [{ assets: guestData.assets, name: 'Guest Portfolio' }];
        }
      } catch (error) {
        console.error('Error fetching guest portfolio:', error);
      }
    }

    // Save user message to session
    if (chatSession) {
      try {
        await ChatService.saveMessage(
          chatSession.id,
          'user',
          message,
          'user'
        );
      } catch (saveError) {
        console.error('Failed to save user message:', saveError);
      }
    }

    // Process with LangGraph unified service
    const processingOptions = {
      userId: user?.id,
      guestSessionId: isGuestMode ? guestSessionId : undefined,
      isGuestMode,
      portfolios: userPortfolios,
      userPreferences: userPreferences || {},
      sessionId: chatSession?.id,
      provider: provider || 'openai',
      requestId: trackingRequestId,
      forceBackend
    };

    let result;
    
    if (enableStreaming) {
      // Handle streaming response
      return handleStreamingResponse(
        message,
        processingOptions,
        chatSession,
        trackingRequestId
      );
    } else {
      // Handle regular response
      result = await langGraphUnifiedService.processMessage(message, processingOptions);
    }

    // Track successful response
    trackChatResponse(trackingRequestId, result.content, result.success);

    // Save assistant message to session
    if (chatSession && result.success) {
      try {
        await ChatService.saveMessage(
          chatSession.id,
          'assistant',
          result.content,
          result.provider || 'langgraph',
          result.chartData ? { chartData: result.chartData } : undefined
        );
      } catch (saveError) {
        console.error('Failed to save assistant message:', saveError);
      }
    }

    // Return response in existing format for backward compatibility
    return NextResponse.json({
      content: result.content,
      provider: result.provider || 'langgraph',
      processingType: result.processingType,
      confidence: result.confidence,
      executionTimeMs: result.executionTimeMs,
      chartData: result.chartData,
      isGuestMode,
      sessionId: chatSession?.id,
      metadata: {
        ...result.metadata,
        langgraphEnabled: true,
        version: '1.0.0'
      },
      error: result.error
    });

  } catch (error) {
    console.error('❌ LangGraph API error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        fallback: 'I apologize, but I\'m having trouble processing your request right now. Please try again.',
        langgraphEnabled: true
      },
      { status: 500 }
    );
  }
}

/**
 * Handle streaming response for real-time updates
 */
async function handleStreamingResponse(
  message: string,
  processingOptions: any,
  chatSession: any,
  requestId: string
) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const streamGenerator = langGraphUnifiedService.streamMessage(message, processingOptions);
        
        for await (const chunk of streamGenerator) {
          // Send chunk to client
          const data = {
            content: chunk.content || '',
            provider: chunk.provider || 'langgraph',
            processingType: chunk.processingType,
            confidence: chunk.confidence,
            executionTimeMs: chunk.executionTimeMs,
            chartData: chunk.chartData,
            metadata: {
              ...chunk.metadata,
              langgraphEnabled: true,
              streaming: true
            },
            error: chunk.error
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }
        
        // Track final response
        // Note: In a real implementation, you'd want to track the final chunk
        trackChatResponse(requestId, 'Streaming response completed', true);
        
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        
        const errorData = {
          error: error instanceof Error ? error.message : 'Streaming error',
          langgraphEnabled: true,
          streaming: true
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Health check endpoint
export async function GET() {
  try {
    const status = await langGraphUnifiedService.getHealthStatus();
    
    return NextResponse.json({
      status: 'healthy',
      langgraphEnabled: true,
      services: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed',
        langgraphEnabled: false,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}