import { describe, it } from 'node:test';
import assert from 'node:assert';
import { retry } from '../../src/utils/retry.js';

describe('Retry Utility Unit Tests', () => {
  it('should return result immediately on first successful attempt', async () => {
    let callCount = 0;
    const result = await retry(async () => {
      callCount++;
      return 'success';
    }, 3, 10);

    assert.strictEqual(result, 'success');
    assert.strictEqual(callCount, 1);
  });

  it('should retry on failure and succeed if subsequent attempt succeeds', async () => {
    let callCount = 0;
    const result = await retry(async () => {
      callCount++;
      if (callCount < 2) {
        throw new Error('Temporary failure');
      }
      return 'recovered';
    }, 3, 10);

    assert.strictEqual(result, 'recovered');
    assert.strictEqual(callCount, 2);
  });

  it('should throw last error after reaching max attempts', async () => {
    let callCount = 0;
    await assert.rejects(
      async () => {
        await retry(async () => {
          callCount++;
          throw new Error('Persistent failure');
        }, 3, 10);
      },
      (err: Error) => {
        assert.strictEqual(err.message, 'Persistent failure');
        return true;
      }
    );

    assert.strictEqual(callCount, 3);
  });
});
