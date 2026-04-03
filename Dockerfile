FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2-dev libxslt1-dev gcc && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY src/ src/

RUN pip install --no-cache-dir .

ENV PORT=8000
EXPOSE 8000

CMD uvicorn wearable_pipeline.api.app:app --host 0.0.0.0 --port $PORT
