import zipfile
import os
from typing import List
import logging

logger = logging.getLogger(__name__)


class ZIPService:
    """Service for processing ZIP files"""
    
    @staticmethod
    def extract_zip(zip_path: str, extract_to: str) -> List[str]:
        """
        Extract ZIP file to specified directory
        """
        try:
            os.makedirs(extract_to, exist_ok=True)
            extracted_files = []
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
                extracted_files = zip_ref.namelist()
            
            logger.info(f"Extracted {len(extracted_files)} files to {extract_to}")
            return [os.path.join(extract_to, f) for f in extracted_files]
        except Exception as e:
            logger.error(f"Error extracting ZIP file: {e}")
            raise
    
    @staticmethod
    def create_zip(files: List[str], output_path: str) -> str:
        """
        Create ZIP file from list of files
        """
        try:
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in files:
                    if os.path.isfile(file_path):
                        zipf.write(file_path, os.path.basename(file_path))
            
            logger.info(f"Created ZIP file: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Error creating ZIP file: {e}")
            raise
