import { verifyToken } from '../utils/jwt.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import User from '../models/User.js';

export const verifyAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new AppError('No token provided', 401, ErrorCodes.UNAUTHORIZED);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    if (!user) throw new AppError('User not found', 401, ErrorCodes.UNAUTHORIZED);
    req.user = user;
    next();
  } catch (err) {
    if (err.isOperational) return next(err);
    next(new AppError('Invalid token', 401, ErrorCodes.UNAUTHORIZED));
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = verifyToken(token);
      req.user = await User.findById(decoded.userId).select('-password -refreshToken');
    }
  } catch {}
  next();
};
