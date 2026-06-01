"""
Yahoo Finance data fetching utilities.

Provides a unified interface for downloading market data with caching,
returns calculation, and Monte Carlo sampling support.
"""

import pandas as pd
import numpy as np
import yfinance as yf
import pickle
import os
import logging
import hashlib
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta


class FinDataFetcher:
    """
    Financial data fetcher for Yahoo Finance.

    Handles ticker data downloads with error handling and logging.
    """

    def __init__(self, start_date: str, end_date: str):
        """
        Initialize fetcher with date range.

        Parameters:
        -----------
        start_date : str
            Start date in YYYY-MM-DD format
        end_date : str
            End date in YYYY-MM-DD format
        """
        self.start_date = start_date
        self.end_date = end_date
        self.logger = logging.getLogger(__name__)

    def fetch_ticker(self, ticker: str) -> Optional[pd.DataFrame]:
        """
        Fetch data for a single ticker from Yahoo Finance.

        Parameters:
        -----------
        ticker : str
            Ticker symbol

        Returns:
        --------
        pd.DataFrame with Close and Volume columns or None if failed
        """
        try:
            data = yf.download(
                ticker,
                start=self.start_date,
                end=self.end_date,
                interval='1d',
                auto_adjust=True,
                progress=False
            )[['Close', 'Volume']]
            self.logger.info(f"Downloaded {len(data)} days of data for {ticker}")
            return data
        except Exception as e:
            self.logger.warning(f"Failed to download data for {ticker}: {e}")
            return None

    def fetch_tickers(self, tickers: List[str]) -> pd.DataFrame:
        """
        Fetch data for multiple tickers.

        Parameters:
        -----------
        tickers : List[str]
            List of ticker symbols

        Returns:
        --------
        pd.DataFrame with MultiIndex columns (Ticker, Metric)
        """
        columns = pd.MultiIndex.from_tuples([], names=['Ticker', 'Metric'])
        all_data = pd.DataFrame(columns=columns)

        for ticker in tickers:
            ticker_data = self.fetch_ticker(ticker)
            if ticker_data is not None:
                for col in ['Close', 'Volume']:
                    all_data[(ticker, col)] = ticker_data[col]

        self.logger.info(f"Fetched data for {len(all_data.columns)//2} tickers")
        return all_data

    def fetch_prices(self, tickers: List[str]) -> pd.DataFrame:
        """
        Fetch just close prices for multiple tickers.

        Parameters:
        -----------
        tickers : List[str]
            List of ticker symbols

        Returns:
        --------
        pd.DataFrame with tickers as columns
        """
        all_data = self.fetch_tickers(tickers)
        if all_data.empty:
            return pd.DataFrame()

        # Extract close prices
        close_prices = all_data.xs('Close', level=1, axis=1)
        close_prices.columns = close_prices.columns.get_level_values(0)
        return close_prices


class FinData:
    """
    Financial data management class for fetching and caching market data.

    Handles ticker loading, Yahoo Finance data fetching, caching, and provides
    returns calculation and baseline weight alignment.
    """

    def __init__(self, start_date: str, end_date: str, cache_dir: str = None):
        """
        Initialize FinData with date range and cache directory.

        Parameters:
        -----------
        start_date : str
            Start date in YYYY-MM-DD format
        end_date : str
            End date in YYYY-MM-DD format
        cache_dir : str, optional
            Directory for pickle cache files. Defaults to data/cache/
        """
        self.start_date = start_date
        self.end_date = end_date

        # Default cache directory
        if cache_dir is None:
            # Use workspace data/cache by default
            workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
            cache_dir = os.path.join(workspace_root, "data", "cache")

        self.cache_dir = cache_dir

        # Ensure cache directory exists
        os.makedirs(cache_dir, exist_ok=True)

        # Data storage
        self._price_data: Optional[pd.DataFrame] = None
        self._returns_data: Optional[pd.DataFrame] = None
        self._tickers_df: Optional[pd.DataFrame] = None

        logging.info(f"FinData initialized for period {start_date} to {end_date}")

    def load_tickers(self, ticker_file: str) -> pd.DataFrame:
        """
        Load ticker symbols and weights from CSV file.

        Parameters:
        -----------
        ticker_file : str
            Path to ticker file (format: Symbol,Weight with headers)

        Returns:
        --------
        pd.DataFrame with columns ['Symbol', 'Weight']
        """
        try:
            # Read CSV with headers
            tickers_df = pd.read_csv(ticker_file, skipinitialspace=True)

            # Clean column names
            tickers_df.columns = tickers_df.columns.str.strip()

            # Standardize column names
            if 'ticker' in tickers_df.columns:
                tickers_df = tickers_df.rename(columns={'ticker': 'Symbol'})
            if 'weights' in tickers_df.columns:
                tickers_df = tickers_df.rename(columns={'weights': 'Weight'})

            # Remove empty rows and ensure weights are numeric
            tickers_df = tickers_df.dropna()
            tickers_df['Weight'] = pd.to_numeric(tickers_df['Weight'], errors='coerce')
            tickers_df = tickers_df.dropna()

            # Normalize weights to sum to 1
            tickers_df['Weight'] = tickers_df['Weight'] / tickers_df['Weight'].sum()

            self._tickers_df = tickers_df

            logging.info(f"Loaded {len(tickers_df)} tickers from {ticker_file}")
            logging.info(f"Weights sum to: {tickers_df['Weight'].sum():.4f}")

            return tickers_df

        except Exception as e:
            logging.error(f"Failed to load ticker file {ticker_file}: {e}")
            raise

    def _generate_ticker_hash(self, tickers: List[str]) -> str:
        """Generate a short hash of the ticker list for cache versioning."""
        sorted_tickers = sorted(tickers)
        ticker_string = ','.join(sorted_tickers)
        hash_object = hashlib.md5(ticker_string.encode())
        return hash_object.hexdigest()[:8]

    def get_cache_filename(self, tickers: List[str] = None) -> str:
        """Generate cache filename based on date range and ticker list."""
        if tickers:
            ticker_hash = self._generate_ticker_hash(tickers)
            return os.path.join(self.cache_dir, f"price_data_{self.start_date}_{self.end_date}_{ticker_hash}.pkl")
        else:
            return os.path.join(self.cache_dir, f"price_data_{self.start_date}_{self.end_date}.pkl")

    def load_cache(self, tickers: List[str]) -> Optional[pd.DataFrame]:
        """Load price data from pickle cache for specific tickers."""
        cache_file = self.get_cache_filename(tickers)

        if not os.path.exists(cache_file):
            logging.info(f"Cache file not found: {cache_file}")
            return None

        try:
            with open(cache_file, 'rb') as f:
                data = pickle.load(f)
            logging.info(f"Successfully loaded price data from cache ({len(data.columns)//2} tickers)")
            return data
        except Exception as e:
            logging.warning(f"Failed to load cache file: {e}")
            return None

    def save_cache(self, data: pd.DataFrame, tickers: List[str]) -> None:
        """Save price data to pickle cache."""
        cache_file = self.get_cache_filename(tickers)

        try:
            with open(cache_file, 'wb') as f:
                pickle.dump(data, f)
            logging.info(f"Price data saved to cache: {cache_file}")
        except Exception as e:
            logging.warning(f"Failed to save cache file: {e}")

    def fetch_ticker_data(self, ticker: str) -> Optional[pd.DataFrame]:
        """
        Fetch data for a single ticker from Yahoo Finance.

        Parameters:
        -----------
        ticker : str
            Ticker symbol

        Returns:
        --------
        pd.DataFrame with Close and Volume columns or None if failed
        """
        try:
            data = yf.download(ticker, start=self.start_date, end=self.end_date,
                             interval='1d', progress=False)[['Close', 'Volume']]
            logging.info(f"Downloaded {len(data)} days of data for {ticker}")
            return data
        except Exception as e:
            logging.warning(f"Failed to download data for {ticker}: {e}")
            return None

    def get_price_data(self, tickers: List[str]) -> pd.DataFrame:
        """
        Get price data for specified tickers with caching.

        Parameters:
        -----------
        tickers : List[str]
            List of ticker symbols

        Returns:
        --------
        pd.DataFrame with MultiIndex columns (Ticker, Metric)
        """
        # Try to load from cache first
        cached_data = self.load_cache(tickers)

        if cached_data is not None:
            logging.info("All requested tickers found in cache")
            self._price_data = cached_data
            return cached_data
        else:
            logging.info(f"Cache miss - fetching fresh data for {len(tickers)} tickers")
            columns = pd.MultiIndex.from_tuples([], names=['Ticker', 'Metric'])
            all_prices_df = pd.DataFrame(columns=columns)
            missing_tickers = set(tickers)

        # Fetch missing tickers
        for ticker in missing_tickers:
            ticker_data = self.fetch_ticker_data(ticker)
            if ticker_data is not None:
                for col in ['Close', 'Volume']:
                    all_prices_df[(ticker, col)] = ticker_data[col]

        # Save updated data to cache
        self.save_cache(all_prices_df, tickers)
        self._price_data = all_prices_df

        logging.info(f"Price data ready for {len(all_prices_df.columns)//2} tickers")
        return all_prices_df

    def get_returns_data(self, tickers: List[str]) -> pd.DataFrame:
        """
        Calculate daily returns from price data.

        Parameters:
        -----------
        tickers : List[str]
            List of ticker symbols

        Returns:
        --------
        pd.DataFrame with daily returns for each ticker
        """
        if self._price_data is None:
            self.get_price_data(tickers)

        # Extract close prices and calculate returns
        close_prices = self._price_data.xs('Close', level=1, axis=1)
        close_prices.columns = close_prices.columns.get_level_values(0)
        returns_df = close_prices.pct_change().dropna()

        self._returns_data = returns_df
        logging.info(f"Calculated daily returns for {len(returns_df.columns)} tickers")

        return returns_df

    def get_baseline_weights(self, tickers: List[str]) -> np.ndarray:
        """
        Get baseline portfolio weights aligned with returns data column order.

        Parameters:
        -----------
        tickers : List[str]
            List of ticker symbols in returns data column order

        Returns:
        --------
        np.ndarray of weights corresponding to ticker order
        """
        if self._tickers_df is None:
            raise ValueError("Tickers must be loaded first using load_tickers()")

        weights = np.zeros(len(tickers))
        ticker_to_weight = dict(zip(self._tickers_df['Symbol'], self._tickers_df['Weight']))

        for i, ticker in enumerate(tickers):
            weights[i] = ticker_to_weight.get(ticker, 0.0)

        if weights.sum() == 0:
            weights = np.ones(len(tickers)) / len(tickers)
            logging.warning("No weights found in ticker file, using equal weights")
        else:
            weights = weights / weights.sum()

        logging.info(f"Baseline weights aligned to returns columns: {dict(zip(tickers, weights))}")
        return weights

    # =========================================================================
    # MONTE CARLO RETURN SAMPLING METHODS
    # =========================================================================

    def sample_return_path(self,
                          tickers: List[str],
                          num_days: int,
                          method: str = 'bootstrap',
                          seed: Optional[int] = None) -> pd.DataFrame:
        """
        Sample synthetic return path for Monte Carlo simulation.

        Parameters:
        -----------
        tickers : List[str]
            List of ticker symbols
        num_days : int
            Number of days to sample
        method : str
            Sampling method: 'bootstrap' (resample with replacement) or 'parametric' (fit normal)
        seed : Optional[int]
            Random seed for reproducibility

        Returns:
        --------
        pd.DataFrame
            Sampled returns with same structure as historical returns
        """
        if seed is not None:
            np.random.seed(seed)

        historical_returns = self.get_returns_data(tickers)

        if method == 'bootstrap':
            sampled_indices = np.random.choice(
                len(historical_returns),
                size=num_days,
                replace=True
            )
            sampled_returns = historical_returns.iloc[sampled_indices].reset_index(drop=True)
            return sampled_returns

        elif method == 'parametric':
            mean_returns = historical_returns.mean()
            cov_matrix = historical_returns.cov()

            sampled_array = np.random.multivariate_normal(
                mean_returns.values,
                cov_matrix.values,
                size=num_days
            )

            sampled_returns = pd.DataFrame(
                sampled_array,
                columns=tickers
            )
            return sampled_returns

        else:
            raise ValueError(f"Unknown sampling method: {method}. Use 'bootstrap' or 'parametric'")

    def sample_annual_returns(self,
                             tickers: List[str],
                             num_years: int,
                             method: str = 'bootstrap',
                             seed: Optional[int] = None,
                             trading_days_per_year: int = 252) -> pd.DataFrame:
        """
        Sample annual return paths (convenience method).

        Parameters:
        -----------
        tickers : List[str]
            List of ticker symbols
        num_years : int
            Number of years to sample
        method : str
            Sampling method: 'bootstrap' or 'parametric'
        seed : Optional[int]
            Random seed for reproducibility
        trading_days_per_year : int
            Number of trading days per year (default: 252)

        Returns:
        --------
        pd.DataFrame
            DataFrame with num_years rows (one per year), columns = tickers
        """
        daily_returns = self.sample_return_path(
            tickers,
            num_days=num_years * trading_days_per_year,
            method=method,
            seed=seed
        )

        annual_returns = []
        for year in range(num_years):
            start_idx = year * trading_days_per_year
            end_idx = start_idx + trading_days_per_year
            year_daily = daily_returns.iloc[start_idx:end_idx]
            year_return = (1 + year_daily).prod() - 1
            annual_returns.append(year_return)

        return pd.DataFrame(annual_returns, columns=tickers)

    def get_covariance_matrix(self, returns: pd.DataFrame,
                              method: str = 'sample', **kwargs) -> pd.DataFrame:
        """
        Calculate covariance matrix using specified method.

        Parameters:
        -----------
        returns : pd.DataFrame
            Daily returns data
        method : str
            Covariance estimation method (see CovarianceEstimator)
        **kwargs : dict
            Method-specific parameters

        Returns:
        --------
        pd.DataFrame covariance matrix with asset names as index/columns
        """
        from findata.covariance import CovarianceEstimator

        estimator = CovarianceEstimator()
        return estimator.calculate(returns, method=method, **kwargs)


# =============================================================================
# STANDALONE FUNCTIONS
# =============================================================================

def load_tickers(ticker_file: str) -> pd.DataFrame:
    """
    Load ticker symbols and weights from CSV file.

    Parameters:
    -----------
    ticker_file : str
        Path to ticker file (format: Symbol,Weight with headers)

    Returns:
    --------
    pd.DataFrame with columns ['Symbol', 'Weight']
    """
    try:
        # Read CSV with headers
        tickers_df = pd.read_csv(ticker_file, skipinitialspace=True)

        # Clean column names
        tickers_df.columns = tickers_df.columns.str.strip()

        # Standardize column names
        if 'ticker' in tickers_df.columns:
            tickers_df = tickers_df.rename(columns={'ticker': 'Symbol'})
        if 'weights' in tickers_df.columns:
            tickers_df = tickers_df.rename(columns={'weights': 'Weight'})

        # Remove empty rows and ensure weights are numeric
        tickers_df = tickers_df.dropna()
        tickers_df['Weight'] = pd.to_numeric(tickers_df['Weight'], errors='coerce')
        tickers_df = tickers_df.dropna()

        # Normalize weights to sum to 1
        tickers_df['Weight'] = tickers_df['Weight'] / tickers_df['Weight'].sum()

        logging.info(f"Loaded {len(tickers_df)} tickers from {ticker_file}")
        return tickers_df

    except Exception as e:
        logging.error(f"Failed to load ticker file {ticker_file}: {e}")
        raise


def compute_tail_hedge_composition(returns_df: pd.DataFrame,
                                   price_df: pd.DataFrame,
                                   prefix: str = 'tail_hedge',
                                   verbose: bool = True) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Combine multiple tail hedge columns into a single averaged column.

    Args:
        returns_df: DataFrame containing return data with tail hedge columns
        price_df: DataFrame containing price data with tail hedge columns
        prefix: Column name prefix to identify tail hedge columns
        verbose: If True, print which columns are being averaged

    Returns:
        tuple: (returns_df, price_df) with tail hedge columns averaged
    """
    tail_cols = [col for col in returns_df.columns if prefix in col]
    if tail_cols:
        if verbose:
            print(f"Averaging tail hedge ETFs: {tail_cols}")

        returns_df = returns_df.copy()
        returns_df['tail_hedge'] = returns_df[tail_cols].mean(axis=1)
        returns_df = returns_df.drop(columns=tail_cols)

        tail_cols_price = [col for col in price_df.columns if prefix in col]
        if tail_cols_price:
            price_df = price_df.copy()
            price_df['tail_hedge'] = price_df[tail_cols_price].mean(axis=1)
            price_df = price_df.drop(columns=tail_cols_price)

    return returns_df, price_df


def fetch_yahoo_finance_data(
    tickers: Dict[str, str] = None,
    start_date: str = None,
    end_date: str = None,
    frequency: str = 'M',
    cache_file: str = 'market_data_cache',
    use_cache: bool = True,
    cache_folder: str = None
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Fetch historical market data from Yahoo Finance with caching.

    Args:
        tickers: Dict mapping asset names to ticker symbols
        start_date: Start date (YYYY-MM-DD or datetime)
        end_date: End date (YYYY-MM-DD or datetime)
        frequency: Data frequency - 'D' (daily), 'W' (weekly), 'M' (monthly)
        cache_file: Base name for cache CSV files
        use_cache: If True, load from cache if exists
        cache_folder: Folder for cache files (defaults to data/cache)

    Returns:
        tuple: (returns_df, price_df)
    """
    # Default tickers for safe haven analysis
    if tickers is None:
        tickers = {
            'bonds': 'TLT',
            'stocks': 'SPY',
            'commodities': 'DBC',
            'gold': 'GLD',
            'tail_hedge_vxx': 'VXX',
            'tail_hedge_vixy': 'VIXY',
            'tail_hedge_tail': 'TAIL',
        }

    # Set date range
    if end_date is None:
        end_date = datetime.now()
    if start_date is None:
        start_date = end_date - timedelta(days=365*20)

    # Cache paths
    if cache_folder is None:
        workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        cache_folder = os.path.join(workspace_root, 'data', 'cache')
    os.makedirs(cache_folder, exist_ok=True)

    base_name = cache_file.replace('.csv', '')
    returns_cache = os.path.join(cache_folder, f'{base_name}_returns.csv')
    prices_cache = os.path.join(cache_folder, f'{base_name}_prices.csv')

    if use_cache and os.path.exists(returns_cache) and os.path.exists(prices_cache):
        print(f"Loading cached data from {cache_file}...")
        try:
            returns_df = pd.read_csv(returns_cache, index_col=0, parse_dates=True)
            price_df = pd.read_csv(prices_cache, index_col=0, parse_dates=True)
            print(f"Loaded {len(returns_df)} periods from cache")
            return returns_df, price_df
        except Exception as e:
            print(f"Warning: Failed to load cache: {e}")

    # Fetch data from Yahoo Finance
    print(f"Fetching data from Yahoo Finance...")
    data = {}
    for asset_name, ticker in tickers.items():
        try:
            print(f"  Downloading {ticker} ({asset_name})...", end=' ')
            ticker_data = yf.download(ticker, start=start_date, end=end_date, progress=False)

            if len(ticker_data) == 0:
                print(f"No data available")
                continue

            # Resample to desired frequency
            if frequency == 'M':
                ticker_data = ticker_data.resample('ME').last()
            elif frequency == 'W':
                ticker_data = ticker_data.resample('W').last()

            # Get adjusted close
            if 'Adj Close' in ticker_data.columns:
                if isinstance(ticker_data.columns, pd.MultiIndex):
                    adj_close = ticker_data['Adj Close'].iloc[:, 0]
                else:
                    adj_close = ticker_data['Adj Close']
            else:
                adj_close = ticker_data['Close'].iloc[:, 0] if isinstance(ticker_data.columns, pd.MultiIndex) else ticker_data['Close']

            data[asset_name] = adj_close
            print(f"OK ({len(adj_close)} periods)")

        except Exception as e:
            print(f"FAILED - {e}")

    df = pd.DataFrame({asset: data[asset] for asset in data if data[asset] is not None})

    if df.empty:
        raise ValueError("No data was successfully fetched.")

    # Calculate returns
    returns_df = df.pct_change().iloc[1:]
    price_df = df.iloc[1:]

    # Handle tail hedge composition
    returns_df, price_df = compute_tail_hedge_composition(returns_df, price_df)

    # Save to cache
    if use_cache:
        returns_df.to_csv(returns_cache)
        price_df.to_csv(prices_cache)

    return returns_df, price_df


def load_returns_data(
    mode: str = 'yahoo',
    tickers: Dict[str, str] = None,
    frequency: str = 'M',
    use_cache: bool = True,
    csv_file: str = 'returns.csv',
    **yahoo_kwargs
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load returns data from either Yahoo Finance or CSV file.

    Args:
        mode: 'yahoo' or 'csv'
        tickers: Dict mapping asset names to ticker symbols
        frequency: Data frequency for Yahoo Finance ('D', 'W', 'M')
        use_cache: Whether to use caching
        csv_file: Path to CSV file if mode='csv'
        **yahoo_kwargs: Additional arguments for fetch_yahoo_finance_data()

    Returns:
        tuple: (returns_df, price_df)
    """
    if mode == 'yahoo':
        return fetch_yahoo_finance_data(tickers=tickers, frequency=frequency, use_cache=use_cache, **yahoo_kwargs)
    elif mode == 'csv':
        print(f"Loading returns data from {csv_file}...")
        ret_df = pd.read_csv(csv_file, index_col=0, parse_dates=True)
        print(f"Loaded {len(ret_df)} periods from CSV")
        price_df = pd.DataFrame(index=ret_df.index)
        return ret_df, price_df
    else:
        raise ValueError(f"Invalid mode: {mode}. Must be 'yahoo' or 'csv'")
