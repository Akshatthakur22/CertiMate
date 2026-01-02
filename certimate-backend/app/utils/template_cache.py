"""
In-memory cache for template metadata and OCR results
Avoids repeated expensive operations on the same template
"""

import hashlib
import os
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class TemplateCache:
    """
    In-memory cache for template processing results
    Caches OCR results, placeholder positions, and metadata
    """
    
    def __init__(self, max_size: int = 100, ttl_hours: int = 24):
        """
        Initialize template cache
        
        Args:
            max_size: Maximum number of templates to cache
            ttl_hours: Time-to-live for cached entries in hours
        """
        self.max_size = max_size
        self.ttl_hours = ttl_hours
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._access_times: Dict[str, datetime] = {}
    
    def _get_cache_key(self, template_path: str) -> str:
        """
        Generate cache key for template
        
        Args:
            template_path: Path to template file
            
        Returns:
            Cache key based on file path and modification time
        """
        try:
            # Use file path and modification time for cache key
            mtime = os.path.getmtime(template_path)
            cache_data = f"{template_path}:{mtime}"
            return hashlib.md5(cache_data.encode()).hexdigest()
        except Exception as e:
            logger.error(f"Error generating cache key for {template_path}: {e}")
            # Fallback to path-only key
            return hashlib.md5(template_path.encode()).hexdigest()
    
    def _is_expired(self, cache_key: str) -> bool:
        """
        Check if cache entry is expired
        
        Args:
            cache_key: Cache key to check
            
        Returns:
            True if entry is expired
        """
        if cache_key not in self._access_times:
            return True
        
        age = datetime.now() - self._access_times[cache_key]
        return age > timedelta(hours=self.ttl_hours)
    
    def _evict_if_needed(self):
        """
        Evict oldest entries if cache is full
        """
        if len(self._cache) >= self.max_size:
            # Find least recently used entry
            oldest_key = min(self._access_times.keys(), 
                           key=lambda k: self._access_times[k])
            self._evict(oldest_key)
    
    def _evict(self, cache_key: str):
        """
        Remove entry from cache
        
        Args:
            cache_key: Cache key to remove
        """
        self._cache.pop(cache_key, None)
        self._access_times.pop(cache_key, None)
        logger.debug(f"Evicted cache entry: {cache_key}")
    
    def get(self, template_path: str) -> Optional[Dict[str, Any]]:
        """
        Get cached template data
        
        Args:
            template_path: Path to template file
            
        Returns:
            Cached data or None if not found/expired
        """
        cache_key = self._get_cache_key(template_path)
        
        # Check if entry exists and is not expired
        if cache_key in self._cache and not self._is_expired(cache_key):
            self._access_times[cache_key] = datetime.now()  # Update access time
            logger.debug(f"Cache hit for template: {template_path}")
            return self._cache[cache_key]
        
        # Remove expired entry if it exists
        if cache_key in self._cache:
            self._evict(cache_key)
        
        logger.debug(f"Cache miss for template: {template_path}")
        return None
    
    def set(self, template_path: str, data: Dict[str, Any]):
        """
        Cache template data
        
        Args:
            template_path: Path to template file
            data: Template data to cache
        """
        cache_key = self._get_cache_key(template_path)
        
        # Evict if needed
        self._evict_if_needed()
        
        # Cache the data
        self._cache[cache_key] = data
        self._access_times[cache_key] = datetime.now()
        
        logger.debug(f"Cached template data for: {template_path}")
    
    def invalidate(self, template_path: str):
        """
        Invalidate cache entry for template
        
        Args:
            template_path: Path to template file
        """
        cache_key = self._get_cache_key(template_path)
        self._evict(cache_key)
        logger.info(f"Invalidated cache for template: {template_path}")
    
    def clear(self):
        """Clear all cache entries"""
        self._cache.clear()
        self._access_times.clear()
        logger.info("Cleared all template cache entries")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics
        
        Returns:
            Dictionary with cache statistics
        """
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "ttl_hours": self.ttl_hours,
            "keys": list(self._cache.keys())
        }


# Global cache instance
_template_cache = TemplateCache()


def get_template_cache() -> TemplateCache:
    """
    Get the global template cache instance
    
    Returns:
        TemplateCache instance
    """
    return _template_cache


def cache_template_metadata(template_path: str, ocr_text: str, placeholders: Dict[str, Any], 
                          font_info: Dict[str, Any] = None) -> None:
    """
    Cache template metadata after processing
    
    Args:
        template_path: Path to template file
        ocr_text: Extracted OCR text
        placeholders: Detected placeholder positions
        font_info: Font information (optional)
    """
    cache = get_template_cache()
    
    data = {
        "template_path": template_path,
        "ocr_text": ocr_text,
        "placeholders": placeholders,
        "font_info": font_info or {},
        "cached_at": datetime.now().isoformat(),
        "file_size": os.path.getsize(template_path) if os.path.exists(template_path) else 0
    }
    
    cache.set(template_path, data)
    logger.info(f"Cached metadata for template: {template_path}")


def get_cached_template_metadata(template_path: str) -> Optional[Dict[str, Any]]:
    """
    Get cached template metadata
    
    Args:
        template_path: Path to template file
        
    Returns:
        Cached metadata or None if not found
    """
    cache = get_template_cache()
    return cache.get(template_path)


def invalidate_template_cache(template_path: str) -> None:
    """
    Invalidate cache for specific template
    
    Args:
        template_path: Path to template file
    """
    cache = get_template_cache()
    cache.invalidate(template_path)
