import jwt from 'jsonwebtoken';
import { config } from '../core/config.js';

export const generateAccessToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

export const generateRefreshToken = (payload) =>
  jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });

export const verifyToken = (token, isRefresh = false) =>
  jwt.verify(token, isRefresh ? config.jwt.refreshSecret : config.jwt.secret);
