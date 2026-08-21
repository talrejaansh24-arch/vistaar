# ══════════════════════════════════════════════════════════════════════
# STAGE 1 — Build React Frontend
# Uses a Node image to install dependencies and compile the Vite app.
# The output (dist/) will be copied into the final Python image.
# ══════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Copy package files first for better Docker layer caching
COPY frontend/package.json frontend/package-lock.json ./

# Install all npm dependencies
RUN npm ci

# Copy the rest of the frontend source code
COPY frontend/ ./

# Accept Google Client ID as a build argument from Render
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build the production React app → outputs to /build/frontend/dist
RUN npm run build


# ══════════════════════════════════════════════════════════════════════
# STAGE 2 — Python FastAPI Backend (Final Image)
# This is the actual container that runs on Render / Docker.
# We copy the built React dist from Stage 1 into it.
# ══════════════════════════════════════════════════════════════════════
FROM python:3.12-slim AS final

# Prevent .pyc files and enable stdout logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies first (cached layer if requirements.txt unchanged)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the entire backend source code
COPY backend/ .

# Copy the compiled React frontend from Stage 1
# FastAPI's main.py will serve this as static files
COPY --from=frontend-builder /build/frontend/dist ./frontend_dist

# Expose the port (Render sets PORT env variable at runtime)
EXPOSE 8000

# Start FastAPI. Uses PORT env var set by Render, defaults to 8000 locally.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
