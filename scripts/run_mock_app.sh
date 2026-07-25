#!/usr/bin/env bash

set -euo pipefail

# Find directory where the script lives
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

CONTAINER_NAME="oa-helper-postgres"

cleanup() {
    echo -e "\nStopping services..."

    # Kill background process trees gracefully
    if [[ -n "${BACKEND_PID:-}" ]]; then
        pkill -P "$BACKEND_PID" 2>/dev/null || kill "$BACKEND_PID" 2>/dev/null || true
    fi

    if [[ -n "${FRONTEND_PID:-}" ]]; then
        pkill -P "$FRONTEND_PID" 2>/dev/null || kill "$FRONTEND_PID" 2>/dev/null || true
    fi

    echo "Stopping container $CONTAINER_NAME..."
    podman stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "Starting PostgreSQL..."
podman start "$CONTAINER_NAME"

echo "Starting backend..."
(cd "$PROJECT_ROOT/backend" && go run main.go) &
BACKEND_PID=$!

echo "Starting frontend..."
(cd "$PROJECT_ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

echo "Application running..."

# Wait for both background processes to finish
wait $BACKEND_PID $FRONTEND_PID