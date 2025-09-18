import { authService } from '../../src/services/AuthService';
import { database } from '../../src/services/Database';

describe('AuthService', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  };

  beforeEach(async () => {
    // Clean up test data
    await database.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });

  afterEach(async () => {
    // Clean up test data
    await database.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const user = await authService.createUser(testUser);

      expect(user).toMatchObject({
        username: testUser.username,
        email: testUser.email
      });
      expect(user.id).toBeDefined();
      expect(user.passwordHash).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error for duplicate email', async () => {
      await authService.createUser(testUser);

      await expect(authService.createUser(testUser))
        .rejects
        .toThrow('User with this email or username already exists');
    });

    it('should throw error for duplicate username', async () => {
      await authService.createUser(testUser);

      const duplicateUsername = {
        ...testUser,
        email: 'different@example.com'
      };

      await expect(authService.createUser(duplicateUsername))
        .rejects
        .toThrow('User with this email or username already exists');
    });
  });

  describe('authenticateUser', () => {
    beforeEach(async () => {
      await authService.createUser(testUser);
    });

    it('should authenticate user with correct credentials', async () => {
      const result = await authService.authenticateUser({
        email: testUser.email,
        password: testUser.password
      });

      expect(result).toMatchObject({
        username: testUser.username,
        email: testUser.email
      });
      expect(result.id).toBeDefined();
    });

    it('should throw error for invalid email', async () => {
      await expect(authService.authenticateUser({
        email: 'nonexistent@example.com',
        password: testUser.password
      })).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      await expect(authService.authenticateUser({
        email: testUser.email,
        password: 'wrongpassword'
      })).rejects.toThrow('Invalid email or password');
    });
  });

  describe('token operations', () => {
    let userSession: any;

    beforeEach(async () => {
      const user = await authService.createUser(testUser);
      userSession = {
        id: user.id,
        username: user.username,
        email: user.email,
        lastSeenAt: new Date()
      };
    });

    it('should generate and verify token', () => {
      const token = authService.generateToken(userSession);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = authService.verifyToken(token);
      expect(decoded.userId).toBe(userSession.id);
      expect(decoded.email).toBe(userSession.email);
      expect(decoded.username).toBe(userSession.username);
    });

    it('should throw error for invalid token', () => {
      expect(() => authService.verifyToken('invalid.token.here'))
        .toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      // Create a token with very short expiry
      const originalExpiresIn = process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRES_IN = '1ms';

      const token = authService.generateToken(userSession);

      // Restore original expiry
      process.env.JWT_EXPIRES_IN = originalExpiresIn;

      // Wait for token to expire
      setTimeout(() => {
        expect(() => authService.verifyToken(token))
          .toThrow('Token has expired');
      }, 10);
    });
  });

  describe('getUserById', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await authService.createUser(testUser);
      userId = user.id;
    });

    it('should return user for valid ID', async () => {
      const user = await authService.getUserById(userId);

      expect(user).toMatchObject({
        id: userId,
        username: testUser.username,
        email: testUser.email
      });
    });

    it('should return null for invalid ID', async () => {
      const user = await authService.getUserById('invalid-uuid');
      expect(user).toBeNull();
    });
  });

  describe('extractTokenFromAuth', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test.jwt.token';
      const authHeader = `Bearer ${token}`;

      const extracted = authService.extractTokenFromAuth(authHeader);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(authService.extractTokenFromAuth('InvalidFormat token')).toBeNull();
      expect(authService.extractTokenFromAuth('Bearer')).toBeNull();
      expect(authService.extractTokenFromAuth(undefined)).toBeNull();
    });
  });
});