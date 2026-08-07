#!/usr/bin/env bash
set -e

echo "======================================"
echo " VistaarWater - Full Stack Build"
echo "======================================"

# ── Step 1: Build React frontend ──
echo ""
echo ">>> [1/2] Building React Frontend..."
cd frontend
npm install --frozen-lockfile
npm run build
echo ">>> Frontend build complete. Output: frontend/dist/"

# ── Step 2: Install Python backend dependencies ──
echo ""
echo ">>> [2/2] Installing Python backend dependencies..."
cd ../backend
pip install -r requirements.txt
echo ">>> Backend dependencies installed."

echo ""
echo "======================================"
echo " Build complete!"
echo "======================================"
