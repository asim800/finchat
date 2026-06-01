"""
Synthetic data generation for testing and validation.

Provides regime-switching market data generation for testing
portfolio optimization and machine learning models.
"""

import numpy as np
from typing import Tuple, List, Dict, Any


def generate_regime_switching_returns(
    n_periods: int = 1000,
    n_assets: int = 5,
    seed: int = 42
) -> Tuple[np.ndarray, List[str]]:
    """
    Generate synthetic returns with known regime switches.

    Generates price relatives (1 + return) for multiple assets across
    three regimes: bull, bear, and sideways markets.

    Parameters:
    -----------
    n_periods : int
        Number of time periods to generate
    n_assets : int
        Number of assets
    seed : int
        Random seed for reproducibility

    Returns:
    --------
    tuple:
        returns: np.ndarray - Price relatives [n_periods, n_assets]
        regimes: List[str] - List of regime labels for each period
    """
    np.random.seed(seed)

    # Define regimes with different mean returns and volatilities
    regime_params = {
        'bull': {
            'mean': np.array([0.001, 0.0008, 0.0005, 0.0003, 0.0002])[:n_assets],
            'vol': 0.01
        },
        'bear': {
            'mean': np.array([-0.001, -0.0005, 0.0, 0.0002, 0.0003])[:n_assets],
            'vol': 0.02
        },
        'sideways': {
            'mean': np.zeros(n_assets),
            'vol': 0.015
        }
    }

    # Handle case where n_assets > 5
    if n_assets > 5:
        for regime in regime_params:
            base_mean = regime_params[regime]['mean']
            extended_mean = np.concatenate([
                base_mean,
                np.random.uniform(-0.001, 0.001, n_assets - 5)
            ])
            regime_params[regime]['mean'] = extended_mean

    # Create regime sequence
    regime_length = n_periods // 5
    regime_sequence = (
        ['bull'] * regime_length +
        ['bear'] * regime_length +
        ['sideways'] * regime_length +
        ['bull'] * regime_length +
        ['bear'] * (n_periods - 4 * regime_length)
    )

    returns = []
    regimes = []

    for regime in regime_sequence:
        params = regime_params[regime]
        ret = np.random.normal(params['mean'], params['vol'])
        returns.append(1 + ret)  # Price relatives
        regimes.append(regime)

    return np.array(returns), regimes


def generate_correlated_returns(
    n_periods: int = 1000,
    n_assets: int = 5,
    correlation: float = 0.3,
    mean_return: float = 0.0005,
    volatility: float = 0.02,
    seed: int = 42
) -> np.ndarray:
    """
    Generate correlated asset returns with constant correlation structure.

    Parameters:
    -----------
    n_periods : int
        Number of time periods
    n_assets : int
        Number of assets
    correlation : float
        Pairwise correlation between assets (0 to 1)
    mean_return : float
        Daily mean return for all assets
    volatility : float
        Daily volatility for all assets
    seed : int
        Random seed

    Returns:
    --------
    np.ndarray: Returns array [n_periods, n_assets]
    """
    np.random.seed(seed)

    # Create correlation matrix
    corr_matrix = np.full((n_assets, n_assets), correlation)
    np.fill_diagonal(corr_matrix, 1.0)

    # Convert to covariance matrix
    cov_matrix = corr_matrix * (volatility ** 2)

    # Generate multivariate normal returns
    mean_vector = np.full(n_assets, mean_return)
    returns = np.random.multivariate_normal(mean_vector, cov_matrix, size=n_periods)

    return returns


def generate_trending_returns(
    n_periods: int = 1000,
    n_assets: int = 5,
    trend_strength: float = 0.0001,
    volatility: float = 0.02,
    seed: int = 42
) -> np.ndarray:
    """
    Generate returns with a deterministic trend component.

    Parameters:
    -----------
    n_periods : int
        Number of time periods
    n_assets : int
        Number of assets
    trend_strength : float
        Strength of linear trend (added to random component)
    volatility : float
        Volatility of random component
    seed : int
        Random seed

    Returns:
    --------
    np.ndarray: Returns array [n_periods, n_assets]
    """
    np.random.seed(seed)

    # Linear trend component (different for each asset)
    time_index = np.arange(n_periods).reshape(-1, 1)
    asset_trends = np.random.uniform(0.5, 1.5, n_assets) * trend_strength
    trend_component = time_index * asset_trends

    # Random component
    random_component = np.random.normal(0, volatility, (n_periods, n_assets))

    returns = trend_component + random_component

    return returns


def generate_mean_reverting_returns(
    n_periods: int = 1000,
    n_assets: int = 5,
    mean_level: float = 0.0,
    reversion_speed: float = 0.1,
    volatility: float = 0.02,
    seed: int = 42
) -> np.ndarray:
    """
    Generate mean-reverting returns using Ornstein-Uhlenbeck process.

    Parameters:
    -----------
    n_periods : int
        Number of time periods
    n_assets : int
        Number of assets
    mean_level : float
        Long-term mean to revert to
    reversion_speed : float
        Speed of mean reversion (higher = faster reversion)
    volatility : float
        Volatility of innovations
    seed : int
        Random seed

    Returns:
    --------
    np.ndarray: Returns array [n_periods, n_assets]
    """
    np.random.seed(seed)

    returns = np.zeros((n_periods, n_assets))
    returns[0] = np.random.normal(mean_level, volatility, n_assets)

    for t in range(1, n_periods):
        innovation = np.random.normal(0, volatility, n_assets)
        returns[t] = (returns[t-1] +
                     reversion_speed * (mean_level - returns[t-1]) +
                     innovation)

    return returns


def generate_volatility_clustering_returns(
    n_periods: int = 1000,
    n_assets: int = 5,
    base_volatility: float = 0.02,
    garch_alpha: float = 0.1,
    garch_beta: float = 0.85,
    seed: int = 42
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate returns with GARCH-like volatility clustering.

    Parameters:
    -----------
    n_periods : int
        Number of time periods
    n_assets : int
        Number of assets
    base_volatility : float
        Long-term average volatility
    garch_alpha : float
        ARCH parameter (shock sensitivity)
    garch_beta : float
        GARCH parameter (volatility persistence)
    seed : int
        Random seed

    Returns:
    --------
    tuple:
        returns: np.ndarray [n_periods, n_assets]
        volatilities: np.ndarray [n_periods, n_assets]
    """
    np.random.seed(seed)

    omega = base_volatility ** 2 * (1 - garch_alpha - garch_beta)

    returns = np.zeros((n_periods, n_assets))
    volatilities = np.zeros((n_periods, n_assets))
    volatilities[0] = base_volatility

    for t in range(1, n_periods):
        # Update volatility (simplified GARCH(1,1))
        volatilities[t] = np.sqrt(
            omega +
            garch_alpha * returns[t-1] ** 2 +
            garch_beta * volatilities[t-1] ** 2
        )
        # Generate returns
        returns[t] = np.random.normal(0, volatilities[t], n_assets)

    return returns, volatilities
