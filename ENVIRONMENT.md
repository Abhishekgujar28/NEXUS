# NEXUS Environment Variables Reference

## Quick Start

```bash
cp nexus/.env.example nexus/.env
# Edit nexus/.env with your actual values
```

## Variables

### Application

| Variable | Required | Default | Example | Description |
|----------|----------|---------|---------|-------------|
| `NODE_ENV` | Required | `development` | `production` | Node environment. Controls logging verbosity, error detail, and optimizations. |
| `PORT` | Optional | `5000` | `5000` | TCP port the Express server listens on. |
| `FRONTEND_URL` | Required | `http://localhost:5173` | `https://nexus.example.com` | Frontend origin used for CORS `Access-Control-Allow-Origin`. Must match exactly (no trailing slash). |

### Database

| Variable | Required | Default | Example | Description |
|----------|----------|---------|---------|-------------|
| `MONGODB_URI` | Required | — | `mongodb://localhost:27017/nexus` | MongoDB connection string. Include database name in the URI. **Never commit to git.** |
| `REDIS_URL` | Required | `redis://localhost:6379` | `redis://localhost:6379` | Redis connection string. Used for Bull job queues and session/token storage. |

### Authentication

| Variable | Required | Default | Example | Description |
|----------|----------|---------|---------|-------------|
| `JWT_SECRET` | Required | — | `a-long-random-string-min-32-chars` | HMAC secret for signing access tokens. **Minimum 32 characters. Use `openssl rand -hex 32`.** |
| `JWT_REFRESH_SECRET` | Required | — | `another-long-random-string` | HMAC secret for signing refresh tokens. **Must differ from `JWT_SECRET`.** |
| `JWT_EXPIRES_IN` | Optional | `15m` | `15m` | Access token lifetime. Short-lived for security. Accepts ms/zeit format (`15m`, `1h`). |
| `JWT_REFRESH_EXPIRES_IN` | Optional | `7d` | `7d` | Refresh token lifetime. Stored in httpOnly cookie. |

**Security notes for JWT secrets:**
- Generate with: `openssl rand -hex 32`
- Store only in `.env` (never in source code or version control)
- Rotate immediately if compromised — all existing tokens become invalid

### AI

| Variable | Required | Default | Example | Description |
|----------|----------|---------|---------|-------------|
| `GEMINI_API_KEY` | Required | — | `AIzaSy...` | Google Gemini API key. Used for text generation (gemini-1.5-pro) and embeddings (text-embedding-004). Restrict to server IPs in Google Cloud Console. |

### Research APIs

| Variable | Required | Default | Example | Description |
|----------|----------|---------|---------|-------------|
| `SERPER_API_KEY` | Required for web search | — | `abc123...` | Serper.dev API key for Google web search results. Without this, web search provider is disabled. |
| `GITHUB_TOKEN` | Optional | — | `ghp_...` | GitHub personal access token. Increases rate limit from 60 to 5000 req/hr. Use a fine-grained token with read-only public repository access. |
| `SEMANTIC_SCHOLAR_API_KEY` | Optional | — | `abc123...` | Semantic Scholar API key. Without it the API still works but at lower rate limits. |

### Vector Database

| Variable | Required | Default | Example | Description |
|----------|----------|---------|---------|-------------|
| `CHROMA_URL` | Required | `http://localhost:8000` | `http://localhost:8000` | ChromaDB HTTP server URL. Used for storing and querying document embeddings in the RAG pipeline. |

### Notifications (Optional)

| Variable | Required | Default | Example | Description |
|----------|----------|---------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Optional | — | `123456:ABC-DEF...` | Telegram bot token for push notifications. Leave empty to disable Telegram notifications. |

---

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET`: `openssl rand -hex 32`
- [ ] Generate strong `JWT_REFRESH_SECRET`: `openssl rand -hex 32` (different value)
- [ ] Set `FRONTEND_URL` to your actual frontend domain
- [ ] Use a MongoDB Atlas URI or secured self-hosted MongoDB with auth
- [ ] Use a secured Redis instance with a password (`redis://:password@host:6379`)
- [ ] Restrict `GEMINI_API_KEY` to server IP ranges in Google Cloud Console
- [ ] Ensure `.env` is in `.gitignore` and never committed

## Security Notes

- `.env` is listed in `.gitignore` — never remove it from there
- Rotate all secrets immediately if any are accidentally exposed
- Use environment variable injection (e.g., Docker secrets, AWS Secrets Manager, Vault) in production rather than `.env` files
- The `MONGODB_URI` and both JWT secrets are the most sensitive values — treat them like passwords
