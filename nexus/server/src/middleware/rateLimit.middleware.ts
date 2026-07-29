import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
export const researchLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
