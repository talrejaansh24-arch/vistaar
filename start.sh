#!/usr/bin/env bash
set -e

echo "======================================"
echo " VistaarWater - Starting Backend Server"
echo "======================================"

cd backend

# Render sets PORT env variable. Default to 8000 for local dev.
PORT="${PORT:-8000}"

echo ">>> Starting FastAPI on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
