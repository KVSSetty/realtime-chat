export type MessageType = 'text' | 'system' | 'join' | 'leave';

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: MessageType;
  metadata: Record<string, any>;
  createdAt: Date;
  editedAt?: Date;
}

export interface CreateMessageData {
  roomId: string;
  userId: string;
  content: string;
  type?: MessageType;
  metadata?: Record<string, any>;
}

export interface UpdateMessageData {
  content?: string;
  metadata?: Record<string, any>;
  editedAt?: Date;
}

export interface MessageWithUser extends Message {
  author: {
    id: string;
    username: string;
  };
}

export interface MessageHistory {
  messages: MessageWithUser[];
  hasMore: boolean;
  nextCursor?: string;
}