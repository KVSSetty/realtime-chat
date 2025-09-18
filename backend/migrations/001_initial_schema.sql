-- Initial schema for real-time chat system
-- Created: 2025-09-18

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,50}$'),
    CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Chat rooms table
CREATE TABLE chat_rooms (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('public', 'private', 'direct')),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT room_id_format CHECK (id ~ '^[a-z0-9-]+$'),
    CONSTRAINT room_name_length CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100)
);

-- Messages table (partitioned by month for performance)
CREATE TABLE messages (
    id BIGSERIAL,
    room_id VARCHAR(100) NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'system', 'join', 'leave')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP,

    PRIMARY KEY (id, created_at),
    CONSTRAINT content_length CHECK (
        (type = 'text' AND LENGTH(content) >= 1 AND LENGTH(content) <= 2000) OR
        (type != 'text' AND LENGTH(content) >= 1)
    )
) PARTITION BY RANGE (created_at);

-- Room memberships junction table
CREATE TABLE room_memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id VARCHAR(100) NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    last_read_at TIMESTAMP DEFAULT NOW(),
    notifications BOOLEAN DEFAULT true,

    UNIQUE(user_id, room_id)
);

-- Create initial message partitions (current and next month)
CREATE TABLE messages_2025_09 PARTITION OF messages
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE messages_2025_10 PARTITION OF messages
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Indexes for performance
-- Message history queries
CREATE INDEX idx_messages_room_created ON messages (room_id, created_at DESC);
CREATE INDEX idx_messages_user_created ON messages (user_id, created_at DESC);

-- Room membership lookups
CREATE INDEX idx_memberships_user_room ON room_memberships (user_id, room_id);
CREATE INDEX idx_memberships_room_role ON room_memberships (room_id, role);

-- User authentication and lookups
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_last_seen ON users (last_seen_at);

-- Chat room queries
CREATE INDEX idx_rooms_type ON chat_rooms (type);
CREATE INDEX idx_rooms_owner ON chat_rooms (owner_id);
CREATE INDEX idx_rooms_updated ON chat_rooms (updated_at DESC);

-- Update trigger for chat_rooms.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_rooms_updated_at
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create message partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);

    -- Add indexes to new partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (room_id, created_at DESC)',
                   'idx_' || partition_name || '_room_created', partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (user_id, created_at DESC)',
                   'idx_' || partition_name || '_user_created', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Insert default general chat room
INSERT INTO chat_rooms (id, name, description, type)
VALUES ('general', 'General Chat', 'Default public chat room for all users', 'public')
ON CONFLICT (id) DO NOTHING;