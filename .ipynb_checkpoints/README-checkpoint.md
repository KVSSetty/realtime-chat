# Simple Chatbot

Real-time chat system with WebSocket messaging, message persistence, and user presence tracking.

## Quick Start

1. **Start databases**:
   ```bash
   docker-compose up -d
   ```

2. **Start backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

3. **Start frontend**:
   ```bash
   cd frontend
   npm start
   ```

## Available Commands

### Backend Development
- `npm run dev` - Start backend with hot reload
- `npm run test` - Run all tests
- `npm run test:unit` - Unit tests only
- `npm run test:integration` - Integration tests only
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed test data
- `npm run db:reset` - Reset database

### Frontend Development
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run component tests

### Infrastructure
- `docker-compose up` - Start PostgreSQL and Redis
- `redis-cli` - Access Redis CLI
- `psql chat_db` - Access PostgreSQL

## Architecture

- **Backend**: Node.js + TypeScript + Express + Socket.io
- **Frontend**: React + TypeScript + Socket.io-client
- **Database**: PostgreSQL for message persistence
- **Cache**: Redis for presence tracking
- **Real-time**: WebSocket communication via Socket.io

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
```