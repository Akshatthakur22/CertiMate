"""
Metadata tracking utility for upload history

Tracks uploaded files and their timestamps in a JSON metadata file.
"""
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)


class UploadMetadata:
    """
    Manages metadata for tracking uploaded files
    Stores metadata in uploads/metadata.json
    """
    
    def __init__(self, metadata_file: str = "uploads/metadata.json"):
        """
        Initialize metadata manager
        
        Args:
            metadata_file: Path to metadata JSON file
        """
        self.metadata_file = Path(metadata_file)
        self._ensure_metadata_file()
    
    def _ensure_metadata_file(self):
        """Create metadata file with default structure if it doesn't exist"""
        if not self.metadata_file.exists():
            self.metadata_file.parent.mkdir(parents=True, exist_ok=True)
            default_data = {
                "last_template": None,
                "last_csv": None,
                "upload_history": {
                    "templates": [],
                    "csvs": []
                }
            }
            self._write_metadata(default_data)
            logger.info(f"Created metadata file: {self.metadata_file}")
    
    def _read_metadata(self) -> Dict:
        """Read metadata from file"""
        try:
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading metadata: {e}")
            return self._get_default_data()
    
    def _write_metadata(self, data: Dict):
        """Write metadata to file"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error writing metadata: {e}")
            raise
    
    def _get_default_data(self) -> Dict:
        """Get default metadata structure"""
        return {
            "last_template": None,
            "last_csv": None,
            "upload_history": {
                "templates": [],
                "csvs": []
            }
        }
    
    def record_template_upload(self, file_path: str, filename: str):
        """
        Record a template file upload
        
        Args:
            file_path: Full path to uploaded template
            filename: Original filename
        """
        data = self._read_metadata()
        timestamp = datetime.now().isoformat()
        
        upload_record = {
            "filename": filename,
            "file_path": file_path,
            "timestamp": timestamp
        }
        
        # Update last template
        data["last_template"] = {
            "filename": filename,
            "file_path": file_path,
            "timestamp": timestamp
        }
        
        # Add to history
        data["upload_history"]["templates"].append(upload_record)
        
        # Keep only last 50 uploads
        if len(data["upload_history"]["templates"]) > 50:
            data["upload_history"]["templates"] = data["upload_history"]["templates"][-50:]
        
        self._write_metadata(data)
        logger.info(f"Recorded template upload: {file_path}")
    
    def record_csv_upload(self, file_path: str, filename: str):
        """
        Record a CSV file upload
        
        Args:
            file_path: Full path to uploaded CSV
            filename: Original filename
        """
        data = self._read_metadata()
        timestamp = datetime.now().isoformat()
        
        upload_record = {
            "filename": filename,
            "file_path": file_path,
            "timestamp": timestamp
        }
        
        # Update last CSV
        data["last_csv"] = {
            "filename": filename,
            "file_path": file_path,
            "timestamp": timestamp
        }
        
        # Add to history
        data["upload_history"]["csvs"].append(upload_record)
        
        # Keep only last 50 uploads
        if len(data["upload_history"]["csvs"]) > 50:
            data["upload_history"]["csvs"] = data["upload_history"]["csvs"][-50:]
        
        self._write_metadata(data)
        logger.info(f"Recorded CSV upload: {file_path}")
    
    def get_latest_template(self) -> Optional[Dict]:
        """
        Get the latest uploaded template
        
        Returns:
            Dict with template info or None if no template uploaded
        """
        data = self._read_metadata()
        return data.get("last_template")
    
    def get_latest_csv(self) -> Optional[Dict]:
        """
        Get the latest uploaded CSV
        
        Returns:
            Dict with CSV info or None if no CSV uploaded
        """
        data = self._read_metadata()
        return data.get("last_csv")
    
    def get_latest_uploads(self) -> Dict:
        """
        Get both latest template and CSV
        
        Returns:
            Dict with 'template' and 'csv' keys
        """
        return {
            "template": self.get_latest_template(),
            "csv": self.get_latest_csv()
        }
    
    def validate_file_exists(self, file_path: str) -> bool:
        """
        Validate that a file path exists
        
        Args:
            file_path: Path to check
            
        Returns:
            True if file exists, False otherwise
        """
        return Path(file_path).exists()

