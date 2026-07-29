import axios from 'axios';
import { AppError, ErrorCodes } from '../core/errors.js';

const PRIVATE_IP_REGEX = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|::1|localhost)/i;

export const safeFetch = async (url, options = {}) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('Invalid URL', 400, ErrorCodes.VALIDATION_ERROR);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError('Only http/https allowed', 400, ErrorCodes.VALIDATION_ERROR);
  }
  if (PRIVATE_IP_REGEX.test(parsed.hostname)) {
    throw new AppError('Private IP addresses are not allowed', 403, ErrorCodes.FORBIDDEN);
  }
  return axios({ url, ...options });
};
