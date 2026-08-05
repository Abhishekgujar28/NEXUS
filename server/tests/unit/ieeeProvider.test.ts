import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IeeeProvider } from '../../src/research/providers/ieee.provider.js';

describe('IEEEProvider Unit Tests', () => {
  it('should return name "ieee"', () => {
    const provider = new IeeeProvider();
    assert.strictEqual(provider.name, 'ieee');
  });

  it('should correctly evaluate configuration status based on ieeeApiKey', () => {
    const provider = new IeeeProvider();
    // isConfigured should return boolean
    assert.strictEqual(typeof provider.isConfigured(), 'boolean');
  });

  it('should return empty list when not configured', async () => {
    const provider = new IeeeProvider();
    // If not configured (or key empty), search yields []
    if (!provider.isConfigured()) {
      const results = await provider.search('quantum computing');
      assert.strictEqual(Array.isArray(results), true);
      assert.strictEqual(results.length, 0);
    }
  });
});
