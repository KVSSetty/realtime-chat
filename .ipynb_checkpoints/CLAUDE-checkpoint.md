# Simple Chatbot Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-17

## Active Technologies

**Language/Version**: JavaScript/TypeScript with Node.js 18+
**Primary Dependencies**: Socket.io (WebSocket), Express.js (REST API), PostgreSQL client, Redis client
**Storage**: PostgreSQL for message history, Redis for presence/session state
**Testing**: Jest for unit tests, Supertest for API testing, Socket.io-client for WebSocket testing
**Target Platform**: Web application (browser + Node.js server)
**Project Type**: web - backend + frontend architecture

## Project Structure
```
backend/
├── src/
│   ├── models/          # Message, User, ChatRoom entities
│   ├── services/        # WebSocket, database, presence services
│   └── api/            # REST endpoints
└── tests/
    ├── contract/       # API contract tests
    ├── integration/    # WebSocket integration tests
    └── unit/          # Service unit tests

frontend/
├── src/
│   ├── components/     # Chat UI components
│   ├── pages/         # Chat application pages
│   └── services/      # WebSocket client, API client
└── tests/
    ├── components/    # Component tests
    └── integration/   # E2E chat flow tests

specs/001-real-time-chat/
├── spec.md             # Feature specification
├── plan.md             # Implementation plan
├── research.md         # Technology research
├── data-model.md       # Database schema and entities
├── quickstart.md       # Validation scenarios
└── contracts/          # API and WebSocket contracts
```

## Commands

### Development
```bash
# Backend development
npm run dev          # Start backend with hot reload
npm run test         # Run all tests
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests only

# Frontend development
npm start            # Start frontend development server
npm run build        # Build for production
npm test             # Run component tests

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed test data
npm run db:reset     # Reset database

# Services
docker-compose up    # Start PostgreSQL and Redis
redis-cli            # Access Redis CLI
psql chat_db         # Access PostgreSQL
```

### Testing
```bash
# Socket.io testing
npm run test:websocket   # WebSocket integration tests
npm run test:contract    # API contract tests

# Load testing
npm run test:load        # Performance testing
npm run test:e2e         # End-to-end scenarios
```

## Code Style

### TypeScript/JavaScript
- Use TypeScript for type safety
- ES6+ syntax with async/await
- Functional components for React
- Event-driven architecture for real-time features

### Database
- Use parameterized queries to prevent SQL injection
- Implement connection pooling for performance
- Use transactions for data consistency
- Partition large tables by date

### WebSocket Patterns
- Event-based message handling
- Room-based organization for chat channels
- Middleware for authentication and rate limiting
- Graceful connection handling and reconnection

### Error Handling
- Structured error responses with error codes
- Comprehensive logging for debugging
- Rate limiting to prevent abuse
- Input validation on all endpoints

## Recent Changes

### 001-real-time-chat (2025-09-17)
**Added**: Real-time chat system with WebSocket messaging, PostgreSQL message persistence, and Redis-based presence tracking
**Technologies**: Socket.io for real-time communication, JWT authentication, partitioned PostgreSQL schema
**Architecture**: Web application with separate backend/frontend, event-driven messaging, room-based chat organization

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->