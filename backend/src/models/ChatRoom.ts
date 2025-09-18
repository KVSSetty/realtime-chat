export type RoomType = 'public' | 'private' | 'direct';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: RoomType;
  ownerId?: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoomData {
  id: string;
  name: string;
  description?: string;
  type: RoomType;
  ownerId?: string;
  settings?: Record<string, any>;
}

export interface UpdateRoomData {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface RoomMembership {
  id: string;
  userId: string;
  roomId: string;
  role: MemberRole;
  joinedAt: Date;
  lastReadAt: Date;
  notifications: boolean;
}

export interface CreateMembershipData {
  userId: string;
  roomId: string;
  role?: MemberRole;
  notifications?: boolean;
}

export interface UpdateMembershipData {
  role?: MemberRole;
  lastReadAt?: Date;
  notifications?: boolean;
}

export interface RoomWithMembership extends ChatRoom {
  membership?: RoomMembership;
  memberCount: number;
  lastMessage?: {
    id: string;
    content: string;
    createdAt: Date;
    user: {
      username: string;
    };
  };
}

export interface RoomParticipant {
  userId: string;
  username: string;
  role: MemberRole;
  joinedAt: Date;
  isOnline: boolean;
}