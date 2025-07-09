"""
Finance Analyzer - Portfolio Risk and Performance Analysis
Pluggable analyzer for the Generic MCP Server
"""

import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import pandas as pd
import numpy as np
import yfinance as yf
from sqlalchemy import text
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from generic_mcp_server import BaseAnalyzer, mcp_analyzer, mcp_tool, mcp_resource

# Risk-free rate (configurable)
RISK_FREE_RATE = 0.02

@mcp_analyzer
class FinanceAnalyzer(BaseAnalyzer):
    """Finance analysis tools for portfolio risk and performance"""
    
    def __init__(self, database_engine=None):
        super().__init__(database_engine)
        self.risk_free_rate = float(os.getenv("RISK_FREE_RATE", RISK_FREE_RATE))
    
    @mcp_resource("portfolio://{user_id}")
    def resource_portfolio_data(self, user_id: str) -> str:
        """Get user's complete portfolio data"""
        portfolio_data = self._get_user_portfolio(user_id)
        return json.dumps(portfolio_data, indent=2)
    
    @mcp_tool
    def tool_calculate_portfolio_risk(self, user_id: str) -> Dict[str, Any]:
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
        # self.logger.info(f"Calculating portfolio risk for user: {user_id}")
        
        portfolio_data = self._get_user_portfolio(user_id)
        if "error" in portfolio_data:
            return portfolio_data
        
        risk_analysis = self._calculate_portfolio_risk(portfolio_data)
        # self.logger.info(f"Risk analysis completed for user: {user_id}")
        return risk_analysis
    
    @mcp_tool
    def tool_calculate_sharpe_ratio(self, user_id: str, portfolio_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Calculate Sharpe ratio for user's portfolio(s)
        
        Args:
            user_id: The user's unique identifier
            portfolio_id: Optional specific portfolio ID
            
        Returns:
            Dictionary containing Sharpe ratio analysis
        """
        self.logger.info(f"Calculating Sharpe ratio for user: {user_id}, portfolio: {portfolio_id}")
        
        portfolio_data = self._get_user_portfolio(user_id)
        if "error" in portfolio_data:
            return portfolio_data
        
        if portfolio_id and portfolio_id not in portfolio_data["portfolios"]:
            return {"error": f"Portfolio {portfolio_id} not found"}
        
        if portfolio_id:
            portfolio_data["portfolios"] = {portfolio_id: portfolio_data["portfolios"][portfolio_id]}
        
        risk_analysis = self._calculate_portfolio_risk(portfolio_data)
        
        # Extract Sharpe ratio information
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
    
    @mcp_tool
    def tool_get_market_data(self, user_id: str, period: str = "1mo") -> Dict[str, Any]:
        """
        Get current market data for all symbols in user's portfolios
        
        Args:
            user_id: The user's unique identifier
            period: Time period for data (1mo, 3mo, 6mo, 1y, 2y, 5y)
            
        Returns:
            Dictionary containing market data summary
        """
        self.logger.info(f"Getting market data for user: {user_id}, period: {period}")
        
        portfolio_data = self._get_user_portfolio(user_id)
        if "error" in portfolio_data:
            return portfolio_data
        
        # Collect all unique symbols
        all_symbols = set()
        for portfolio in portfolio_data["portfolios"].values():
            for asset in portfolio["assets"]:
                all_symbols.add(asset["symbol"])
        
        symbols_list = list(all_symbols)
        market_data = self._get_market_data(symbols_list, period)
        
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
    
    # Private helper methods
    def _get_user_portfolio(self, user_id: str) -> Dict[str, Any]:
        """Get user's portfolio data from database"""
        if not self.db_engine:
            return {"error": "Database not available"}
        
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
            
            with self.db_engine.connect() as conn:
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
            self.logger.error(f"Error fetching portfolio data: {e}")
            return {"error": f"Database error: {str(e)}"}
    
    def _get_market_data(self, symbols: List[str], period: str = "1y") -> Dict[str, pd.DataFrame]:
        """Fetch market data for given symbols"""
        try:
            market_data = {}
            for symbol in symbols:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=period)
                if not hist.empty:
                    market_data[symbol] = hist
                else:
                    self.logger.warning(f"No data found for symbol: {symbol}")
            
            return market_data
        except Exception as e:
            self.logger.error(f"Error fetching market data: {e}")
            return {}
    
    def _calculate_returns(self, prices: pd.Series) -> pd.Series:
        """Calculate daily returns from price series"""
        return prices.pct_change().dropna()
    
    def _calculate_portfolio_risk(self, portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate portfolio risk metrics"""
        try:
            results = {}
            
            for portfolio_id, portfolio in portfolio_data["portfolios"].items():
                assets = portfolio["assets"]
                symbols = [asset["symbol"] for asset in assets]
                
                # Calculate market data and weights
                market_data = self._get_market_data(symbols)
                
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
                weights = []
                for symbol in symbols:
                    if symbol in market_data and symbol in asset_values:
                        weights.append(asset_values[symbol] / total_value)
                        returns_data[symbol] = self._calculate_returns(
                            market_data[symbol]["Close"]
                        )
                
                if not returns_data:
                    results[portfolio_id] = {"error": "Cannot calculate returns"}
                    continue
                
                # Create returns dataframe
                returns_df = pd.DataFrame(returns_data).fillna(0)
                weights_array = np.array(weights)
                portfolio_returns = (returns_df * weights_array).sum(axis=1)
                
                # Calculate risk metrics
                annual_return = portfolio_returns.mean() * 252
                annual_volatility = portfolio_returns.std() * np.sqrt(252)
                sharpe_ratio = (annual_return - self.risk_free_rate) / annual_volatility if annual_volatility > 0 else 0
                
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
                    "risk_free_rate": self.risk_free_rate * 100
                }
            
            return {
                "user_id": portfolio_data["user_id"],
                "analysis_date": datetime.now().isoformat(),
                "results": results
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating portfolio risk: {e}")
            return {"error": f"Risk calculation error: {str(e)}"}