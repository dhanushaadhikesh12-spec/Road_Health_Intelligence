#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "============================================================"
echo "      ROADGUARD AI — ROAD HEALTH INTELLIGENCE PLATFORM      "
echo "============================================================"

echo "[1/2] Starting FastAPI Backend on http://127.0.0.1:8001 ..."
cd "$DIR/backend"
if [ ! -d ".venv" ]; then
    /usr/bin/python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
fi
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

echo "[2/2] Starting Authority Dashboard on http://localhost:5173 ..."
cd "$DIR/dashboard"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev -- --port 5173 &
DASHBOARD_PID=$!

echo ""
echo "🚀 RoadGuard AI Services Live:"
echo "   • Backend API & Docs:   http://127.0.0.1:8001/docs"
echo "   • Authority Dashboard:  http://localhost:5173"
echo "   • Mobile App:           cd ../road-health-intelligence && npm start"
echo ""
echo "Press Ctrl+C to terminate all services."

trap "kill $BACKEND_PID $DASHBOARD_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
