import os
import hashlib
import shutil
from pathlib import Path
from typing import Optional, Union, List
import logging

logger = logging.getLogger(__name__)


def get_file_hash(file_path: str) -> str:
    """
    Calculate MD5 hash of a file
    """
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def ensure_directory(directory: str) -> None:
    """
    Create directory if it doesn't exist (thread-safe)
    
    Args:
        directory: Directory path to create
    """
    try:
        Path(directory).mkdir(parents=True, exist_ok=True)
        logger.debug(f"Ensured directory exists: {directory}")
    except Exception as e:
        logger.error(f"Error creating directory {directory}: {e}")
        raise


def ensure_directories(*directories: str) -> None:
    """
    Create multiple directories if they don't exist
    
    Args:
        *directories: Variable number of directory paths to create
    """
    for directory in directories:
        ensure_directory(directory)


def get_file_size(file_path: str) -> int:
    """
    Get file size in bytes
    
    Args:
        file_path: Path to the file
        
    Returns:
        File size in bytes
    """
    return os.path.getsize(file_path)


def get_file_extension(file_path: str) -> str:
    """
    Get file extension
    
    Args:
        file_path: Path to the file
        
    Returns:
        File extension (e.g., '.pdf', '.png')
    """
    return Path(file_path).suffix.lower()


def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
    """
    Check if file has allowed extension
    
    Args:
        filename: Original filename
        allowed_extensions: List of allowed extensions (e.g., ['.pdf', '.png'])
        
    Returns:
        True if file extension is allowed, False otherwise
    """
    extension = get_file_extension(filename)
    return extension in allowed_extensions


def validate_file_extension_and_size(filename: str, allowed_extensions: List[str], max_size: int = None) -> tuple[bool, str]:
    """
    Validate file extension and optionally size
    
    Args:
        filename: Original filename
        allowed_extensions: List of allowed extensions
        max_size: Maximum file size in bytes (optional)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check extension
    if not validate_file_extension(filename, allowed_extensions):
        ext_list = ", ".join(allowed_extensions)
        return False, f"File type not allowed. Allowed types: {ext_list}"
    
    # Check size if provided
    if max_size is not None:
        file_ext = get_file_extension(filename)
        if file_ext not in allowed_extensions:
            return False, f"File type {file_ext} not allowed. Allowed types: {allowed_extensions}"
    
    return True, ""


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename by removing unsafe characters
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename safe for filesystem
    """
    import re
    # Remove any character that's not a letter, digit, dash, underscore, or dot
    sanitized = re.sub(r'[^a-zA-Z0-9\-_\.]', '_', filename)
    return sanitized


def safe_save_file(content: bytes, file_path: str, create_dir: bool = True) -> str:
    """
    Safely save file content to disk
    
    Args:
        content: File content as bytes
        file_path: Destination file path
        create_dir: Whether to create parent directories if they don't exist
        
    Returns:
        Path to the saved file
        
    Raises:
        Exception if file cannot be saved
    """
    try:
        # Create parent directories if requested
        if create_dir:
            parent_dir = os.path.dirname(file_path)
            if parent_dir:
                ensure_directory(parent_dir)
        
        # Write file content
        with open(file_path, 'wb') as f:
            f.write(content)
        
        logger.info(f"File saved successfully: {file_path}")
        return file_path
        
    except Exception as e:
        logger.error(f"Error saving file {file_path}: {e}")
        raise


def safe_save_text(text: str, file_path: str, create_dir: bool = True, encoding: str = 'utf-8') -> str:
    """
    Safely save text content to disk
    
    Args:
        text: Text content to save
        file_path: Destination file path
        create_dir: Whether to create parent directories if they don't exist
        encoding: Text encoding (default: utf-8)
        
    Returns:
        Path to the saved file
        
    Raises:
        Exception if file cannot be saved
    """
    try:
        # Create parent directories if requested
        if create_dir:
            parent_dir = os.path.dirname(file_path)
            if parent_dir:
                ensure_directory(parent_dir)
        
        # Write text content
        with open(file_path, 'w', encoding=encoding) as f:
            f.write(text)
        
        logger.info(f"Text file saved successfully: {file_path}")
        return file_path
        
    except Exception as e:
        logger.error(f"Error saving text file {file_path}: {e}")
        raise


def file_exists(file_path: str) -> bool:
    """
    Check if a file exists
    
    Args:
        file_path: Path to the file
        
    Returns:
        True if file exists, False otherwise
    """
    return os.path.isfile(file_path)


def directory_exists(dir_path: str) -> bool:
    """
    Check if a directory exists
    
    Args:
        dir_path: Path to the directory
        
    Returns:
        True if directory exists, False otherwise
    """
    return os.path.isdir(dir_path)


def get_unique_filename(base_path: str, extension: str = '') -> str:
    """
    Generate a unique filename by appending a number if the file exists
    
    Args:
        base_path: Base file path (without extension)
        extension: File extension (e.g., '.pdf', '.png')
        
    Returns:
        Unique file path that doesn't exist
    """
    counter = 1
    unique_path = f"{base_path}{extension}"
    
    while file_exists(unique_path):
        unique_path = f"{base_path}_{counter}{extension}"
        counter += 1
    
    return unique_path


def safe_delete_file(file_path: str) -> bool:
    """
    Safely delete a file
    
    Args:
        file_path: Path to the file to delete
        
    Returns:
        True if file was deleted, False otherwise
    """
    try:
        if file_exists(file_path):
            os.remove(file_path)
            logger.info(f"File deleted: {file_path}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting file {file_path}: {e}")
        return False


def copy_file(source: str, destination: str, create_dir: bool = True) -> str:
    """
    Copy a file from source to destination
    
    Args:
        source: Source file path
        destination: Destination file path
        create_dir: Whether to create parent directories if they don't exist
        
    Returns:
        Path to the copied file
    """
    try:
        if create_dir:
            parent_dir = os.path.dirname(destination)
            if parent_dir:
                ensure_directory(parent_dir)
        
        shutil.copy2(source, destination)
        logger.info(f"File copied from {source} to {destination}")
        return destination
        
    except Exception as e:
        logger.error(f"Error copying file from {source} to {destination}: {e}")
        raise
