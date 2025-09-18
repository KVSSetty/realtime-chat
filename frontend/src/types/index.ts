// User types
export interface User {
  id: string;
  username: string;
  email: string;
  lastSeenAt: string;
}

export interface UserSession {
  user: User;
  token: string;
}

// Message types
export type MessageType = 'text' | 'system' | 'join' | 'leave';

export interface Message {
  id: string;
  roomId: string;
  content: string;
  type: MessageType;
  author: {
    id: string;
    username: string;
  };
  replyTo?: string;
  metadata: Record<string, any>;
  createdAt: string;
  editedAt?: string;
}

export interface MessageHistory {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

// Room types
export type RoomType = 'public' | 'private' | 'direct';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: RoomType;
  ownerId?: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      username: string;
    };
  };
}

export interface RoomMembership {
  id: string;
  userId: string;
  roomId: string;
  role: MemberRole;
  joinedAt: string;
  lastReadAt: string;
  notifications: boolean;
}

export interface RoomWithMembership extends ChatRoom {
  membership?: RoomMembership;
}

export interface RoomParticipant {
  userId: string;
  username: string;
  role: MemberRole;
  joinedAt: string;
  isOnline: boolean;
}

// Presence types
export type UserPresenceStatus = 'online' | 'away' | 'offline';

export interface UserPresence {
  userId: string;
  status: UserPresenceStatus;
  currentRoom?: string;
  timestamp: string;
}

// Typing indicator types
export interface TypingIndicator {
  userId: string;
  username: string;
  roomId: string;
  timestamp: string;
}

// WebSocket event types
export interface WebSocketError {
  error: string;
  message: string;
  timestamp: string;
  details?: any;
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface SendMessageRequest {
  roomId: string;
  content: string;
  type?: MessageType;
  replyTo?: string;
  metadata?: Record<string, any>;
}