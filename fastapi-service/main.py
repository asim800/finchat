#!/usr/bin/env python3
"""
FastAPI Portfolio Analysis Microservice
Provides financial analysis tools via REST API endpoints
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging

# Third-party imports
import pandas as pd
import numpy as np
import yfinance as yf
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Setup logging
log_level = logging.ERROR if os.getenv("PRODUCTION") else logging.WARNING
logging.basicConfig(level=log_level)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Portfolio Analysis Service",
    description="Financial portfolio analysis and risk calculation API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "https://*.vercel.app",   # Vercel deployments
        "https://your-domain.com" # Replace with actual production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection - lazy initialization
DATABASE_URL = os.getenv("DATABASE_URL")
engine = None

def get_engine():
    """Get database engine with lazy initialization"""
    global engine
    if engine is None:
        if not DATABASE_URL:
            logger.error("DATABASE_URL environment variable is required")
            raise ValueError("DATABASE_URL is required")
        
        # Convert postgres:// to postgresql+psycopg2:// for better compatibility
        db_url = DATABASE_URL
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
            
        logger.info(f"Using database URL scheme: {db_url.split('://')[0]}")
        
        # Configure engine for SSL and connection pooling
        engine = create_engine(
            db_url,
            pool_pre_ping=True,  # Verify connections before use
            pool_recycle=300,    # Recycle connections every 5 minutes
            connect_args={"sslmode": "require"} if "sslmode=require" in db_url else {}
        )
    return engine

# Risk-free rate (can be made configurable)
RISK_FREE_RATE = 0.02  # 2% annual risk-free rate

# Pydantic models for request/response
class PortfolioRiskRequest(BaseModel):
    user_id: str

class SharpeRatioRequest(BaseModel):
    user_id: str
    portfolio_id: Optional[str] = None

class MarketDataRequest(BaseModel):
    user_id: str
    period: str = "1mo"

class PortfolioAnalyzer:
    """Portfolio analysis utilities"""
    
    @staticmethod
    def get_user_portfolio(user_id: str) -> Dict[str, Any]:
        """Get user's portfolio data from database"""
        try:
            query = """
            SELECT 
                p.id as portfolio_id,
                p.name as portfolio_name,
                a.symbol,
                a.quantity,
                a."avgPrice" as avg_price,
                a."assetType" as asset_type
            FROM portfolios p
            JOIN assets a ON p.id = a."portfolioId"
            WHERE p."userId" = :user_id
            ORDER BY p.name, a.symbol
            """
            
            with get_engine().connect() as conn:
                result = conn.execute(text(query), {"user_id": user_id})
                rows = result.fetchall()
                
                if not rows:
                    return {"error": "No portfolio data found for user"}
                
                # Group by portfolio
                portfolios = {}
                for row in rows:
                    portfolio_id = row.portfolio_id
                    if portfolio_id not in portfolios:
                        portfolios[portfolio_id] = {
                            "name": row.portfolio_name,
                            "assets": []
                        }
                    
                    portfolios[portfolio_id]["assets"].append({
                        "symbol": row.symbol,
                        "quantity": float(row.quantity),
                        "avg_price": float(row.avg_price) if row.avg_price else None,
                        "asset_type": row.asset_type
                    })
                
                return {
                    "user_id": user_id,
                    "portfolios": portfolios,
                    "total_portfolios": len(portfolios)
                }
                
        except Exception as e:
            logger.error(f"Error fetching portfolio data: {e}")
            return {"error": f"Database error: {str(e)}"}
    
    @staticmethod
    def get_market_data(symbols: List[str], period: str = "1y") -> Dict[str, pd.DataFrame]:
        """Fetch market data for given symbols"""
        try:
            market_data = {}
            for symbol in symbols:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=period)
                if not hist.empty:
                    market_data[symbol] = hist
                else:
                    logger.warning(f"No data found for symbol: {symbol}")
            
            return market_data
        except Exception as e:
            logger.error(f"Error fetching market data: {e}")
            return {}
    
    @staticmethod
    def calculate_returns(prices: pd.Series) -> pd.Series:
        """Calculate daily returns from price series"""
        return prices.pct_change().dropna()
    
    @staticmethod
    def calculate_portfolio_risk(portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate portfolio risk metrics"""
        try:
            results = {}
            
            for portfolio_id, portfolio in portfolio_data["portfolios"].items():
                assets = portfolio["assets"]
                symbols = [asset["symbol"] for asset in assets]
                weights = []
                
                # Calculate market data and weights
                market_data = PortfolioAnalyzer.get_market_data(symbols)
                
                if not market_data:
                    results[portfolio_id] = {"error": "No market data available"}
                    continue
                
                # Calculate total portfolio value for weights
                total_value = 0
                asset_values = {}
                
                for asset in assets:
                    symbol = asset["symbol"]
                    if symbol in market_data and not market_data[symbol].empty:
                        current_price = market_data[symbol]["Close"].iloc[-1]
                        value = asset["quantity"] * current_price
                        asset_values[symbol] = value
                        total_value += value
                
                if total_value == 0:
                    results[portfolio_id] = {"error": "Cannot calculate portfolio value"}
                    continue
                
                # Calculate weights and returns
                returns_data = {}
                for symbol in symbols:
                    if symbol in market_data and symbol in asset_values:
                        weights.append(asset_values[symbol] / total_value)
                        returns_data[symbol] = PortfolioAnalyzer.calculate_returns(
                            market_data[symbol]["Close"]
                        )
                
                if not returns_data:
                    results[portfolio_id] = {"error": "Cannot calculate returns"}
                    continue
                
                # Create returns dataframe
                returns_df = pd.DataFrame(returns_data).fillna(0)
                
                # Calculate portfolio returns
                weights_array = np.array(weights)
                portfolio_returns = (returns_df * weights_array).sum(axis=1)
                
                # Calculate risk metrics
                annual_return = portfolio_returns.mean() * 252
                annual_volatility = portfolio_returns.std() * np.sqrt(252)
                sharpe_ratio = (annual_return - RISK_FREE_RATE) / annual_volatility if annual_volatility > 0 else 0
                
                # Calculate Value at Risk (95% confidence)
                var_95 = np.percentile(portfolio_returns, 5)
                var_95_annual = var_95 * np.sqrt(252)
                
                # Calculate maximum drawdown
                cumulative_returns = (1 + portfolio_returns).cumprod()
                running_max = cumulative_returns.expanding().max()
                drawdown = (cumulative_returns - running_max) / running_max
                max_drawdown = drawdown.min()
                
                results[portfolio_id] = {
                    "portfolio_name": portfolio["name"],
                    "total_value": total_value,
                    "annual_return": round(annual_return * 100, 2),
                    "annual_volatility": round(annual_volatility * 100, 2),
                    "sharpe_ratio": round(sharpe_ratio, 3),
                    "var_95_daily": round(var_95 * 100, 2),
                    "var_95_annual": round(var_95_annual * 100, 2),
                    "max_drawdown": round(max_drawdown * 100, 2),
                    "num_assets": len(assets),
                    "risk_free_rate": RISK_FREE_RATE * 100
                }
            
            return {
                "user_id": portfolio_data["user_id"],
                "analysis_date": datetime.now().isoformat(),
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Error calculating portfolio risk: {e}")
            return {"error": f"Risk calculation error: {str(e)}"}

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Portfolio Analysis API",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check with database connectivity"""
    try:
        # Test database connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

@app.post("/portfolio/risk")
async def calculate_portfolio_risk_endpoint(request: PortfolioRiskRequest):
    """
    Calculate comprehensive risk metrics for user's portfolios including:
    - Annual return and volatility
    - Sharpe ratio
    - Value at Risk (VaR)
    - Maximum drawdown
    """
    try:
        # Get portfolio data
        portfolio_data = PortfolioAnalyzer.get_user_portfolio(request.user_id)
        
        if "error" in portfolio_data:
            raise HTTPException(status_code=404, detail=portfolio_data["error"])
        
        # Calculate risk metrics
        risk_analysis = PortfolioAnalyzer.calculate_portfolio_risk(portfolio_data)
        
        if "error" in risk_analysis:
            raise HTTPException(status_code=500, detail=risk_analysis["error"])
        
        return risk_analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in risk calculation endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/portfolio/sharpe")
async def calculate_sharpe_ratio_endpoint(request: SharpeRatioRequest):
    """
    Calculate Sharpe ratio for user's portfolio(s)
    """
    try:
        # Get portfolio data
        portfolio_data = PortfolioAnalyzer.get_user_portfolio(request.user_id)
        
        if "error" in portfolio_data:
            raise HTTPException(status_code=404, detail=portfolio_data["error"])
        
        # Filter to specific portfolio if requested
        if request.portfolio_id:
            if request.portfolio_id not in portfolio_data["portfolios"]:
                raise HTTPException(status_code=404, detail=f"Portfolio {request.portfolio_id} not found")
            
            portfolio_data["portfolios"] = {request.portfolio_id: portfolio_data["portfolios"][request.portfolio_id]}
        
        # Calculate risk metrics (includes Sharpe ratio)
        risk_analysis = PortfolioAnalyzer.calculate_portfolio_risk(portfolio_data)
        
        if "error" in risk_analysis:
            raise HTTPException(status_code=500, detail=risk_analysis["error"])
        
        # Extract just Sharpe ratio information
        sharpe_results = {}
        if "results" in risk_analysis:
            for pid, result in risk_analysis["results"].items():
                if "error" not in result:
                    sharpe_results[pid] = {
                        "portfolio_name": result["portfolio_name"],
                        "sharpe_ratio": result["sharpe_ratio"],
                        "annual_return": result["annual_return"],
                        "annual_volatility": result["annual_volatility"],
                        "risk_free_rate": result["risk_free_rate"]
                    }
                else:
                    sharpe_results[pid] = result
        
        return {
            "user_id": request.user_id,
            "analysis_date": datetime.now().isoformat(),
            "sharpe_analysis": sharpe_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Sharpe ratio calculation endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/portfolio/market-data")
async def get_portfolio_market_data_endpoint(request: MarketDataRequest):
    """
    Get current market data for all symbols in user's portfolios
    """
    try:
        # Get portfolio data
        portfolio_data = PortfolioAnalyzer.get_user_portfolio(request.user_id)
        
        if "error" in portfolio_data:
            raise HTTPException(status_code=404, detail=portfolio_data["error"])
        
        # Collect all unique symbols
        all_symbols = set()
        for portfolio in portfolio_data["portfolios"].values():
            for asset in portfolio["assets"]:
                all_symbols.add(asset["symbol"])
        
        symbols_list = list(all_symbols)
        
        # Get market data
        market_data = PortfolioAnalyzer.get_market_data(symbols_list, request.period)
        
        # Summarize data
        summary = {}
        for symbol, data in market_data.items():
            if not data.empty:
                current_price = data["Close"].iloc[-1]
                start_price = data["Close"].iloc[0]
                price_change = ((current_price - start_price) / start_price) * 100
                
                summary[symbol] = {
                    "current_price": round(current_price, 2),
                    "period_return": round(price_change, 2),
                    "volatility": round(data["Close"].pct_change().std() * np.sqrt(252) * 100, 2),
                    "data_points": len(data)
                }
        
        return {
            "user_id": request.user_id,
            "period": request.period,
            "symbols_analyzed": len(summary),
            "market_data": summary,
            "analysis_date": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in market data endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Server startup event
@app.on_event("startup")
async def startup_event():
    """Test database connection on startup"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")