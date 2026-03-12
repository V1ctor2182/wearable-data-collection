#!/bin/bash
# Stop all services for the wearable data pipeline

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=== Stopping Wearable Data Pipeline ==="

# 1. Stop Vite dashboard
if [ -f /tmp/wearable-dashboard.pid ]; then
    PID=$(cat /tmp/wearable-dashboard.pid)
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null
        echo "[1/3] Dashboard stopped (PID $PID)"
    else
        echo "[1/3] Dashboard not running"
    fi
    rm -f /tmp/wearable-dashboard.pid
else
    echo "[1/3] No dashboard PID file"
fi

# 2. Stop FastAPI server
if [ -f /tmp/wearable-api.pid ]; then
    PID=$(cat /tmp/wearable-api.pid)
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null
        echo "[2/3] API server stopped (PID $PID)"
    else
        echo "[2/3] API server not running"
    fi
    rm -f /tmp/wearable-api.pid
else
    echo "[2/3] No API PID file"
    # Try to find and kill uvicorn
    pkill -f "scripts/run_server.py" 2>/dev/null && echo "  Killed orphan uvicorn" || true
fi

# 3. Stop PostgreSQL (Docker)
echo "[3/3] Stopping PostgreSQL..."
docker-compose down

echo ""
echo "=== All services stopped ==="
