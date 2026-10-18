import os
from pydantic import BaseModel

def _load_env_file():
    """
    Lightweight, dependency-free .env file loader.
    Searches backend/ and project root for .env and populates os.environ if not already set.
    """
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.getcwd(), ".env"),
    ]
    for path in candidates:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    # Do not overwrite environment variables if already set explicitly in shell
                    if key not in os.environ:
                        os.environ[key] = val
            break

_load_env_file()

class AppSettings(BaseModel):
    app_name: str = "Sentinel AI"
    environment: str = os.getenv("SENTINEL_ENV", "LinuxONE Production Service")
    database_path: str = os.getenv("SENTINEL_DB_PATH", "sentinel_ai.db")
    host: str = os.getenv("SENTINEL_HOST", "0.0.0.0")
    port: int = int(os.getenv("SENTINEL_PORT", "8000"))
    secret_key: str = os.getenv("SECRET_KEY", "sentinel-ai-linuxone-shared-service-secret-key-32b")
    
    # Degraded mode toggle
    ai_service_online: bool = True
    ai_provider: str = os.getenv("AI_PROVIDER", "watsonx")
    
    # watsonx.ai
    watsonx_apikey: str = os.getenv("WATSONX_APIKEY", "")
    watsonx_url: str = os.getenv("WATSONX_URL", "https://eu-de.ml.cloud.ibm.com")
    watsonx_project_id: str = os.getenv("WATSONX_PROJECT_ID", "")
    watsonx_model_id: str = os.getenv("WATSONX_MODEL_ID", "granite-4-h-small")
    
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model_id: str = os.getenv("OPENAI_MODEL_ID", "gpt-4o-mini")
    
    # Anthropic
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_model_id: str = os.getenv("ANTHROPIC_MODEL_ID", "claude-3-5-sonnet-20241022")
    
    current_industry: str = "Banking"

settings = AppSettings()
