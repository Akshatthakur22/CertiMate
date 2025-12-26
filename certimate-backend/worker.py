import os

# Fix for macOS fork() issue
os.environ['OBJC_DISABLE_INITIALIZE_FORK_SAFETY'] = 'YES'

from rq import Queue
from rq.worker import SimpleWorker
from app.core.queue import redis_conn

# Queues to listen on (priority order)
listen = ['high', 'default', 'email', 'low']

if __name__ == '__main__':
    print("Starting RQ Worker (SimpleWorker for macOS compatibility)...")
    print(f"Listening on queues: {listen}")

    # Create queue objects using redis_conn
    queues = [Queue(name, connection=redis_conn) for name in listen]

    # Use SimpleWorker instead of Worker to avoid fork() issues on macOS
    # SimpleWorker runs jobs in the same process instead of forking
    worker = SimpleWorker(queues, connection=redis_conn)
    worker.work()
