# NEXUS AI Research Copilot - Server Infrastructure & Setup

This repository contains the backend server for NEXUS AI Research Copilot, powered by Express, MongoDB, Redis, and BullMQ for asynchronous background job processing.

## Prerequisites

Before running the server, ensure the following software is installed on your system:

- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local instance running on `mongodb://localhost:27017/nexus` or a MongoDB Atlas URI
- **Redis**: v6.0+ instance running on port 6379 (used for BullMQ job queue & caching)
- **Docker & Docker Desktop** (optional, recommended for quick local infrastructure setup)

---

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Verify or update Redis configuration variables in `.env`:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0
   REDIS_URL=redis://localhost:6379
   ```

---

## Redis Installation & Setup Options

### Option A: Docker Setup (Recommended)

1. Start Redis and Redis Commander using Docker Compose:
   ```bash
   docker compose up -d
   ```
2. Verify Redis container status:
   ```bash
   docker compose ps
   ```
3. Open Redis Commander Web UI (optional):
   Navigate to [http://localhost:8081](http://localhost:8081)

### Option B: Native Local Redis

#### Windows
- Install via WSL2 (`sudo apt install redis-server && sudo service redis-server start`) or Memurai/Redis Windows binary.

#### macOS
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

---

## Running the Server & Worker

### 1. Build TypeScript Source
```bash
npm run build
```

### 2. Start Background Research Worker
In a dedicated terminal tab/window:
```bash
npm run worker
```

### 3. Start Express API Server
In another terminal tab/window:
```bash
npm run dev
```

---

## Verifying Asynchronous Research Pipeline

1. **Queue Connection**:
   When `npm run dev` starts, you should see:
   ```
   Redis connected (localhost:6379)
   Server listening on port 5000
   ```

2. **Worker Connection**:
   When `npm run worker` starts, you should see:
   ```
   MongoDB Connected: localhost
   Research worker started (queue="research", concurrency=2)
   ```

3. **Enqueue Research Job**:
   Send a `POST` request to start research:
   ```http
   POST /api/v1/research/:projectId/start
   Authorization: Bearer <JWT_TOKEN>
   ```

4. **Job Execution**:
   The worker will receive the job payload from BullMQ, execute provider searches, and persist research sources.
