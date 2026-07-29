export const retry = async <T>(fn: () => Promise<T>, maxAttempts = 3, baseDelay = 500): Promise<T> => {
  let lastErr: unknown;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i - 1)));
      }
    }
  }
  throw lastErr;
};
