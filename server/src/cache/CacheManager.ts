import { redis } from '../core/redis.js';
import { logger } from '../core/logger.js';
import { buildCacheKey, TTL_MAP } from './cacheKeys.js';

class L1MemoryCache {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private maxItems = 500;

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: string, value: any, ttlSeconds: number): void {
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

class CacheManagerClass {
  private l1 = new L1MemoryCache();

  async get<T>(namespace: string, payload: any): Promise<T | null> {
    const key = buildCacheKey(namespace, payload);

    // Check L1 In-Memory Cache
    const l1Hit = this.l1.get(key);
    if (l1Hit !== null) {
      logger.debug(`Cache L1 HIT: ${key}`);
      return l1Hit as T;
    }

    // Check L2 Redis Cache
    try {
      const data = await redis.get(key);
      if (data) {
        logger.debug(`Cache L2 Redis HIT: ${key}`);
        const parsed = JSON.parse(data);
        this.l1.set(key, parsed, 60); // Cache in L1 for 60s
        return parsed as T;
      }
    } catch (err) {
      logger.warn(`Redis get error for key ${key}`, { error: (err as Error).message });
    }

    logger.debug(`Cache MISS: ${key}`);
    return null;
  }

  async set(namespace: string, payload: any, value: any, ttlSeconds?: number): Promise<void> {
    const key = buildCacheKey(namespace, payload);
    const ttl = ttlSeconds ?? (TTL_MAP as any)[namespace.toUpperCase()] ?? 3600;

    // Set L1
    this.l1.set(key, value, Math.min(ttl, 300)); // L1 max 5 mins

    // Set L2 Redis
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
      logger.debug(`Cache SET ${key} (TTL: ${ttl}s)`);
    } catch (err) {
      logger.warn(`Redis set error for key ${key}`, { error: (err as Error).message });
    }
  }

  async delete(namespace: string, payload: any): Promise<void> {
    const key = buildCacheKey(namespace, payload);
    this.l1.delete(key);
    try {
      await redis.del(key);
    } catch (err) {
      logger.warn(`Redis del error for key ${key}`, { error: (err as Error).message });
    }
  }
}

export const CacheManager = new CacheManagerClass();
