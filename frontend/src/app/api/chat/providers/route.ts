// ============================================================================
// FILE: app/api/chat/providers/route.ts
// Get available LLM providers endpoint
// ============================================================================

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check what providers are available based on environment variables
    const providers: string[] = [];
    
    if (process.env.OPENAI_API_KEY) {
      providers.push('openai');
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push('anthropic');
    }
    
    // Default to simulation if no providers available
    if (providers.length === 0) {
      providers.push('simulation');
    }
    
    return NextResponse.json({
      providers,
      default: providers[0]
    });
    
  } catch (error) {
    console.error('Error getting providers:', error);
    return NextResponse.json(
      { 
        providers: ['simulation'],
        default: 'simulation'
      },
      { status: 200 } // Return 200 even on error with fallback
    );
  }
}