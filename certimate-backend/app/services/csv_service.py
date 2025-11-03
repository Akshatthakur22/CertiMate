import pandas as pd
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class CSVService:
    """Service for processing CSV files"""
    
    @staticmethod
    def read_csv(file_path: str) -> pd.DataFrame:
        """
        Read CSV file and return DataFrame
        Handles common CSV issues like different delimiters and encoding
        """
        try:
            # Try reading with different encodings
            encodings = ['utf-8', 'latin-1', 'iso-8859-1']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    logger.info(f"Successfully read CSV file: {file_path} with encoding: {encoding}")
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise ValueError("Could not read CSV file with any encoding")
            
            # Strip whitespace from column names
            df.columns = df.columns.str.strip()
            
            return df
            
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
            df = CSVService.read_csv(file_path)
            
            # Auto-detect name column if not specified
            if name_column is None:
                # Common variations of name column names
                name_variations = ['name', 'Name', 'NAME', 'full_name', 'Full Name', 
                                 'fullname', 'participant', 'Participant', 'student', 'Student']
                
                name_column = None
                for col in df.columns:
                    if col in name_variations:
                        name_column = col
                        break
                
                # If not found, use first column as fallback
                if name_column is None:
                    name_column = df.columns[0]
                    logger.warning(f"No standard name column found, using first column: {name_column}")
            
            # Validate that the column exists
            if name_column not in df.columns:
                raise ValueError(f"Column '{name_column}' not found in CSV. Available columns: {df.columns.tolist()}")
            
            # Extract names and drop NaN values
            names = df[name_column].dropna().astype(str).str.strip()
            names = names[names != ''].tolist()
            
            logger.info(f"Extracted {len(names)} names from CSV")
            return names
            
        except Exception as e:
            logger.error(f"Error extracting names from CSV: {e}")
            raise
    
    @staticmethod
    def get_records(df: pd.DataFrame) -> List[Dict]:
        """
        Convert DataFrame to list of dictionaries
        """
        return df.to_dict('records')
    
    @staticmethod
    def validate_columns(df: pd.DataFrame, required_columns: List[str]) -> bool:
        """
        Validate that DataFrame contains required columns
        """
        missing_columns = set(required_columns) - set(df.columns)
        if missing_columns:
            logger.error(f"Missing required columns: {missing_columns}")
            return False
        return True
