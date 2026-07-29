import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        name?: string;
      };
      auth?: JwtPayload;
      projectRole?: 'owner' | 'editor' | 'viewer';
    }
  }
}

export {};
