import jwt from 'jsonwebtoken';
import { config } from '../core/config.js';

export const generateAccessToken = (payload: { userId: string; email: string }) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] });

export const generateRefreshToken = (payload: { userId: string }) =>
  jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

export const verifyToken = (token: string, isRefresh = false) =>
  jwt.verify(token, isRefresh ? config.jwt.refreshSecret : config.jwt.secret) as jwt.JwtPayload;
