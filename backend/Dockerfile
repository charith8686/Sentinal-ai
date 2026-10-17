# Multi-architecture base image supporting linux/s390x (IBM Z / LinuxONE) and linux/amd64
FROM python:3.11-slim

WORKDIR /app

# Install system utilities if needed for s390x compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and sample data
COPY app/ ./app/

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    SENTINEL_HOST=0.0.0.0 \
    SENTINEL_PORT=8000 \
    SENTINEL_DB_PATH=/app/sentinel_ai.db

# Expose Sentinel AI API port (does not conflict with existing JupyterLab container on 8888)
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
