import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../src/api/auth';
import { database } from '../../src/services/Database';

describe('Auth API Contract Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  beforeEach(async () => {
    // Clean up test data
    await database.query('DELETE FROM users WHERE email LIKE $1', ['%contract-test%']);
  });

  afterEach(async () => {
    // Clean up test data
    await database.query('DELETE FROM users WHERE email LIKE $1', ['%contract-test%']);
  });

  describe('POST /api/auth/register', () => {
    const validRegistration = {
      username: 'contractuser',
      email: 'contract-test@example.com',
      password: 'password123'
    };

    it('should register user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistration)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'User created successfully',
        user: {
          username: validRegistration.username,
          email: validRegistration.email
        },
        token: expect.any(String)
      });

      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.createdAt).toBeDefined();
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser'
          // Missing email and password
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'missing_fields',
        message: 'Username, email, and password are required'
      });
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistration,
          password: '123' // Too short
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'weak_password',
        message: 'Password must be at least 6 characters long'
      });
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validRegistration)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistration,
          username: 'differentuser'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'registration_failed'
      });
    });

    it('should reject duplicate username registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validRegistration)
        .expect(201);

      // Duplicate username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistration,
          email: 'different-contract-test@example.com'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'registration_failed'
      });
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      username: 'loginuser',
      email: 'login-contract-test@example.com',
      password: 'password123'
    };

    beforeEach(async () => {
      // Register test user
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: {
          username: testUser.username,
          email: testUser.email
        },
        token: expect.any(String)
      });

      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.lastSeenAt).toBeDefined();
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email
          // Missing password
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'missing_credentials',
        message: 'Email and password are required'
      });
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'authentication_failed'
      });
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'authentication_failed'
      });
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;
    const testUser = {
      username: 'meuser',
      email: 'me-contract-test@example.com',
      password: 'password123'
    };

    beforeEach(async () => {
      // Register and get token
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      authToken = response.body.token;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          username: testUser.username,
          email: testUser.email
        }
      });

      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.lastSeenAt).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'no_token',
        message: 'No authentication token provided'
      });
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'invalid_token'
      });
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'no_token'
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    let authToken: string;
    const testUser = {
      username: 'refreshuser',
      email: 'refresh-contract-test@example.com',
      password: 'password123'
    };

    beforeEach(async () => {
      // Register and get token
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      authToken = response.body.token;
    });

    it('should refresh token with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ token: authToken })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Token refreshed successfully',
        token: expect.any(String),
        user: {
          username: testUser.username,
          email: testUser.email
        }
      });

      expect(response.body.token).not.toBe(authToken);
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'no_token',
        message: 'Token is required'
      });
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ token: 'invalid.token.here' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'refresh_failed'
      });
    });
  });
});