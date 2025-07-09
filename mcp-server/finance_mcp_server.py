#!/usr/bin/env python3
"""
Finance MCP Server - Portfolio Risk and Sharpe Ratio Calculator
Provides financial analysis tools through Model Context Protocol
"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging

# Third-party imports
import pandas as pd
import numpy as np
import yfinance as yf
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# MCP imports
from mcp.server.fastmcp import FastMCP
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions
from mcp.types import Resource, Tool

# Load environment variables
load_dotenv()

# Setup logging - suppress INFO messages in production
log_level = logging.ERROR if os.getenv("PRODUCTION") else logging.WARNING
logging.basicConfig(level=log_level)
logger = logging.getLogger(__name__)

# Initialize MCP server
mcp = FastMCP("FinanceTools")

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable is required")
    raise ValueError("DATABASE_URL is required")

engine = create_engine(DATABASE_URL)

# Risk-free rate (can be made configurable)
RISK_FREE_RATE = 0.02  # 2% annual risk-free rate

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
                a."avgCost" as avg_cost,
                a."assetType" as asset_type
            FROM portfolios p
            JOIN assets a ON p.id = a."portfolioId"
            WHERE p."userId" = :user_id
            ORDER BY p.name, a.symbol
            """
            
            with engine.connect() as conn:
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
                        "avg_cost": float(row.avg_cost) if row.avg_cost else None,
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

# MCP Resource: Get portfolio data
@mcp.resource("portfolio://{user_id}")
def get_portfolio_resource(user_id: str) -> str:
    """Get user's portfolio data"""
    portfolio_data = PortfolioAnalyzer.get_user_portfolio(user_id)
    return json.dumps(portfolio_data, indent=2)

# MCP Tool: Calculate portfolio risk metrics
@mcp.tool()
def calculate_portfolio_risk(user_id: str) -> Dict[str, Any]:
    """
    Calculate comprehensive risk metrics for user's portfolios including:
    - Annual return and volatility
    - Sharpe ratio
    - Value at Risk (VaR)
    - Maximum drawdown
    
    Args:
        user_id: The user's unique identifier
        
    Returns:
        Dictionary containing risk analysis for each portfolio
    """
    # Suppress info logging in API calls
    # logger.info(f"Calculating portfolio risk for user: {user_id}")
    
    # Get portfolio data
    portfolio_data = PortfolioAnalyzer.get_user_portfolio(user_id)
    
    if "error" in portfolio_data:
        return portfolio_data
    
    # Calculate risk metrics
    risk_analysis = PortfolioAnalyzer.calculate_portfolio_risk(portfolio_data)
    
    # logger.info(f"Risk analysis completed for user: {user_id}")
    return risk_analysis

# MCP Tool: Calculate Sharpe ratio for specific portfolio
@mcp.tool()
def calculate_sharpe_ratio(user_id: str, portfolio_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculate Sharpe ratio for user's portfolio(s)
    
    Args:
        user_id: The user's unique identifier
        portfolio_id: Optional specific portfolio ID (if None, calculates for all)
        
    Returns:
        Dictionary containing Sharpe ratio analysis
    """
    # logger.info(f"Calculating Sharpe ratio for user: {user_id}, portfolio: {portfolio_id}")
    
    # Get portfolio data
    portfolio_data = PortfolioAnalyzer.get_user_portfolio(user_id)
    
    if "error" in portfolio_data:
        return portfolio_data
    
    # Filter to specific portfolio if requested
    if portfolio_id:
        if portfolio_id not in portfolio_data["portfolios"]:
            return {"error": f"Portfolio {portfolio_id} not found"}
        
        portfolio_data["portfolios"] = {portfolio_id: portfolio_data["portfolios"][portfolio_id]}
    
    # Calculate risk metrics (includes Sharpe ratio)
    risk_analysis = PortfolioAnalyzer.calculate_portfolio_risk(portfolio_data)
    
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
        "user_id": user_id,
        "analysis_date": datetime.now().isoformat(),
        "sharpe_analysis": sharpe_results
    }

# MCP Tool: Get market data for portfolio symbols
@mcp.tool()
def get_portfolio_market_data(user_id: str, period: str = "1mo") -> Dict[str, Any]:
    """
    Get current market data for all symbols in user's portfolios
    
    Args:
        user_id: The user's unique identifier
        period: Time period for data (1mo, 3mo, 6mo, 1y, 2y, 5y)
        
    Returns:
        Dictionary containing market data summary
    """
    # logger.info(f"Getting market data for user: {user_id}, period: {period}")
    
    # Get portfolio data
    portfolio_data = PortfolioAnalyzer.get_user_portfolio(user_id)
    
    if "error" in portfolio_data:
        return portfolio_data
    
    # Collect all unique symbols
    all_symbols = set()
    for portfolio in portfolio_data["portfolios"].values():
        for asset in portfolio["assets"]:
            all_symbols.add(asset["symbol"])
    
    symbols_list = list(all_symbols)
    
    # Get market data
    market_data = PortfolioAnalyzer.get_market_data(symbols_list, period)
    
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
        "user_id": user_id,
        "period": period,
        "symbols_analyzed": len(summary),
        "market_data": summary,
        "analysis_date": datetime.now().isoformat()
    }

# Server startup
if __name__ == "__main__":
    logger.info("Starting Finance MCP Server...")
    
    # Test database connection
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise
    
    logger.info("Finance MCP Server ready!")
    mcp.run()