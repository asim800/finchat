"""
Covariance Matrix Estimation Module.

Provides multiple covariance estimation methods for portfolio optimization.
"""

import numpy as np
import pandas as pd
import logging
from typing import Optional, Dict, Any, List

from sklearn.covariance import LedoitWolf, MinCovDet

try:
    import cvxpy as cp
    CVXPY_AVAILABLE = True
except ImportError:
    CVXPY_AVAILABLE = False


class CovarianceEstimator:
    """
    Covariance matrix estimation with multiple methods.

    Provides sample, exponentially weighted, shrunk (Ledoit-Wolf),
    robust (MCD), factor model, and sparse inverse (graphical lasso) methods.
    """

    def __init__(self):
        """Initialize CovarianceEstimator."""
        self._last_precision_matrix: Optional[np.ndarray] = None

    def calculate_sample(self, returns: pd.DataFrame) -> np.ndarray:
        """
        Calculate sample covariance matrix.

        Parameters:
        -----------
        returns : pd.DataFrame
            Daily returns data

        Returns:
        --------
        np.ndarray covariance matrix
        """
        cov_matrix = returns.cov().values
        logging.info("Calculated sample covariance matrix")
        return cov_matrix

    def calculate_exponential_weighted(self, returns: pd.DataFrame,
                                       alpha: float = 0.94) -> np.ndarray:
        """
        Calculate exponentially weighted covariance matrix.

        Parameters:
        -----------
        returns : pd.DataFrame
            Daily returns data
        alpha : float
            Decay factor (0 < alpha < 1)

        Returns:
        --------
        np.ndarray covariance matrix
        """
        ewm_cov = returns.ewm(alpha=alpha).cov().iloc[-len(returns.columns):].values
        logging.info(f"Calculated exponentially weighted covariance (alpha={alpha})")
        return ewm_cov

    def calculate_shrunk(self, returns: pd.DataFrame,
                        shrinkage: Optional[float] = None) -> np.ndarray:
        """
        Calculate shrunk covariance matrix using Ledoit-Wolf estimator.

        Parameters:
        -----------
        returns : pd.DataFrame
            Daily returns data
        shrinkage : float, optional
            Shrinkage intensity (ignored - auto-estimated by LedoitWolf)

        Returns:
        --------
        np.ndarray covariance matrix
        """
        # LedoitWolf auto-computes optimal shrinkage
        lw = LedoitWolf()
        lw.fit(returns.values)
        cov_matrix = lw.covariance_
        shrinkage_used = lw.shrinkage_

        logging.info(f"Calculated Ledoit-Wolf shrunk covariance (shrinkage={shrinkage_used:.3f})")
        return cov_matrix

    def calculate_robust(self, returns: pd.DataFrame,
                        method: str = 'mcd') -> np.ndarray:
        """
        Calculate robust covariance matrix.

        Parameters:
        -----------
        returns : pd.DataFrame
            Daily returns data
        method : str
            Robust method ('mcd' for Minimum Covariance Determinant)

        Returns:
        --------
        np.ndarray covariance matrix
        """
        if method == 'mcd':
            robust_cov = MinCovDet().fit(returns.values)
            cov_matrix = robust_cov.covariance_
            logging.info("Calculated robust covariance using Minimum Covariance Determinant")
        else:
            raise ValueError(f"Unknown robust covariance method: {method}")

        return cov_matrix

    def calculate_factor_model(self, returns: pd.DataFrame,
                               factors: Optional[pd.DataFrame] = None) -> np.ndarray:
        """
        Calculate factor model covariance matrix.

        Parameters:
        -----------
        returns : pd.DataFrame
            Daily returns data
        factors : pd.DataFrame, optional
            Factor returns (uses market factor if None)

        Returns:
        --------
        np.ndarray covariance matrix
        """
        if factors is None:
            market_factor = returns.mean(axis=1)
            factors = pd.DataFrame({'Market': market_factor})

        n_assets = len(returns.columns)
        factor_loadings = np.zeros((n_assets, len(factors.columns)))
        residual_vars = np.zeros(n_assets)

        for i, asset in enumerate(returns.columns):
            y = returns[asset].values
            X = np.column_stack([np.ones(len(factors)), factors.values])

            try:
                beta = np.linalg.lstsq(X, y, rcond=None)[0]
                factor_loadings[i] = beta[1:]

                predicted = X @ beta
                residuals = y - predicted
                residual_vars[i] = np.var(residuals)
            except np.linalg.LinAlgError:
                factor_loadings[i] = 0
                residual_vars[i] = returns[asset].var()

        factor_cov = factors.cov().values
        systematic_cov = factor_loadings @ factor_cov @ factor_loadings.T
        idiosyncratic_cov = np.diag(residual_vars)

        cov_matrix = systematic_cov + idiosyncratic_cov

        logging.info(f"Calculated factor model covariance using {len(factors.columns)} factors")
        return cov_matrix

    def calculate_sparse_inverse(self, returns: pd.DataFrame,
                                 alpha: float = 0.1,
                                 max_iters: int = 1000,
                                 eps_abs: float = 1e-4,
                                 eps_rel: float = 1e-4) -> np.ndarray:
        """
        Calculate sparse inverse covariance (precision) matrix using graphical lasso.

        Parameters:
        -----------
        returns : pd.DataFrame
            Daily returns data
        alpha : float, default=0.1
            L1 regularization parameter
        max_iters : int, default=1000
            Maximum number of iterations
        eps_abs : float, default=1e-4
            Absolute tolerance for convergence
        eps_rel : float, default=1e-4
            Relative tolerance for convergence

        Returns:
        --------
        np.ndarray covariance matrix
        """
        if not CVXPY_AVAILABLE:
            logging.warning("CVXPY not available, falling back to sample covariance")
            return self.calculate_sample(returns)

        try:
            S = np.cov(returns.T)
            n_assets = S.shape[0]

            Theta = cp.Variable((n_assets, n_assets), symmetric=True)
            L1_mask = np.ones((n_assets, n_assets)) - np.eye(n_assets)

            objective = cp.Maximize(
                cp.log_det(Theta) - cp.trace(S @ Theta) - alpha * cp.norm(cp.multiply(L1_mask, Theta), 1)
            )

            constraints = [Theta >> 1e-8 * np.eye(n_assets)]
            problem = cp.Problem(objective, constraints)

            try:
                problem.solve(solver=cp.SCS, max_iters=max_iters, eps=eps_abs, normalize=False, verbose=False)
            except cp.SolverError:
                try:
                    problem.solve(solver=cp.ECOS, max_iters=max_iters, abstol=eps_abs, reltol=eps_rel, verbose=False)
                except cp.SolverError:
                    problem.solve(solver=cp.OSQP, max_iter=max_iters, eps_abs=eps_abs, eps_rel=eps_rel, verbose=False)

            if problem.status not in ["optimal", "optimal_inaccurate"]:
                logging.warning(f"Sparse inverse optimization failed: {problem.status}")
                return self.calculate_sample(returns)

            precision_matrix = Theta.value

            if precision_matrix is None:
                logging.warning("Failed to extract precision matrix")
                return self.calculate_sample(returns)

            precision_matrix = (precision_matrix + precision_matrix.T) / 2

            try:
                cov_matrix = np.linalg.inv(precision_matrix)
            except np.linalg.LinAlgError:
                logging.warning("Failed to invert precision matrix")
                return self.calculate_sample(returns)

            sparsity = np.sum(np.abs(precision_matrix) < 1e-6) / (n_assets * n_assets)
            logging.info(f"Calculated sparse inverse covariance (α={alpha}, sparsity={sparsity:.1%})")

            self._last_precision_matrix = precision_matrix
            return cov_matrix

        except Exception as e:
            logging.error(f"Error in sparse inverse covariance: {e}")
            return self.calculate_sample(returns)

    def get_precision_matrix(self, returns: pd.DataFrame, **kwargs) -> Optional[np.ndarray]:
        """
        Get the precision matrix (inverse covariance) from sparse inverse method.

        Parameters:
        -----------
        returns : pd.DataFrame
            Daily returns data
        **kwargs : dict
            Parameters for sparse inverse calculation

        Returns:
        --------
        np.ndarray or None
        """
        try:
            self.calculate_sparse_inverse(returns, **kwargs)
            return self._last_precision_matrix if hasattr(self, '_last_precision_matrix') else None
        except Exception as e:
            logging.error(f"Error getting precision matrix: {e}")
            return None

    def calculate(self, returns: pd.DataFrame,
                 method: str = 'sample', **kwargs) -> pd.DataFrame:
        """
        Calculate covariance matrix using specified method.

        Parameters:
        -----------
        returns : pd.DataFrame
            Daily returns data
        method : str
            Covariance estimation method:
            - 'sample': Sample covariance
            - 'exponential_weighted': Exponentially weighted
            - 'shrunk': Ledoit-Wolf shrinkage
            - 'robust': Robust estimation (MCD)
            - 'factor_model': Factor model
            - 'sparse_inverse': Sparse inverse covariance
        **kwargs : dict
            Method-specific parameters

        Returns:
        --------
        pd.DataFrame covariance matrix with asset names as index/columns
        """
        method_map = {
            'sample': self.calculate_sample,
            'exponential_weighted': self.calculate_exponential_weighted,
            'shrunk': self.calculate_shrunk,
            'robust': self.calculate_robust,
            'factor_model': self.calculate_factor_model,
            'sparse_inverse': self.calculate_sparse_inverse
        }

        if method not in method_map:
            available_methods = list(method_map.keys())
            raise ValueError(f"Unknown covariance method '{method}'. Available: {available_methods}")

        cov_func = method_map[method]
        cov_matrix = cov_func(returns, **kwargs)

        # Ensure positive semi-definite
        eigenvalues, eigenvectors = np.linalg.eigh(cov_matrix)
        eigenvalues = np.maximum(eigenvalues, 1e-8)
        cov_matrix = eigenvectors @ np.diag(eigenvalues) @ eigenvectors.T

        # Convert to DataFrame
        cov_df = pd.DataFrame(cov_matrix, index=returns.columns, columns=returns.columns)

        logging.info(f"Covariance matrix calculated using '{method}' method")
        return cov_df

    @staticmethod
    def get_available_methods() -> List[str]:
        """Get list of available covariance calculation methods."""
        return ['sample', 'exponential_weighted', 'shrunk', 'robust', 'factor_model', 'sparse_inverse']

    @staticmethod
    def get_method_parameters(method: str) -> Dict[str, Any]:
        """Get parameters for specific covariance method."""
        method_params = {
            'sample': {},
            'exponential_weighted': {'alpha': 0.94},
            'shrunk': {'shrinkage': None},
            'robust': {'method': 'mcd'},
            'factor_model': {'factors': None},
            'sparse_inverse': {'alpha': 0.1, 'max_iters': 1000}
        }
        return method_params.get(method, {})
