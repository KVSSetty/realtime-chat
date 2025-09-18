# Data Model: Real-time Chat System

**Feature**: Real-time chat system with message history and user presence
**Date**: 2025-09-17

## Core Entities

### User
**Purpose**: Represents a chat participant with identity and connection state

**Attributes**:
- `id` (string): Unique user identifier
- `username` (string): Display name in chat
- `email` (string): Authentication identifier
- `createdAt` (timestamp): Account creation time
- `lastSeenAt` (timestamp): Last activity timestamp

**Validation Rules**:
- Username: 3-50 characters, alphanumeric + underscore/dash only
- Email: Valid email format, unique across system
- ID: UUIDv4 format for global uniqueness

**State Transitions**:
- `created` → `active` (first login)
- `active` → `idle` (no activity for 5 minutes)
- `idle` → `active` (any user action)
- `active` → `offline` (disconnection)

### Message
**Purpose**: Individual chat message with content and metadata

**Attributes**:
- `id` (bigint): Sequential message identifier
- `roomId` (string): Chat room identifier
- `userId` (string): Message author reference
- `content` (text): Message text content
- `type` (enum): Message type (`text`, `system`, `join`, `leave`)
- `metadata` (json): Extensible message properties
- `createdAt` (timestamp): Message creation time
- `editedAt` (timestamp, nullable): Last edit timestamp

**Validation Rules**:
- Content: 1-2000 characters for text messages
- Type: Must be valid enum value
- RoomId: Must reference existing chat room
- UserId: Must reference valid user

**Relationships**:
- `belongsTo` User (author)
- `belongsTo` ChatRoom
- `hasMany` MessageReactions (future)

### ChatRoom
**Purpose**: Conversation container grouping messages and participants

**Attributes**:
- `id` (string): Unique room identifier
- `name` (string): Human-readable room name
- `description` (text, nullable): Room purpose description
- `type` (enum): Room type (`public`, `private`, `direct`)
- `ownerId` (string): Room creator reference
- `settings` (json): Room configuration (notifications, etc.)
- `createdAt` (timestamp): Room creation time
- `updatedAt` (timestamp): Last activity time

**Validation Rules**:
- Name: 1-100 characters, no special characters
- Type: Must be valid enum value
- ID: Slug format (alphanumeric + dash) for URL safety

**Relationships**:
- `hasMany` Messages
- `belongsTo` User (owner)
- `hasMany` RoomMemberships
- `hasMany` Users (through memberships)

### PresenceStatus
**Purpose**: Real-time user availability and location tracking

**Attributes**:
- `userId` (string): User reference
- `status` (enum): Presence state (`online`, `away`, `offline`)
- `currentRoom` (string, nullable): Active room identifier
- `lastActivity` (timestamp): Last user action time
- `connectionId` (string): Socket connection identifier
- `userAgent` (string): Client information

**Validation Rules**:
- Status: Must be valid enum value
- UserId: Must reference valid user
- LastActivity: Cannot be future timestamp

**State Transitions**:
- Any status → `online` (user activity)
- `online` → `away` (5 minutes idle)
- `away` → `offline` (connection lost)
- `offline` → `online` (reconnection)

### RoomMembership
**Purpose**: Junction table managing user-room relationships

**Attributes**:
- `id` (bigint): Membership identifier
- `userId` (string): User reference
- `roomId` (string): Room reference
- `role` (enum): Member role (`owner`, `admin`, `member`)
- `joinedAt` (timestamp): Membership start time
- `lastReadAt` (timestamp): Last message read timestamp
- `notifications` (boolean): Notification preferences

**Validation Rules**:
- Role: Must be valid enum value
- Unique constraint on (userId, roomId)
- Owner role: Max one per room

**Relationships**:
- `belongsTo` User
- `belongsTo` ChatRoom

## Database Schema

### PostgreSQL Tables
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW()
);

-- Chat rooms table
CREATE TABLE chat_rooms (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('public', 'private', 'direct')),
    owner_id UUID REFERENCES users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table (partitioned by month)
CREATE TABLE messages (
    id BIGSERIAL,
    room_id VARCHAR(100) REFERENCES chat_rooms(id),
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'system', 'join', 'leave')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Room memberships junction table
CREATE TABLE room_memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    room_id VARCHAR(100) REFERENCES chat_rooms(id),
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    last_read_at TIMESTAMP DEFAULT NOW(),
    notifications BOOLEAN DEFAULT true,
    UNIQUE(user_id, room_id)
);
```

### Redis Schema
```
-- Presence tracking
Key: presence:user:{userId}
Value: {
  "status": "online|away|offline",
  "currentRoom": "roomId",
  "lastActivity": timestamp,
  "connectionId": "socketId"
}
TTL: 30 seconds

-- Room participant lists
Key: room:participants:{roomId}
Value: Set of userIds
TTL: None (managed by application)

-- User session mapping
Key: session:{connectionId}
Value: {
  "userId": "userId",
  "joinedAt": timestamp
}
TTL: 1 hour
```

## Indexes and Performance

### PostgreSQL Indexes
```sql
-- Message history queries
CREATE INDEX idx_messages_room_created ON messages (room_id, created_at DESC);
CREATE INDEX idx_messages_user_created ON messages (user_id, created_at DESC);

-- Room membership lookups
CREATE INDEX idx_memberships_user_room ON room_memberships (user_id, room_id);
CREATE INDEX idx_memberships_room_role ON room_memberships (room_id, role);

-- User authentication
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
```

### Message Partitioning Strategy
```sql
-- Monthly partitions for message archival
CREATE TABLE messages_2025_01 PARTITION OF messages
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE messages_2025_02 PARTITION OF messages
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... (automated partition creation)
```

## Data Flow Patterns

### Message Creation Flow
1. Client sends message via WebSocket
2. Server validates user permissions and content
3. Message saved to PostgreSQL (async)
4. Message broadcast to room participants via Socket.io
5. Presence status updated in Redis

### Presence Update Flow
1. User activity triggers presence update
2. Redis key updated with new timestamp and status
3. Status change broadcast to relevant rooms
4. TTL refreshed for automatic cleanup

### Message History Flow
1. Client requests history via REST API
2. Database query with pagination and room filtering
3. Results cached in Redis for subsequent requests
4. Response includes message metadata and user info

---

*Data model complete - Ready for contract definition*