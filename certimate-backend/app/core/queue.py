import asyncio
from typing import Callable, Any, Dict, Optional
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from queue import Queue, Empty
from threading import Thread, Lock
import time
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Task:
    func: Callable
    args: tuple
    kwargs: dict
    task_id: str
    status: TaskStatus = TaskStatus.PENDING
    created_at: float = None
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    result: Any = None
    error: Optional[Exception] = None

class EnhancedQueue:
    def __init__(self, max_workers: int = 8, queue_size: int = 1000):
        self.max_workers = max_workers
        self.queue_size = queue_size
        self.task_queue = Queue(maxsize=queue_size)
        self.tasks: Dict[str, Task] = {}
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.worker_thread = None
        self.lock = Lock()
        self.running = False
        self._start_worker()
    
    def _start_worker(self):
        """Start the background worker thread"""
        if not self.running:
            self.running = True
            self.worker_thread = Thread(target=self._worker_loop, daemon=True)
            self.worker_thread.start()
            logger.info(f"Enhanced queue started with {self.max_workers} workers")
    
    def _worker_loop(self):
        """Background worker that processes tasks"""
        while self.running:
            try:
                task = self.task_queue.get(timeout=1)
                self._execute_task(task)
                self.task_queue.task_done()
            except Empty:
                continue
            except Exception as e:
                logger.error(f"Worker loop error: {e}")
    
    def _execute_task(self, task: Task):
        """Execute a single task"""
        with self.lock:
            task.status = TaskStatus.RUNNING
            task.started_at = time.time()
        
        try:
            future = self.executor.submit(task.func, *task.args, **task.kwargs)
            result = future.result(timeout=300)  # 5 minute timeout
            
            with self.lock:
                task.status = TaskStatus.COMPLETED
                task.completed_at = time.time()
                task.result = result
            
            logger.info(f"Task {task.task_id} completed in {task.completed_at - task.started_at:.2f}s")
            
        except Exception as e:
            with self.lock:
                task.status = TaskStatus.FAILED
                task.completed_at = time.time()
                task.error = e
            
            logger.error(f"Task {task.task_id} failed: {e}")
    
    def enqueue(self, func: Callable, *args, **kwargs) -> str:
        """Enqueue a task and return task ID"""
        task_id = f"task_{int(time.time() * 1000000)}_{len(self.tasks)}"
        
        task = Task(
            func=func,
            args=args,
            kwargs=kwargs,
            task_id=task_id,
            created_at=time.time()
        )
        
        with self.lock:
            self.tasks[task_id] = task
        
        try:
            self.task_queue.put(task, timeout=5)
            logger.info(f"Task {task_id} enqueued")
            return task_id
        except Exception as e:
            with self.lock:
                task.status = TaskStatus.FAILED
                task.error = e
            logger.error(f"Failed to enqueue task {task_id}: {e}")
            raise
    
    def get_task_status(self, task_id: str) -> Optional[Task]:
        """Get task status and details"""
        with self.lock:
            return self.tasks.get(task_id)
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        with self.lock:
            stats = {
                "queue_size": self.task_queue.qsize(),
                "total_tasks": len(self.tasks),
                "pending": sum(1 for t in self.tasks.values() if t.status == TaskStatus.PENDING),
                "running": sum(1 for t in self.tasks.values() if t.status == TaskStatus.RUNNING),
                "completed": sum(1 for t in self.tasks.values() if t.status == TaskStatus.COMPLETED),
                "failed": sum(1 for t in self.tasks.values() if t.status == TaskStatus.FAILED),
                "max_workers": self.max_workers
            }
        return stats
    
    def cleanup_completed_tasks(self, max_age: int = 3600):
        """Clean up completed tasks older than max_age seconds"""
        current_time = time.time()
        with self.lock:
            to_remove = []
            for task_id, task in self.tasks.items():
                if (task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED] and 
                    task.completed_at and 
                    current_time - task.completed_at > max_age):
                    to_remove.append(task_id)
            
            for task_id in to_remove:
                del self.tasks[task_id]
            
            if to_remove:
                logger.info(f"Cleaned up {len(to_remove)} old tasks")
    
    def shutdown(self):
        """Gracefully shutdown the queue"""
        self.running = False
        if self.worker_thread:
            self.worker_thread.join(timeout=5)
        self.executor.shutdown(wait=True)
        logger.info("Enhanced queue shutdown complete")

# Create optimized queue instances
q = EnhancedQueue(max_workers=6, queue_size=500)  # More workers for generation
email_queue = EnhancedQueue(max_workers=4, queue_size=200)  # Separate workers for email
email_q = email_queue  # Alias for convenience
