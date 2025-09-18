export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  lastSeenAt?: Date;
}

export interface UserSession {
  id: string;
  username: string;
  email: string;
  lastSeenAt: Date;
}

export type UserPresenceStatus = 'online' | 'away' | 'offline';

export interface UserPresence {
  userId: string;
  status: UserPresenceStatus;
  currentRoom?: string;
  lastActivity: Date;
  connectionId?: string;
}