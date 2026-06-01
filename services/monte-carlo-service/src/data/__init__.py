# Data loading and processing package
"""
Data loading, caching, and preprocessing utilities.

All data functionality is now provided by the shared findata library.
This module re-exports for backward compatibility.
"""

# Import all data functionality from shared findata library
from findata import (
    # Market data
    FinData,
    fetch_yahoo_finance_data,
    load_returns_data,
    compute_tail_hedge_composition,
    # Covariance
    CovarianceEstimator,
    # Simulated params
    SimulatedParams,
    get_accumulation_params,
    get_decumulation_params,
    create_simulated_returns_data,
    add_regularization,
    MEAN_ANNUAL_ACC,
    MEAN_ANNUAL_DEC,
    COV_ANNUAL_ACC,
    COV_ANNUAL_DEC,
)

__all__ = [
    # Market data
    'FinData',
    'fetch_yahoo_finance_data',
    'load_returns_data',
    'compute_tail_hedge_composition',
    # Covariance
    'CovarianceEstimator',
    # Simulated params
    'SimulatedParams',
    'get_accumulation_params',
    'get_decumulation_params',
    'create_simulated_returns_data',
    'add_regularization',
    'MEAN_ANNUAL_ACC',
    'MEAN_ANNUAL_DEC',
    'COV_ANNUAL_ACC',
    'COV_ANNUAL_DEC',
]
