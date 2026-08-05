import { logger } from '../core/logger.js';
import { ProviderMetricsLog } from '../models/ProviderMetricsLog.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  providerType: 'ai' | 'search';
  failureThreshold?: number; // Failure percentage (e.g. 50%)
  minRequests?: number; // Min calls before trip evaluation
  resetTimeoutMs?: number; // Time in OPEN state before trying HALF_OPEN
  halfOpenSuccessThreshold?: number; // Successes in HALF_OPEN to CLOSE
}

export class CircuitBreaker {
  public name: string;
  public providerType: 'ai' | 'search';
  private state: CircuitState = 'CLOSED';
  private failureThreshold: number;
  private minRequests: number;
  private resetTimeoutMs: number;
  private halfOpenSuccessThreshold: number;

  private failures = 0;
  private successes = 0;
  private totalRequests = 0;
  private halfOpenSuccesses = 0;
  private nextAttempt: number = Date.now();

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.providerType = options.providerType;
    this.failureThreshold = options.failureThreshold ?? 50;
    this.minRequests = options.minRequests ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.halfOpenSuccesses = 0;
      logger.info(`CircuitBreaker [${this.name}] transitioned OPEN -> HALF_OPEN (probing)`);
      this.logTelemetry('HALF_OPEN');
    }
    return this.state;
  }

  public async execute<T>(
    action: () => Promise<T>,
    fallbackAction?: (err: Error) => Promise<T>
  ): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      const openErr = new Error(`CircuitBreaker [${this.name}] is OPEN (failing fast)`);
      logger.warn(openErr.message);
      if (fallbackAction) {
        return fallbackAction(openErr);
      }
      throw openErr;
    }

    const start = Date.now();
    try {
      const result = await action();
      const durationMs = Date.now() - start;
      this.onSuccess(durationMs);
      return result;
    } catch (err) {
      const error = err as Error;
      this.onFailure(error);
      if (fallbackAction) {
        logger.info(`CircuitBreaker [${this.name}] executing fallback route`, { error: error.message });
        return fallbackAction(error);
      }
      throw error;
    }
  }

  private onSuccess(durationMs: number): void {
    this.totalRequests++;
    this.successes++;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.halfOpenSuccessThreshold) {
        this.state = 'CLOSED';
        this.resetCounters();
        logger.info(`CircuitBreaker [${this.name}] transitioned HALF_OPEN -> CLOSED (recovered)`);
        this.logTelemetry('CLOSED', durationMs);
      }
    }
  }

  private onFailure(error: Error): void {
    this.totalRequests++;
    this.failures++;

    logger.warn(`CircuitBreaker [${this.name}] recorded failure`, {
      failures: this.failures,
      total: this.totalRequests,
      error: error.message,
    });

    if (this.state === 'HALF_OPEN') {
      this.tripOpen(error.message);
      return;
    }

    if (this.totalRequests >= this.minRequests) {
      const failureRate = (this.failures / this.totalRequests) * 100;
      if (failureRate >= this.failureThreshold) {
        this.tripOpen(error.message);
      }
    }
  }

  private tripOpen(reason: string): void {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.resetTimeoutMs;
    logger.error(`CircuitBreaker [${this.name}] TRIPPED -> OPEN for ${this.resetTimeoutMs}ms`, { reason });
    this.logTelemetry('OPEN', undefined, reason);
  }

  private resetCounters(): void {
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.halfOpenSuccesses = 0;
  }

  private async logTelemetry(state: CircuitState, latencyMs?: number, reason?: string): Promise<void> {
    try {
      await ProviderMetricsLog.create({
        providerName: this.name,
        providerType: this.providerType,
        state,
        failures: this.failures,
        successes: this.successes,
        lastFailureReason: reason,
        latencyMs,
        timestamp: new Date(),
      });
    } catch (err) {
      // Non-blocking telemetry log
    }
  }
}
