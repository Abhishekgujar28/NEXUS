import 'dotenv/config';

const bool = (v: string | undefined): boolean => v === 'true' || v === '1';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt: {
    // No hardcoded fallbacks — validated at startup by validateConfig().
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  serperApiKey: process.env.SERPER_API_KEY || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  rag: {
    chunkSize: parseInt(process.env.RAG_CHUNK_SIZE || '1200'),
    chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || '150'),
    topK: parseInt(process.env.RAG_TOP_K || '8'),
    maxContextChars: parseInt(process.env.RAG_MAX_CONTEXT_CHARS || '12000'),
  },
  research: {
    workerConcurrency: parseInt(process.env.RESEARCH_WORKER_CONCURRENCY || '2'),
    jobAttempts: parseInt(process.env.RESEARCH_JOB_ATTEMPTS || '2'),
    providerTimeoutMs: parseInt(process.env.PROVIDER_TIMEOUT_MS || '15000'),
    maxSourcesPerProvider: parseInt(process.env.MAX_SOURCES_PER_PROVIDER || '10'),
  },
  copilot: {
    historyWindow: parseInt(process.env.COPILOT_HISTORY_WINDOW || '10'),
  },
  vectorStore: process.env.VECTOR_STORE || 'memory', // 'chroma' | 'memory'
} as const;

/**
 * Fail-fast validation of required environment. Called once at startup
 * (and by the worker) before anything security-sensitive runs.
 */
export const validateConfig = (): void => {
  const missing: string[] = [];
  if (!config.jwt.secret) missing.push('JWT_SECRET');
  if (!config.jwt.refreshSecret) missing.push('JWT_REFRESH_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Set them (see .env.example) before starting the server.`
    );
  }

  if (config.env === 'production') {
    if (config.jwt.secret.length < 32 || config.jwt.refreshSecret.length < 32) {
      throw new Error('JWT secrets must be at least 32 characters in production.');
    }
    if (config.jwt.secret === config.jwt.refreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must differ.');
    }
  }
};

export const providerStatus = {
  gemini: () => ({ name: 'Gemini', configured: !!config.geminiApiKey }),
  serper: () => ({ name: 'Serper', configured: !!config.serperApiKey }),
  github: () => ({ name: 'GitHub', configured: !!config.githubToken }),
  arxiv: () => ({ name: 'arXiv', configured: true }),
  semanticScholar: () => ({ name: 'Semantic Scholar', configured: true }),
};
