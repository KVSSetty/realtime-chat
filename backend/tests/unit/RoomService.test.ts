import { roomService } from '../../src/services/RoomService';
import { authService } from '../../src/services/AuthService';
import { database } from '../../src/services/Database';

describe('RoomService', () => {
  let testUser: any;
  let testUser2: any;

  beforeEach(async () => {
    // Create test users
    testUser = await authService.createUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    testUser2 = await authService.createUser({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });
  });

  afterEach(async () => {
    // Clean up test data
    await database.query('DELETE FROM room_memberships WHERE user_id IN ($1, $2)', [testUser.id, testUser2.id]);
    await database.query('DELETE FROM chat_rooms WHERE owner_id IN ($1, $2)', [testUser.id, testUser2.id]);
    await database.query('DELETE FROM users WHERE id IN ($1, $2)', [testUser.id, testUser2.id]);
  });

  describe('createRoom', () => {
    it('should create a public room successfully', async () => {
      const roomData = {
        id: 'test-room',
        name: 'Test Room',
        description: 'A test room',
        type: 'public' as const,
        settings: { allowGuests: true }
      };

      const room = await roomService.createRoom(roomData, testUser.id);

      expect(room).toMatchObject({
        id: 'test-room',
        name: 'Test Room',
        description: 'A test room',
        type: 'public',
        ownerId: testUser.id
      });
      expect(room.settings).toEqual({ allowGuests: true });
    });

    it('should create a private room successfully', async () => {
      const roomData = {
        id: 'private-room',
        name: 'Private Room',
        type: 'private' as const
      };

      const room = await roomService.createRoom(roomData, testUser.id);

      expect(room.type).toBe('private');
      expect(room.ownerId).toBe(testUser.id);
    });

    it('should automatically add creator as owner', async () => {
      const roomData = {
        id: 'owner-test-room',
        name: 'Owner Test',
        type: 'public' as const
      };

      await roomService.createRoom(roomData, testUser.id);

      // Check membership
      const result = await database.query(
        'SELECT role FROM room_memberships WHERE user_id = $1 AND room_id = $2',
        [testUser.id, 'owner-test-room']
      );

      expect(result.rows[0].role).toBe('owner');
    });
  });

  describe('getRoomById', () => {
    let testRoom: any;

    beforeEach(async () => {
      testRoom = await roomService.createRoom({
        id: 'get-test-room',
        name: 'Get Test Room',
        type: 'public'
      }, testUser.id);
    });

    it('should return room with membership info for member', async () => {
      const room = await roomService.getRoomById(testRoom.id, testUser.id);

      expect(room).toMatchObject({
        id: testRoom.id,
        name: 'Get Test Room',
        memberCount: 1
      });
      expect(room?.membership?.role).toBe('owner');
    });

    it('should return room without membership info for non-member', async () => {
      const room = await roomService.getRoomById(testRoom.id, testUser2.id);

      expect(room?.membership).toBeUndefined();
      expect(room?.memberCount).toBe(1);
    });

    it('should return null for non-existent room', async () => {
      const room = await roomService.getRoomById('non-existent', testUser.id);
      expect(room).toBeNull();
    });
  });

  describe('joinRoom', () => {
    let testRoom: any;

    beforeEach(async () => {
      testRoom = await roomService.createRoom({
        id: 'join-test-room',
        name: 'Join Test Room',
        type: 'public'
      }, testUser.id);
    });

    it('should allow user to join public room', async () => {
      const membership = await roomService.joinRoom(testUser2.id, testRoom.id);

      expect(membership).toMatchObject({
        userId: testUser2.id,
        roomId: testRoom.id,
        role: 'member'
      });
    });

    it('should prevent duplicate membership', async () => {
      await roomService.joinRoom(testUser2.id, testRoom.id);

      await expect(roomService.joinRoom(testUser2.id, testRoom.id))
        .rejects
        .toThrow('User is already a member of this room');
    });

    it('should reject joining non-existent room', async () => {
      await expect(roomService.joinRoom(testUser2.id, 'non-existent'))
        .rejects
        .toThrow('Room not found');
    });

    it('should reject joining private room without invitation', async () => {
      const privateRoom = await roomService.createRoom({
        id: 'private-join-test',
        name: 'Private Room',
        type: 'private'
      }, testUser.id);

      await expect(roomService.joinRoom(testUser2.id, privateRoom.id))
        .rejects
        .toThrow('Cannot join private room without invitation');
    });
  });

  describe('leaveRoom', () => {
    let testRoom: any;

    beforeEach(async () => {
      testRoom = await roomService.createRoom({
        id: 'leave-test-room',
        name: 'Leave Test Room',
        type: 'public'
      }, testUser.id);

      await roomService.joinRoom(testUser2.id, testRoom.id);
    });

    it('should allow member to leave room', async () => {
      await roomService.leaveRoom(testUser2.id, testRoom.id);

      const membership = await database.query(
        'SELECT id FROM room_memberships WHERE user_id = $1 AND room_id = $2',
        [testUser2.id, testRoom.id]
      );

      expect(membership.rows).toHaveLength(0);
    });

    it('should transfer ownership when owner leaves', async () => {
      // Owner leaves
      await roomService.leaveRoom(testUser.id, testRoom.id);

      // Check that testUser2 is now the owner
      const newOwnership = await database.query(
        'SELECT role FROM room_memberships WHERE user_id = $1 AND room_id = $2',
        [testUser2.id, testRoom.id]
      );

      expect(newOwnership.rows[0].role).toBe('owner');

      const roomOwner = await database.query(
        'SELECT owner_id FROM chat_rooms WHERE id = $1',
        [testRoom.id]
      );

      expect(roomOwner.rows[0].owner_id).toBe(testUser2.id);
    });

    it('should reject leaving room for non-member', async () => {
      const otherUser = await authService.createUser({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      });

      try {
        await expect(roomService.leaveRoom(otherUser.id, testRoom.id))
          .rejects
          .toThrow('User is not a member of this room');
      } finally {
        await database.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
      }
    });
  });

  describe('getUserRooms', () => {
    beforeEach(async () => {
      // Create multiple rooms for testing
      await roomService.createRoom({
        id: 'user-room-1',
        name: 'User Room 1',
        type: 'public'
      }, testUser.id);

      const room2 = await roomService.createRoom({
        id: 'user-room-2',
        name: 'User Room 2',
        type: 'public'
      }, testUser2.id);

      // Join testUser to room2
      await roomService.joinRoom(testUser.id, room2.id);
    });

    it('should return all rooms user is member of', async () => {
      const rooms = await roomService.getUserRooms(testUser.id);

      expect(rooms).toHaveLength(2);
      expect(rooms.map(r => r.id)).toContain('user-room-1');
      expect(rooms.map(r => r.id)).toContain('user-room-2');
    });

    it('should include membership information', async () => {
      const rooms = await roomService.getUserRooms(testUser.id);

      const ownedRoom = rooms.find(r => r.id === 'user-room-1');
      const joinedRoom = rooms.find(r => r.id === 'user-room-2');

      expect(ownedRoom?.membership?.role).toBe('owner');
      expect(joinedRoom?.membership?.role).toBe('member');
    });
  });

  describe('getPublicRooms', () => {
    beforeEach(async () => {
      // Create public and private rooms
      await roomService.createRoom({
        id: 'public-room-1',
        name: 'Public Room 1',
        type: 'public'
      }, testUser.id);

      await roomService.createRoom({
        id: 'public-room-2',
        name: 'Public Room 2',
        type: 'public'
      }, testUser.id);

      await roomService.createRoom({
        id: 'private-room-1',
        name: 'Private Room 1',
        type: 'private'
      }, testUser.id);
    });

    it('should return only public rooms', async () => {
      const rooms = await roomService.getPublicRooms(10, 0);

      expect(rooms.length).toBeGreaterThanOrEqual(2);
      rooms.forEach(room => {
        expect(room.type).toBe('public');
      });
    });

    it('should respect limit parameter', async () => {
      const rooms = await roomService.getPublicRooms(1, 0);
      expect(rooms).toHaveLength(1);
    });
  });

  describe('updateRoom', () => {
    let testRoom: any;

    beforeEach(async () => {
      testRoom = await roomService.createRoom({
        id: 'update-test-room',
        name: 'Original Name',
        description: 'Original Description',
        type: 'public'
      }, testUser.id);
    });

    it('should allow owner to update room', async () => {
      const updatedRoom = await roomService.updateRoom(
        testRoom.id,
        testUser.id,
        {
          name: 'Updated Name',
          description: 'Updated Description'
        }
      );

      expect(updatedRoom.name).toBe('Updated Name');
      expect(updatedRoom.description).toBe('Updated Description');
    });

    it('should reject update by non-owner', async () => {
      await expect(roomService.updateRoom(
        testRoom.id,
        testUser2.id,
        { name: 'Hacked Name' }
      )).rejects.toThrow('User is not a member of this room');
    });

    it('should allow admin to update room', async () => {
      // Make testUser2 an admin
      await roomService.joinRoom(testUser2.id, testRoom.id);
      await database.query(
        'UPDATE room_memberships SET role = $1 WHERE user_id = $2 AND room_id = $3',
        ['admin', testUser2.id, testRoom.id]
      );

      const updatedRoom = await roomService.updateRoom(
        testRoom.id,
        testUser2.id,
        { name: 'Admin Updated' }
      );

      expect(updatedRoom.name).toBe('Admin Updated');
    });
  });
});