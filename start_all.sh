#!/bin/bash
# Start all services for the wearable data pipeline
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=== Wearable Data Pipeline ==="

# 1. Start PostgreSQL (Docker)
echo "[1/4] Starting PostgreSQL..."
docker-compose up -d
sleep 2

# 2. Create database if not exists (local PostgreSQL)
echo "[2/4] Ensuring database exists..."
if command -v createdb &>/dev/null; then
    createdb wearable_raw 2>/dev/null && echo "  Created database wearable_raw" || echo "  Database wearable_raw already exists"
fi

# 3. Init schema + start FastAPI
echo "[3/4] Starting FastAPI server on :8000..."
PYTHONPATH=src python3 scripts/init_db.py 2>/dev/null || true
PYTHONPATH=src nohup python3 scripts/run_server.py > /tmp/wearable-api.log 2>&1 &
echo $! > /tmp/wearable-api.pid
echo "  API PID: $(cat /tmp/wearable-api.pid)"

# 4. Start Vite dashboard
echo "[4/4] Starting Vite dashboard on :5173..."
cd dashboard
nohup npm run dev > /tmp/wearable-dashboard.log 2>&1 &
echo $! > /tmp/wearable-dashboard.pid
echo "  Dashboard PID: $(cat /tmp/wearable-dashboard.pid)"
cd ..

echo ""
echo "=== All services started ==="
echo "  API:       http://localhost:8000"
echo "  Dashboard: http://localhost:5173"
echo ""
echo "Logs:"
echo "  API:       tail -f /tmp/wearable-api.log"
echo "  Dashboard: tail -f /tmp/wearable-dashboard.log"
echo ""
echo "Stop with: ./stop_all.sh"
