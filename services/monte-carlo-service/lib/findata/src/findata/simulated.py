"""
Simulated data parameters for Monte Carlo validation testing.

This module contains controlled parameters with known mean/covariance
for validating MC path generation without Yahoo Finance dependency.
"""

import numpy as np
import pandas as pd
import os
from typing import Tuple, List, Optional


# Simulation settings
NUM_SIMULATIONS = 100
NUM_DAYS = 1825  # 5 years
RANDOM_SEED = 42
REINDEX_METHOD = 'ffill'


# ============================================================================
# Accumulation Phase Parameters (Regime 1)
# ============================================================================
# Annual mean returns: [BIL, MSFT, NVDA, SPY]
MEAN_ANNUAL_ACC = np.array([
    0.025,   # BIL: 2.5% (cash-like)
    0.15,    # MSFT: 15%
    0.175,   # NVDA: 17.5%
    0.05     # SPY: 5%
])

# Annual covariance matrix: [BIL, MSFT, NVDA, SPY]
COV_ANNUAL_ACC = np.array([
    [0.0001, 0.0002, 0.0003, 0.0001],  # BIL
    [0.0002, 0.0400, 0.0300, 0.0150],  # MSFT
    [0.0003, 0.0300, 0.0900, 0.0200],  # NVDA
    [0.0001, 0.0150, 0.0200, 0.0400]   # SPY
])


# ============================================================================
# Decumulation Phase Parameters (Regime 2)
# ============================================================================
# Annual mean returns (zero for testing): [BIL, MSFT, NVDA, SPY]
MEAN_ANNUAL_DEC = np.array([0.0, 0.0, 0.0, 0.0])

# Annual covariance matrix (uncorrelated for testing)
COV_ANNUAL_DEC = np.array([
    [0.0001, 0.0000, 0.0000, 0.0000],
    [0.0000, 0.0400, 0.0000, 0.0000],
    [0.0000, 0.0000, 0.0900, 0.0000],
    [0.0000, 0.0000, 0.0000, 0.0400]
])


class SimulatedParams:
    """
    Container for simulated market parameters used in MC validation.

    Provides parameters for accumulation and decumulation phases,
    with methods for loading/saving to files.
    """

    def __init__(self,
                 mean_acc: np.ndarray = None,
                 cov_acc: np.ndarray = None,
                 mean_dec: np.ndarray = None,
                 cov_dec: np.ndarray = None):
        """
        Initialize with optional custom parameters.

        Parameters default to module-level constants if not provided.
        """
        self.mean_acc = mean_acc if mean_acc is not None else MEAN_ANNUAL_ACC.copy()
        self.cov_acc = cov_acc if cov_acc is not None else COV_ANNUAL_ACC.copy()
        self.mean_dec = mean_dec if mean_dec is not None else MEAN_ANNUAL_DEC.copy()
        self.cov_dec = cov_dec if cov_dec is not None else COV_ANNUAL_DEC.copy()

    def get_accumulation_params(self, regularize: bool = True) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get accumulation phase parameters.

        Parameters:
        -----------
        regularize : bool
            Whether to add regularization to covariance matrix

        Returns:
        --------
        tuple[np.ndarray, np.ndarray]: (mean_returns, cov_matrix)
        """
        mean = self.mean_acc.copy()
        cov = self.cov_acc.copy()
        if regularize:
            cov = add_regularization(cov)
        return mean, cov

    def get_decumulation_params(self, regularize: bool = True) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get decumulation phase parameters.

        Parameters:
        -----------
        regularize : bool
            Whether to add regularization to covariance matrix

        Returns:
        --------
        tuple[np.ndarray, np.ndarray]: (mean_returns, cov_matrix)
        """
        mean = self.mean_dec.copy()
        cov = self.cov_dec.copy()
        if regularize:
            cov = add_regularization(cov)
        return mean, cov


# ============================================================================
# Helper Functions
# ============================================================================

def add_regularization(cov_matrix: np.ndarray, epsilon: float = 1e-8) -> np.ndarray:
    """
    Add small regularization to ensure positive definiteness.

    Parameters:
    -----------
    cov_matrix : np.ndarray
        Covariance matrix to regularize
    epsilon : float
        Small value to add to diagonal

    Returns:
    --------
    np.ndarray: Regularized covariance matrix
    """
    n = cov_matrix.shape[0]
    return cov_matrix + epsilon * np.eye(n)


def get_accumulation_params(regularize: bool = True) -> Tuple[np.ndarray, np.ndarray]:
    """Get accumulation phase parameters (module-level function)."""
    mean = MEAN_ANNUAL_ACC.copy()
    cov = COV_ANNUAL_ACC.copy()
    if regularize:
        cov = add_regularization(cov)
    return mean, cov


def get_decumulation_params(regularize: bool = True) -> Tuple[np.ndarray, np.ndarray]:
    """Get decumulation phase parameters (module-level function)."""
    mean = MEAN_ANNUAL_DEC.copy()
    cov = COV_ANNUAL_DEC.copy()
    if regularize:
        cov = add_regularization(cov)
    return mean, cov


def create_simulated_returns_data(tickers: List[str],
                                   num_days: int = NUM_DAYS,
                                   seed: int = RANDOM_SEED) -> pd.DataFrame:
    """
    Generate simulated returns data using accumulation phase parameters.

    Parameters:
    -----------
    tickers : list[str]
        List of ticker symbols
    num_days : int
        Number of days of data to generate
    seed : int
        Random seed for reproducibility

    Returns:
    --------
    pd.DataFrame with simulated returns
    """
    mean_annual, cov_annual = get_accumulation_params(regularize=True)

    # Convert to daily
    daily_mean = mean_annual / 252
    daily_cov = cov_annual / 252

    np.random.seed(seed)
    returns_data = np.random.multivariate_normal(
        mean=daily_mean,
        cov=daily_cov,
        size=num_days
    )

    return pd.DataFrame(returns_data, columns=tickers)


# ============================================================================
# Save/Load Functions
# ============================================================================

def save_mean_returns_to_csv(filepath: str, tickers: List[str]) -> None:
    """
    Save mean returns (accumulation and decumulation) to CSV file.

    Parameters:
    -----------
    filepath : str
        Path to save CSV file
    tickers : list[str]
        List of ticker symbols (column names)
    """
    mean_acc, _ = get_accumulation_params(regularize=False)
    mean_dec, _ = get_decumulation_params(regularize=False)

    df = pd.DataFrame(
        [mean_acc, mean_dec],
        index=['accumulation', 'decumulation'],
        columns=tickers
    )
    df.index.name = 'regime'

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    df.to_csv(filepath)
    print(f"Saved mean returns to: {filepath}")


def load_mean_returns_from_csv(filepath: str) -> pd.DataFrame:
    """Load mean returns from CSV file."""
    return pd.read_csv(filepath, index_col='regime')


def save_cov_matrices_to_txt(filepath: str) -> None:
    """
    Save covariance matrices (accumulation and decumulation) to text file.

    Parameters:
    -----------
    filepath : str
        Path to save text file
    """
    _, cov_acc = get_accumulation_params(regularize=False)
    _, cov_dec = get_decumulation_params(regularize=False)

    cov_3d = np.stack([cov_acc, cov_dec], axis=0)

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    header = f"Shape: {cov_3d.shape}\nRegimes: [0=accumulation, 1=decumulation]"
    np.savetxt(filepath, cov_3d.reshape(cov_3d.shape[0], -1), header=header, comments='# ')
    print(f"Saved covariance matrices to: {filepath}")


def load_cov_matrices_from_txt(filepath: str, n_assets: int = 4) -> np.ndarray:
    """
    Load covariance matrices from text file.

    Parameters:
    -----------
    filepath : str
        Path to text file
    n_assets : int
        Number of assets

    Returns:
    --------
    np.ndarray: 3D array (2, n_assets, n_assets)
    """
    cov_2d = np.loadtxt(filepath)
    n_regimes = cov_2d.shape[0]
    return cov_2d.reshape(n_regimes, n_assets, n_assets)


def save_all_parameters(mean_csv_path: str, cov_txt_path: str, tickers: List[str]) -> None:
    """Save both mean returns and covariance matrices to files."""
    print("Saving simulated data parameters...")
    save_mean_returns_to_csv(mean_csv_path, tickers)
    save_cov_matrices_to_txt(cov_txt_path)
    print("All parameters saved successfully")


def load_all_parameters(mean_csv_path: str, cov_txt_path: str,
                       n_assets: int = 4) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Load both mean returns and covariance matrices from files.

    Returns:
    --------
    tuple: (mean_acc, mean_dec, cov_acc, cov_dec)
    """
    mean_df = load_mean_returns_from_csv(mean_csv_path)
    mean_acc = mean_df.loc['accumulation'].values
    mean_dec = mean_df.loc['decumulation'].values

    cov_3d = load_cov_matrices_from_txt(cov_txt_path, n_assets)
    cov_acc = cov_3d[0]
    cov_dec = cov_3d[1]

    return mean_acc, mean_dec, cov_acc, cov_dec
