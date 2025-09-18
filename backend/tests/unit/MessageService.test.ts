import { messageService } from '../../src/services/MessageService';
import { roomService } from '../../src/services/RoomService';
import { authService } from '../../src/services/AuthService';
import { database } from '../../src/services/Database';

describe('MessageService', () => {
  let testUser: any;
  let testRoom: any;

  beforeEach(async () => {
    // Create test user
    testUser = await authService.createUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // Create test room
    testRoom = await roomService.createRoom({
      id: 'test-room',
      name: 'Test Room',
      description: 'A room for testing',
      type: 'public'
    }, testUser.id);

    // Add user to room
    await roomService.joinRoom(testUser.id, testRoom.id);
  });

  afterEach(async () => {
    // Clean up test data
    await database.query('DELETE FROM messages WHERE room_id = $1', [testRoom.id]);
    await database.query('DELETE FROM room_memberships WHERE room_id = $1', [testRoom.id]);
    await database.query('DELETE FROM chat_rooms WHERE id = $1', [testRoom.id]);
    await database.query('DELETE FROM users WHERE id = $1', [testUser.id]);
  });

  describe('createMessage', () => {
    it('should create a new message successfully', async () => {
      const messageData = {
        roomId: testRoom.id,
        userId: testUser.id,
        content: 'Hello, world!',
        type: 'text' as const
      };

      const message = await messageService.createMessage(messageData);

      expect(message).toMatchObject({
        roomId: testRoom.id,
        userId: testUser.id,
        content: 'Hello, world!',
        type: 'text'
      });
      expect(message.id).toBeDefined();
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it('should create system message', async () => {
      const messageData = {
        roomId: testRoom.id,
        userId: testUser.id,
        content: 'User joined the room',
        type: 'system' as const
      };

      const message = await messageService.createMessage(messageData);

      expect(message.type).toBe('system');
      expect(message.content).toBe('User joined the room');
    });

    it('should reject message for non-member user', async () => {
      // Create another user not in the room
      const otherUser = await authService.createUser({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      });

      try {
        await expect(messageService.createMessage({
          roomId: testRoom.id,
          userId: otherUser.id,
          content: 'Hello',
          type: 'text'
        })).rejects.toThrow('User is not a member of this room');
      } finally {
        await database.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
      }
    });
  });

  describe('getMessageHistory', () => {
    beforeEach(async () => {
      // Create test messages
      const messages = [
        'First message',
        'Second message',
        'Third message'
      ];

      for (const content of messages) {
        await messageService.createMessage({
          roomId: testRoom.id,
          userId: testUser.id,
          content,
          type: 'text'
        });
      }
    });

    it('should return message history for room member', async () => {
      const history = await messageService.getMessageHistory(
        testRoom.id,
        testUser.id,
        10
      );

      expect(history.messages).toHaveLength(3);
      expect(history.messages[0].content).toBe('First message');
      expect(history.messages[2].content).toBe('Third message');
      expect(history.hasMore).toBe(false);
    });

    it('should respect limit parameter', async () => {
      const history = await messageService.getMessageHistory(
        testRoom.id,
        testUser.id,
        2
      );

      expect(history.messages).toHaveLength(2);
      expect(history.hasMore).toBe(true);
      expect(history.nextCursor).toBeDefined();
    });

    it('should reject access for non-member', async () => {
      const otherUser = await authService.createUser({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      });

      try {
        await expect(messageService.getMessageHistory(
          testRoom.id,
          otherUser.id,
          10
        )).rejects.toThrow('User is not a member of this room');
      } finally {
        await database.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
      }
    });
  });

  describe('updateMessage', () => {
    let testMessage: any;

    beforeEach(async () => {
      testMessage = await messageService.createMessage({
        roomId: testRoom.id,
        userId: testUser.id,
        content: 'Original content',
        type: 'text'
      });
    });

    it('should update message by owner', async () => {
      const updatedMessage = await messageService.updateMessage(
        testMessage.id,
        testUser.id,
        { content: 'Updated content' }
      );

      expect(updatedMessage.content).toBe('Updated content');
      expect(updatedMessage.editedAt).toBeInstanceOf(Date);
    });

    it('should reject update by non-owner', async () => {
      const otherUser = await authService.createUser({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      });

      try {
        await expect(messageService.updateMessage(
          testMessage.id,
          otherUser.id,
          { content: 'Hacked content' }
        )).rejects.toThrow('Not authorized to edit this message');
      } finally {
        await database.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
      }
    });

    it('should reject update of non-existent message', async () => {
      await expect(messageService.updateMessage(
        '999999',
        testUser.id,
        { content: 'Updated content' }
      )).rejects.toThrow('Message not found');
    });
  });

  describe('deleteMessage', () => {
    let testMessage: any;

    beforeEach(async () => {
      testMessage = await messageService.createMessage({
        roomId: testRoom.id,
        userId: testUser.id,
        content: 'Message to delete',
        type: 'text'
      });
    });

    it('should delete message by owner', async () => {
      await messageService.deleteMessage(testMessage.id, testUser.id);

      const deletedMessage = await messageService.getMessageById(testMessage.id);
      expect(deletedMessage?.content).toBe('[Message deleted]');
      expect(deletedMessage?.type).toBe('system');
    });

    it('should allow admin to delete any message', async () => {
      await messageService.deleteMessage(testMessage.id, testUser.id, true);

      const deletedMessage = await messageService.getMessageById(testMessage.id);
      expect(deletedMessage?.content).toBe('[Message deleted]');
    });

    it('should reject deletion by non-owner', async () => {
      const otherUser = await authService.createUser({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      });

      try {
        await expect(messageService.deleteMessage(
          testMessage.id,
          otherUser.id
        )).rejects.toThrow('Not authorized to delete this message');
      } finally {
        await database.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
      }
    });
  });

  describe('getMessageById', () => {
    let testMessage: any;

    beforeEach(async () => {
      testMessage = await messageService.createMessage({
        roomId: testRoom.id,
        userId: testUser.id,
        content: 'Test message',
        type: 'text'
      });
    });

    it('should return message with user info', async () => {
      const message = await messageService.getMessageById(testMessage.id);

      expect(message).toMatchObject({
        id: testMessage.id,
        content: 'Test message',
        user: {
          id: testUser.id,
          username: testUser.username
        }
      });
    });

    it('should return null for non-existent message', async () => {
      const message = await messageService.getMessageById('999999');
      expect(message).toBeNull();
    });
  });
});