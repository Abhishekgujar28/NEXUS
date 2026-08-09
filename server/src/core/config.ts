import 'dotenv/config';

const bool = (v: string | undefined): boolean => v === 'true' || v === '1';

const cleanEnvKey = (v: string | undefined): string => {
  if (!v) return '';
  const trimmed = v.trim();
  if (/^(your-.*|change-this-.*|placeholder)$/i.test(trimmed)) return '';
  return trimmed;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    // No hardcoded fallbacks — validated at startup by validateConfig().
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  geminiApiKey: cleanEnvKey(process.env.GEMINI_API_KEY),
  defaultAiProvider: process.env.DEFAULT_AI_PROVIDER || 'openrouter',
  ai: {
    openrouter: {
      apiKey: cleanEnvKey(process.env.OPENROUTER_API_KEY),
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    },
    gemini: {
      apiKey: cleanEnvKey(process.env.GEMINI_API_KEY),
    },
    openai: {
      apiKey: cleanEnvKey(process.env.OPENAI_API_KEY),
    },
    anthropic: {
      apiKey: cleanEnvKey(process.env.ANTHROPIC_API_KEY),
    },
    groq: {
      apiKey: cleanEnvKey(process.env.GROQ_API_KEY),
    },
    deepseek: {
      apiKey: cleanEnvKey(process.env.DEEPSEEK_API_KEY),
    },
    together: {
      apiKey: cleanEnvKey(process.env.TOGETHER_API_KEY),
    },
  },
  serperApiKey: cleanEnvKey(process.env.SERPER_API_KEY),
  githubToken: cleanEnvKey(process.env.GITHUB_TOKEN),
  semanticScholarApiKey: cleanEnvKey(process.env.SEMANTIC_SCHOLAR_API_KEY),
  ieeeApiKey: cleanEnvKey(process.env.IEEE_XPLORE_API_KEY),
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

  if (isNaN(config.redis.port) || config.redis.port <= 0 || config.redis.port > 65535) {
    throw new Error(`Invalid REDIS_PORT: "${process.env.REDIS_PORT}". Must be a valid port number (1-65535).`);
  }

  if (config.redis.url && !/^rediss?:\/\//i.test(config.redis.url)) {
    throw new Error(`Invalid REDIS_URL format: "${config.redis.url}". Must start with redis:// or rediss://`);
  }

  if (config.env === 'production') {
    if (config.jwt.secret.length < 32 || config.jwt.refreshSecret.length < 32) {
      throw new Error('JWT secrets must be at least 32 characters in production.');
    }
    if (config.jwt.secret === config.jwt.refreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must differ.');
    }
    if (config.mongoUri.includes('localhost') || config.mongoUri.includes('127.0.0.1')) {
      throw new Error('In production, MONGODB_URI must point to a remote database (e.g. MongoDB Atlas), not localhost.');
    }
  }
};

export const providerStatus = {
  gemini: () => ({ name: 'Gemini', configured: !!config.geminiApiKey }),
  serper: () => ({ name: 'Serper', configured: !!config.serperApiKey }),
  github: () => ({ name: 'GitHub', configured: !!config.githubToken }),
  arxiv: () => ({ name: 'arXiv', configured: true }),
  semanticScholar: () => ({ name: 'Semantic Scholar', configured: !!config.semanticScholarApiKey }),
  ieee: () => ({ name: 'IEEE Xplore', configured: !!config.ieeeApiKey }),
};
