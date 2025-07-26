// ============================================================================
// FILE: src/app/api/fastapi/[...slug]/route.ts
// Proxy API route to forward requests to FastAPI chat engine
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_CHAT_URL = process.env.FASTAPI_CHAT_URL || 'http://localhost:8000';

async function forwardRequest(request: NextRequest, method: string) {
  try {
    // Extract the path after /api/fastapi/
    const { pathname, search } = new URL(request.url);
    let slugPath = pathname.replace('/api/fastapi/', '');
    
    // Handle root path case - if slugPath is empty, don't add extra slash
    const targetUrl = slugPath === '' 
      ? `${FASTAPI_CHAT_URL}${search}` 
      : `${FASTAPI_CHAT_URL}/${slugPath}${search}`;
    
    console.log(`🔄 Proxying ${method} request: ${pathname} -> ${targetUrl}`);

    // Prepare headers, excluding certain headers that might cause issues
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // Prepare the request body for non-GET requests
    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.text();
      } catch (error) {
        console.warn('Could not read request body:', error);
      }
    }

    // Forward the request to FastAPI
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    // Get response data
    const responseData = await response.text();
    
    // Prepare response headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Forward most headers, but handle CORS properly
      if (!['connection', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Ensure CORS headers are set for the frontend domain
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Proxy request failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 502 }
    );
  }
}

// Handle all HTTP methods
export async function GET(request: NextRequest) {
  return forwardRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return forwardRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return forwardRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return forwardRequest(request, 'DELETE');
}

export async function PATCH(request: NextRequest) {
  return forwardRequest(request, 'PATCH');
}

export async function OPTIONS(request: NextRequest) {
  // Handle CORS preflight requests
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}