import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  serperApiKey: process.env.SERPER_API_KEY || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
};
