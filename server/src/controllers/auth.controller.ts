import { Request, Response } from 'express';
import User from '../models/User.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';

const toAuthResponse = (user: { _id: string; email: string; name?: string }, accessToken: string, refreshToken: string) => ({
  success: true,
  data: {
    user,
    accessToken,
    refreshToken,
  },
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const exists = await User.findOne({ email });
  if (exists) {
    throw new AppError('Email already in use', 409, ErrorCodes.CONFLICT);
  }

  const user = await User.create({ name, email, password });
  const accessToken = generateAccessToken({ userId: String(user._id), email: user.email as string });
  const refreshToken = generateRefreshToken({ userId: String(user._id) });
  user.refreshToken = refreshToken;
  await user.save();

  res.status(201).json(
    toAuthResponse(
      {
        _id: String(user._id),
        email: String(user.email),
        name: user.name ? String(user.name) : undefined,
      },
      accessToken,
      refreshToken
    )
  );
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401, ErrorCodes.UNAUTHORIZED);
  }

  const validPassword = await user.comparePassword(password);
  if (!validPassword) {
    throw new AppError('Invalid email or password', 401, ErrorCodes.UNAUTHORIZED);
  }

  const accessToken = generateAccessToken({ userId: String(user._id), email: String(user.email) });
  const refreshToken = generateRefreshToken({ userId: String(user._id) });
  user.refreshToken = refreshToken;
  await user.save();

  res.json(
    toAuthResponse(
      {
        _id: String(user._id),
        email: String(user.email),
        name: user.name ? String(user.name) : undefined,
      },
      accessToken,
      refreshToken
    )
  );
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // Authenticated logout: revoke the current user's refresh token server-side.
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });
  }
  res.json({ success: true, data: { message: 'Logged out' } });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = (req.body as { refreshToken?: string }).refreshToken;
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400, ErrorCodes.VALIDATION_ERROR);
  }

  const decoded = verifyToken(refreshToken, true);
  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401, ErrorCodes.UNAUTHORIZED);
  }

  const nextRefreshToken = generateRefreshToken({ userId: String(user._id) });
  user.refreshToken = nextRefreshToken;
  await user.save();

  const accessToken = generateAccessToken({ userId: String(user._id), email: String(user.email) });
  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken: nextRefreshToken,
    },
  });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
};
