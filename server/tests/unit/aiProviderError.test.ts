import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseAIError } from '../../src/integrations/parseAIError.js';
import { AIProviderError } from '../../src/integrations/AIProvider.js';

describe('AI Provider Error & 429 Quota Detection Unit Tests', () => {
  it('should detect Gemini 429 quota error from status code and message', () => {
    const rawError = new Error(
      '[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent: [429 Too Many Requests] Resource has been exhausted (e.g. check quota).'
    );
    (rawError as any).status = 429;

    const parsed = parseAIError(rawError, 'Gemini', 'gemini-2.0-flash');

    assert.ok(parsed instanceof AIProviderError);
    assert.strictEqual(parsed.provider, 'Gemini');
    assert.strictEqual(parsed.model, 'gemini-2.0-flash');
    assert.strictEqual(parsed.statusCode, 429);
    assert.strictEqual(parsed.isQuotaError, true);
  });

  it('should detect retry-after delay from error message text in seconds', () => {
    const rawError = new Error(
      'Quota exceeded for quota metric Generate Content API requests per minute. Please retry after 15s.'
    );

    const parsed = parseAIError(rawError, 'Gemini', 'gemini-1.5-flash');

    assert.strictEqual(parsed.statusCode, 429);
    assert.strictEqual(parsed.isQuotaError, true);
    assert.strictEqual(parsed.retryDelayMs, 15000);
  });

  it('should extract retry-after delay from response headers', () => {
    const rawError = new Error('Rate limit exceeded');
    (rawError as any).response = {
      status: 429,
      headers: {
        'retry-after': '30',
      },
    };

    const parsed = parseAIError(rawError, 'Gemini', 'gemini-2.0-flash');

    assert.strictEqual(parsed.statusCode, 429);
    assert.strictEqual(parsed.isQuotaError, true);
    assert.strictEqual(parsed.retryDelayMs, 30000);
  });

  it('should detect 404 model not found error without marking as quota error', () => {
    const rawError = new Error('models/gemini-legacy is not found: 404 Not Found');

    const parsed = parseAIError(rawError, 'Gemini', 'gemini-legacy');

    assert.strictEqual(parsed.statusCode, 404);
    assert.strictEqual(parsed.isQuotaError, false);
    assert.strictEqual(parsed.retryDelayMs, undefined);
  });
});
