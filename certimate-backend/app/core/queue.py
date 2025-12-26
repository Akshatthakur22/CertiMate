import os
import redis
from rq import Queue
from app.config import settings

# Initialize Redis connection
# Use environment variable or default to localhost
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
redis_conn = redis.from_url(redis_url)

# Initialize RQ Queues
# 'default' for normal tasks, 'high' for priority, 'low' for background
q = Queue('default', connection=redis_conn)
email_queue = Queue('email', connection=redis_conn)
email_q = email_queue  # Alias for convenience
