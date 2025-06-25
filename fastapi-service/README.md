# FastAPI Portfolio Analysis Microservice

A high-performance REST API microservice for financial portfolio analysis and risk calculations.

## Features

- **Portfolio Risk Analysis**: Calculate comprehensive risk metrics including volatility, VaR, and drawdowns
- **Sharpe Ratio Calculation**: Risk-adjusted performance measurement
- **Market Data Integration**: Real-time market data via Yahoo Finance
- **Database Integration**: Direct PostgreSQL connection for portfolio data
- **Health Monitoring**: Built-in health checks and monitoring endpoints
- **CORS Support**: Ready for frontend integration

## API Endpoints

### Health Check
- `GET /` - Basic service info
- `GET /health` - Detailed health check with database connectivity

### Portfolio Analysis
- `POST /portfolio/risk` - Calculate portfolio risk metrics
- `POST /portfolio/sharpe` - Calculate Sharpe ratios
- `POST /portfolio/market-data` - Get market data for portfolio symbols

## Quick Start

### 1. Setup Environment

**Using uv (recommended - consistent with MCP server):**
```bash
cd fastapi-service
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc

# Setup project with uv
uv venv
uv sync
```

**Alternative - using pip:**
```bash
cd fastapi-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Set the following in your `.env` file (in the parent directory):

```bash
# Database connection
DATABASE_URL="postgresql://user:password@host:port/database"

# FastAPI service configuration
FASTAPI_SERVICE_URL="http://localhost:8000"
```

### 3. Start the Service

**Option A: Using the startup script (with uv)**
```bash
chmod +x start.sh
./start.sh
```

**Option B: Manual startup with uv**
```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Option C: Manual startup with traditional venv**
```bash
source venv/bin/activate  # or source .venv/bin/activate for uv
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Verify Service

Visit `http://localhost:8000` to see the service info, or `http://localhost:8000/docs` for the interactive API documentation.

## Configuration

### Backend Selection

In your Next.js `.env` file, configure which backend to use:

```bash
# Primary backend: 'mcp' or 'fastapi'
PRIMARY_ANALYSIS_BACKEND=fastapi

# Enable automatic fallback to other backend
ENABLE_BACKEND_FALLBACK=true

# FastAPI service URL
FASTAPI_SERVICE_URL=http://localhost:8000
```

### Configuration Options

- **MCP Primary, FastAPI Fallback**: Traditional MCP with FastAPI backup
- **FastAPI Primary, MCP Fallback**: Modern REST API with MCP backup  
- **FastAPI Only**: Disable fallback for pure FastAPI usage
- **MCP Only**: Disable fallback for pure MCP usage

## API Examples

### Calculate Portfolio Risk

```bash
curl -X POST "http://localhost:8000/portfolio/risk" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123"}'
```

### Calculate Sharpe Ratio

```bash
curl -X POST "http://localhost:8000/portfolio/sharpe" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123", "portfolio_id": "optional"}'
```

### Get Market Data

```bash
curl -X POST "http://localhost:8000/portfolio/market-data" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123", "period": "1mo"}'
```

## Performance

FastAPI offers several advantages over the MCP implementation:

- **Faster Startup**: No subprocess overhead
- **Better Error Handling**: Structured HTTP responses
- **Monitoring Ready**: Built-in metrics and health checks
- **Scalability**: Easy to containerize and deploy
- **Documentation**: Auto-generated OpenAPI/Swagger docs

## Development

### Adding New Endpoints

1. Add the endpoint function in `main.py`
2. Define Pydantic models for request/response
3. Add business logic to the `PortfolioAnalyzer` class
4. Update tests and documentation

### Testing

```bash
# Manual testing
python -m pytest tests/

# Load testing
pip install locust
locust -f tests/load_test.py --host=http://localhost:8000
```

## Deployment

### Docker Deployment

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY main.py .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Considerations

- Use a production ASGI server (gunicorn + uvicorn workers)
- Set up proper logging and monitoring
- Configure database connection pooling
- Add authentication and rate limiting
- Use environment-specific configurations

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` in environment
   - Verify database is running and accessible
   - Check firewall and network settings

2. **Market Data Errors**
   - Yahoo Finance API rate limits
   - Network connectivity issues
   - Invalid symbol names

3. **Service Unavailable**
   - Check if port 8000 is available
   - Verify virtual environment is activated
   - Check logs for startup errors

### Monitoring

Check service health:
```bash
curl http://localhost:8000/health
```

View metrics and logs:
```bash
# Service logs
tail -f logs/fastapi.log

# System metrics
htop
```

## Integration with Next.js

The FastAPI service integrates seamlessly with your Next.js finance app through the unified analysis service. The system automatically:

1. **Detects Backend Availability**: Health checks before requests
2. **Handles Fallbacks**: Switches to backup backend on failures  
3. **Formats Responses**: Consistent formatting regardless of backend
4. **Logs Performance**: Tracks which backend was used and why

No changes needed to your existing chat interface - it works transparently!