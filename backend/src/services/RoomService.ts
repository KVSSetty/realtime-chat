import { database } from './Database';
import { redis } from './Redis';
import {
  ChatRoom,
  CreateRoomData,
  UpdateRoomData,
  RoomMembership,
  CreateMembershipData,
  UpdateMembershipData,
  RoomWithMembership,
  RoomParticipant
} from '../models';

export class RoomService {
  async createRoom(roomData: CreateRoomData, creatorId: string): Promise<ChatRoom> {
    const { id, name, description, type, settings = {} } = roomData;

    return await database.transaction(async (client) => {
      // Create room
      const roomResult = await client.query(`
        INSERT INTO chat_rooms (id, name, description, type, owner_id, settings)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, description, type, owner_id, settings, created_at, updated_at
      `, [id, name, description, type, creatorId, JSON.stringify(settings)]);

      const room = roomResult.rows[0];

      // Add creator as owner
      await client.query(`
        INSERT INTO room_memberships (user_id, room_id, role)
        VALUES ($1, $2, 'owner')
      `, [creatorId, id]);

      return this.mapRowToRoom(room);
    });
  }

  async getRoomById(roomId: string, userId?: string): Promise<RoomWithMembership | null> {
    let query = `
      SELECT
        r.id, r.name, r.description, r.type, r.owner_id, r.settings,
        r.created_at, r.updated_at,
        COUNT(rm.id) as member_count
    `;

    const params: any[] = [roomId];

    if (userId) {
      query += `,
        user_rm.id as membership_id,
        user_rm.role as user_role,
        user_rm.joined_at as user_joined_at,
        user_rm.last_read_at as user_last_read_at,
        user_rm.notifications as user_notifications
      `;
    }

    query += `
      FROM chat_rooms r
      LEFT JOIN room_memberships rm ON r.id = rm.room_id
    `;

    if (userId) {
      query += `
        LEFT JOIN room_memberships user_rm ON r.id = user_rm.room_id AND user_rm.user_id = $${params.length + 1}
      `;
      params.push(userId);
    }

    query += `
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.description, r.type, r.owner_id, r.settings, r.created_at, r.updated_at
    `;

    if (userId) {
      query += `, user_rm.id, user_rm.role, user_rm.joined_at, user_rm.last_read_at, user_rm.notifications`;
    }

    const result = await database.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const room: RoomWithMembership = {
      ...this.mapRowToRoom(row),
      memberCount: parseInt(row.member_count),
      membership: userId && row.membership_id ? {
        id: row.membership_id,
        userId: userId,
        roomId: roomId,
        role: row.user_role,
        joinedAt: row.user_joined_at,
        lastReadAt: row.user_last_read_at,
        notifications: row.user_notifications
      } : undefined
    };

    // Get last message
    const lastMessageResult = await database.query(`
      SELECT m.id, m.content, m.created_at, u.username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = $1
      ORDER BY m.created_at DESC
      LIMIT 1
    `, [roomId]);

    if (lastMessageResult.rows.length > 0) {
      const lastMsg = lastMessageResult.rows[0];
      room.lastMessage = {
        id: lastMsg.id.toString(),
        content: lastMsg.content,
        createdAt: lastMsg.created_at,
        user: {
          username: lastMsg.username
        }
      };
    }

    return room;
  }

  async getUserRooms(userId: string): Promise<RoomWithMembership[]> {
    const result = await database.query(`
      SELECT
        r.id, r.name, r.description, r.type, r.owner_id, r.settings,
        r.created_at, r.updated_at,
        rm.id as membership_id, rm.role, rm.joined_at, rm.last_read_at, rm.notifications,
        COUNT(all_rm.id) as member_count
      FROM chat_rooms r
      JOIN room_memberships rm ON r.id = rm.room_id
      LEFT JOIN room_memberships all_rm ON r.id = all_rm.room_id
      WHERE rm.user_id = $1
      GROUP BY r.id, r.name, r.description, r.type, r.owner_id, r.settings, r.created_at, r.updated_at,
               rm.id, rm.role, rm.joined_at, rm.last_read_at, rm.notifications
      ORDER BY r.updated_at DESC
    `, [userId]);

    const rooms = await Promise.all(result.rows.map(async (row) => {
      const room: RoomWithMembership = {
        ...this.mapRowToRoom(row),
        memberCount: parseInt(row.member_count),
        membership: {
          id: row.membership_id,
          userId: userId,
          roomId: row.id,
          role: row.role,
          joinedAt: row.joined_at,
          lastReadAt: row.last_read_at,
          notifications: row.notifications
        }
      };

      // Get last message for this room
      const lastMessageResult = await database.query(`
        SELECT m.id, m.content, m.created_at, u.username
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = $1
        ORDER BY m.created_at DESC
        LIMIT 1
      `, [row.id]);

      if (lastMessageResult.rows.length > 0) {
        const lastMsg = lastMessageResult.rows[0];
        room.lastMessage = {
          id: lastMsg.id.toString(),
          content: lastMsg.content,
          createdAt: lastMsg.created_at,
          user: {
            username: lastMsg.username
          }
        };
      }

      return room;
    }));

    return rooms;
  }

  async getPublicRooms(limit: number = 20, offset: number = 0): Promise<RoomWithMembership[]> {
    const result = await database.query(`
      SELECT
        r.id, r.name, r.description, r.type, r.owner_id, r.settings,
        r.created_at, r.updated_at,
        COUNT(rm.id) as member_count
      FROM chat_rooms r
      LEFT JOIN room_memberships rm ON r.id = rm.room_id
      WHERE r.type = 'public'
      GROUP BY r.id, r.name, r.description, r.type, r.owner_id, r.settings, r.created_at, r.updated_at
      ORDER BY member_count DESC, r.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows.map(row => ({
      ...this.mapRowToRoom(row),
      memberCount: parseInt(row.member_count)
    }));
  }

  async joinRoom(userId: string, roomId: string, role: string = 'member'): Promise<RoomMembership> {
    // Check if user is already a member
    const existing = await database.query(
      'SELECT id, user_id, room_id, role, joined_at, last_read_at, notifications FROM room_memberships WHERE user_id = $1 AND room_id = $2',
      [userId, roomId]
    );

    if (existing.rows.length > 0) {
      // Return existing membership instead of throwing error
      const membership = existing.rows[0];
      return {
        id: membership.id,
        userId: membership.user_id,
        roomId: membership.room_id,
        role: membership.role,
        joinedAt: membership.joined_at,
        lastReadAt: membership.last_read_at,
        notifications: membership.notifications
      };
    }

    // Check room exists and is joinable
    const room = await database.query(
      'SELECT type FROM chat_rooms WHERE id = $1',
      [roomId]
    );

    if (room.rows.length === 0) {
      throw new Error('Room not found');
    }

    if (room.rows[0].type === 'private') {
      throw new Error('Cannot join private room without invitation');
    }

    // Add membership
    const result = await database.query(`
      INSERT INTO room_memberships (user_id, room_id, role)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, room_id, role, joined_at, last_read_at, notifications
    `, [userId, roomId, role]);

    const membership = result.rows[0];

    // Add user to Redis room participants
    await redis.addUserToRoom(userId, roomId);

    // Update room activity
    await database.query(
      'UPDATE chat_rooms SET updated_at = NOW() WHERE id = $1',
      [roomId]
    );

    return {
      id: membership.id,
      userId: membership.user_id,
      roomId: membership.room_id,
      role: membership.role,
      joinedAt: membership.joined_at,
      lastReadAt: membership.last_read_at,
      notifications: membership.notifications
    };
  }

  async leaveRoom(userId: string, roomId: string): Promise<void> {
    return await database.transaction(async (client) => {
      // Check if user is the owner
      const membership = await client.query(
        'SELECT role FROM room_memberships WHERE user_id = $1 AND room_id = $2',
        [userId, roomId]
      );

      if (membership.rows.length === 0) {
        throw new Error('User is not a member of this room');
      }

      const userRole = membership.rows[0].role;

      if (userRole === 'owner') {
        // Transfer ownership to another admin or member
        const newOwner = await client.query(`
          SELECT user_id FROM room_memberships
          WHERE room_id = $1 AND user_id != $2 AND role IN ('admin', 'member')
          ORDER BY role DESC, joined_at ASC
          LIMIT 1
        `, [roomId, userId]);

        if (newOwner.rows.length > 0) {
          await client.query(
            'UPDATE room_memberships SET role = $1 WHERE user_id = $2 AND room_id = $3',
            ['owner', newOwner.rows[0].user_id, roomId]
          );

          await client.query(
            'UPDATE chat_rooms SET owner_id = $1 WHERE id = $2',
            [newOwner.rows[0].user_id, roomId]
          );
        }
      }

      // Remove membership
      await client.query(
        'DELETE FROM room_memberships WHERE user_id = $1 AND room_id = $2',
        [userId, roomId]
      );

      // Remove from Redis
      await redis.removeUserFromRoom(userId, roomId);
    });
  }

  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    const result = await database.query(`
      SELECT
        u.id, u.username,
        rm.role, rm.joined_at
      FROM room_memberships rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = $1
      ORDER BY rm.role DESC, rm.joined_at ASC
    `, [roomId]);

    const participants: RoomParticipant[] = [];

    for (const row of result.rows) {
      const presence = await redis.getUserPresence(row.id);
      participants.push({
        userId: row.id,
        username: row.username,
        role: row.role,
        joinedAt: row.joined_at,
        isOnline: presence?.status === 'online' || false
      });
    }

    return participants;
  }

  async updateRoom(roomId: string, userId: string, updateData: UpdateRoomData): Promise<ChatRoom> {
    // Verify user has permission to update room
    const membership = await database.query(
      'SELECT role FROM room_memberships WHERE user_id = $1 AND room_id = $2',
      [userId, roomId]
    );

    if (membership.rows.length === 0) {
      throw new Error('User is not a member of this room');
    }

    const userRole = membership.rows[0].role;
    if (userRole !== 'owner' && userRole !== 'admin') {
      throw new Error('Insufficient permissions to update room');
    }

    // Update room
    const result = await database.query(`
      UPDATE chat_rooms
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        settings = COALESCE($3, settings),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, description, type, owner_id, settings, created_at, updated_at
    `, [
      updateData.name,
      updateData.description,
      updateData.settings ? JSON.stringify(updateData.settings) : null,
      roomId
    ]);

    return this.mapRowToRoom(result.rows[0]);
  }

  async updateMembership(
    roomId: string,
    targetUserId: string,
    updateData: UpdateMembershipData,
    requesterId: string
  ): Promise<RoomMembership> {
    // Verify requester has permission
    const requesterMembership = await database.query(
      'SELECT role FROM room_memberships WHERE user_id = $1 AND room_id = $2',
      [requesterId, roomId]
    );

    if (requesterMembership.rows.length === 0) {
      throw new Error('Requester is not a member of this room');
    }

    const requesterRole = requesterMembership.rows[0].role;
    if (requesterRole !== 'owner' && requesterRole !== 'admin') {
      throw new Error('Insufficient permissions');
    }

    // Update membership
    const result = await database.query(`
      UPDATE room_memberships
      SET
        role = COALESCE($1, role),
        last_read_at = COALESCE($2, last_read_at),
        notifications = COALESCE($3, notifications)
      WHERE user_id = $4 AND room_id = $5
      RETURNING id, user_id, room_id, role, joined_at, last_read_at, notifications
    `, [
      updateData.role,
      updateData.lastReadAt,
      updateData.notifications,
      targetUserId,
      roomId
    ]);

    if (result.rows.length === 0) {
      throw new Error('Membership not found');
    }

    const membership = result.rows[0];
    return {
      id: membership.id,
      userId: membership.user_id,
      roomId: membership.room_id,
      role: membership.role,
      joinedAt: membership.joined_at,
      lastReadAt: membership.last_read_at,
      notifications: membership.notifications
    };
  }

  private mapRowToRoom(row: any): ChatRoom {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      ownerId: row.owner_id,
      settings: row.settings || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const roomService = new RoomService();