from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Portfolio Analysis Service",
    description="A FastAPI microservice for portfolio analysis and risk calculation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Asset(BaseModel):
    symbol: str
    shares: float
    avgPrice: Optional[float] = None

class PortfolioRequest(BaseModel):
    assets: List[Asset]

class RiskRequest(BaseModel):
    assets: List[Asset]
    timeframe: str = "1y"

class MarketDataRequest(BaseModel):
    symbols: List[str]
    period: str = "1y"

class PortfolioRiskAnalysis(BaseModel):
    totalValue: float
    dailyVaR: float
    annualizedVoL: float
    sharpeRatio: float
    beta: float
    riskLevel: str

class SharpeRatioResponse(BaseModel):
    sharpeRatio: float
    explanation: str

class MarketDataResponse(BaseModel):
    data: Dict[str, Dict]
    timestamp: str

@app.get("/")
async def root():
    return {"message": "Portfolio Analysis Service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/portfolio/analyze", response_model=PortfolioRiskAnalysis)
async def analyze_portfolio(request: PortfolioRequest):
    """Analyze portfolio and return comprehensive risk metrics"""
    try:
        if not request.assets:
            raise HTTPException(status_code=400, detail="No assets provided")
        
        # Get portfolio data
        symbols = [asset.symbol for asset in request.assets]
        shares = {asset.symbol: asset.shares for asset in request.assets}
        
        # Fetch market data - always use list format for consistency
        data = yf.download(symbols, period="1y", progress=False, group_by='ticker', auto_adjust=True)
        
        if data.empty:
            raise HTTPException(status_code=400, detail="Could not fetch market data")
        
        # Handle single vs multiple symbols
        if len(symbols) == 1:
            # For single symbol, yfinance returns a different structure
            symbol = symbols[0]
            if 'Close' in data.columns:
                prices = pd.DataFrame({symbol: data['Close']})
            else:
                prices = pd.DataFrame({symbol: data[symbol]['Close']})
        else:
            # Multiple symbols
            prices = pd.DataFrame({symbol: data[symbol]['Close'] for symbol in symbols})
        
        # Calculate returns
        returns = prices.pct_change().dropna()
        
        # Portfolio weights (simplified - using current prices)
        current_prices = prices.iloc[-1]
        portfolio_values = {symbol: shares[symbol] * current_prices[symbol] for symbol in symbols}
        total_value = sum(portfolio_values.values())
        weights = {symbol: portfolio_values[symbol] / total_value for symbol in symbols}
        
        # Portfolio returns
        portfolio_returns = (returns * pd.Series(weights)).sum(axis=1)
        
        # Risk metrics
        daily_var = np.percentile(portfolio_returns, 5) * total_value  # 5% VaR
        annualized_vol = portfolio_returns.std() * np.sqrt(252)
        
        # Sharpe ratio (assuming 2% risk-free rate)
        risk_free_rate = 0.02
        annual_return = portfolio_returns.mean() * 252
        sharpe_ratio = (annual_return - risk_free_rate) / annualized_vol if annualized_vol > 0 else 0
        
        # Beta calculation (vs S&P 500)
        try:
            spy_data = yf.download("SPY", period="1y", progress=False, auto_adjust=True)
            spy_returns = spy_data['Close'].pct_change().dropna()
            
            # Align dates
            common_dates = portfolio_returns.index.intersection(spy_returns.index)
            portfolio_aligned = portfolio_returns.loc[common_dates]
            spy_aligned = spy_returns.loc[common_dates]
            
            if len(common_dates) > 10:  # Need sufficient data points
                # Ensure both arrays are 1D
                portfolio_values = portfolio_aligned.values.flatten()
                spy_values = spy_aligned.values.flatten()
                
                # Calculate beta using correlation and volatility ratio
                if len(portfolio_values) == len(spy_values) and len(portfolio_values) > 1:
                    correlation = np.corrcoef(portfolio_values, spy_values)[0, 1]
                    portfolio_std = np.std(portfolio_values)
                    spy_std = np.std(spy_values)
                    beta = correlation * (portfolio_std / spy_std) if spy_std > 0 else 1.0
                else:
                    beta = 1.0
            else:
                beta = 1.0
        except Exception as e:
            logger.warning(f"Beta calculation failed: {e}, using default beta=1.0")
            beta = 1.0
        
        # Risk level classification
        if annualized_vol < 0.1:
            risk_level = "Low"
        elif annualized_vol < 0.2:
            risk_level = "Medium"
        else:
            risk_level = "High"
        
        return PortfolioRiskAnalysis(
            totalValue=round(total_value, 2),
            dailyVaR=round(abs(daily_var), 2),
            annualizedVoL=round(annualized_vol * 100, 2),
            sharpeRatio=round(sharpe_ratio, 3),
            beta=round(beta, 3),
            riskLevel=risk_level
        )
        
    except Exception as e:
        logger.error(f"Error analyzing portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/portfolio/risk", response_model=PortfolioRiskAnalysis)
async def calculate_portfolio_risk(request: RiskRequest):
    """Calculate portfolio risk metrics"""
    return await analyze_portfolio(PortfolioRequest(assets=request.assets))

@app.post("/portfolio/sharpe", response_model=SharpeRatioResponse)
async def calculate_sharpe_ratio(request: PortfolioRequest):
    """Calculate Sharpe ratio for portfolio"""
    try:
        analysis = await analyze_portfolio(request)
        
        explanation = f"Sharpe ratio of {analysis.sharpeRatio} indicates "
        if analysis.sharpeRatio > 1:
            explanation += "excellent risk-adjusted returns"
        elif analysis.sharpeRatio > 0.5:
            explanation += "good risk-adjusted returns"
        elif analysis.sharpeRatio > 0:
            explanation += "acceptable risk-adjusted returns"
        else:
            explanation += "poor risk-adjusted returns"
            
        return SharpeRatioResponse(
            sharpeRatio=analysis.sharpeRatio,
            explanation=explanation
        )
        
    except Exception as e:
        logger.error(f"Error calculating Sharpe ratio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sharpe ratio calculation failed: {str(e)}")

@app.post("/portfolio/market-data", response_model=MarketDataResponse)
async def get_market_data(request: MarketDataRequest):
    """Fetch market data for given symbols"""
    try:
        if not request.symbols:
            raise HTTPException(status_code=400, detail="No symbols provided")
        
        data = yf.download(request.symbols, period=request.period, progress=False, auto_adjust=True)
        
        if data.empty:
            raise HTTPException(status_code=400, detail="Could not fetch market data")
        
        # Convert to JSON-serializable format
        result = {}
        if len(request.symbols) == 1:
            # Single symbol case
            symbol = request.symbols[0]
            result[symbol] = {
                'prices': data['Close'].to_dict(),
                'volume': data['Volume'].to_dict() if 'Volume' in data else {},
                'high': data['High'].to_dict() if 'High' in data else {},
                'low': data['Low'].to_dict() if 'Low' in data else {}
            }
        else:
            # Multiple symbols case
            for symbol in request.symbols:
                if symbol in data['Close'].columns:
                    result[symbol] = {
                        'prices': data['Close'][symbol].dropna().to_dict(),
                        'volume': data['Volume'][symbol].dropna().to_dict() if 'Volume' in data else {},
                        'high': data['High'][symbol].dropna().to_dict() if 'High' in data else {},
                        'low': data['Low'][symbol].dropna().to_dict() if 'Low' in data else {}
                    }
        
        return MarketDataResponse(
            data=result,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error fetching market data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Market data fetch failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)