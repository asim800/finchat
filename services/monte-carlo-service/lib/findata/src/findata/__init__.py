"""
findata - Financial data fetching, caching, and persistence.

This package provides utilities for:
- Fetching market data from Yahoo Finance
- Fetching option chain data
- Caching data with hash-based versioning
- Persistence (pickle, CSV, JSON)
- Return calculations and resampling
- Covariance matrix estimation (6 methods)
- Simulated and synthetic data generation
"""

# Core fetching
from findata.fetcher import (
    FinData,
    FinDataFetcher,
    load_tickers,
    fetch_yahoo_finance_data,
    load_returns_data,
    compute_tail_hedge_composition,
)

# Cache management
from findata.cache import CacheManager

# Persistence
from findata.persistence import (
    save_pickle,
    load_pickle,
    save_csv,
    load_csv,
    save_json,
    load_json,
    DataPersistenceManager,
)

# Returns calculations
from findata.returns import (
    calculate_returns,
    resample_returns,
    compound_returns,
)

# Covariance estimation
from findata.covariance import CovarianceEstimator

# Simulated data
from findata.simulated import (
    SimulatedParams,
    create_simulated_returns_data,
    get_accumulation_params,
    get_decumulation_params,
    add_regularization,
    save_mean_returns_to_csv,
    load_mean_returns_from_csv,
    save_cov_matrices_to_txt,
    load_cov_matrices_from_txt,
    save_all_parameters,
    load_all_parameters,
    MEAN_ANNUAL_ACC,
    MEAN_ANNUAL_DEC,
    COV_ANNUAL_ACC,
    COV_ANNUAL_DEC,
    NUM_SIMULATIONS,
    NUM_DAYS,
    RANDOM_SEED,
)

# Synthetic data
from findata.synthetic import (
    generate_regime_switching_returns,
    generate_correlated_returns,
    generate_trending_returns,
    generate_mean_reverting_returns,
    generate_volatility_clustering_returns,
)

# Options fetching
from findata.options_fetcher import OptionsDataFetcher

__all__ = [
    # Fetcher
    'FinData',
    'FinDataFetcher',
    'load_tickers',
    'fetch_yahoo_finance_data',
    'load_returns_data',
    'compute_tail_hedge_composition',
    # Cache
    'CacheManager',
    # Persistence
    'save_pickle',
    'load_pickle',
    'save_csv',
    'load_csv',
    'save_json',
    'load_json',
    'DataPersistenceManager',
    # Returns
    'calculate_returns',
    'resample_returns',
    'compound_returns',
    # Covariance
    'CovarianceEstimator',
    # Simulated
    'SimulatedParams',
    'create_simulated_returns_data',
    'get_accumulation_params',
    'get_decumulation_params',
    'add_regularization',
    'save_mean_returns_to_csv',
    'load_mean_returns_from_csv',
    'save_cov_matrices_to_txt',
    'load_cov_matrices_from_txt',
    'save_all_parameters',
    'load_all_parameters',
    'MEAN_ANNUAL_ACC',
    'MEAN_ANNUAL_DEC',
    'COV_ANNUAL_ACC',
    'COV_ANNUAL_DEC',
    'NUM_SIMULATIONS',
    'NUM_DAYS',
    'RANDOM_SEED',
    # Synthetic
    'generate_regime_switching_returns',
    'generate_correlated_returns',
    'generate_trending_returns',
    'generate_mean_reverting_returns',
    'generate_volatility_clustering_returns',
    # Options
    'OptionsDataFetcher',
]
