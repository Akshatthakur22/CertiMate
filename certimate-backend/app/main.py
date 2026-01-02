from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError, HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.gzip import GZipMiddleware
from app.routes import upload, generate, health, send, mapping
from app.routes import health_endpoints
from app.config import settings
from app.utils.logger import setup_logging
from app.utils.error_handling import (
    global_exception_handler, 
    validation_exception_handler, 
    http_exception_handler,
    RequestTimeoutMiddleware,
    log_error_with_context
)
from app.utils.monitoring import health_monitor, RequestMonitoringMiddleware
import logging

# Setup logging for the application
setup_logging()
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """
    Factory function to create and configure the FastAPI application
    This pattern allows for better testing and configuration management
    """
    app = FastAPI(
        title=settings.API_TITLE,
        description="Certificate generation and management API",
        version=settings.API_VERSION,
        debug=settings.DEBUG
    )

    # Add gzip compression middleware (before other middleware for maximum compression)
    app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses larger than 1KB
    
    # CORS middleware configuration
    # Allows cross-origin requests from any domain (can be restricted in production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add request timeout middleware
    app.add_middleware(RequestTimeoutMiddleware, timeout=120.0)  # 2 minute timeout
    
    # Add request monitoring middleware
    app.add_middleware(RequestMonitoringMiddleware, health_monitor=health_monitor)

    # Include routers with API prefix
    app.include_router(upload.router, prefix="/api")
    app.include_router(generate.router, prefix="/api")
    app.include_router(send.router, prefix="/api")
    app.include_router(mapping.router, prefix="/api")
    app.include_router(health.router, prefix="/api")
    app.include_router(health_endpoints.router, prefix="/api")

    # Add global exception handlers
    app.add_exception_handler(Exception, global_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)

    @app.get("/")
    async def root():
        """Root endpoint to verify API is running"""
        return {
            "message": "CertiMate API is running",
            "version": settings.API_VERSION
        }

    # Startup event
    @app.on_event("startup")
    async def startup_event():
        """Initialize application on startup"""
        logger.info("Starting CertiMate API...")
        logger.info(f"Environment: {'Development' if settings.DEBUG else 'Production'}")
        
        # Create required directories at startup
        from app.utils.fileutils import ensure_directories
        ensure_directories(
            settings.UPLOAD_DIR,
            f"{settings.UPLOAD_DIR}/templates",
            f"{settings.UPLOAD_DIR}/csv",
            f"{settings.UPLOAD_DIR}/certificates",
            f"{settings.UPLOAD_DIR}/preview",
            "logs"
        )
        logger.info("Required directories created/verified")
        
        # Log configuration
        logger.info(f"Configuration loaded - Max upload size: {settings.MAX_UPLOAD_SIZE} bytes")
        logger.info(f"Request timeout: 120 seconds")
    
    # Shutdown event
    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup on shutdown"""
        logger.info("Shutting down CertiMate API...")

    return app


# Create the application instance
app = create_app()
