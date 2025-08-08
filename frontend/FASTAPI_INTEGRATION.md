# FastAPI Chat Engine Integration

## Overview
This integration adds FastAPI chat engine functionality to your Next.js finance app via API proxy routes. The FastAPI chat engine runs as a separate Vercel deployment and is accessible through your main domain.

## Integration Architecture
```
mystocks.ai/                    → Next.js Finance App (existing)
mystocks.ai/api/fastapi/agentic/ → FastAPI Chat Engine (proxied)
```

## Files Added

### Proxy API Route
- `src/app/api/fastapi/[...slug]/route.ts` - Forwards requests to FastAPI deployment

### Configuration  
- `.env.local.example` - Environment variable template
- `test-fastapi-proxy.js` - Integration test script
- `FASTAPI_INTEGRATION.md` - This documentation

## Setup Instructions

### 1. Deploy FastAPI to Vercel
```bash
# In the FastAPI project directory
vercel login
vercel deploy
```

### 2. Configure Environment Variables
Add to your `.env.local`:
```bash
FASTAPI_CHAT_URL=https://your-fastapi-deployment.vercel.app
```

### 3. Deploy Next.js App
Deploy your Next.js app with the new proxy route:
```bash
vercel deploy
```

### 4. Test Integration
```bash
# Run the test script
node test-fastapi-proxy.js

# Or test manually
curl https://mystocks.ai/api/fastapi/agentic/api/prompts
```

## Access Points

### FastAPI Chat Interface
- **URL**: `https://mystocks.ai/api/fastapi/agentic/`
- **Features**: Full chat interface with React pattern support

### API Documentation  
- **URL**: `https://mystocks.ai/api/fastapi/agentic/docs`
- **Features**: Interactive API documentation

### Chat API Endpoint
- **URL**: `https://mystocks.ai/api/fastapi/agentic/api/chat`
- **Method**: POST
- **Usage**: Send chat messages programmatically

## Features Available

### Chat Modes
- **Financial Chat**: Portfolio analysis and financial advice
- **React Pattern**: Step-by-step AI reasoning display
- **Coding Mentor**: Programming help and guidance
- **Creative Writer**: Content creation assistance

### React Pattern Display
When using React Pattern mode, you'll see:
- 🤔 **Thought**: AI's reasoning process
- ⚡ **Action**: Tools being used  
- 📥 **Action Input**: Parameters for tools
- 👁️ **Observation**: Tool results
- ✅ **Final Answer**: Complete response

### Chat Features
- Arrow key history navigation
- Multiline input support (Shift+Enter)
- Session management
- Engagement scoring
- Multiple prompt templates

## API Usage Examples

### Send Chat Message
```javascript
const response = await fetch('/api/fastapi/agentic/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What is the risk of a tech stock portfolio?',
    user_id: 'user123',
    prompt_name: 'react_prompt'  // For step-by-step reasoning
  })
});

const data = await response.json();
console.log(data.response);
```

### Get Available Prompts
```javascript
const response = await fetch('/api/fastapi/agentic/api/prompts');
const prompts = await response.json();
console.log(prompts); // ['finchat_prompt', 'react_prompt', 'coding_mentor', ...]
```

### Get Chat History
```javascript
const response = await fetch(`/api/fastapi/agentic/api/sessions/${sessionId}/history?user_id=user123`);
const history = await response.json();
console.log(history.messages);
```

## Integration Benefits

### For Short-Term Use ✅
- **Quick Setup**: Minimal changes to existing codebase  
- **Easy Removal**: Just delete proxy files when done
- **Independent**: FastAPI and Next.js remain separate
- **Same Domain**: Everything under mystocks.ai

### Technical Benefits ✅
- **Serverless**: Both apps run on Vercel infrastructure
- **Scalable**: Automatic scaling for both components
- **Maintainable**: Clear separation of concerns
- **Testable**: Comprehensive test coverage

## Troubleshooting

### Common Issues

#### Proxy Not Working
1. Check `FASTAPI_CHAT_URL` in `.env.local`
2. Verify FastAPI deployment is accessible
3. Check Vercel deployment logs

#### CORS Errors  
1. Ensure mystocks.ai is in FastAPI CORS origins
2. Check proxy route CORS headers
3. Verify request headers are properly forwarded

#### FastAPI Deployment Issues
1. Check `requirements.txt` has all dependencies
2. Verify `main.py` imports work
3. Check Vercel function logs

### Testing Commands
```bash
# Test FastAPI directly
curl https://your-fastapi-deployment.vercel.app/api/prompts

# Test through proxy
curl https://mystocks.ai/api/fastapi/agentic/api/prompts

# Run integration tests
node test-fastapi-proxy.js

# Test with custom URL
TEST_URL=https://mystocks.ai node test-fastapi-proxy.js
```

## Cleanup (When No Longer Needed)

To remove the FastAPI integration:

1. **Delete proxy route**: Remove `src/app/api/fastapi/` directory
2. **Remove environment variables**: Delete FastAPI_CHAT_URL from `.env.local`  
3. **Delete FastAPI deployment**: Remove from Vercel dashboard
4. **Remove test files**: Delete integration test files

The cleanup is simple since the integration is additive and doesn't modify existing functionality.