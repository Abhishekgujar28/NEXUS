# NEXUS Backend Production Deployment Guide (Render)

This guide provides step-by-step instructions for deploying the **NEXUS Autonomous AI Research Copilot Backend** to [Render](https://render.com).

---

## 1. Architecture Overview

NEXUS uses a distributed multi-process architecture to decouple real-time HTTP/WebSocket requests from long-running autonomous research pipelines:

```
                      +-----------------------------+
                      |   Frontend Web Client       |
                      |   (Vite / React SPA)        |
                      +--------------+--------------+
                                     |
                                     | HTTPS / WSS
                                     v
                      +-----------------------------+
                      |   Render Web Service        |
                      |   (nexus-api)               |
                      |   Express + Socket.IO       |
                      +--------------+--------------+
                                     |
                                     | Job Queue & Pub/Sub
                                     v
                      +-----------------------------+
                      |   Render Redis Instance     |
                      |   (nexus-redis)             |
                      +--------------+--------------+
                                     |
                                     | BullMQ Dispatch
                                     v
                      +-----------------------------+
                      |   Render Background Worker  |
                      |   (nexus-research-worker)   |
                      |   Multi-Agent Orchestrator  |
                      +--------------+--------------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
              v                      v                      v
    +------------------+   +------------------+   +------------------+
    | MongoDB Atlas    |   | AI LLM Providers |   | Search Providers |
    | (Database)       |   | OpenRouter/Gemini|   | Serper/GitHub/.. |
    +------------------+   +------------------+   +------------------+
```

### Services Summary
1. **API Web Service (`nexus-api`)**: Handles user authentication, project CRUD, API requests, export downloads, and broadcasts real-time Socket.IO events.
2. **Background Worker (`nexus-research-worker`)**: Standalone, headless Node process running `ResearchOrchestrator` to execute search queries, AI analysis, component design, stress testing, and roadmap generation.
3. **Redis Instance (`nexus-redis`)**: High-throughput message broker used by BullMQ for background job queuing and Socket.IO Redis pub/sub.
4. **MongoDB Database (`MongoDB Atlas`)**: Remote managed database for persistence (`Project`, `ResearchJob`, `ResearchSource`, `EvidenceClaim`, `ExportArtifact`).

---

## 2. Prerequisites

Before starting deployment, prepare the following accounts and credentials:

- A [Render Account](https://dashboard.render.com).
- A GitHub repository containing the NEXUS codebase.
- A **MongoDB Atlas** cluster (or external managed MongoDB connection string).
- At least **one AI Provider API key** (e.g. `OPENROUTER_API_KEY` or `GEMINI_API_KEY`).
- At least **one Search Provider API key** (e.g. `SERPER_API_KEY` or `GITHUB_TOKEN`).
- Strong, random 32-character strings for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

---

## 3. Environment Variables Inventory

| Variable Name | Required | Service | Description | Example / Default |
|---|---|---|---|---|
| `NODE_ENV` | **Yes** | API & Worker | Runtime environment mode | `production` |
| `PORT` | **Auto** | API | Port set automatically by Render | `10000` |
| `FRONTEND_URL` | **Yes** | API | Allowed origin for CORS & WebSockets | `https://your-frontend.onrender.com` |
| `MONGODB_URI` | **Yes** | API & Worker | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/nexus` |
| `REDIS_URL` | **Yes** | API & Worker | Redis connection URL | `rediss://red-c1234:6379` |
| `JWT_SECRET` | **Yes** | API & Worker | Access token signing secret (min 32 chars) | `rand_32_char_secret_key_1234567890` |
| `JWT_REFRESH_SECRET` | **Yes** | API & Worker | Refresh token signing secret (min 32 chars) | `rand_32_char_refresh_key_987654321` |
| `DEFAULT_AI_PROVIDER` | No | API & Worker | Default LLM provider | `openrouter` |
| `OPENROUTER_API_KEY` | **Recommended** | API & Worker | OpenRouter API key | `sk-or-v1-...` |
| `GEMINI_API_KEY` | Optional | API & Worker | Google Gemini 1.5 Pro key | `AIzaSy...` |
| `OPENAI_API_KEY` | Optional | API & Worker | OpenAI GPT-4o key | `sk-...` |
| `ANTHROPIC_API_KEY` | Optional | API & Worker | Anthropic Claude key | `sk-ant-...` |
| `GROQ_API_KEY` | Optional | API & Worker | Groq Llama3 key | `gsk_...` |
| `DEEPSEEK_API_KEY` | Optional | API & Worker | DeepSeek R1 key | `sk-...` |
| `TOGETHER_API_KEY` | Optional | API & Worker | Together AI key | `...` |
| `SERPER_API_KEY` | **Recommended** | Worker | Serper Google Search API key | `a1b2c3...` |
| `GITHUB_TOKEN` | **Recommended** | Worker | GitHub Personal Access Token | `ghp_...` |
| `SEMANTIC_SCHOLAR_API_KEY` | Optional | Worker | Academic paper search key | `...` |
| `IEEE_XPLORE_API_KEY` | Optional | Worker | IEEE academic search key | `...` |
| `KROKI_URL` | Optional | API & Worker | Diagram rendering microservice URL | `https://kroki.io` |
| `VECTOR_STORE` | Optional | API & Worker | Vector store backend (`memory` or `chroma`) | `memory` |
| `RESEARCH_WORKER_CONCURRENCY` | Optional | Worker | Parallel jobs processed per worker instance | `2` |

---

## 4. MongoDB Database Setup (MongoDB Atlas)

1. Create a free or paid cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Database User with read/write access.
3. Under **Network Access**, add `0.0.0.0/0` (or Render's outbound IP addresses) to the IP Access List.
4. Copy the connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/nexus?retryWrites=true&w=majority
   ```
5. Set `MONGODB_URI` in your Render Environment Variables for both the **API Web Service** and **Background Worker**.

---

## 5. Redis Setup (Render Key-Value)

1. In Render Dashboard, click **New +** -> **Redis** (or Render Key-Value).
2. Name the instance `nexus-redis`.
3. Choose your preferred region (same region as your Web Service).
4. After creation, copy the **Internal Redis URL** (`redis://...`) or **External Connection String** (`rediss://...`).
5. Set `REDIS_URL` in both `nexus-api` and `nexus-research-worker`.

---

## 6. Render Deployment Option A: Using Render Blueprint (`render.yaml`)

NEXUS includes an automated Infrastructure Blueprint at the root of the repository (`render.yaml`).

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect `render.yaml` and provision 3 services:
   - `nexus-api` (Web Service)
   - `nexus-research-worker` (Background Worker)
   - `nexus-redis` (Redis Instance)
5. Fill in the missing environment variables (`MONGODB_URI`, `FRONTEND_URL`, `OPENROUTER_API_KEY`, etc.) when prompted.
6. Click **Apply**.

---

## 7. Render Deployment Option B: Manual Setup

### 7.1 Web Service (`nexus-api`)

1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `nexus-api`
   - **Environment**: `Node`
   - **Region**: Select your preferred region.
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: `https://your-frontend-domain.example`
   - `MONGODB_URI`: `<your-mongodb-atlas-uri>`
   - `REDIS_URL`: `<your-redis-url>`
   - `JWT_SECRET`: `<32-char-random-string>`
   - `JWT_REFRESH_SECRET`: `<different-32-char-random-string>`
   - `OPENROUTER_API_KEY`: `<your-key>`
   - `SERPER_API_KEY`: `<your-key>`
   - `GITHUB_TOKEN`: `<your-token>`
5. Click **Create Web Service**.

### 7.2 Background Worker (`nexus-research-worker`)

1. Click **New +** -> **Background Worker**.
2. Connect the same GitHub repository.
3. Configure settings:
   - **Name**: `nexus-research-worker`
   - **Environment**: `Node`
   - **Region**: Same region as `nexus-api`.
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run worker:prod`
4. Under **Environment Variables**, add the exact same database and provider keys:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<same-mongodb-atlas-uri>`
   - `REDIS_URL`: `<same-redis-url>`
   - `JWT_SECRET`: `<same-jwt-secret>`
   - `JWT_REFRESH_SECRET`: `<same-jwt-refresh-secret>`
   - `OPENROUTER_API_KEY`: `<your-key>`
   - `SERPER_API_KEY`: `<your-key>`
   - `GITHUB_TOKEN`: `<your-token>`
   - `RESEARCH_WORKER_CONCURRENCY`: `2`
5. Click **Create Background Worker**.

---

## 8. CORS & Socket.IO Configuration

- Set `FRONTEND_URL` on the API Web Service to match your deployed frontend (e.g. `https://nexus.example.com` or `https://your-app.onrender.com`).
- Socket.IO and Express CORS use `FRONTEND_URL` to restrict cross-origin access securely.
- Socket.IO works over HTTPS and WSS automatically on Render Web Services.

---

## 9. Provider Skip & Isolation Behavior

NEXUS is engineered to degrade gracefully when optional providers are not configured:
- If `GEMINI_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, or `IEEE_XPLORE_API_KEY` are not set, NEXUS automatically marks those providers as `skipped` without crashing the research run.
- As long as at least one search provider (such as `arXiv` or `Serper`) returns results, research jobs will execute to completion successfully.

---

## 10. Vector Storage (RAG) in Production

- By default, `VECTOR_STORE` is configured to `memory`.
- In-memory vector search runs directly in Node process memory during research runs, requiring no extra database deployment.
- If you run a persistent ChromaDB instance, set `VECTOR_STORE=chroma` and provide `CHROMA_URL`.

---

## 11. Export System (PDF, DOCX, Markdown, HTML, JSON)

- All export report generation (PDF, DOCX, Markdown, HTML, JSON) executes deterministically in memory.
- PDF exports use `pdfmake` and DOCX exports use `docx`.
- Diagram rendering calls Kroki (`https://kroki.io`). If Kroki is unreachable, diagram rendering times out in 3.5s and falls back gracefully to formatted text descriptions.

---

## 12. Verification & Testing Deployment

### Health Check Endpoint
To verify the API Web Service is operational:
```bash
curl https://nexus-api.onrender.com/health
```
Expected output:
```json
{"success":true,"data":{"status":"ok"}}
```

### Production Smoke Test Checklist
- [ ] `GET /health` returns HTTP 200 OK.
- [ ] User registration and login return valid JWT tokens.
- [ ] MongoDB connects successfully without timeout errors.
- [ ] Redis connects and BullMQ queues initialize cleanly.
- [ ] Research worker picks up queued jobs and streams progress over Socket.IO.
- [ ] Export endpoint (`GET /api/v1/export/:id/pdf?download=true`) downloads valid report files.
- [ ] No secret values, passwords, or API keys are exposed in application logs.

---

## 13. Security Checklist

1. **No Hardcoded Secrets**: Ensure `.env` is listed in `.gitignore` and never committed to git.
2. **JWT Secret Strength**: `JWT_SECRET` and `JWT_REFRESH_SECRET` must be distinct and at least 32 characters long.
3. **CORS Restriction**: Ensure `FRONTEND_URL` is set to your exact production domain.
4. **Database Security**: Protect MongoDB Atlas with strong user passwords and restricted IP rules.

---

## 14. Troubleshooting

- **MongoDB Connection Failure**: Check that `0.0.0.0/0` is permitted under Atlas Network Access and that `MONGODB_URI` contains correct credentials.
- **Redis Connection Error**: Ensure `REDIS_URL` uses `redis://` or `rediss://` format.
- **Worker Not Processing Jobs**: Verify `nexus-research-worker` has started and is connected to the exact same `REDIS_URL` and `MONGODB_URI` as `nexus-api`.
- **CORS Errors on Frontend**: Verify `FRONTEND_URL` on `nexus-api` matches the exact URL of the frontend (including `https://` without trailing slash).
