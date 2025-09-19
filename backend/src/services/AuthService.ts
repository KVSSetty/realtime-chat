import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { database } from './Database';
import { User, CreateUserData, UserSession } from '../models';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  async createUser(userData: CreateUserData): Promise<User> {
    const { username, email, password } = userData;

    // Check if user already exists
    const existing = await database.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await database.query(`
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at, last_seen_at
    `, [username, email, passwordHash]);

    const user = result.rows[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash,
      createdAt: user.created_at,
      lastSeenAt: user.last_seen_at
    };
  }

  async authenticateUser(credentials: LoginCredentials): Promise<UserSession> {
    const { email, password } = credentials;

    // Find user by email
    const result = await database.query(
      'SELECT id, username, email, password_hash, last_seen_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last seen
    await database.query(
      'UPDATE users SET last_seen_at = NOW() WHERE id = $1',
      [user.id]
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      lastSeenAt: new Date()
    };
  }

  generateToken(user: UserSession): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      username: user.username
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    } as jwt.SignOptions);
  }

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  async getUserById(userId: string): Promise<UserSession | null> {
    const result = await database.query(
      'SELECT id, username, email, last_seen_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      lastSeenAt: user.last_seen_at
    };
  }

  async updateLastSeen(userId: string): Promise<void> {
    await database.query(
      'UPDATE users SET last_seen_at = NOW() WHERE id = $1',
      [userId]
    );
  }

  extractTokenFromAuth(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

export const authService = new AuthService();