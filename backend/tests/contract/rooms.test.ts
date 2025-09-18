import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../src/api/auth';
import roomRoutes from '../../src/api/rooms';
import { database } from '../../src/services/Database';

describe('Rooms API Contract Tests', () => {
  let app: express.Application;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/rooms', roomRoutes);

    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'roomscontractuser',
        email: 'rooms-contract-test@example.com',
        password: 'password123'
      })
      .expect(201);

    authToken = userResponse.body.token;
    testUserId = userResponse.body.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await database.query('DELETE FROM room_memberships WHERE user_id = $1', [testUserId]);
    await database.query('DELETE FROM chat_rooms WHERE owner_id = $1', [testUserId]);
    await database.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  beforeEach(async () => {
    // Clean up test rooms before each test
    await database.query('DELETE FROM room_memberships WHERE user_id = $1', [testUserId]);
    await database.query('DELETE FROM chat_rooms WHERE owner_id = $1', [testUserId]);
  });

  describe('GET /api/rooms/public', () => {
    beforeEach(async () => {
      // Create test public rooms
      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'public-room-1',
          name: 'Public Room 1',
          description: 'First public room',
          type: 'public'
        });

      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'public-room-2',
          name: 'Public Room 2',
          type: 'public'
        });
    });

    it('should return public rooms', async () => {
      const response = await request(app)
        .get('/api/rooms/public')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        rooms: expect.any(Array),
        pagination: {
          limit: 20,
          offset: 0,
          hasMore: expect.any(Boolean)
        }
      });

      expect(response.body.rooms.length).toBeGreaterThanOrEqual(2);
      response.body.rooms.forEach((room: any) => {
        expect(room.type).toBe('public');
        expect(room).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          type: 'public',
          memberCount: expect.any(Number)
        });
      });
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/rooms/public?limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.rooms.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/rooms/public')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'no_token'
      });
    });
  });

  describe('GET /api/rooms/my', () => {
    beforeEach(async () => {
      // Create test rooms
      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'my-room-1',
          name: 'My Room 1',
          type: 'public'
        });
    });

    it('should return user\'s rooms', async () => {
      const response = await request(app)
        .get('/api/rooms/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        rooms: expect.any(Array)
      });

      expect(response.body.rooms.length).toBeGreaterThanOrEqual(1);
      response.body.rooms.forEach((room: any) => {
        expect(room.membership).toBeDefined();
        expect(room.membership.userId).toBe(testUserId);
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/rooms/my')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'no_token'
      });
    });
  });

  describe('POST /api/rooms', () => {
    it('should create public room with valid data', async () => {
      const roomData = {
        id: 'test-create-room',
        name: 'Test Create Room',
        description: 'A room for testing creation',
        type: 'public',
        settings: { allowGuests: true }
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roomData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Room created successfully',
        room: {
          id: roomData.id,
          name: roomData.name,
          description: roomData.description,
          type: roomData.type,
          ownerId: testUserId
        }
      });
    });

    it('should create private room', async () => {
      const roomData = {
        id: 'test-private-room',
        name: 'Test Private Room',
        type: 'private'
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roomData)
        .expect(201);

      expect(response.body.room.type).toBe('private');
    });

    it('should reject room creation with missing fields', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Incomplete Room'
          // Missing id and type
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'missing_fields',
        message: 'Room ID, name, and type are required'
      });
    });

    it('should reject invalid room type', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'invalid-type-room',
          name: 'Invalid Type Room',
          type: 'invalid'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'invalid_type',
        message: 'Room type must be public or private'
      });
    });

    it('should reject invalid room ID format', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'Invalid_Room_ID!',
          name: 'Invalid ID Room',
          type: 'public'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'invalid_room_id'
      });
    });

    it('should reject duplicate room ID', async () => {
      const roomData = {
        id: 'duplicate-room',
        name: 'Duplicate Room',
        type: 'public'
      };

      // First creation
      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roomData)
        .expect(201);

      // Duplicate creation
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roomData)
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'room_exists'
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .send({
          id: 'unauth-room',
          name: 'Unauthorized Room',
          type: 'public'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'no_token'
      });
    });
  });

  describe('GET /api/rooms/:roomId', () => {
    let testRoomId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'get-room-test',
          name: 'Get Room Test',
          description: 'Room for GET testing',
          type: 'public'
        })
        .expect(201);

      testRoomId = response.body.room.id;
    });

    it('should return room details for member', async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        room: {
          id: testRoomId,
          name: 'Get Room Test',
          description: 'Room for GET testing',
          type: 'public',
          membership: {
            userId: testUserId,
            role: 'owner'
          }
        }
      });
    });

    it('should return 404 for non-existent room', async () => {
      const response = await request(app)
        .get('/api/rooms/non-existent-room')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'room_not_found'
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoomId}`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'no_token'
      });
    });
  });

  describe('POST /api/rooms/:roomId/join', () => {
    let testRoomId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'join-room-test',
          name: 'Join Room Test',
          type: 'public'
        })
        .expect(201);

      testRoomId = response.body.room.id;

      // Leave the room so we can test joining
      await request(app)
        .post(`/api/rooms/${testRoomId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should join public room successfully', async () => {
      const response = await request(app)
        .post(`/api/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Successfully joined room',
        membership: {
          userId: testUserId,
          roomId: testRoomId,
          role: 'member'
        }
      });
    });

    it('should reject joining non-existent room', async () => {
      const response = await request(app)
        .post('/api/rooms/non-existent/join')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'join_failed'
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/rooms/${testRoomId}/join`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'no_token'
      });
    });
  });

  describe('POST /api/rooms/:roomId/leave', () => {
    let testRoomId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'leave-room-test',
          name: 'Leave Room Test',
          type: 'public'
        })
        .expect(201);

      testRoomId = response.body.room.id;
    });

    it('should leave room successfully', async () => {
      const response = await request(app)
        .post(`/api/rooms/${testRoomId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Successfully left room'
      });
    });

    it('should reject leaving room user is not member of', async () => {
      // First leave the room
      await request(app)
        .post(`/api/rooms/${testRoomId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to leave again
      const response = await request(app)
        .post(`/api/rooms/${testRoomId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'leave_failed'
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/rooms/${testRoomId}/leave`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'no_token'
      });
    });
  });

  describe('GET /api/rooms/:roomId/messages', () => {
    let testRoomId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'messages-room-test',
          name: 'Messages Room Test',
          type: 'public'
        })
        .expect(201);

      testRoomId = response.body.room.id;
    });

    it('should return message history for room member', async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        messages: expect.any(Array),
        hasMore: expect.any(Boolean)
      });
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoomId}/messages?limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages.length).toBeLessThanOrEqual(10);
    });

    it('should reject access for non-member', async () => {
      // Leave the room first
      await request(app)
        .post(`/api/rooms/${testRoomId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response = await request(app)
        .get(`/api/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'fetch_failed'
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoomId}/messages`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'no_token'
      });
    });
  });
});