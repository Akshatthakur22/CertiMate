import csv
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class CSVService:
    """Service for processing CSV files"""
    
    @staticmethod
    def read_csv(file_path: str) -> List[Dict]:
        """
        Read CSV file and return list of dictionaries
        Handles common CSV issues like different delimiters and encoding
        """
        try:
            # Try reading with different encodings
            encodings = ['utf-8', 'latin-1', 'iso-8859-1']
            data = None
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding, newline='') as f:
                        reader = csv.DictReader(f)
                        data = list(reader)
                        # Strip whitespace from keys and values
                        data = [{k.strip(): v.strip() if v else v for k, v in row.items()} for row in data]
                    logger.info(f"Successfully read CSV file: {file_path} with encoding: {encoding}")
                    break
                except UnicodeDecodeError:
                    continue
            
            if data is None:
                raise ValueError("Could not read CSV file with any encoding")
            
            return data
            
        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            raise
    
    @staticmethod
    def get_names_from_csv(file_path: str, name_column: str = None) -> List[str]:
        """
        Extract names from CSV file
        Automatically detects common column names for names (name, Name, NAME, etc.)
        """
        try:
            # Read the CSV file
            data = CSVService.read_csv(file_path)
            
            if not data:
                return []
            
            # Auto-detect name column if not specified
            if name_column is None:
                # Common variations of name column names
                name_variations = ['name', 'Name', 'NAME', 'full_name', 'Full Name', 
                                 'fullname', 'participant', 'Participant', 'student', 'Student']
                
                # Get column names from first row
                columns = list(data[0].keys()) if data else []
                
                name_column = None
                for col in columns:
                    if col in name_variations:
                        name_column = col
                        break
                
                # If not found, use first column as fallback
                if name_column is None and columns:
                    name_column = columns[0]
                    logger.warning(f"No standard name column found, using first column: {name_column}")
            
            # Extract names and drop empty values
            names = []
            for row in data:
                if name_column in row and row[name_column] and row[name_column].strip():
                    names.append(row[name_column].strip())
            
            logger.info(f"Extracted {len(names)} names from CSV")
            return names
            
        except Exception as e:
            logger.error(f"Error extracting names from CSV: {e}")
            raise
    
    @staticmethod
    def get_all_data(file_path: str) -> List[Dict]:
        """
        Get all data from CSV as list of dictionaries
        Each dictionary represents a row with column names as keys
        """
        try:
            return CSVService.read_csv(file_path)
        except Exception as e:
            logger.error(f"Error getting all data from CSV: {e}")
            raise
    
    @staticmethod
    def validate_columns(data: List[Dict], required_columns: List[str]) -> bool:
        """
        Validate that data contains required columns
        """
        if not data:
            logger.error("No data to validate")
            return False
        
        columns = set(data[0].keys()) if data else set()
        missing_columns = set(required_columns) - columns
        if missing_columns:
            logger.error(f"Missing required columns: {missing_columns}")
            return False
        return True
