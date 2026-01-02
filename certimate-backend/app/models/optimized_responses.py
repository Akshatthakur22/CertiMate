"""
Optimized response schemas for reduced payload size
Minimal, essential fields only for better performance
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# Minimal response base class
class BaseResponse(BaseModel):
    """Base response with minimal fields"""
    success: bool = True
    message: Optional[str] = None


# Optimized file upload response
class OptimizedFileUploadResponse(BaseResponse):
    """Optimized file upload response"""
    filename: str
    file_size: int
    file_type: str


# Optimized certificate generation response
class OptimizedCertificateResponse(BaseResponse):
    """Optimized certificate generation response"""
    job_id: str
    status: str
    total_items: int


# Optimized job status response
class OptimizedJobStatusResponse(BaseResponse):
    """Optimized job status response"""
    job_id: str
    status: str
    total_items: int
    processed_items: int
    successful_items: int
    failed_items: int


# Optimized template analysis response
class OptimizedTemplateAnalysisResponse(BaseResponse):
    """Optimized template analysis response"""
    placeholders: List[str]
    placeholder_count: int
    validation: Dict[str, Any]


# Optimized health check response
class OptimizedHealthResponse(BaseResponse):
    """Optimized health check response"""
    status: str
    timestamp: str


# Optimized error response
class OptimizedErrorResponse(BaseModel):
    """Optimized error response"""
    success: bool = False
    error_code: str
    message: str
    request_id: str


# Response utility functions
def create_optimized_response(
    success: bool = True,
    message: str = None,
    data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Create optimized response with minimal fields
    
    Args:
        success: Operation success status
        message: Optional message
        data: Optional data payload
        
    Returns:
        Optimized response dictionary
    """
    response = {"success": success}
    
    if message:
        response["message"] = message
    
    if data:
        response.update(data)
    
    return response


def create_file_upload_response(
    filename: str,
    file_path: str,
    file_size: int,
    file_type: str,
    message: str = "File uploaded successfully"
) -> Dict[str, Any]:
    """Create optimized file upload response"""
    return {
        "success": True,
        "message": message,
        "filename": filename,
        "file_path": file_path,
        "file_size": file_size,
        "file_type": file_type
    }


def create_job_response(
    job_id: str,
    status: str,
    total_items: int,
    message: str = None
) -> Dict[str, Any]:
    """Create optimized job response"""
    response = {
        "success": True,
        "job_id": job_id,
        "status": status,
        "total_items": total_items
    }
    
    if message:
        response["message"] = message
    
    return response


def create_job_status_response(
    job_id: str,
    status: str,
    total_items: int,
    processed_items: int,
    successful_items: int,
    failed_items: int
) -> Dict[str, Any]:
    """Create optimized job status response"""
    return {
        "success": True,
        "job_id": job_id,
        "status": status,
        "total_items": total_items,
        "processed_items": processed_items,
        "successful_items": successful_items,
        "failed_items": failed_items
    }


def create_template_analysis_response(
    placeholders: List[str],
    placeholder_count: int,
    validation: Dict[str, Any]
) -> Dict[str, Any]:
    """Create optimized template analysis response"""
    return {
        "success": True,
        "placeholders": placeholders,
        "placeholder_count": placeholder_count,
        "validation": validation
    }


def create_health_response(status: str, timestamp: str = None) -> Dict[str, Any]:
    """Create optimized health response"""
    if not timestamp:
        timestamp = datetime.utcnow().isoformat()
    
    return {
        "success": True,
        "status": status,
        "timestamp": timestamp
    }


def create_error_response(
    error_code: str,
    message: str,
    request_id: str = None
) -> Dict[str, Any]:
    """Create optimized error response"""
    if not request_id:
        import uuid
        request_id = str(uuid.uuid4())
    
    return {
        "success": False,
        "error_code": error_code,
        "message": message,
        "request_id": request_id
    }


# Response filtering utilities
def filter_response_data(data: Dict[str, Any], allowed_fields: List[str]) -> Dict[str, Any]:
    """
    Filter response data to include only allowed fields
    
    Args:
        data: Original response data
        allowed_fields: List of allowed field names
        
    Returns:
        Filtered response data
    """
    return {k: v for k, v in data.items() if k in allowed_fields}


def remove_null_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove null/None fields from response data
    
    Args:
        data: Original response data
        
    Returns:
        Cleaned response data
    """
    return {k: v for k, v in data.items() if v is not None}


def minimize_list_response(items: List[Dict[str, Any]], max_items: int = 100) -> List[Dict[str, Any]]:
    """
    Minimize list response by limiting items and removing unnecessary fields
    
    Args:
        items: Original list of items
        max_items: Maximum number of items to return
        
    Returns:
        Minimized list of items
    """
    # Limit number of items
    limited_items = items[:max_items]
    
    # Remove null fields from each item
    return [remove_null_fields(item) for item in limited_items]


# Response size monitoring
def calculate_response_size(response_data: Dict[str, Any]) -> int:
    """
    Calculate approximate response size in bytes
    
    Args:
        response_data: Response data
        
    Returns:
        Approximate size in bytes
    """
    import json
    return len(json.dumps(response_data).encode('utf-8'))


def log_response_size(endpoint: str, response_size: int, threshold: int = 10000):
    """
    Log response size if it exceeds threshold
    
    Args:
        endpoint: API endpoint name
        response_size: Response size in bytes
        threshold: Size threshold in bytes
    """
    if response_size > threshold:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(
            f"Large response detected: {endpoint} - {response_size} bytes "
            f"(threshold: {threshold} bytes)"
        )


# Common response field definitions
COMMON_RESPONSE_FIELDS = {
    "file_upload": ["success", "message", "filename", "file_size", "file_type"],
    "job_status": ["success", "job_id", "status", "total_items", "processed_items", "successful_items", "failed_items"],
    "template_analysis": ["success", "placeholders", "placeholder_count", "validation"],
    "health": ["success", "status", "timestamp"],
    "error": ["success", "error_code", "message", "request_id"]
}


# Response optimization decorators
def optimize_response(allowed_fields: List[str] = None):
    """
    Decorator to optimize response by filtering fields
    
    Args:
        allowed_fields: List of allowed fields (if None, use common fields based on context)
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            if isinstance(result, dict):
                # Remove null fields
                result = remove_null_fields(result)
                
                # Filter fields if specified
                if allowed_fields:
                    result = filter_response_data(result, allowed_fields)
                
                # Log large responses
                size = calculate_response_size(result)
                log_response_size(func.__name__, size)
            
            return result
        return wrapper
    return decorator
