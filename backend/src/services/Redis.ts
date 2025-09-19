import { createClient, RedisClientType } from 'redis';
import { UserPresence, UserPresenceStatus } from '../models';

export class RedisService {
  public client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected');
    });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  // Presence management
  async setUserPresence(presence: UserPresence): Promise<void> {
    const key = `presence:user:${presence.userId}`;
    const value = JSON.stringify({
      status: presence.status,
      currentRoom: presence.currentRoom,
      lastActivity: presence.lastActivity.toISOString(),
      connectionId: presence.connectionId
    });

    await this.client.setEx(key, 30, value); // 30 second TTL
  }

  async getUserPresence(userId: string): Promise<UserPresence | null> {
    const key = `presence:user:${userId}`;
    const value = await this.client.get(key);

    if (!value) return null;

    const data = JSON.parse(value);
    return {
      userId,
      status: data.status,
      currentRoom: data.currentRoom,
      lastActivity: new Date(data.lastActivity),
      connectionId: data.connectionId
    };
  }

  async removeUserPresence(userId: string): Promise<void> {
    const key = `presence:user:${userId}`;
    await this.client.del(key);
  }

  async updateUserActivity(userId: string): Promise<void> {
    const presence = await this.getUserPresence(userId);
    if (presence) {
      presence.lastActivity = new Date();
      presence.status = 'online';
      await this.setUserPresence(presence);
    }
  }

  // Room participant management
  async addUserToRoom(userId: string, roomId: string): Promise<void> {
    const key = `room:participants:${roomId}`;
    await this.client.sAdd(key, userId);
  }

  async removeUserFromRoom(userId: string, roomId: string): Promise<void> {
    const key = `room:participants:${roomId}`;
    await this.client.sRem(key, userId);
  }

  async getRoomParticipants(roomId: string): Promise<string[]> {
    const key = `room:participants:${roomId}`;
    return await this.client.sMembers(key);
  }

  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    const key = `room:participants:${roomId}`;
    return await this.client.sIsMember(key, userId);
  }

  // Session management
  async setSession(connectionId: string, userId: string): Promise<void> {
    const key = `session:${connectionId}`;
    const value = JSON.stringify({
      userId,
      joinedAt: new Date().toISOString()
    });

    await this.client.setEx(key, 3600, value); // 1 hour TTL
  }

  async getSession(connectionId: string): Promise<{ userId: string; joinedAt: Date } | null> {
    const key = `session:${connectionId}`;
    const value = await this.client.get(key);

    if (!value) return null;

    const data = JSON.parse(value);
    return {
      userId: data.userId,
      joinedAt: new Date(data.joinedAt)
    };
  }

  async removeSession(connectionId: string): Promise<void> {
    const key = `session:${connectionId}`;
    await this.client.del(key);
  }

  // Cache management
  async cacheMessageHistory(roomId: string, messages: any[], cursor?: string): Promise<void> {
    const key = `cache:messages:${roomId}:${cursor || 'latest'}`;
    const value = JSON.stringify(messages);

    await this.client.setEx(key, 300, value); // 5 minute cache
  }

  async getCachedMessageHistory(roomId: string, cursor?: string): Promise<any | null> {
    const key = `cache:messages:${roomId}:${cursor || 'latest'}`;
    const value = await this.client.get(key);

    return value ? JSON.parse(value) : null;
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      await this.client.ping();
      console.log('✅ Redis connection successful');
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      return false;
    }
  }

  async flushAll(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      await this.client.flushAll();
    }
  }
}

// Singleton instance
export const redis = new RedisService();