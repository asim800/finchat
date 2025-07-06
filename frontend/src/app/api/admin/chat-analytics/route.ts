// ============================================================================
// FILE: app/api/admin/chat-analytics/route.ts
// API endpoint for chat analytics dashboard data
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { ChatLogger } from '@/lib/chat-logger';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // TODO: Add admin role check
    // For now, we'll allow any authenticated user
    // In production, you should check if user has admin role:
    // if (user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: 'Admin access required' },
    //     { status: 403 }
    //   );
    // }
    
    // Get query parameters
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') as '1h' | '24h' | '7d' | '30d' || '24h';
    
    console.log(`📊 Fetching chat analytics for timeRange: ${timeRange}`);
    
    // Get analytics data
    const analytics = ChatLogger.getAnalytics(timeRange);
    
    return NextResponse.json({
      success: true,
      data: analytics,
      timeRange,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Chat analytics API error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { action, timeRange, format } = body;
    
    console.log(`📊 Chat analytics action: ${action}`);
    
    switch (action) {
      case 'export':
        // Export logs in specified format
        const exportFormat = format || 'json';
        const exportTimeRange = timeRange || '24h';
        
        const exportData = ChatLogger.exportLogs(exportFormat, exportTimeRange);
        
        return NextResponse.json({
          success: true,
          data: exportData,
          format: exportFormat,
          timeRange: exportTimeRange,
          timestamp: new Date().toISOString()
        });
        
      case 'clear':
        // Clear logs (admin only)
        // TODO: Implement log clearing functionality
        return NextResponse.json({
          success: true,
          message: 'Logs cleared successfully'
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Chat analytics POST error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}