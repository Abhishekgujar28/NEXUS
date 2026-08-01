import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import User from '../models/User.js';

export const verifyAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token =
      req.headers.authorization?.split(' ')[1] ||
      (req.query.token as string | undefined);
    if (!token) throw new AppError('No token provided', 401, ErrorCodes.UNAUTHORIZED);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded['userId']).select('-password -refreshToken');
    if (!user) throw new AppError('User not found', 401, ErrorCodes.UNAUTHORIZED);
    req.user = {
      _id: String(user._id),
      email: String(user.email),
      name: user.name ? String(user.name) : undefined,
    };
    req.auth = decoded;
    next();
  } catch (err) {
    if (err instanceof AppError && err.isOperational) return next(err);
    next(new AppError('Invalid token', 401, ErrorCodes.UNAUTHORIZED));
  }
};
