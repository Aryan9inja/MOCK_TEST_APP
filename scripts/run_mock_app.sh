#!/usr/bin/env bash

set -e

cleanup() {
    echo "Stopping services..."

    kill "$BACKEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true

    podman stop oa-helper >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "Starting PostgreSQL..."
podman start oa-helper-postgres 

echo "Starting backend..."
cd ../backend
go run cmd/main.go &
BACKEND_PID=$!

echo "Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Application running at http://localhost:5173"

wait