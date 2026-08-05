import { CircuitBreaker } from './CircuitBreaker.js';
import { logger } from '../core/logger.js';

class CircuitBreakerRegistryClass {
  private breakers: Map<string, CircuitBreaker> = new Map();

  public getOrCreate(name: string, providerType: 'ai' | 'search'): CircuitBreaker {
    const key = `${providerType}:${name.toLowerCase()}`;
    if (!this.breakers.has(key)) {
      const breaker = new CircuitBreaker({
        name,
        providerType,
        failureThreshold: 50,
        minRequests: 4,
        resetTimeoutMs: 30000,
      });
      this.breakers.set(key, breaker);
      logger.info(`Registered new CircuitBreaker: ${key}`);
    }
    return this.breakers.get(key)!;
  }

  public getStatus(): Array<{ name: string; type: string; state: string }> {
    const status: Array<{ name: string; type: string; state: string }> = [];
    this.breakers.forEach((breaker) => {
      status.push({
        name: breaker.name,
        type: breaker.providerType,
        state: breaker.getState(),
      });
    });
    return status;
  }
}

export const CircuitBreakerRegistry = new CircuitBreakerRegistryClass();
