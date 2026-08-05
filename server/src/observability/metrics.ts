import { logger } from '../core/logger.js';

class MetricsRegistryClass {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();

  increment(metricName: string, value = 1, labels: Record<string, string> = {}): void {
    const key = this.formatKey(metricName, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  setGauge(metricName: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.formatKey(metricName, labels);
    this.gauges.set(key, value);
  }

  getMetricsSummary(): Record<string, any> {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      timestamp: new Date().toISOString(),
    };
  }

  private formatKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }
}

export const MetricsRegistry = new MetricsRegistryClass();
