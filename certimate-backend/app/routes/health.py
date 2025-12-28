from fastapi import APIRouter
from datetime import datetime
from app.models.schemas import HealthResponse, ServiceStatus

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    """
    return HealthResponse(
        status=ServiceStatus.HEALTHY,
        timestamp=datetime.utcnow(),
        service="certimate-api",
        version="1.0.0",
        checks={
            "database": "healthy",
            "storage": "healthy",
            "queue": "healthy"
        }
    )


@router.get("/ready", response_model=HealthResponse)
async def readiness_check():
    """
    Readiness check endpoint
    """
    # TODO: Add actual checks for required services/dependencies
    return HealthResponse(
        status=ServiceStatus.HEALTHY,
        timestamp=datetime.utcnow(),
        service="certimate-api",
        checks={
            "dependencies": "ready",
            "external_apis": "ready"
        }
    )


@router.get("/live", response_model=HealthResponse)
async def liveness_check():
    """
    Liveness check endpoint
    """
    return HealthResponse(
        status=ServiceStatus.HEALTHY,
        timestamp=datetime.utcnow(),
        service="certimate-api"
    )
