import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Client from 'socket.io-client';
import { authService } from '../../src/services/AuthService';
import { roomService } from '../../src/services/RoomService';
import { database } from '../../src/services/Database';
import { redis } from '../../src/services/Redis';

describe('WebSocket Integration', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let clientSocket: any;
  let testUser: any;
  let testRoom: any;
  let authToken: string;

  beforeAll(async () => {
    // Create HTTP server and Socket.IO server
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: "*" }
    });

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, resolve);
    });

    // Create test user and room
    testUser = await authService.createUser({
      username: 'websocketuser',
      email: 'websocket@example.com',
      password: 'password123'
    });

    authToken = authService.generateToken({
      id: testUser.id,
      username: testUser.username,
      email: testUser.email,
      lastSeenAt: new Date()
    });

    testRoom = await roomService.createRoom({
      id: 'websocket-test-room',
      name: 'WebSocket Test Room',
      type: 'public'
    }, testUser.id);
  });

  afterAll(async () => {
    // Clean up
    await database.query('DELETE FROM room_memberships WHERE room_id = $1', [testRoom.id]);
    await database.query('DELETE FROM chat_rooms WHERE id = $1', [testRoom.id]);
    await database.query('DELETE FROM users WHERE id = $1', [testUser.id]);

    io.close();
    httpServer.close();
  });

  beforeEach(async () => {
    // Connect client before each test
    const port = httpServer.address()?.port;
    clientSocket = Client(`http://localhost:${port}`, {
      auth: { token: authToken },
      forceNew: true
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(() => {
    // Disconnect client after each test
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection', () => {
    it('should connect with valid token', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should reject connection with invalid token', (done) => {
      const invalidClient = Client(`http://localhost:${httpServer.address()?.port}`, {
        auth: { token: 'invalid.token.here' },
        forceNew: true
      });

      invalidClient.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        invalidClient.close();
        done();
      });

      invalidClient.on('connect', () => {
        invalidClient.close();
        done(new Error('Should not connect with invalid token'));
      });
    });
  });

  describe('Room Management', () => {
    it('should join room successfully', (done) => {
      clientSocket.emit('join_room', { roomId: testRoom.id });

      clientSocket.on('room_joined', (data: any) => {
        expect(data.roomId).toBe(testRoom.id);
        expect(data.roomName).toBe(testRoom.name);
        expect(data.recentMessages).toBeInstanceOf(Array);
        done();
      });

      clientSocket.on('join_room_error', (error: any) => {
        done(new Error(`Join room failed: ${error.message}`));
      });
    });

    it('should reject joining non-existent room', (done) => {
      clientSocket.emit('join_room', { roomId: 'non-existent-room' });

      clientSocket.on('join_room_error', (error: any) => {
        expect(error.error).toBe('join_failed');
        done();
      });

      clientSocket.on('room_joined', () => {
        done(new Error('Should not join non-existent room'));
      });
    });

    it('should leave room successfully', (done) => {
      // First join the room
      clientSocket.emit('join_room', { roomId: testRoom.id });

      clientSocket.on('room_joined', () => {
        // Then leave the room
        clientSocket.emit('leave_room', { roomId: testRoom.id });
      });

      clientSocket.on('room_left', (data: any) => {
        expect(data.roomId).toBe(testRoom.id);
        done();
      });

      clientSocket.on('leave_room_error', (error: any) => {
        done(new Error(`Leave room failed: ${error.message}`));
      });
    });
  });

  describe('Messaging', () => {
    beforeEach((done) => {
      // Join room before each messaging test
      clientSocket.emit('join_room', { roomId: testRoom.id });
      clientSocket.on('room_joined', () => done());
    });

    it('should send message successfully', (done) => {
      const messageContent = 'Test message from WebSocket';

      clientSocket.emit('send_message', {
        roomId: testRoom.id,
        content: messageContent,
        type: 'text'
      });

      clientSocket.on('message_sent', (data: any) => {
        expect(data.roomId).toBe(testRoom.id);
        expect(data.status).toBe('sent');
        expect(data.messageId).toBeDefined();
        done();
      });

      clientSocket.on('send_message_error', (error: any) => {
        done(new Error(`Send message failed: ${error.message}`));
      });
    });

    it('should reject empty message', (done) => {
      clientSocket.emit('send_message', {
        roomId: testRoom.id,
        content: '',
        type: 'text'
      });

      clientSocket.on('send_message_error', (error: any) => {
        expect(error.error).toBe('missing_required_fields');
        done();
      });

      clientSocket.on('message_sent', () => {
        done(new Error('Should not send empty message'));
      });
    });

    it('should broadcast message to other users in room', (done) => {
      // Create second client
      const secondClient = Client(`http://localhost:${httpServer.address()?.port}`, {
        auth: { token: authToken },
        forceNew: true
      });

      secondClient.on('connect', () => {
        // Join same room with second client
        secondClient.emit('join_room', { roomId: testRoom.id });
      });

      secondClient.on('room_joined', () => {
        // Send message from first client
        clientSocket.emit('send_message', {
          roomId: testRoom.id,
          content: 'Broadcast test message',
          type: 'text'
        });
      });

      // Second client should receive the message
      secondClient.on('message_received', (message: any) => {
        expect(message.content).toBe('Broadcast test message');
        expect(message.author.id).toBe(testUser.id);
        secondClient.close();
        done();
      });
    });
  });

  describe('Typing Indicators', () => {
    beforeEach((done) => {
      // Join room before each test
      clientSocket.emit('join_room', { roomId: testRoom.id });
      clientSocket.on('room_joined', () => done());
    });

    it('should broadcast typing indicator', (done) => {
      // Create second client to receive typing indicator
      const secondClient = Client(`http://localhost:${httpServer.address()?.port}`, {
        auth: { token: authToken },
        forceNew: true
      });

      secondClient.on('connect', () => {
        secondClient.emit('join_room', { roomId: testRoom.id });
      });

      secondClient.on('room_joined', () => {
        // Start typing from first client
        clientSocket.emit('start_typing', { roomId: testRoom.id });
      });

      secondClient.on('user_typing', (data: any) => {
        expect(data.userId).toBe(testUser.id);
        expect(data.username).toBe(testUser.username);
        expect(data.roomId).toBe(testRoom.id);
        secondClient.close();
        done();
      });
    });

    it('should broadcast stop typing indicator', (done) => {
      // Create second client
      const secondClient = Client(`http://localhost:${httpServer.address()?.port}`, {
        auth: { token: authToken },
        forceNew: true
      });

      secondClient.on('connect', () => {
        secondClient.emit('join_room', { roomId: testRoom.id });
      });

      secondClient.on('room_joined', () => {
        // Stop typing from first client
        clientSocket.emit('stop_typing', { roomId: testRoom.id });
      });

      secondClient.on('user_stopped_typing', (data: any) => {
        expect(data.userId).toBe(testUser.id);
        expect(data.roomId).toBe(testRoom.id);
        secondClient.close();
        done();
      });
    });
  });

  describe('Presence', () => {
    it('should update presence status', (done) => {
      clientSocket.emit('update_presence', {
        status: 'away',
        currentRoom: testRoom.id
      });

      clientSocket.on('presence_updated', (data: any) => {
        expect(data.status).toBe('away');
        done();
      });

      clientSocket.on('update_presence_error', (error: any) => {
        done(new Error(`Presence update failed: ${error.message}`));
      });
    });

    it('should reject invalid presence status', (done) => {
      clientSocket.emit('update_presence', {
        status: 'invalid_status'
      });

      clientSocket.on('update_presence_error', (error: any) => {
        expect(error.error).toBe('invalid_status');
        done();
      });

      clientSocket.on('presence_updated', () => {
        done(new Error('Should not accept invalid status'));
      });
    });
  });

  describe('Health Check', () => {
    it('should respond to ping with pong', (done) => {
      clientSocket.emit('ping');

      clientSocket.on('pong', (data: any) => {
        expect(data.timestamp).toBeDefined();
        expect(data.serverTime).toBeDefined();
        done();
      });
    });
  });
});