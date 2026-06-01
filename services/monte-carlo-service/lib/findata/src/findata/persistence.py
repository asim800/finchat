"""
Data persistence utilities for pickle, CSV, and JSON formats.

Provides both simple functions and a structured DataPersistenceManager class
for organizing analysis data.
"""

import os
import pickle
import json
import logging
import shutil
from pathlib import Path
from typing import Any, Optional, Dict, List, Union
from datetime import datetime
import pandas as pd


# =============================================================================
# Simple Functions
# =============================================================================

def save_pickle(data: Any, path: str) -> bool:
    """
    Save data to pickle file.

    Parameters:
    -----------
    data : Any
        Data to save
    path : str
        Output file path

    Returns:
    --------
    bool: True if successful
    """
    try:
        dir_path = os.path.dirname(path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump(data, f)
        logging.info(f"Saved pickle: {path}")
        return True
    except Exception as e:
        logging.error(f"Failed to save pickle {path}: {e}")
        return False


def load_pickle(path: str) -> Optional[Any]:
    """
    Load data from pickle file.

    Parameters:
    -----------
    path : str
        Input file path

    Returns:
    --------
    Loaded data or None if failed
    """
    try:
        with open(path, 'rb') as f:
            data = pickle.load(f)
        logging.info(f"Loaded pickle: {path}")
        return data
    except (ImportError, ModuleNotFoundError) as e:
        if "numpy._core" in str(e) or "numpy.core" in str(e):
            logging.warning(f"Numpy version compatibility issue with {path}: {e}")
            return None
        else:
            logging.error(f"Import error loading pickle {path}: {e}")
            return None
    except Exception as e:
        logging.error(f"Failed to load pickle {path}: {e}")
        return None


def save_csv(data: pd.DataFrame, path: str, **kwargs) -> bool:
    """
    Save DataFrame to CSV file.

    Parameters:
    -----------
    data : pd.DataFrame
        DataFrame to save
    path : str
        Output file path
    **kwargs : dict
        Additional arguments to to_csv()

    Returns:
    --------
    bool: True if successful
    """
    try:
        dir_path = os.path.dirname(path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        data.to_csv(path, **kwargs)
        logging.info(f"Saved CSV: {path}")
        return True
    except Exception as e:
        logging.error(f"Failed to save CSV {path}: {e}")
        return False


def load_csv(path: str, **kwargs) -> Optional[pd.DataFrame]:
    """
    Load DataFrame from CSV file.

    Parameters:
    -----------
    path : str
        Input file path
    **kwargs : dict
        Additional arguments to read_csv()

    Returns:
    --------
    pd.DataFrame or None if failed
    """
    try:
        data = pd.read_csv(path, **kwargs)
        logging.info(f"Loaded CSV: {path}")
        return data
    except Exception as e:
        logging.error(f"Failed to load CSV {path}: {e}")
        return None


def save_json(data: dict, path: str, indent: int = 2) -> bool:
    """
    Save dictionary to JSON file.

    Parameters:
    -----------
    data : dict
        Dictionary to save
    path : str
        Output file path
    indent : int
        JSON indentation

    Returns:
    --------
    bool: True if successful
    """
    try:
        dir_path = os.path.dirname(path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        with open(path, 'w') as f:
            json.dump(data, f, indent=indent, default=str)
        logging.info(f"Saved JSON: {path}")
        return True
    except Exception as e:
        logging.error(f"Failed to save JSON {path}: {e}")
        return False


def load_json(path: str) -> Optional[dict]:
    """
    Load dictionary from JSON file.

    Parameters:
    -----------
    path : str
        Input file path

    Returns:
    --------
    dict or None if failed
    """
    try:
        with open(path, 'r') as f:
            data = json.load(f)
        logging.info(f"Loaded JSON: {path}")
        return data
    except Exception as e:
        logging.error(f"Failed to load JSON {path}: {e}")
        return None


# =============================================================================
# DataPersistenceManager Class
# =============================================================================

class DataPersistenceManager:
    """
    Handles saving and loading of analysis data and results.

    Provides structured data organization with support for different
    analysis stages (raw, processed, individual, comprehensive).
    """

    def __init__(self, data_folder: str):
        """
        Initialize DataPersistenceManager.

        Args:
            data_folder: Base folder for saving data files
        """
        self.data_folder = Path(data_folder)
        self.data_folder.mkdir(parents=True, exist_ok=True)

        # Create step-specific folders
        self.raw_folder = self.data_folder / "raw"
        self.processed_folder = self.data_folder / "processed"
        self.individual_folder = self.data_folder / "individual"
        self.comprehensive_folder = self.data_folder / "comprehensive"

        self.raw_folder.mkdir(exist_ok=True)
        self.processed_folder.mkdir(exist_ok=True)
        self.individual_folder.mkdir(exist_ok=True)
        self.comprehensive_folder.mkdir(exist_ok=True)

        self.logger = logging.getLogger(__name__)

    def save_analysis_data(self, data: Dict[str, Any], filename: Optional[str] = None) -> str:
        """
        Save complete analysis data to pickle file.

        Args:
            data: Dictionary containing all analysis data
            filename: Optional custom filename

        Returns:
            Path to saved file
        """
        if filename is None:
            date_str = datetime.now().strftime("%y%m%d")
            filename = f"analysis_{date_str}.pkl"

        file_path = self.data_folder / filename

        try:
            save_data = {
                'timestamp': datetime.now(),
                'version': '1.0',
                **data
            }

            with open(file_path, 'wb') as f:
                pickle.dump(save_data, f, protocol=pickle.HIGHEST_PROTOCOL)

            self.logger.info(f"Saved analysis data to {file_path}")
            return str(file_path)

        except Exception as e:
            self.logger.error(f"Error saving data to {file_path}: {e}")
            raise

    def load_analysis_data(self, filename: str) -> Optional[Dict[str, Any]]:
        """
        Load analysis data from pickle file.

        Args:
            filename: Filename to load

        Returns:
            Dictionary with loaded data or None if file not found
        """
        file_path = self.data_folder / filename

        if not file_path.exists():
            self.logger.warning(f"File not found: {file_path}")
            return None

        try:
            with open(file_path, 'rb') as f:
                data = pickle.load(f)

            self.logger.info(f"Loaded analysis data from {file_path}")
            return data

        except (ImportError, ModuleNotFoundError) as e:
            if "numpy._core" in str(e) or "numpy.core" in str(e):
                self.logger.warning(f"Numpy version compatibility issue with {file_path}")
                try:
                    file_path.unlink()
                    self.logger.info(f"Removed incompatible cached file: {file_path}")
                except Exception:
                    pass
                return None
            else:
                self.logger.error(f"Import error loading data from {file_path}: {e}")
                return None
        except Exception as e:
            self.logger.error(f"Error loading data from {file_path}: {e}")
            return None

    def save_market_data(self, market_data: Dict[str, Any], date_str: Optional[str] = None) -> str:
        """
        Save raw market data to raw folder.

        Args:
            market_data: Dictionary containing option chains, prices, etc.
            date_str: Optional date/time string, defaults to now (YYMMDD_HHMM)

        Returns:
            Path to saved file
        """
        if date_str is None:
            date_str = datetime.now().strftime("%y%m%d_%H%M")

        filename = f"market_data_{date_str}.pkl"
        file_path = self.raw_folder / filename

        try:
            with open(file_path, 'wb') as f:
                pickle.dump({
                    'timestamp': datetime.now(),
                    **market_data
                }, f)

            self.logger.info(f"Saved market data to {file_path}")
            return str(file_path)

        except Exception as e:
            self.logger.error(f"Error saving market data: {e}")
            raise

    def save_processed_data(self, processed_data: Dict[str, Any], date_str: Optional[str] = None) -> str:
        """
        Save processed data to processed folder.

        Args:
            processed_data: Dictionary containing processed data
            date_str: Optional date string

        Returns:
            Path to saved file
        """
        if date_str is None:
            date_str = datetime.now().strftime("%Y%m%d_%H%M%S")

        filename = f"processed_{date_str}.pkl"
        file_path = self.processed_folder / filename

        try:
            with open(file_path, 'wb') as f:
                pickle.dump({
                    'timestamp': datetime.now(),
                    **processed_data
                }, f)

            self.logger.info(f"Saved processed data to {file_path}")
            return str(file_path)

        except Exception as e:
            self.logger.error(f"Error saving processed data: {e}")
            raise

    def save_individual_results(self, individual_results: Dict[str, Any], date_str: Optional[str] = None) -> str:
        """
        Save individual analysis results to individual folder.

        Args:
            individual_results: Dictionary containing individual analysis results
            date_str: Optional date string

        Returns:
            Path to saved file
        """
        if date_str is None:
            date_str = datetime.now().strftime("%y%m%d")

        filename = f"individual_results_{date_str}.pkl"
        file_path = self.individual_folder / filename

        try:
            with open(file_path, 'wb') as f:
                pickle.dump({
                    'timestamp': datetime.now(),
                    **individual_results
                }, f)

            self.logger.info(f"Saved individual results to {file_path}")
            return str(file_path)

        except Exception as e:
            self.logger.error(f"Error saving individual results: {e}")
            raise

    def save_comprehensive_results(self, comprehensive_results: Dict[str, Any], date_str: Optional[str] = None) -> str:
        """
        Save comprehensive analysis results to comprehensive folder.

        Args:
            comprehensive_results: Dictionary containing comprehensive analysis results
            date_str: Optional date string

        Returns:
            Path to saved file
        """
        if date_str is None:
            date_str = datetime.now().strftime("%y%m%d")

        filename = f"comprehensive_results_{date_str}.pkl"
        file_path = self.comprehensive_folder / filename

        try:
            with open(file_path, 'wb') as f:
                pickle.dump({
                    'timestamp': datetime.now(),
                    **comprehensive_results
                }, f)

            self.logger.info(f"Saved comprehensive results to {file_path}")
            return str(file_path)

        except Exception as e:
            self.logger.error(f"Error saving comprehensive results: {e}")
            raise

    def export_to_json(self, data: Dict[str, Any], filename: str) -> str:
        """
        Export data to JSON format for interoperability.

        Args:
            data: Data to export
            filename: JSON filename

        Returns:
            Path to exported file
        """
        file_path = self.data_folder / filename

        try:
            json_data = self._prepare_for_json(data)

            with open(file_path, 'w') as f:
                json.dump(json_data, f, indent=2, default=str)

            self.logger.info(f"Exported data to JSON: {file_path}")
            return str(file_path)

        except Exception as e:
            self.logger.error(f"Error exporting to JSON {file_path}: {e}")
            raise

    def export_to_csv(self, dataframes: Dict[str, pd.DataFrame], base_filename: str) -> List[str]:
        """
        Export DataFrames to CSV files.

        Args:
            dataframes: Dictionary of DataFrames to export
            base_filename: Base filename (will append keys)

        Returns:
            List of exported file paths
        """
        exported_files = []

        for key, df in dataframes.items():
            if not isinstance(df, pd.DataFrame) or df.empty:
                continue

            filename = f"{base_filename}_{key}.csv"
            file_path = self.data_folder / filename

            try:
                df.to_csv(file_path, index=True)
                exported_files.append(str(file_path))
                self.logger.info(f"Exported {key} to CSV: {file_path}")

            except Exception as e:
                self.logger.error(f"Error exporting {key} to CSV: {e}")
                continue

        return exported_files

    def _prepare_for_json(self, data: Any) -> Any:
        """
        Recursively prepare data for JSON serialization.

        Args:
            data: Data to prepare

        Returns:
            JSON-serializable data
        """
        if isinstance(data, dict):
            return {k: self._prepare_for_json(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._prepare_for_json(item) for item in data]
        elif isinstance(data, pd.DataFrame):
            return {
                'type': 'DataFrame',
                'data': data.to_dict('records'),
                'index': data.index.tolist(),
                'columns': data.columns.tolist()
            }
        elif isinstance(data, pd.Series):
            return {
                'type': 'Series',
                'data': data.to_dict(),
                'index': data.index.tolist()
            }
        elif isinstance(data, (datetime, pd.Timestamp)):
            return data.isoformat()
        elif isinstance(data, (int, float, str, bool)) or data is None:
            return data
        else:
            return str(data)

    def get_available_files(self, pattern: str = "*.pkl") -> List[str]:
        """
        Get list of available data files.

        Args:
            pattern: File pattern to match

        Returns:
            List of available file paths
        """
        try:
            files = list(self.data_folder.glob(pattern))
            return [str(f) for f in sorted(files, key=lambda x: x.stat().st_mtime, reverse=True)]
        except Exception as e:
            self.logger.error(f"Error listing files: {e}")
            return []

    def cleanup_old_files(self, days_old: int = 30, pattern: str = "*.pkl") -> int:
        """
        Remove data files older than specified days.

        Args:
            days_old: Number of days old for cleanup threshold
            pattern: File pattern to match

        Returns:
            Number of files deleted
        """
        cutoff_time = datetime.now().timestamp() - (days_old * 24 * 3600)
        deleted_count = 0

        try:
            for file_path in self.data_folder.glob(pattern):
                if file_path.stat().st_mtime < cutoff_time:
                    file_path.unlink()
                    deleted_count += 1
                    self.logger.info(f"Deleted old file: {file_path}")

            self.logger.info(f"Cleaned up {deleted_count} old files")
            return deleted_count

        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
            return 0

    def backup_data(self, backup_folder: str) -> str:
        """
        Create backup of all data files.

        Args:
            backup_folder: Folder for backup

        Returns:
            Path to backup folder
        """
        backup_path = Path(backup_folder)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        timestamped_backup = backup_path / f"backup_{timestamp}"

        try:
            timestamped_backup.mkdir(parents=True, exist_ok=True)

            for file_path in self.data_folder.iterdir():
                if file_path.is_file():
                    shutil.copy2(file_path, timestamped_backup)

            self.logger.info(f"Backup created: {timestamped_backup}")
            return str(timestamped_backup)

        except Exception as e:
            self.logger.error(f"Error creating backup: {e}")
            raise

    def get_file_info(self, filename: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a data file.

        Args:
            filename: Name of file to inspect

        Returns:
            Dictionary with file information or None
        """
        file_path = self.data_folder / filename

        if not file_path.exists():
            return None

        try:
            stat = file_path.stat()
            info = {
                'filename': filename,
                'size_bytes': stat.st_size,
                'size_mb': stat.st_size / (1024 * 1024),
                'created': datetime.fromtimestamp(stat.st_ctime),
                'modified': datetime.fromtimestamp(stat.st_mtime),
                'is_pickle': filename.endswith('.pkl'),
                'is_json': filename.endswith('.json'),
                'is_csv': filename.endswith('.csv')
            }

            if info['is_pickle']:
                try:
                    data = self.load_analysis_data(filename)
                    if data:
                        info['data_keys'] = list(data.keys())
                        info['data_timestamp'] = data.get('timestamp')
                except Exception:
                    pass

            return info

        except Exception as e:
            self.logger.error(f"Error getting file info for {filename}: {e}")
            return None
