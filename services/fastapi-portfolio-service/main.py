from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import logging
from scipy.optimize import minimize
import warnings
import requests
import re
from textblob import TextBlob
warnings.filterwarnings('ignore')

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
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        "*"  # Allow all origins for now to test
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Asset(BaseModel):
    symbol: str
    shares: float
    # Note: FastAPI service uses current market prices fetched from yfinance
    # for all risk calculations, not historical average cost

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

# Portfolio Optimization Models
class OptimizationRequest(BaseModel):
    assets: List[Asset]
    objective: str = "max_sharpe"  # max_sharpe, min_volatility, max_return
    risk_tolerance: float = 0.5  # 0.0 (conservative) to 1.0 (aggressive)
    constraints: Optional[Dict] = None  # sector limits, individual asset limits, etc.

class OptimizedAllocation(BaseModel):
    symbol: str
    current_weight: float
    optimized_weight: float
    recommended_action: str  # "buy", "sell", "hold"
    shares_to_trade: float
    value_to_trade: float

class PortfolioOptimizationResponse(BaseModel):
    current_portfolio: Dict[str, float]  # symbol: weight
    optimized_portfolio: Dict[str, float]  # symbol: weight
    allocations: List[OptimizedAllocation]
    expected_return: float
    expected_volatility: float
    sharpe_ratio: float
    improvement_metrics: Dict[str, float]
    rebalancing_cost_estimate: float
    implementation_notes: List[str]

# Monte Carlo Simulation Models
class MonteCarloRequest(BaseModel):
    assets: List[Asset]
    time_horizon_years: int = 10
    simulations: int = 10000
    initial_investment: float = 100000.0

class MonteCarloResponse(BaseModel):
    simulations_run: int
    time_horizon_years: int
    percentile_outcomes: Dict[str, float]  # 5th, 25th, 50th, 75th, 95th percentiles
    probability_of_loss: float
    expected_final_value: float
    worst_case_scenario: float
    best_case_scenario: float
    chart_data: Dict[str, List[float]]  # for visualization

# Market Sentiment Analysis Models
class SentimentRequest(BaseModel):
    symbols: List[str]
    news_sources: List[str] = ["general"]  # general, reddit, twitter, news
    time_range: str = "24h"  # 24h, 7d, 30d

class StockSentiment(BaseModel):
    symbol: str
    sentiment_score: float  # -1 to 1 (negative to positive)
    confidence: float  # 0 to 1
    news_count: int
    key_themes: List[str]
    sentiment_label: str  # "Very Negative", "Negative", "Neutral", "Positive", "Very Positive"

class MarketSentimentResponse(BaseModel):
    overall_sentiment: float
    overall_confidence: float
    sentiment_distribution: Dict[str, int]  # {"positive": 45, "negative": 20, "neutral": 35}
    stock_sentiments: List[StockSentiment]
    market_fear_greed_index: Optional[float]  # 0-100 scale
    analysis_timestamp: str
    recommendations: List[str]

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
            raise HTTPException(status_code=400, detail="Could not fetch market data for any symbols")
        
        # Handle single vs multiple symbols and filter out failed symbols
        prices_dict = {}
        
        if len(symbols) == 1:
            # For single symbol, yfinance returns a different structure
            symbol = symbols[0]
            if 'Close' in data.columns and not data['Close'].empty:
                prices_dict[symbol] = data['Close']
            elif symbol in data.columns and not data[symbol]['Close'].empty:
                prices_dict[symbol] = data[symbol]['Close']
            else:
                logger.warning(f"No valid data for symbol: {symbol}")
        else:
            # Multiple symbols - only include symbols with valid data
            for symbol in symbols:
                try:
                    if symbol in data and 'Close' in data[symbol].columns:
                        symbol_data = data[symbol]['Close'].dropna()
                        if len(symbol_data) > 10:  # Need at least 10 data points
                            prices_dict[symbol] = symbol_data
                        else:
                            logger.warning(f"Insufficient data for symbol: {symbol}")
                    else:
                        logger.warning(f"No data found for symbol: {symbol}")
                except Exception as e:
                    logger.warning(f"Error processing symbol {symbol}: {e}")
        
        if not prices_dict:
            raise HTTPException(status_code=400, detail="No valid market data found for any symbols")
            
        prices = pd.DataFrame(prices_dict)
        
        # Calculate returns
        returns = prices.pct_change().dropna()
        
        # Portfolio weights (simplified - using current prices)
        # Only use symbols that have valid price data
        valid_symbols = list(prices.columns)
        
        current_prices = prices.iloc[-1]
        portfolio_values = {symbol: shares[symbol] * current_prices[symbol] for symbol in valid_symbols}
        total_value = sum(portfolio_values.values())
        
        if total_value <= 0:
            raise HTTPException(status_code=400, detail="Portfolio has no valid assets with market data")
            
        weights = {symbol: portfolio_values[symbol] / total_value for symbol in valid_symbols}
        
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
        
        risk_analysis_result = PortfolioRiskAnalysis(
            totalValue=round(total_value, 2),
            dailyVaR=round(abs(daily_var), 2),
            annualizedVoL=round(annualized_vol * 100, 2),
            sharpeRatio=round(sharpe_ratio, 3),
            beta=round(beta, 3),
            riskLevel=risk_level
        )
        
        # Log successful analysis
        logger.info(f"Portfolio risk analysis completed: ${risk_analysis_result.totalValue:,.2f} total value, {risk_analysis_result.riskLevel} risk")
        
        return risk_analysis_result
        
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
            
        sharpe_result = SharpeRatioResponse(
            sharpeRatio=analysis.sharpeRatio,
            explanation=explanation
        )
        
        # Log successful analysis
        logger.info(f"Sharpe ratio analysis completed: {sharpe_result.sharpeRatio:.3f}")
        
        return sharpe_result
        
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

@app.post("/portfolio/optimize", response_model=PortfolioOptimizationResponse)
async def optimize_portfolio(request: OptimizationRequest):
    """Optimize portfolio allocation using Modern Portfolio Theory"""
    try:
        if not request.assets:
            raise HTTPException(status_code=400, detail="No assets provided")
        
        logger.info(f"Starting portfolio optimization for {len(request.assets)} assets with objective: {request.objective}")
        
        # Get portfolio data
        symbols = [asset.symbol for asset in request.assets]
        current_shares = {asset.symbol: asset.shares for asset in request.assets}
        
        # Fetch market data for returns calculation
        data = yf.download(symbols, period="2y", progress=False, auto_adjust=True)
        
        if data.empty:
            raise HTTPException(status_code=400, detail="Could not fetch market data for any symbols")
        
        # Process price data
        if len(symbols) == 1:
            prices = pd.DataFrame({symbols[0]: data['Close']})
        else:
            prices = data['Close']
        
        # Remove symbols with insufficient data
        valid_symbols = []
        for symbol in symbols:
            if symbol in prices.columns and len(prices[symbol].dropna()) > 50:
                valid_symbols.append(symbol)
            else:
                logger.warning(f"Insufficient data for symbol: {symbol}")
        
        if len(valid_symbols) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 assets with sufficient data for optimization")
        
        # Filter assets to valid symbols only
        valid_assets = [asset for asset in request.assets if asset.symbol in valid_symbols]
        prices = prices[valid_symbols].dropna()
        
        # Calculate returns
        returns = prices.pct_change().dropna()
        
        # Calculate current portfolio value and weights
        current_prices = prices.iloc[-1]
        current_values = {symbol: current_shares[symbol] * current_prices[symbol] for symbol in valid_symbols}
        total_value = sum(current_values.values())
        current_weights = np.array([current_values[symbol] / total_value for symbol in valid_symbols])
        
        # Calculate expected returns and covariance matrix
        expected_returns = returns.mean() * 252  # Annualized
        cov_matrix = returns.cov() * 252  # Annualized
        
        # Portfolio optimization function
        def portfolio_performance(weights, returns, cov_matrix):
            portfolio_return = np.sum(returns * weights)
            portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            return portfolio_return, portfolio_volatility
        
        def negative_sharpe_ratio(weights, returns, cov_matrix, risk_free_rate=0.02):
            p_return, p_volatility = portfolio_performance(weights, returns, cov_matrix)
            return -(p_return - risk_free_rate) / p_volatility
        
        def minimize_volatility(weights, returns, cov_matrix):
            return portfolio_performance(weights, returns, cov_matrix)[1]
        
        def negative_return(weights, returns, cov_matrix):
            return -portfolio_performance(weights, returns, cov_matrix)[0]
        
        # Constraints and bounds
        num_assets = len(valid_symbols)
        constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
        bounds = tuple((0, 1) for _ in range(num_assets))
        
        # Apply risk tolerance to constraints
        if request.risk_tolerance < 0.3:  # Conservative
            # Limit individual asset weights to 20%
            bounds = tuple((0, 0.2) for _ in range(num_assets))
        elif request.risk_tolerance > 0.7:  # Aggressive
            # Allow up to 40% in individual assets
            bounds = tuple((0, 0.4) for _ in range(num_assets))
        
        # Choose objective function
        if request.objective == "max_sharpe":
            objective_func = negative_sharpe_ratio
        elif request.objective == "min_volatility":
            objective_func = minimize_volatility
        elif request.objective == "max_return":
            objective_func = negative_return
        else:
            objective_func = negative_sharpe_ratio
        
        # Optimize
        initial_guess = np.array([1/num_assets] * num_assets)
        result = minimize(
            objective_func,
            initial_guess,
            args=(expected_returns, cov_matrix),
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        if not result.success:
            raise HTTPException(status_code=500, detail="Optimization failed to converge")
        
        optimized_weights = result.x
        
        # Calculate performance metrics
        current_return, current_volatility = portfolio_performance(current_weights, expected_returns, cov_matrix)
        optimized_return, optimized_volatility = portfolio_performance(optimized_weights, expected_returns, cov_matrix)
        
        current_sharpe = (current_return - 0.02) / current_volatility if current_volatility > 0 else 0
        optimized_sharpe = (optimized_return - 0.02) / optimized_volatility if optimized_volatility > 0 else 0
        
        # Generate allocation recommendations
        allocations = []
        rebalancing_cost = 0.0
        
        for i, symbol in enumerate(valid_symbols):
            current_weight = current_weights[i]
            optimized_weight = optimized_weights[i]
            
            weight_diff = optimized_weight - current_weight
            value_to_trade = weight_diff * total_value
            shares_to_trade = value_to_trade / current_prices[symbol]
            
            if abs(weight_diff) > 0.01:  # Only suggest changes > 1%
                action = "buy" if weight_diff > 0 else "sell"
                rebalancing_cost += abs(value_to_trade) * 0.001  # Assume 0.1% transaction cost
            else:
                action = "hold"
            
            allocations.append(OptimizedAllocation(
                symbol=symbol,
                current_weight=round(current_weight * 100, 2),
                optimized_weight=round(optimized_weight * 100, 2),
                recommended_action=action,
                shares_to_trade=round(shares_to_trade, 2),
                value_to_trade=round(value_to_trade, 2)
            ))
        
        # Improvement metrics
        improvement_metrics = {
            "return_improvement": round((optimized_return - current_return) * 100, 2),
            "volatility_change": round((optimized_volatility - current_volatility) * 100, 2),
            "sharpe_improvement": round(optimized_sharpe - current_sharpe, 3)
        }
        
        # Implementation notes
        implementation_notes = []
        if rebalancing_cost > total_value * 0.01:
            implementation_notes.append("High rebalancing costs detected. Consider gradual implementation.")
        if optimized_sharpe > current_sharpe + 0.1:
            implementation_notes.append("Significant improvement potential identified.")
        if request.risk_tolerance < 0.3 and optimized_volatility > 0.15:
            implementation_notes.append("Portfolio may still be too aggressive for conservative risk tolerance.")
        
        response = PortfolioOptimizationResponse(
            current_portfolio={symbol: round(current_weights[i] * 100, 2) for i, symbol in enumerate(valid_symbols)},
            optimized_portfolio={symbol: round(optimized_weights[i] * 100, 2) for i, symbol in enumerate(valid_symbols)},
            allocations=allocations,
            expected_return=round(optimized_return * 100, 2),
            expected_volatility=round(optimized_volatility * 100, 2),
            sharpe_ratio=round(optimized_sharpe, 3),
            improvement_metrics=improvement_metrics,
            rebalancing_cost_estimate=round(rebalancing_cost, 2),
            implementation_notes=implementation_notes
        )
        
        logger.info(f"Portfolio optimization completed. Sharpe ratio: {optimized_sharpe:.3f}")
        return response
        
    except Exception as e:
        logger.error(f"Error optimizing portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Portfolio optimization failed: {str(e)}")

@app.post("/portfolio/monte-carlo", response_model=MonteCarloResponse)
async def run_monte_carlo_simulation(request: MonteCarloRequest):
    """Run Monte Carlo simulation for portfolio projections"""
    try:
        if not request.assets:
            raise HTTPException(status_code=400, detail="No assets provided")
        
        logger.info(f"Starting Monte Carlo simulation with {request.simulations} runs for {request.time_horizon_years} years")
        
        # Get portfolio data
        symbols = [asset.symbol for asset in request.assets]
        shares = {asset.symbol: asset.shares for asset in request.assets}
        
        # Fetch market data
        data = yf.download(symbols, period="2y", progress=False, auto_adjust=True)
        
        if data.empty:
            raise HTTPException(status_code=400, detail="Could not fetch market data")
        
        # Process price data
        if len(symbols) == 1:
            prices = pd.DataFrame({symbols[0]: data['Close']})
        else:
            prices = data['Close']
        
        # Calculate returns and portfolio weights
        returns = prices.pct_change().dropna()
        current_prices = prices.iloc[-1]
        
        # Calculate portfolio weights
        portfolio_values = {symbol: shares[symbol] * current_prices[symbol] for symbol in symbols}
        total_value = sum(portfolio_values.values())
        weights = np.array([portfolio_values[symbol] / total_value for symbol in symbols])
        
        # Calculate portfolio statistics
        portfolio_returns = (returns * weights).sum(axis=1)
        mean_return = portfolio_returns.mean()
        std_return = portfolio_returns.std()
        
        # Run Monte Carlo simulation
        np.random.seed(42)  # For reproducible results
        simulations = []
        
        for _ in range(request.simulations):
            # Generate random returns for each year
            random_returns = np.random.normal(mean_return, std_return, 252 * request.time_horizon_years)
            
            # Calculate cumulative value
            cumulative_returns = np.cumprod(1 + random_returns)
            final_value = request.initial_investment * cumulative_returns[-1]
            simulations.append(final_value)
        
        simulations = np.array(simulations)
        
        # Calculate percentiles and statistics
        percentiles = {
            "5th": float(np.percentile(simulations, 5)),
            "25th": float(np.percentile(simulations, 25)),
            "50th": float(np.percentile(simulations, 50)),
            "75th": float(np.percentile(simulations, 75)),
            "95th": float(np.percentile(simulations, 95))
        }
        
        probability_of_loss = float(np.sum(simulations < request.initial_investment) / len(simulations))
        expected_final_value = float(np.mean(simulations))
        worst_case = float(np.min(simulations))
        best_case = float(np.max(simulations))
        
        # Generate chart data for visualization
        chart_data = {
            "simulation_results": simulations.tolist()[:1000],  # Limit for frontend
            "percentile_bands": list(percentiles.values())
        }
        
        response = MonteCarloResponse(
            simulations_run=request.simulations,
            time_horizon_years=request.time_horizon_years,
            percentile_outcomes=percentiles,
            probability_of_loss=probability_of_loss,
            expected_final_value=round(expected_final_value, 2),
            worst_case_scenario=round(worst_case, 2),
            best_case_scenario=round(best_case, 2),
            chart_data=chart_data
        )
        
        logger.info(f"Monte Carlo simulation completed. Expected value: ${expected_final_value:,.2f}")
        return response
        
    except Exception as e:
        logger.error(f"Error running Monte Carlo simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Monte Carlo simulation failed: {str(e)}")

@app.post("/market/sentiment", response_model=MarketSentimentResponse)
async def analyze_market_sentiment(request: SentimentRequest):
    """Analyze market sentiment for given symbols using news and social media data"""
    try:
        if not request.symbols:
            raise HTTPException(status_code=400, detail="No symbols provided")
        
        logger.info(f"Starting sentiment analysis for {len(request.symbols)} symbols")
        
        stock_sentiments = []
        total_sentiment = 0
        total_confidence = 0
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        
        # Analyze sentiment for each symbol
        for symbol in request.symbols:
            try:
                # Get company info from yfinance
                ticker = yf.Ticker(symbol)
                info = ticker.info
                company_name = info.get('longName', symbol)
                
                # Simulate sentiment analysis (in production, you'd use real news APIs)
                sentiment_data = await simulate_sentiment_analysis(symbol, company_name, request.time_range)
                
                # Calculate sentiment label
                sentiment_label = get_sentiment_label(sentiment_data['sentiment_score'])
                
                stock_sentiment = StockSentiment(
                    symbol=symbol,
                    sentiment_score=sentiment_data['sentiment_score'],
                    confidence=sentiment_data['confidence'],
                    news_count=sentiment_data['news_count'],
                    key_themes=sentiment_data['key_themes'],
                    sentiment_label=sentiment_label
                )
                
                stock_sentiments.append(stock_sentiment)
                
                # Accumulate overall metrics
                total_sentiment += sentiment_data['sentiment_score'] * sentiment_data['confidence']
                total_confidence += sentiment_data['confidence']
                
                # Count sentiment distribution
                if sentiment_data['sentiment_score'] > 0.1:
                    sentiment_counts["positive"] += 1
                elif sentiment_data['sentiment_score'] < -0.1:
                    sentiment_counts["negative"] += 1
                else:
                    sentiment_counts["neutral"] += 1
                    
            except Exception as e:
                logger.warning(f"Error analyzing sentiment for {symbol}: {e}")
                # Add neutral sentiment for failed analysis
                stock_sentiments.append(StockSentiment(
                    symbol=symbol,
                    sentiment_score=0.0,
                    confidence=0.5,
                    news_count=0,
                    key_themes=["analysis_failed"],
                    sentiment_label="Neutral"
                ))
                sentiment_counts["neutral"] += 1
        
        # Calculate overall sentiment
        overall_sentiment = total_sentiment / total_confidence if total_confidence > 0 else 0
        overall_confidence = total_confidence / len(request.symbols) if request.symbols else 0
        
        # Calculate Fear & Greed Index (simulated)
        fear_greed_index = calculate_fear_greed_index(overall_sentiment, sentiment_counts)
        
        # Generate recommendations
        recommendations = generate_sentiment_recommendations(overall_sentiment, fear_greed_index, sentiment_counts)
        
        response = MarketSentimentResponse(
            overall_sentiment=round(overall_sentiment, 3),
            overall_confidence=round(overall_confidence, 3),
            sentiment_distribution=sentiment_counts,
            stock_sentiments=stock_sentiments,
            market_fear_greed_index=fear_greed_index,
            analysis_timestamp=datetime.now().isoformat(),
            recommendations=recommendations
        )
        
        logger.info(f"Sentiment analysis completed. Overall sentiment: {overall_sentiment:.3f}")
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing market sentiment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")

# Helper functions for sentiment analysis
async def simulate_sentiment_analysis(symbol: str, company_name: str, time_range: str) -> Dict:
    """Simulate sentiment analysis (replace with real API calls in production)"""
    import random
    import hashlib
    
    # Use symbol hash for consistent results
    seed = int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16)
    random.seed(seed)
    
    # Simulate different sentiment patterns based on symbol
    base_sentiment = random.uniform(-0.3, 0.3)
    
    # Add some market-wide effects
    market_effect = random.uniform(-0.2, 0.2)
    
    # Simulate news volume based on company size (approximated by symbol length)
    news_count = random.randint(5, 50)
    
    # Simulate key themes
    themes = ["earnings", "growth", "market_trends", "analyst_coverage", "regulatory", "competition"]
    key_themes = random.sample(themes, random.randint(2, 4))
    
    # Calculate final sentiment
    final_sentiment = np.clip(base_sentiment + market_effect, -1, 1)
    confidence = random.uniform(0.6, 0.9)
    
    return {
        "sentiment_score": final_sentiment,
        "confidence": confidence,
        "news_count": news_count,
        "key_themes": key_themes
    }

def get_sentiment_label(sentiment_score: float) -> str:
    """Convert sentiment score to human-readable label"""
    if sentiment_score > 0.4:
        return "Very Positive"
    elif sentiment_score > 0.1:
        return "Positive"
    elif sentiment_score > -0.1:
        return "Neutral"
    elif sentiment_score > -0.4:
        return "Negative"
    else:
        return "Very Negative"

def calculate_fear_greed_index(overall_sentiment: float, sentiment_counts: Dict[str, int]) -> float:
    """Calculate Fear & Greed Index based on sentiment data"""
    # Convert sentiment to 0-100 scale (50 is neutral)
    base_score = 50 + (overall_sentiment * 30)
    
    # Adjust based on sentiment distribution
    total_stocks = sum(sentiment_counts.values())
    if total_stocks > 0:
        positive_ratio = sentiment_counts["positive"] / total_stocks
        negative_ratio = sentiment_counts["negative"] / total_stocks
        
        # Boost or reduce based on consensus
        if positive_ratio > 0.7:  # Strong positive consensus
            base_score += 15
        elif negative_ratio > 0.7:  # Strong negative consensus
            base_score -= 15
    
    return round(np.clip(base_score, 0, 100), 1)

def generate_sentiment_recommendations(overall_sentiment: float, fear_greed_index: float, sentiment_counts: Dict[str, int]) -> List[str]:
    """Generate actionable recommendations based on sentiment analysis"""
    recommendations = []
    
    # Overall sentiment recommendations
    if overall_sentiment > 0.3:
        recommendations.append("Market sentiment is strongly positive. Consider taking profits on overvalued positions.")
    elif overall_sentiment > 0.1:
        recommendations.append("Market sentiment is positive. Good environment for growth investments.")
    elif overall_sentiment < -0.3:
        recommendations.append("Market sentiment is strongly negative. Consider defensive positioning or value opportunities.")
    elif overall_sentiment < -0.1:
        recommendations.append("Market sentiment is negative. Focus on quality stocks and risk management.")
    else:
        recommendations.append("Market sentiment is neutral. Focus on fundamental analysis for stock selection.")
    
    # Fear & Greed Index recommendations
    if fear_greed_index > 75:
        recommendations.append("Fear & Greed Index shows extreme greed. Consider reducing risk exposure.")
    elif fear_greed_index < 25:
        recommendations.append("Fear & Greed Index shows extreme fear. May be a good time to find value opportunities.")
    
    # Sentiment distribution recommendations
    total_stocks = sum(sentiment_counts.values())
    if total_stocks > 0:
        positive_ratio = sentiment_counts["positive"] / total_stocks
        if positive_ratio > 0.8:
            recommendations.append("Very high positive sentiment consensus. Watch for potential market overconfidence.")
        elif positive_ratio < 0.2:
            recommendations.append("Low positive sentiment. Market may be overly pessimistic about opportunities.")
    
    return recommendations[:5]  # Limit to 5 recommendations

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)