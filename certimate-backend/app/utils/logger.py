import logging
import sys
from pathlib import Path


def setup_logging(log_level: int = logging.INFO, log_file: str = "logs/certimate.log"):
    """
    Setup logging for the entire application
    
    Args:
        log_level: Logging level (default: INFO)
        log_file: Path to log file (default: logs/certimate.log)
    """
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file) if log_file else logging.NullHandler()
        ]
    )
    
    # Create logs directory if needed
    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)


class CSVAuditLogger:
    """Simple audit logger for CSV operations"""
    
    def __init__(self):
        self.logger = logging.getLogger("csv_audit")
    
    def log_success(self, name: str, output_path: str, status: str = "success"):
        """Log successful certificate generation"""
        self.logger.info(f"Certificate generated: {name} -> {output_path}")
    
    def log_failure(self, name: str, error_message: str, status: str = "failed"):
        """Log failed certificate generation"""
        self.logger.error(f"Certificate failed: {name} - {error_message}")
    
    def get_success_count(self) -> int:
        """Get the count of successful certificate generations"""
        return 0  # Simplified - no longer tracking counts
    
    def get_failure_count(self) -> int:
        """Get the count of failed certificate generations"""
        return 0  # Simplified - no longer tracking counts
