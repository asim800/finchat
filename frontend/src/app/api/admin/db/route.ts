// ============================================================================
// FILE: app/api/admin/db/route.ts
// Admin API for direct database queries (READ-ONLY for security)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ADMIN_UNAUTHORIZED } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';

// GET /api/admin/db - Execute read-only database queries
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const action = searchParams.get('action') || 'list';
    
    if (!table) {
      return NextResponse.json(
        { error: 'Table parameter is required' },
        { status: 400 }
      );
    }
    
    // Security: Only allow specific tables
    const allowedTables = [
      'users', 'portfolios', 'assets', 'accounts', 
      'chat_sessions', 'messages', 'api_keys', 'historical_prices'
    ];
    
    if (!allowedTables.includes(table)) {
      return NextResponse.json(
        { error: 'Access to this table is not allowed' },
        { status: 400 }
      );
    }
    
    let result;
    
    switch (action) {
      case 'list':
        result = await executeTableList(table);
        break;
      case 'count':
        result = await executeTableCount(table);
        break;
      case 'schema':
        result = await getTableSchema(table);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: list, count, schema' },
          { status: 400 }
        );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(ADMIN_UNAUTHORIZED, { status: 403 });
    }
    
    console.error('Admin DB query error:', error);
    return NextResponse.json(
      { error: 'Database query failed' },
      { status: 500 }
    );
  }
}

// Execute table listing with pagination
async function executeTableList(table: string) {
  const limit = 50; // Safety limit
  
  switch (table) {
    case 'users':
      return await prisma.user.findMany({
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              portfolio: true,
              chatSessions: true,
              accounts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
    case 'portfolios':
      return await prisma.portfolio.findMany({
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              assets: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
    case 'assets':
      return await prisma.asset.findMany({
        take: limit,
        select: {
          id: true,
          symbol: true,
          quantity: true,
          avgCost: true,
          price: true,
          assetType: true,
          createdAt: true,
          portfolio: {
            select: {
              name: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
    case 'chat_sessions':
      return await prisma.chatSession.findMany({
        take: limit,
        select: {
          id: true,
          title: true,
          isGuestSession: true,
          createdAt: true,
          user: {
            select: {
              email: true
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
    case 'messages':
      return await prisma.message.findMany({
        take: limit,
        select: {
          id: true,
          role: true,
          content: true,
          provider: true,
          createdAt: true,
          session: {
            select: {
              title: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
    case 'accounts':
      return await prisma.account.findMany({
        take: limit,
        select: {
          id: true,
          provider: true,
          accountName: true,
          accountType: true,
          balance: true,
          isActive: true,
          createdAt: true,
          user: {
            select: {
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
    case 'historical_prices':
      return await prisma.historicalPrice.findMany({
        take: limit,
        select: {
          id: true,
          symbol: true,
          price: true,
          date: true,
          source: true,
          assetType: true,
          createdAt: true
        },
        orderBy: { date: 'desc' }
      });
      
    default:
      throw new Error('Table not supported');
  }
}

// Get table row counts
async function executeTableCount(table: string) {
  switch (table) {
    case 'users':
      return { count: await prisma.user.count() };
    case 'portfolios':
      return { count: await prisma.portfolio.count() };
    case 'assets':
      return { count: await prisma.asset.count() };
    case 'chat_sessions':
      return { count: await prisma.chatSession.count() };
    case 'messages':
      return { count: await prisma.message.count() };
    case 'accounts':
      return { count: await prisma.account.count() };
    case 'historical_prices':
      return { count: await prisma.historicalPrice.count() };
    default:
      throw new Error('Table not supported');
  }
}

// Get table schema information
async function getTableSchema(table: string) {
  // This is a simplified schema representation
  const schemas: Record<string, any> = {
    users: {
      fields: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'],
      relations: ['portfolio', 'accounts', 'chatSessions', 'apiKeys']
    },
    portfolios: {
      fields: ['id', 'userId', 'name', 'description', 'createdAt', 'updatedAt'],
      relations: ['user', 'assets']
    },
    assets: {
      fields: ['id', 'portfolioId', 'symbol', 'quantity', 'avgCost', 'price', 'assetType', 'createdAt', 'updatedAt'],
      relations: ['portfolio']
    },
    chat_sessions: {
      fields: ['id', 'userId', 'guestSessionId', 'title', 'isGuestSession', 'expiresAt', 'createdAt', 'updatedAt'],
      relations: ['user', 'messages']
    },
    messages: {
      fields: ['id', 'sessionId', 'role', 'content', 'provider', 'metadata', 'createdAt'],
      relations: ['session']
    },
    accounts: {
      fields: ['id', 'userId', 'provider', 'accountId', 'accountName', 'accountType', 'balance', 'currency', 'isActive', 'lastSync', 'createdAt', 'updatedAt'],
      relations: ['user']
    },
    historical_prices: {
      fields: ['id', 'symbol', 'price', 'date', 'source', 'assetType', 'createdAt'],
      relations: []
    }
  };
  
  return schemas[table] || { error: 'Schema not found' };
}