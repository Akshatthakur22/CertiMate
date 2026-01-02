import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # API Settings
    API_TITLE: str = "CertiMate API"
    API_VERSION: str = "1.0.0"
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # File Upload Settings
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: list = [".csv", ".zip", ".pdf"]
    UPLOAD_DIR: str = "uploads"
    
    # Tesseract OCR Settings
    TESSERACT_CMD: str = "/opt/homebrew/bin/tesseract"  # Homebrew path for macOS
    
    # Gmail API Settings
    # Note: OAuth token is passed from frontend, not stored here
    # For local development, you can use: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GMAIL_SCOPE: str = "https://www.googleapis.com/auth/gmail.send"
    
    # Logging Settings
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/certimate.log"
    
    class Config:
        env_file = ".env"


settings = Settings()
