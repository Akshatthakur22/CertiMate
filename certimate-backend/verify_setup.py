import os
import sys
from app.config import settings

def check_redis():
    print("Checking Redis connection...")
    try:
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))
        r.ping()
        print("✅ Redis connection successful")
        return True
    except redis.ConnectionError:
        print("❌ Redis connection failed. Is Redis running?")
        return False
    except Exception as e:
        print(f"❌ Redis error: {e}")
        return False

def check_directories():
    print("\nChecking directories...")
    required_dirs = [
        "app",
        "app/services",
        "app/core",
        "app/tasks",
        "jobs"
    ]
    all_exist = True
    for d in required_dirs:
        if os.path.exists(d):
            print(f"✅ Directory exists: {d}")
        else:
            print(f"❌ Directory missing: {d}")
            if d == "jobs":
                print("   (Will be created automatically, but good to check)")
            else:
                all_exist = False
    return all_exist

def check_files():
    print("\nChecking key files...")
    required_files = [
        "worker.py",
        "app/core/queue.py",
        "app/services/job_service.py",
        "app/tasks/generation_tasks.py"
    ]
    all_exist = True
    for f in required_files:
        if os.path.exists(f):
            print(f"✅ File exists: {f}")
        else:
            print(f"❌ File missing: {f}")
            all_exist = False
    return all_exist

if __name__ == "__main__":
    print("=== System Verification ===")
    redis_ok = check_redis()
    dirs_ok = check_directories()
    files_ok = check_files()
    
    if redis_ok and dirs_ok and files_ok:
        print("\n✅ System verification PASSED")
        sys.exit(0)
    else:
        print("\n❌ System verification FAILED")
        sys.exit(1)
