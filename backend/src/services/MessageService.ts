import { database } from './Database';
import { redis } from './Redis';
import { Message, CreateMessageData, UpdateMessageData, MessageWithUser, MessageHistory } from '../models';

export class MessageService {
  async createMessage(messageData: CreateMessageData): Promise<Message> {
    const { roomId, userId, content, type = 'text', metadata = {} } = messageData;

    // Validate user is member of room
    await this.validateUserInRoom(userId, roomId);

    // Create message
    const result = await database.query(`
      INSERT INTO messages (room_id, user_id, content, type, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, room_id, user_id, content, type, metadata, created_at, edited_at
    `, [roomId, userId, content, type, JSON.stringify(metadata)]);

    const message = result.rows[0];

    // Update room's last activity
    await database.query(
      'UPDATE chat_rooms SET updated_at = NOW() WHERE id = $1',
      [roomId]
    );

    // Clear message cache for this room
    await this.clearMessageCache(roomId);

    return this.mapRowToMessage(message);
  }

  async getMessageHistory(
    roomId: string,
    userId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<MessageHistory> {
    // Validate user has access to room
    await this.validateUserInRoom(userId, roomId);

    // Check cache first
    const cacheKey = `${roomId}:${cursor || 'latest'}`;
    const cached = await redis.getCachedMessageHistory(roomId, cursor);
    if (cached) {
      return cached;
    }

    let query = `
      SELECT
        m.id, m.room_id, m.user_id, m.content, m.type, m.metadata,
        m.created_at, m.edited_at,
        u.username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = $1
    `;

    const params: any[] = [roomId];

    if (cursor) {
      query += ` AND m.created_at < $${params.length + 1}`;
      params.push(new Date(cursor));
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1); // Get one extra to check if there are more

    const result = await database.query(query, params);
    const rows = result.rows;

    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit);

    const messageHistory: MessageHistory = {
      messages: messages.map(row => ({
        id: row.id.toString(),
        roomId: row.room_id,
        userId: row.user_id,
        content: row.content,
        type: row.type,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        editedAt: row.edited_at,
        user: {
          id: row.user_id,
          username: row.username
        }
      })).reverse(), // Reverse to get chronological order
      hasMore,
      nextCursor: hasMore ? rows[limit].created_at.toISOString() : undefined
    };

    // Cache the result
    await redis.cacheMessageHistory(roomId, messageHistory.messages, cursor);

    return messageHistory;
  }

  async updateMessage(messageId: string, userId: string, updateData: UpdateMessageData): Promise<Message> {
    // Verify user owns the message
    const ownership = await database.query(
      'SELECT user_id, room_id, created_at FROM messages WHERE id = $1',
      [messageId]
    );

    if (ownership.rows.length === 0) {
      throw new Error('Message not found');
    }

    const message = ownership.rows[0];
    if (message.user_id !== userId) {
      throw new Error('Not authorized to edit this message');
    }

    // Check if message is still editable (within 24 hours)
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const maxEditTime = 24 * 60 * 60 * 1000; // 24 hours
    if (messageAge > maxEditTime) {
      throw new Error('Message too old to edit');
    }

    // Update message
    const result = await database.query(`
      UPDATE messages
      SET content = COALESCE($1, content),
          metadata = COALESCE($2, metadata),
          edited_at = NOW()
      WHERE id = $3
      RETURNING id, room_id, user_id, content, type, metadata, created_at, edited_at
    `, [
      updateData.content,
      updateData.metadata ? JSON.stringify(updateData.metadata) : null,
      messageId
    ]);

    // Clear cache
    await this.clearMessageCache(message.room_id);

    return this.mapRowToMessage(result.rows[0]);
  }

  async deleteMessage(messageId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    // Verify ownership or admin rights
    const result = await database.query(
      'SELECT user_id, room_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found');
    }

    const message = result.rows[0];
    if (message.user_id !== userId && !isAdmin) {
      throw new Error('Not authorized to delete this message');
    }

    // Soft delete - update content to indicate deletion
    await database.query(`
      UPDATE messages
      SET content = '[Message deleted]',
          type = 'system',
          edited_at = NOW()
      WHERE id = $1
    `, [messageId]);

    // Clear cache
    await this.clearMessageCache(message.room_id);
  }

  async getMessageById(messageId: string): Promise<MessageWithUser | null> {
    const result = await database.query(`
      SELECT
        m.id, m.room_id, m.user_id, m.content, m.type, m.metadata,
        m.created_at, m.edited_at,
        u.username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [messageId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id.toString(),
      roomId: row.room_id,
      userId: row.user_id,
      content: row.content,
      type: row.type,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      editedAt: row.edited_at,
      user: {
        id: row.user_id,
        username: row.username
      }
    };
  }

  private async validateUserInRoom(userId: string, roomId: string): Promise<void> {
    const membership = await database.query(
      'SELECT id FROM room_memberships WHERE user_id = $1 AND room_id = $2',
      [userId, roomId]
    );

    if (membership.rows.length === 0) {
      throw new Error('User is not a member of this room');
    }
  }

  private mapRowToMessage(row: any): Message {
    return {
      id: row.id.toString(),
      roomId: row.room_id,
      userId: row.user_id,
      content: row.content,
      type: row.type,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      editedAt: row.edited_at
    };
  }

  private async clearMessageCache(roomId: string): Promise<void> {
    // In a production system, you'd want to clear all cached pages
    // For now, just clear the latest page
    const keys = await redis.client.keys(`cache:messages:${roomId}:*`);
    if (keys.length > 0) {
      await redis.client.del(keys);
    }
  }
}

export const messageService = new MessageService();