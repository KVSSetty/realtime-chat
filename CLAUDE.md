# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Simple Chatbot Development Guidelines

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

## Development Commands

### Quick Start
```bash
# 1. Start database services
docker-compose up -d

# 2. Backend setup and development (in backend/ directory)
npm install
cp .env.example .env
npm run dev          # Start with hot reload

# 3. Frontend development (in frontend/ directory)
npm install
npm start            # Start development server on localhost:3000
```

### Backend Commands (run from backend/ directory)
```bash
npm run dev          # Start with nodemon hot reload
npm run build        # TypeScript compilation
npm run start        # Start production build
npm run test         # Run all tests
npm run test:unit    # Unit tests only (services)
npm run test:integration  # WebSocket integration tests
npm run test:contract     # API contract tests
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed test data
npm run db:reset     # Reset database
```

### Frontend Commands (run from frontend/ directory)
```bash
npm start            # Start development server
npm run build        # Build for production
npm test             # Run component tests
npm test -- --watchAll=false  # Run tests once
npm test -- MessageList       # Run specific component tests
```

### Infrastructure
```bash
docker-compose up    # Start PostgreSQL and Redis
docker-compose up -d # Start in background
redis-cli            # Access Redis CLI
psql -h localhost -U postgres -d chat_db  # Access PostgreSQL
```

## Architecture Overview

### Core Services & Data Flow
- **WebSocketService**: Manages real-time connections, authentication middleware, room-based event handling
- **AuthService**: JWT token management, password hashing with bcrypt, user session handling
- **MessageService**: Message CRUD operations, database persistence with partitioning by date
- **RoomService**: Chat room management, membership tracking, room joining/leaving logic
- **Redis**: Used for user presence tracking and session state caching
- **PostgreSQL**: Message persistence with partitioned tables, user/room data storage

### Real-time Communication Architecture
- **Authentication Flow**: Socket.io middleware validates JWT tokens before connection
- **Room-based Messaging**: Users join specific room channels, messages broadcast only to room members
- **Typing Indicators**: Ephemeral state managed via WebSocket events with automatic timeouts
- **Presence Tracking**: User online/offline status cached in Redis, broadcast to relevant rooms

### Frontend State Management
- **ChatContext**: Global state using useReducer for messages, rooms, typing indicators, presence
- **AuthContext**: User authentication state and token management
- **WebSocket Client**: Real-time event handling with automatic reconnection logic
- **API Client**: REST endpoints for authentication, room management, message history

### Database Schema Design
- **Messages Table**: Partitioned by created_at date for performance at scale
- **Room Memberships**: Many-to-many relationship with role-based permissions (owner/admin/member)
- **User Sessions**: JWT-based authentication with configurable expiration
- **Message History**: Pagination support with cursor-based loading for infinite scroll

### Testing Strategy
- **Unit Tests**: Service layer isolation with mocked dependencies (AuthService, MessageService, RoomService)
- **Integration Tests**: Full WebSocket connection testing with Socket.io-client
- **Contract Tests**: API endpoint validation with Supertest for request/response contracts
- **Component Tests**: React Testing Library for UI behavior with mocked contexts

## Development Notes

### Environment Setup
- Backend requires `.env` file with database credentials and JWT secret (copy from `.env.example`)
- PostgreSQL and Redis must be running before starting backend (use `docker-compose up -d`)
- Frontend connects to backend on localhost:3001 by default

### Common Development Patterns
- **Service Layer**: All business logic isolated in services/ directory with dependency injection
- **Error Handling**: Use structured error responses with specific error codes for API consistency
- **WebSocket Events**: Follow naming convention: `action_noun` (e.g., `send_message`, `join_room`)
- **Database Operations**: Always use parameterized queries and connection pooling
- **Testing**: Mock external dependencies (WebSocket, database) in unit tests for isolation

### Debugging & Troubleshooting
- **WebSocket Issues**: Check authentication middleware and token validation in browser dev tools
- **Database Errors**: Verify PostgreSQL is running and migrations have been applied
- **Test Failures**: Use `npm test -- --watchAll=false` to run tests once, add `Element.prototype.scrollIntoView = jest.fn()` for DOM method mocking
- **Connection Problems**: Ensure CORS configuration matches frontend URL in WebSocketService