# Finance MCP Server

A Model Context Protocol (MCP) server that provides financial analysis tools for portfolio risk assessment and performance calculation.

## Features

### 🔧 Available Tools

1. **Portfolio Risk Analysis** (`calculate_portfolio_risk`)
   - Annual return and volatility calculation
   - Sharpe ratio measurement
   - Value at Risk (VaR) at 95% confidence
   - Maximum drawdown analysis
   - Comprehensive risk metrics

2. **Sharpe Ratio Calculator** (`calculate_sharpe_ratio`)  
   - Risk-adjusted return measurement
   - Portfolio performance rating
   - Comparison against risk-free rate

3. **Market Data Analysis** (`get_portfolio_market_data`)
   - Current price information
   - Period return calculations
   - Volatility measurements
   - Real-time market data integration

### 📊 Available Resources

1. **Portfolio Data** (`portfolio://{user_id}`)
   - Complete portfolio holdings
   - Asset allocation information
   - User-specific financial data

## Setup

### Prerequisites

- Python 3.8 or higher
- PostgreSQL database (with portfolio data)
- Environment variables configured

### Installation

1. **Run the setup script:**
   ```bash
   cd mcp-server
   python3 setup.py
   ```

2. **Set environment variables:**
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

3. **Manual installation (alternative):**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate
   
   # Install dependencies  
   pip install -r requirements.txt
   ```

### Running the Server

```bash
# Activate virtual environment (if using)
source venv/bin/activate

# Start the MCP server
python3 finance_mcp_server.py
```

## Usage with Next.js

The MCP server integrates with your Next.js finance application through the MCP client (`lib/mcp-client.ts`).

### Trigger Phrases

The chat interface automatically triggers MCP tools when users mention:

**Risk Analysis:**
- "analyze my portfolio"
- "portfolio risk"
- "what's my portfolio volatility?"
- "calculate VaR"

**Sharpe Ratio:**
- "sharpe ratio"
- "risk-adjusted returns"
- "performance ratio"

**Market Data:**
- "current stock prices"
- "market data"
- "price changes"

### Example Conversations

```
User: "What's my portfolio risk?"
🔧 Executes: calculate_portfolio_risk
📊 Returns: Comprehensive risk analysis with metrics

User: "How's my Sharpe ratio?"  
🔧 Executes: calculate_sharpe_ratio
📈 Returns: Risk-adjusted performance analysis

User: "Show me current market data"
🔧 Executes: get_portfolio_market_data
💹 Returns: Real-time price and performance data
```

## Architecture

```
Next.js Chat Interface
         ↓
    MCP Client (TypeScript)
         ↓  
    MCP Server (Python)
         ↓
   PostgreSQL Database
         ↓
    Yahoo Finance API
```

## Database Schema

The MCP server expects these database tables:

```sql
-- Users table
users (id, email, firstName, lastName, ...)

-- Portfolios table  
portfolios (id, userId, name, description, ...)

-- Assets table
assets (id, portfolioId, symbol, quantity, avgPrice, assetType, ...)
```

## Technical Details

### Risk Calculations

- **Annual Return**: Mean daily return × 252 trading days
- **Volatility**: Standard deviation × √252
- **Sharpe Ratio**: (Annual Return - Risk Free Rate) / Volatility  
- **VaR**: 5th percentile of return distribution
- **Max Drawdown**: Largest peak-to-trough decline

### Market Data

- Source: Yahoo Finance (yfinance library)
- Real-time price feeds
- Historical data for calculations
- Error handling for missing/invalid symbols

### Security

- Database connections use environment variables
- No hardcoded credentials
- Error handling prevents data leaks
- User-specific data access controls

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Reinstall dependencies
   pip install -r requirements.txt
   ```

2. **Database Connection Failed**
   ```bash
   # Check DATABASE_URL format
   export DATABASE_URL="postgresql://user:pass@host:port/db"
   ```

3. **Market Data Issues**
   ```bash
   # Test yfinance connection
   python3 -c "import yfinance; print(yfinance.Ticker('AAPL').info['regularMarketPrice'])"
   ```

4. **MCP Server Won't Start**
   ```bash
   # Check Python version
   python3 --version  # Should be 3.8+
   
   # Check all dependencies
   python3 setup.py
   ```

### Logging

The server logs important events:
- Tool execution start/completion
- Database queries
- Error conditions
- Market data fetching

Check console output for debugging information.

## Development

### Adding New Tools

1. **Create the analysis function:**
   ```python
   @staticmethod
   def new_analysis_function(portfolio_data):
       # Your analysis logic
       return results
   ```

2. **Add MCP tool decorator:**
   ```python
   @mcp.tool()
   def new_mcp_tool(user_id: str) -> Dict[str, Any]:
       # Tool implementation
       return PortfolioAnalyzer.new_analysis_function(data)
   ```

3. **Update the Next.js client:**
   ```typescript
   // Add to lib/mcp-client.ts
   async newTool(userId: string): Promise<ResultType> {
     return await this.executeTool('new_mcp_tool', { user_id: userId });
   }
   ```

4. **Add trigger keywords:**
   ```typescript
   // Update app/api/chat/route.ts
   const newToolKeywords = ['keyword1', 'keyword2'];
   ```

### Testing

```bash
# Test individual components
python3 -c "from finance_mcp_server import PortfolioAnalyzer; print('OK')"

# Test database connection
python3 -c "from finance_mcp_server import engine; engine.connect()"

# Test market data
python3 -c "import yfinance; print(yfinance.Ticker('AAPL').history(period='1mo'))"
```

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify environment variables are set correctly
3. Test database connectivity independently
4. Ensure all Python dependencies are installed