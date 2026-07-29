export const retry = async (fn, maxAttempts = 3, baseDelay = 500) => {
  let lastErr;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i - 1)));
      }
    }
  }
  throw lastErr;
};
