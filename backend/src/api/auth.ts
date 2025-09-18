import { Router, Request, Response } from 'express';
import { authService } from '../services/AuthService';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'weak_password',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Create user
    const user = await authService.createUser({ username, email, password });
    const token = authService.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      lastSeenAt: user.lastSeenAt
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      error: 'registration_failed',
      message: error instanceof Error ? error.message : 'Failed to create user'
    });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'missing_credentials',
        message: 'Email and password are required'
      });
    }

    // Authenticate user
    const user = await authService.authenticateUser({ email, password });
    const token = authService.generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        lastSeenAt: user.lastSeenAt
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      error: 'authentication_failed',
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
});

// Verify token and get user info
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromAuth(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'no_token',
        message: 'No authentication token provided'
      });
    }

    const decoded = authService.verifyToken(token);
    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        lastSeenAt: user.lastSeenAt
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      error: 'invalid_token',
      message: error instanceof Error ? error.message : 'Invalid token'
    });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'no_token',
        message: 'Token is required'
      });
    }

    const decoded = authService.verifyToken(token);
    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found'
      });
    }

    // Generate new token
    const newToken = authService.generateToken(user);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        lastSeenAt: user.lastSeenAt
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'refresh_failed',
      message: error instanceof Error ? error.message : 'Failed to refresh token'
    });
  }
});

export default router;