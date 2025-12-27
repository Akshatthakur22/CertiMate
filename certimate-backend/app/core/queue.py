import asyncio
from typing import Callable, Any, Dict
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# Simple in-memory task executor
class InMemoryQueue:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def enqueue(self, func: Callable, *args, **kwargs):
        """Execute a function in the background"""
        try:
            # Run the function in a thread pool
            future = self.executor.submit(func, *args, **kwargs)
            logger.info(f"Task {func.__name__} enqueued for background execution")
            return future
        except Exception as e:
            logger.error(f"Failed to enqueue task {func.__name__}: {e}")
            raise

# Create queue instances
q = InMemoryQueue()
email_queue = InMemoryQueue()
email_q = email_queue  # Alias for convenience
