FROM python:3.11-slim

LABEL maintainer="deliberateensemble.works"
LABEL description="Federation Game Engine - USS Chaosbringer"

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy game engine (uss-chaosbringer)
COPY uss-chaosbringer/ ./uss-chaosbringer/

# Copy API and frontend (copied flat by deploy.sh)
COPY game_api.py .
COPY frontend/ ./frontend/

# Create saves directory
RUN mkdir -p /tmp/federation_saves

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "game_api:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
