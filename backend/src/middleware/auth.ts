import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    email: string;
  };
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromAuth(authHeader);

    if (!token) {
      res.status(401).json({
        error: 'no_token',
        message: 'No authentication token provided'
      });
      return;
    }

    const decoded = authService.verifyToken(token);
    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      res.status(401).json({
        error: 'user_not_found',
        message: 'User not found'
      });
      return;
    }

    // Attach user info to request
    (req as AuthenticatedRequest).user = {
      userId: user.id,
      username: user.username,
      email: user.email
    };

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({
      error: 'authentication_failed',
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
};

export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromAuth(authHeader);

    if (token) {
      const decoded = authService.verifyToken(token);
      const user = await authService.getUserById(decoded.userId);

      if (user) {
        (req as AuthenticatedRequest).user = {
          userId: user.id,
          username: user.username,
          email: user.email
        };
      }
    }

    next();

  } catch (error) {
    // For optional auth, we don't fail the request if auth fails
    // Just continue without user info
    next();
  }
};