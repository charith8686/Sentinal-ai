import os
from pydantic import BaseModel

class AppSettings(BaseModel):
    app_name: str = "Sentinel AI"
    environment: str = "SIMULATED IBM Z (s390x / LinuxONE)"
    database_path: str = os.getenv("SENTINEL_DB_PATH", "sentinel_ai.db")
    host: str = os.getenv("SENTINEL_HOST", "0.0.0.0")
    port: int = int(os.getenv("SENTINEL_PORT", "8000"))
    
    # Degraded mode toggle (AI service simulated availability)
    ai_service_online: bool = True
    ai_provider: str = os.getenv("AI_PROVIDER", "watsonx.ai (Simulated Fallback)")
    
    # Current active reviewer profile
    current_reviewer: str = "Chief Compliance Officer (J. Vance - RACF SECADMIN)"
    current_industry: str = "Banking"

settings = AppSettings()
