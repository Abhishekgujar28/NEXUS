import axios, { AxiosRequestConfig } from 'axios';
import dns from 'node:dns/promises';
import net from 'node:net';
import { AppError, ErrorCodes } from '../core/errors.js';

const isPrivateIp = (ip: string): boolean => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true;
  }
  return false;
};

/**
 * SSRF-safe outbound fetch. Resolves the hostname and rejects private /
 * loopback / link-local ranges before making the request.
 */
export const safeFetch = async (url: string, options: AxiosRequestConfig = {}) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('Invalid URL', 400, ErrorCodes.VALIDATION_ERROR);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError('Only http/https URLs are allowed', 400, ErrorCodes.VALIDATION_ERROR);
  }
  if (net.isIP(parsed.hostname) && isPrivateIp(parsed.hostname)) {
    throw new AppError('Private addresses are not allowed', 403, ErrorCodes.FORBIDDEN);
  }
  try {
    const { address } = await dns.lookup(parsed.hostname);
    if (isPrivateIp(address)) {
      throw new AppError('Resolved to a private address', 403, ErrorCodes.FORBIDDEN);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Unable to resolve host', 400, ErrorCodes.VALIDATION_ERROR);
  }
  return axios({ url, timeout: 15000, ...options });
};
