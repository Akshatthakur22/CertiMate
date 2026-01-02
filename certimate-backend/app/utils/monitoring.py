"""
Production-grade monitoring and health checks
Provides comprehensive health monitoring and metrics collection
"""

import asyncio
import logging
import psutil
import os
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from fastapi import Request
from app.config import settings
from app.utils.error_handling import log_error_with_context

logger = logging.getLogger(__name__)


class HealthMonitor:
    """
    Comprehensive health monitoring for production systems
    """
    
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.last_health_check = None
        self.health_status = "healthy"
    
    async def check_system_health(self) -> Dict[str, Any]:
        """
        Perform comprehensive system health check
        
        Returns:
            Dictionary with health status and metrics
        """
        health_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": int(time.time() - self.start_time),
            "status": "healthy",
            "checks": {}
        }
        
        # Check system resources
        health_data["checks"]["system"] = await self._check_system_resources()
        
        # Check file system
        health_data["checks"]["filesystem"] = await self._check_filesystem_health()
        
        # Check external services
        health_data["checks"]["external_services"] = await self._check_external_services()
        
        # Check application metrics
        health_data["checks"]["application"] = await self._check_application_metrics()
        
        # Determine overall status
        failed_checks = [
            name for name, check in health_data["checks"].items()
            if check.get("status") != "healthy"
        ]
        
        if failed_checks:
            health_data["status"] = "unhealthy"
            health_data["failed_checks"] = failed_checks
            self.health_status = "unhealthy"
        else:
            self.health_status = "healthy"
        
        self.last_health_check = datetime.utcnow()
        return health_data
    
    async def _check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # Load average (Unix systems)
            try:
                load_avg = psutil.getloadavg()
            except AttributeError:
                load_avg = None
            
            status = "healthy"
            warnings = []
            
            # Check thresholds
            if cpu_percent > 90:
                status = "warning"
                warnings.append(f"High CPU usage: {cpu_percent}%")
            elif cpu_percent > 95:
                status = "unhealthy"
                warnings.append(f"Critical CPU usage: {cpu_percent}%")
            
            if memory.percent > 85:
                status = "warning" if status == "healthy" else status
                warnings.append(f"High memory usage: {memory.percent}%")
            elif memory.percent > 95:
                status = "unhealthy"
                warnings.append(f"Critical memory usage: {memory.percent}%")
            
            if disk.percent > 90:
                status = "warning" if status == "healthy" else status
                warnings.append(f"High disk usage: {disk.percent}%")
            elif disk.percent > 95:
                status = "unhealthy"
                warnings.append(f"Critical disk usage: {disk.percent}%")
            
            return {
                "status": status,
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "disk_percent": disk.percent,
                "disk_free_gb": round(disk.free / (1024**3), 2),
                "load_average": load_avg,
                "warnings": warnings
            }
            
        except Exception as e:
            log_error_with_context("System resource check failed", {}, e)
            return {
                "status": "unknown",
                "error": str(e)
            }
    
    async def _check_filesystem_health(self) -> Dict[str, Any]:
        """Check file system accessibility"""
        try:
            # Check upload directory
            upload_dir = settings.UPLOAD_DIR
            
            # Test write access
            test_file = os.path.join(upload_dir, ".health_check")
            try:
                with open(test_file, 'w') as f:
                    f.write("health_check")
                os.remove(test_file)
                write_access = True
            except:
                write_access = False
            
            # Check directory sizes
            upload_size = 0
            if os.path.exists(upload_dir):
                for root, dirs, files in os.walk(upload_dir):
                    upload_size += sum(os.path.getsize(os.path.join(root, name)) for name in files)
            
            status = "healthy" if write_access else "unhealthy"
            warnings = []
            
            if not write_access:
                warnings.append("No write access to upload directory")
            
            upload_size_mb = round(upload_size / (1024 * 1024), 2)
            if upload_size_mb > 1000:  # 1GB
                status = "warning" if status == "healthy" else status
                warnings.append(f"Large upload directory: {upload_size_mb}MB")
            
            return {
                "status": status,
                "upload_directory_accessible": write_access,
                "upload_size_mb": upload_size_mb,
                "warnings": warnings
            }
            
        except Exception as e:
            log_error_with_context("Filesystem health check failed", {}, e)
            return {
                "status": "unknown",
                "error": str(e)
            }
    
    async def _check_external_services(self) -> Dict[str, Any]:
        """Check external service availability"""
        services = {}
        
        # Check Tesseract OCR
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            services["tesseract"] = {"status": "healthy", "version": pytesseract.get_tesseract_version()}
        except Exception as e:
            services["tesseract"] = {"status": "unhealthy", "error": str(e)}
        
        # Check PDF processing capabilities
        try:
            from pdf2image import pdf2image
            services["pdf2image"] = {"status": "healthy", "version": pdf2image.__version__}
        except Exception as e:
            services["pdf2image"] = {"status": "unhealthy", "error": str(e)}
        
        # Check Gmail API availability (basic check)
        try:
            from googleapiclient.discovery import build
            services["gmail_api"] = {"status": "available", "note": "API key required for actual use"}
        except Exception as e:
            services["gmail_api"] = {"status": "unavailable", "error": str(e)}
        
        # Determine overall status
        failed_services = [name for name, service in services.items() if service.get("status") not in ["healthy", "available"]]
        overall_status = "healthy" if not failed_services else "unhealthy"
        
        return {
            "status": overall_status,
            "services": services,
            "failed_services": failed_services
        }
    
    async def _check_application_metrics(self) -> Dict[str, Any]:
        """Check application-specific metrics"""
        try:
            uptime = time.time() - self.start_time
            error_rate = (self.error_count / max(self.request_count, 1)) * 100
            
            status = "healthy"
            warnings = []
            
            if error_rate > 10:
                status = "warning"
                warnings.append(f"High error rate: {error_rate:.1f}%")
            elif error_rate > 25:
                status = "unhealthy"
                warnings.append(f"Critical error rate: {error_rate:.1f}%")
            
            if uptime < 60:  # Less than 1 minute
                status = "warning" if status == "healthy" else status
                warnings.append("Application recently started")
            
            return {
                "status": status,
                "uptime_seconds": int(uptime),
                "request_count": self.request_count,
                "error_count": self.error_count,
                "error_rate_percent": round(error_rate, 2),
                "warnings": warnings
            }
            
        except Exception as e:
            log_error_with_context("Application metrics check failed", {}, e)
            return {
                "status": "unknown",
                "error": str(e)
            }
    
    def record_request(self):
        """Record a request"""
        self.request_count += 1
    
    def record_error(self):
        """Record an error"""
        self.error_count += 1
    
    def record_response_time(self, response_time_ms: float):
        """Record response time for monitoring"""
        # For now, just log it - could be extended to track metrics
        logger.debug(f"Response time: {response_time_ms:.2f}ms")


class RequestMonitoringMiddleware:
    """Middleware for request monitoring"""
    
    def __init__(self, app, health_monitor: HealthMonitor):
        self.app = app
        self.health_monitor = health_monitor
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
            
        import time
        start_time = time.time()
        
        # Record request
        self.health_monitor.record_request()
        
        try:
            # Create response tracking
            response_sent = False
            response_status = 200
            
            async def send_wrapper(message):
                nonlocal response_sent, response_status
                if message["type"] == "http.response.start":
                    response_status = message["status"]
                await send(message)
                response_sent = True
            
            # Call the app
            await self.app(scope, receive, send_wrapper)
            
            # Record response time
            response_time = (time.time() - start_time) * 1000  # ms
            
            # Log slow requests
            if response_time > 5000:  # 5 seconds
                log_error_with_context(
                    "Slow request detected",
                    {
                        "response_time_ms": response_time,
                        "status_code": response_status,
                        "path": scope.get("path", "unknown")
                    }
                )
            
            # Record response time for monitoring
            self.health_monitor.record_response_time(response_time)
            
        except Exception as e:
            # Record error
            self.health_monitor.record_error()
            log_error_with_context(
                "Request monitoring error",
                {
                    "error": str(e),
                    "path": scope.get("path", "unknown"),
                    "response_time_ms": (time.time() - start_time) * 1000
                },
                e
            )
            raise


# Global health monitor instance
health_monitor = HealthMonitor()


async def get_health_status() -> Dict[str, Any]:
    """Get current health status"""
    return await health_monitor.check_system_health()


async def get_application_metrics() -> Dict[str, Any]:
    """Get application metrics"""
    return {
        "uptime_seconds": int(time.time() - health_monitor.start_time),
        "request_count": health_monitor.request_count,
        "error_count": health_monitor.error_count,
        "error_rate_percent": round((health_monitor.error_count / max(health_monitor.request_count, 1)) * 100, 2),
        "last_health_check": health_monitor.last_health_check.isoformat() if health_monitor.last_health_check else None,
        "health_status": health_monitor.health_status
    }


async def get_response_metrics() -> Dict[str, Any]:
    """Get response performance metrics"""
    return {
        "average_response_time_ms": 0,  # Would be calculated from request history
        "average_response_size_bytes": 0,  # Would be calculated from request history
        "compression_ratio": 0,  # Would be calculated from gzip compression
        "large_response_count": 0,  # Would be calculated from request history
        "slow_request_count": 0  # Would be calculated from request history
    }
