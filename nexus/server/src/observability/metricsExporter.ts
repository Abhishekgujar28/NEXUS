import { Request, Response } from 'express';
import { MetricsRegistry } from './metrics.js';
import { CircuitBreakerRegistry } from '../circuit-breaker/CircuitBreakerRegistry.js';

export const metricsExporterHandler = (_req: Request, res: Response): void => {
  const circuitStatus = CircuitBreakerRegistry.getStatus();
  circuitStatus.forEach((cb) => {
    MetricsRegistry.setGauge('circuit_breaker_state', cb.state === 'CLOSED' ? 0 : cb.state === 'HALF_OPEN' ? 1 : 2, {
      name: cb.name,
      type: cb.type,
    });
  });

  const summary = MetricsRegistry.getMetricsSummary();
  res.json({
    success: true,
    data: summary,
  });
};
