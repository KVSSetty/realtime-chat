# Research: Real-time Chat System

**Feature**: Real-time chat system with message history and user presence
**Date**: 2025-09-17

## WebSocket Implementation

### Decision: Socket.io
**Rationale**:
- Built-in room management for organizing chat participants
- Automatic fallback mechanisms (polling, xhr-polling) for older browsers
- Event-based architecture matches chat message patterns
- Extensive middleware ecosystem for authentication, rate limiting
- Battle-tested in production chat applications

**Alternatives Considered**:
- **Native WebSocket API**: Lacks room management, requires manual connection handling
- **ws library**: Lower level, requires building room and presence management from scratch
- **uws**: Faster but less feature-complete, smaller ecosystem

**Implementation Notes**:
- Use Socket.io v4+ for modern ES modules support
- Leverage built-in rooms for chat channel organization
- Implement heartbeat for connection health monitoring

## Database Strategy

### Decision: PostgreSQL with Date Partitioning
**Rationale**:
- ACID compliance ensures message delivery guarantees
- Excellent concurrent read/write performance for chat workloads
- Mature full-text search for message history
- JSON column support for flexible message metadata
- Horizontal scaling via read replicas for message history

**Alternatives Considered**:
- **MongoDB**: Better for document-oriented messages but lacks ACID guarantees
- **SQLite**: Simple but limited to single-user scenarios
- **Redis only**: Fast but lacks persistence guarantees for message history

**Schema Design**:
```sql
-- Partitioned by month for efficient archival
CREATE TABLE messages (
    id BIGSERIAL,
    room_id VARCHAR(255),
    user_id VARCHAR(255),
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

## Presence Management

### Decision: Redis with TTL Keys
**Rationale**:
- Sub-millisecond presence lookups for real-time updates
- Automatic cleanup via TTL prevents stale presence data
- Pub/Sub capabilities for presence change notifications
- Memory-efficient for tracking thousands of concurrent users

**Alternatives Considered**:
- **Database polling**: Too slow for real-time presence (>100ms latency)
- **In-memory only**: Loses presence state on server restart
- **WebSocket heartbeat only**: Doesn't survive connection interruptions

**Presence Schema**:
```
Key: presence:user:{userId}
Value: {status: "online", lastSeen: timestamp, room: "roomId"}
TTL: 30 seconds (refreshed on activity)
```

## Real-time Architecture

### Decision: Socket.io Rooms + Redis Adapter
**Rationale**:
- Rooms provide natural chat channel boundaries
- Redis adapter enables horizontal scaling across server instances
- Built-in broadcast mechanisms reduce message routing complexity
- Automatic cleanup when users disconnect

**Alternatives Considered**:
- **Manual WebSocket routing**: Complex state management, error-prone
- **Pub/Sub only**: Lacks direct connection management for private messages
- **Event sourcing**: Over-engineered for chat use case

**Architecture Pattern**:
```
Client ↔ Socket.io Server ↔ Redis (presence + adapter) ↔ PostgreSQL (messages)
```

## Authentication Strategy

### Decision: JWT with Socket.io Middleware
**Rationale**:
- Stateless authentication works across multiple server instances
- Socket.io middleware intercepts and validates tokens on connection
- Standard web security practices apply

**Implementation**:
- REST API issues JWT on login
- Frontend stores JWT in memory (not localStorage for security)
- Socket.io validates JWT on connection and message events

## Performance Considerations

### Message Delivery: <200ms target
- Socket.io binary protocol for reduced overhead
- Message batching for high-frequency users
- Redis pipeline commands for presence updates

### Concurrent Users: 1000+ target
- Horizontal scaling via Redis adapter
- Connection pooling for database access
- Rate limiting per user to prevent spam

### Reliability: 99.9% uptime target
- Circuit breaker pattern for database connections
- Graceful degradation when Redis unavailable
- Message queuing for offline users (future enhancement)

## Security Research

### Real-time Security Patterns
- Rate limiting per user and per room
- Message content validation and sanitization
- Room access control via JWT claims
- DDoS protection via connection limits

### Data Privacy
- Message encryption at rest (database level)
- No message content in logs
- User presence data retention limits

---

*Research complete - Ready for design phase*