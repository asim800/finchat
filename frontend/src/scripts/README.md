# Development & Testing Scripts

This directory contains **development and testing scripts** for the Finance App used during development and debugging.

## 📁 Script Organization

### `/scripts/` - **Production/Operational Scripts**
- Scripts for data management and operations
- Run via `npm run` commands
- Used by administrators and in production
- See `/scripts/README.md` for details

### `/src/scripts/` (This Directory) - **Development/Testing Scripts**
- Development tools and testing utilities
- Run directly during development  
- Used by developers for debugging and testing

## 🧪 Available Development Scripts

### Portfolio & Asset Testing
```bash
npx tsx src/scripts/test-portfolio-overview.ts    # Test portfolio operations
npx tsx src/scripts/realistic-portfolio-test.ts   # Generate realistic portfolio data
npx tsx src/scripts/test-partial-removal.ts       # Test asset removal functionality
npx tsx src/scripts/test-show-position.ts         # Test position display
npx tsx src/scripts/test-edge-cases.ts           # Test edge cases and error handling
```

### Chat & LLM Testing
```bash
npx tsx src/scripts/test-chat-triage.ts          # Test chat query triage system
npx tsx src/scripts/simple-triage-test.ts        # Simple triage functionality test
npx tsx src/scripts/test-langgraph-integration.ts # Test LangGraph integration
npx tsx src/scripts/test-user-query.ts           # Test user query processing
```

### Data & Price Management
```bash
npx tsx src/scripts/add-sample-prices.ts         # Add sample price data
npx tsx src/scripts/populate-asset-metrics.ts    # Populate asset metrics (dev version)
```

### UI Testing
```bash
# Open in browser:
src/scripts/test-chat-scroll.html                # Test chat scroll behavior
```

## 🛠️ Script Details

### Portfolio Testing Scripts

#### `realistic-portfolio-test.ts`
- Creates realistic portfolio data for testing
- Generates multiple portfolios with various asset types
- Includes options, stocks, ETFs, and bonds
- Useful for UI testing with diverse data

#### `test-portfolio-overview.ts`
- Tests portfolio CRUD operations
- Validates portfolio service functionality
- Tests asset addition/removal/updates
- Useful for backend testing

#### `test-edge-cases.ts`
- Tests error handling and edge cases
- Invalid data scenarios
- Boundary conditions
- Network error simulations

### Chat & AI Testing Scripts

#### `test-chat-triage.ts`
- Comprehensive test of chat query triage system
- Tests different query types (portfolio, financial, general)
- Validates AI response routing
- Performance testing for chat features

#### `test-langgraph-integration.ts`
- Tests LangGraph backend integration
- AI agent workflow testing
- Multi-step conversation flows
- Integration with portfolio data

#### `simple-triage-test.ts`
- Lightweight triage testing
- Quick validation of chat routing
- Minimal test cases for rapid feedback

### Data Management Scripts

#### `populate-asset-metrics.ts`
- Development version of metrics population
- More comprehensive sample data
- Testing different metric combinations
- Database seeding for development

#### `add-sample-prices.ts`
- Quick price data addition
- Development-specific price scenarios
- Historical data for testing charts/graphs

### UI Testing

#### `test-chat-scroll.html`
- Standalone HTML file for testing chat scroll behavior
- Tests auto-scroll functionality
- Message rendering performance
- Mobile responsiveness

## 🎯 Usage Patterns

### Quick Testing Workflow
```bash
# 1. Set up test data
npx tsx src/scripts/add-sample-prices.ts
npx tsx src/scripts/populate-asset-metrics.ts

# 2. Create realistic portfolios
npx tsx src/scripts/realistic-portfolio-test.ts

# 3. Test specific functionality
npx tsx src/scripts/test-portfolio-overview.ts
npx tsx src/scripts/test-chat-triage.ts
```

### Development Debugging
```bash
# Test specific components
npx tsx src/scripts/test-edge-cases.ts

# Check AI integration
npx tsx src/scripts/test-langgraph-integration.ts

# Validate data flows
npx tsx src/scripts/test-user-query.ts
```

## ⚠️ Important Notes

### Environment Requirements
- These scripts require development environment setup
- Database connection needed for most scripts
- Some scripts require API keys (OpenAI, Anthropic)
- Node.js and TypeScript environment

### Data Safety
- Development scripts may modify test data
- Use separate development database
- Don't run against production data
- Scripts include data cleanup where appropriate

### Dependencies
- Scripts use the same dependencies as main app
- Prisma client for database operations
- LLM SDKs for AI testing
- Development utilities and helpers

## 🚀 Adding New Test Scripts

When creating new test scripts:

1. **Follow naming convention**: `test-[feature-name].ts`
2. **Add proper error handling** for development debugging
3. **Include cleanup code** to reset test state
4. **Document usage** in this README
5. **Use TypeScript** for type safety during development

### Template for New Scripts
```typescript
// New test script template
import { prisma } from '../lib/db';

async function testNewFeature() {
  try {
    console.log('🧪 Testing new feature...');
    
    // Test logic here
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewFeature();
```