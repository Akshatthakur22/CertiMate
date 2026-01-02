"""
Production-grade exception handling and error response formatting
Provides consistent error handling across the entire application
"""

import logging
import traceback
from typing import Any, Dict, Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError
import uuid
import time

logger = logging.getLogger(__name__)


class CertiMateException(Exception):
    """Base exception for CertiMate application"""
    def __init__(
        self, 
        message: str, 
        error_code: str = None, 
        details: Dict = None, 
        cause: Exception = None
    ):
        self.message = message
        self.error_code = error_code or "INTERNAL_ERROR"
        self.details = details or {}
        self.cause = cause
        super().__init__(message)


class ValidationError(CertiMateException):
    """Validation error for user input"""
    def __init__(self, message: str, field: str = None, value: Any = None):
        details = {"field": field, "value": value} if field else {}
        super().__init__(message, "VALIDATION_ERROR", details)


class ExternalServiceError(CertiMateException):
    """Error in external service (OCR, Gmail, etc.)"""
    def __init__(self, message: str, service: str = None, status_code: int = None):
        details = {"service": service, "status_code": status_code} if service else {}
        super().__init__(message, "EXTERNAL_SERVICE_ERROR", details)


class FileProcessingError(CertiMateException):
    """Error in file processing (PDF, image, CSV)"""
    def __init__(self, message: str, file_path: str = None, file_type: str = None):
        details = {"file_path": file_path, "file_type": file_type} if file_path else {}
        super().__init__(message, "FILE_PROCESSING_ERROR", details)


class JobProcessingError(CertiMateException):
    """Error in job processing"""
    def __init__(self, message: str, job_id: str = None, step: str = None):
        details = {"job_id": job_id, "step": step} if job_id else {}
        super().__init__(message, "JOB_PROCESSING_ERROR", details)


class DatabaseError(CertiMateException):
    """Database operation error"""
    def __init__(self, message: str, operation: str = None):
        details = {"operation": operation} if operation else {}
        super().__init__(message, "DATABASE_ERROR", details)


class ErrorResponse:
    """Standardized error response format"""
    
    def __init__(
        self,
        success: bool = False,
        error_code: str = "INTERNAL_ERROR",
        message: str = "An unexpected error occurred",
        details: Dict = None,
        request_id: str = None,
        timestamp: str = None
    ):
        self.success = success
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        self.request_id = request_id or str(uuid.uuid4())
        self.timestamp = timestamp or time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON response"""
        return {
            "success": self.success,
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
                "request_id": self.request_id,
                "timestamp": self.timestamp
            }
        }


class ErrorHandler:
    """Global error handler for consistent error responses"""
    
    @staticmethod
    def create_error_response(
        error_code: str = "INTERNAL_ERROR",
        message: str = "An unexpected error occurred",
        details: Dict = None,
        status_code: int = 500
    ) -> JSONResponse:
        """Create standardized error response"""
        error_response = ErrorResponse(
            error_code=error_code,
            message=message,
            details=details
        )
        
        logger.error(f"Error response: {error_code} - {message} - {details}")
        
        return JSONResponse(
            status_code=status_code,
            content=error_response.to_dict()
        )
    
    @staticmethod
    def handle_exception(request: Request, exc: Exception) -> JSONResponse:
        """
        Handle exceptions and return standardized error responses
        """
        try:
            # Log the full exception for debugging
            logger.error(f"Unhandled exception: {type(exc).__name__}: {exc}", exc_info=True)
            
            # Handle different exception types
            if isinstance(exc, CertiMateException):
                return ErrorHandler.create_error_response(
                    error_code=exc.error_code,
                    message=exc.message,
                    details=exc.details,
                    status_code=ErrorHandler._get_status_code(exc.error_code)
                )
            
            elif isinstance(exc, HTTPException):
                return ErrorHandler.create_error_response(
                    error_code="HTTP_ERROR",
                    message=exc.detail,
                    details={"status_code": exc.status_code},
                    status_code=exc.status_code
                )
            
            elif isinstance(exc, RequestValidationError):
                return ErrorHandler.create_error_response(
                    error_code="VALIDATION_ERROR",
                    message="Invalid request data",
                    details={"validation_errors": exc.errors()},
                    status_code=422
                )
            
            elif isinstance(exc, ValidationError):
                return ErrorHandler.create_error_response(
                    error_code="VALIDATION_ERROR",
                    message="Invalid data format",
                    details={"validation_error": str(exc)},
                    status_code=422
                )
            
            elif isinstance(exc, StarletteHTTPException):
                return ErrorHandler.create_error_response(
                    error_code="HTTP_ERROR",
                    message=exc.detail,
                    details={"status_code": exc.status_code},
                    status_code=exc.status_code
                )
            
            elif isinstance(exc, (FileNotFoundError, OSError)):
                return ErrorHandler.create_error_response(
                    error_code="FILE_NOT_FOUND",
                    message="Requested file not found",
                    details={"error_type": type(exc).__name__},
                    status_code=404
                )
            
            elif isinstance(exc, PermissionError):
                return ErrorHandler.create_error_response(
                    error_code="PERMISSION_DENIED",
                    message="Permission denied",
                    details={"error_type": type(exc).__name__},
                    status_code=403
                )
            
            elif isinstance(exc, TimeoutError):
                return ErrorHandler.create_error_response(
                    error_code="TIMEOUT_ERROR",
                    message="Request timed out",
                    details={"error_type": type(exc).__name__},
                    status_code=408
                )
            
            elif isinstance(exc, ConnectionError):
                return ErrorHandler.create_error_response(
                    error_code="CONNECTION_ERROR",
                    message="Connection failed",
                    details={"error_type": type(exc).__name__},
                    status_code=503
                )
            
            else:
                # Unknown exception - return generic error
                return ErrorHandler.create_error_response(
                    error_code="INTERNAL_ERROR",
                    message="An unexpected error occurred",
                    details={
                        "exception_type": type(exc).__name__,
                        "exception_message": str(exc)
                    },
                    status_code=500
                )
        
        except Exception as handler_error:
            # If error handler itself fails, return minimal error response
            logger.critical(f"Error handler failed: {handler_error}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": {
                        "code": "HANDLER_ERROR",
                        "message": "Internal error occurred",
                        "request_id": str(uuid.uuid4()),
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                    }
                }
            )
    
    @staticmethod
    def _get_status_code(error_code: str) -> int:
        """Get HTTP status code for error code"""
        status_codes = {
            "VALIDATION_ERROR": 400,
            "AUTHENTICATION_ERROR": 401,
            "AUTHORIZATION_ERROR": 403,
            "FILE_NOT_FOUND": 404,
            "METHOD_NOT_ALLOWED": 405,
            "TIMEOUT_ERROR": 408,
            "CONFLICT_ERROR": 409,
            "EXTERNAL_SERVICE_ERROR": 502,
            "FILE_PROCESSING_ERROR": 422,
            "JOB_PROCESSING_ERROR": 422,
            "DATABASE_ERROR": 500,
            "HTTP_ERROR": 500,
            "INTERNAL_ERROR": 500,
            "HANDLER_ERROR": 500
        }
        return status_codes.get(error_code, 500)


class SafeServiceWrapper:
    """Wrapper for safe external service calls with timeout and error handling"""
    
    @staticmethod
    async def safe_execute(
        service_name: str,
        operation_func,
        *args,
        timeout: float = 30.0,
        **kwargs
    ) -> Any:
        """
        Safely execute external service operation with timeout and error handling
        
        Args:
            service_name: Name of the service (for logging)
            operation_func: Function to execute
            timeout: Timeout in seconds
            *args: Arguments to pass to function
            **kwargs: Keyword arguments to pass to function
            
        Returns:
            Result of the operation
            
        Raises:
            ExternalServiceError: If operation fails or times out
        """
        import asyncio
        
        try:
            # Execute with timeout
            result = await asyncio.wait_for(
                operation_func(*args, **kwargs),
                timeout=timeout
            )
            return result
            
        except asyncio.TimeoutError:
            raise ExternalServiceError(
                f"{service_name} operation timed out after {timeout} seconds",
                service=service_name,
                status_code=408
            )
        
        except Exception as e:
            # Check if it's a known external service error
            if "connection" in str(e).lower():
                raise ExternalServiceError(
                    f"Failed to connect to {service_name}",
                    service=service_name,
                    status_code=503
                )
            elif "timeout" in str(e).lower():
                raise ExternalServiceError(
                    f"{service_name} operation timed out",
                    service=service_name,
                    status_code=408
                )
            else:
                raise ExternalServiceError(
                    f"Error in {service_name}: {str(e)}",
                    service=service_name,
                    status_code=502
                )


class RequestTimeoutMiddleware:
    """Middleware for request timeout handling"""
    
    def __init__(self, app, timeout: float = 60.0):
        self.app = app
        self.timeout = timeout
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
            
        import asyncio
        
        async def call_next(request):
            # Create a new receive function for the app
            async def receive_wrapper():
                return await receive()
            
            # Create a new send function for the app
            async def send_wrapper(message):
                await send(message)
            
            # Call the app
            await self.app(scope, receive_wrapper, send_wrapper)
        
        try:
            # Set timeout for the request
            await asyncio.wait_for(
                call_next(scope),
                timeout=self.timeout
            )
            
        except asyncio.TimeoutError:
            logger.error(f"Request timeout after {self.timeout} seconds")
            # Send timeout response
            response = ErrorHandler.create_error_response(
                status_code=408,
                error_code="REQUEST_TIMEOUT",
                message="Request took too long to process",
                details={"timeout_seconds": self.timeout}
            )
            
            # Send the response
            await send({
                "type": "http.response.start",
                "status": response.status_code,
                "headers": [
                    (b"content-type", b"application/json"),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": response.body.encode(),
            })


# Global exception handler for FastAPI
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler for FastAPI"""
    return ErrorHandler.handle_exception(request, exc)


# Validation error handler for FastAPI
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Validation error handler for FastAPI"""
    return ErrorHandler.handle_exception(request, exc)


# HTTP exception handler for FastAPI
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """HTTP exception handler for FastAPI"""
    return ErrorHandler.handle_exception(request, exc)


# Utility functions for common error scenarios
def log_error_with_context(
    message: str, 
    context: Dict = None, 
    exc: Exception = None, 
    level: str = "error"
):
    """Log error with context information"""
    log_data = {
        "message": message,
        "context": context or {},
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    }
    
    if exc:
        log_data["exception"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc()
        }
    
    logger.log(
        getattr(logging, level.upper(), logging.ERROR),
        f"Error: {message} | Context: {context} | Exception: {exc}"
    )
