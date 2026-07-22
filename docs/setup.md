# Setup and Run Guide

This guide explains how to set up and run the OA Practice Platform locally on your machine.

## Prerequisites

Ensure you have the following installed on your system:
- **Node.js** (v18+ recommended) and **npm**
- **Go** (v1.20+ recommended)
- **PostgreSQL**
- **g++** (for C++ runner)
- **python3** (for Python runner)
- **goose** (for database migrations)
- **sqlc** (for Go query generation)

## 1. Database Setup

1. Start your local PostgreSQL instance.
2. Create a new database for the application (e.g., `oa_practice`).
   ```bash
   createdb oa_practice
   ```
3. Set your `DATABASE_URL` environment variable. You can do this by creating a `.env` file in the root of the `backend/` directory:
   ```env
   DATABASE_URL=postgres://username:password@localhost:5432/oa_practice?sslmode=disable
   PORT=8080
   ```
4. Run the database migrations using `goose`:
   ```bash
   cd database/migrations
   goose postgres "postgres://username:password@localhost:5432/oa_practice?sslmode=disable" up
   ```

*(Optional)* If you modify the queries in `database/queries/query.sql`, regenerate the Go repository code:
```bash
sqlc generate
```

## 2. Backend Setup

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Download dependencies:
   ```bash
   go mod download
   ```
3. Start the Go server:
   ```bash
   go run main.go
   ```
   The backend will start running on `http://localhost:8080`.

## 3. Frontend Setup

1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will start running on `http://localhost:5173`.

## 4. Usage

Once both the backend and frontend servers are running, simply open your browser and navigate to `http://localhost:5173`. The web application will communicate automatically with the local Go backend.

> **Note:** To test the C++ and Python runner features in the future, ensure `g++` and `python3` are correctly added to your system's PATH.
