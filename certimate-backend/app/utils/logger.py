import logging
import sys
import csv
from datetime import datetime
from pathlib import Path
from typing import Optional


def setup_logger(name: str, log_file: str = None, level: int = logging.INFO) -> logging.Logger:
    """
    Setup logger with file and console handlers
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler
    if log_file:
        # Create logs directory if it doesn't exist
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


def setup_logging(log_level: int = logging.INFO, log_file: str = "logs/certimate.log"):
    """
    Setup logging for the entire application
    
    Args:
        log_level: Logging level (default: INFO)
        log_file: Path to log file (default: logs/certimate.log)
    """
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file)
        ]
    )
    
    # Set log levels for third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


class CSVAuditLogger:
    """
    Logger for tracking certificate generation success and failures in CSV files
    """
    
    def __init__(self, log_dir: str = "logs"):
        """
        Initialize CSV audit logger
        
        Args:
            log_dir: Directory to store log files
        """
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        self.success_log = self.log_dir / "success.csv"
        self.failure_log = self.log_dir / "failed.csv"
        
        # Initialize CSV files with headers if they don't exist
        self._initialize_csv_files()
    
    def _initialize_csv_files(self):
        """Initialize CSV files with headers if they don't exist"""
        # Initialize success log
        if not self.success_log.exists():
            with open(self.success_log, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'name', 'output_path', 'status'])
        
        # Initialize failure log
        if not self.failure_log.exists():
            with open(self.failure_log, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'name', 'error_message', 'status'])
    
    def log_success(self, name: str, output_path: str, status: str = "success"):
        """
        Log successful certificate generation
        
        Args:
            name: Name of the person for whom certificate was generated
            output_path: Path to the generated certificate file
            status: Status of the generation (default: "success")
        """
        try:
            with open(self.success_log, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    datetime.now().isoformat(),
                    name,
                    output_path,
                    status
                ])
        except Exception as e:
            logging.error(f"Error logging success for {name}: {e}")
    
    def log_failure(self, name: str, error_message: str, status: str = "failed"):
        """
        Log failed certificate generation
        
        Args:
            name: Name of the person for whom certificate generation failed
            error_message: Error message describing the failure
            status: Status of the generation (default: "failed")
        """
        try:
            with open(self.failure_log, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    datetime.now().isoformat(),
                    name,
                    error_message,
                    status
                ])
        except Exception as e:
            logging.error(f"Error logging failure for {name}: {e}")
    
    def get_success_count(self) -> int:
        """Get the count of successful certificate generations"""
        try:
            with open(self.success_log, 'r') as f:
                reader = csv.reader(f)
                return sum(1 for row in reader) - 1  # Subtract header row
        except Exception:
            return 0
    
    def get_failure_count(self) -> int:
        """Get the count of failed certificate generations"""
        try:
            with open(self.failure_log, 'r') as f:
                reader = csv.reader(f)
                return sum(1 for row in reader) - 1  # Subtract header row
        except Exception:
            return 0
