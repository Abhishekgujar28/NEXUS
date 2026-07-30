import { AIProviderError } from './AIProvider.js';

/**
 * Inspect raw errors to construct a normalized AIProviderError with 429 & Retry-After info.
 */
export const parseAIError = (err: unknown, provider: string, model?: string): AIProviderError => {
  if (err instanceof AIProviderError) {
    return err;
  }

  const errorObj = err as any;
  const message = errorObj?.message || String(err);

  let statusCode: number | undefined = errorObj?.status || errorObj?.statusCode || errorObj?.response?.status;
  if (!statusCode) {
    if (/429|RESOURCE_EXHAUSTED|Quota exceeded|Too Many Requests/i.test(message)) {
      statusCode = 429;
    } else if (/404|not found/i.test(message)) {
      statusCode = 404;
    }
  }

  const isQuotaError = statusCode === 429 || /RESOURCE_EXHAUSTED|Quota exceeded|Too Many Requests/i.test(message);

  let retryDelayMs: number | undefined;

  // 1. Extract from headers if available
  const headers = errorObj?.response?.headers || errorObj?.headers;
  const retryHeader = headers?.['retry-after'] || headers?.['Retry-After'];
  if (retryHeader) {
    const parsed = parseInt(String(retryHeader), 10);
    if (!isNaN(parsed)) {
      retryDelayMs = parsed * 1000;
    }
  }

  // 2. Extract from error message strings (e.g. "retry after 15s", "in 20.5s", "retryAfter: 30s")
  if (!retryDelayMs) {
    const match = message.match(/(?:retry|wait|backoff|quota)\s*(?:after|in)?\s*(\d+(?:\.\d+)?)\s*s(?:econds?)?/i) ||
                  message.match(/(\d+(?:\.\d+)?)\s*seconds?/i);
    if (match) {
      retryDelayMs = Math.ceil(parseFloat(match[1]) * 1000);
    }
  }

  return new AIProviderError({
    provider,
    model,
    statusCode,
    retryDelayMs,
    isQuotaError,
    message,
    originalError: err,
  });
};
