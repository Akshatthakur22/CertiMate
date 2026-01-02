from fastapi import APIRouter
from datetime import datetime
from app.models.schemas import HealthResponse, ServiceStatus
from app.models.optimized_responses import create_health_response

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check():
    """
    Health check endpoint
    """
    return create_health_response(
        status="healthy",
        timestamp=datetime.utcnow().isoformat()
    )


@router.get("/ready")
async def readiness_check():
    """
    Readiness check endpoint
    """
    return create_health_response(
        status="ready",
        timestamp=datetime.utcnow().isoformat()
    )


@router.get("/live")
async def liveness_check():
    """
    Liveness check endpoint
    """
    return create_health_response(
        status="healthy",
        timestamp=datetime.utcnow().isoformat()
    )
