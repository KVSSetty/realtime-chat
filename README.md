# Realtime Chat

Real-time chat system with WebSocket messaging, message persistence, and user presence tracking.

## Features

- 🚀 **Real-time messaging** with Socket.io WebSockets
- 👥 **Room-based chat** with public and private rooms
- 🔐 **JWT authentication** with secure user sessions
- 💾 **Message persistence** with PostgreSQL and date partitioning
- 👀 **Typing indicators** and user presence tracking
- 📱 **Responsive UI** built with React and Tailwind CSS
- 🧪 **Comprehensive testing** suite (unit, integration, component tests)

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/KVSSetty/realtime-chat.git
   cd realtime-chat
   ```

2. **Start database services**:
   ```bash
   docker-compose up -d
   ```

3. **Setup and start backend**:
   ```bash
   cd backend
   npm install
   npm run db:seed    # Create demo users and rooms
   npm run dev
   ```

4. **Setup and start frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm start
   ```

5. **Open your browser** and navigate to http://localhost:3000

### Default Demo Users
✅ Available after setup (automatically seeded):
- **alice@example.com** / password123
- **bob@example.com** / password123
- **charlie@example.com** / password123

## Development Commands

### Backend Commands (run from `backend/` directory)
```bash
npm run dev          # Start with hot reload
npm run build        # TypeScript compilation
npm run test         # Run all tests
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests only
npm run test:contract     # API contract tests
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed demo users and rooms
npm run db:reset     # Reset database
```

### Frontend Commands (run from `frontend/` directory)
```bash
npm start            # Start development server
npm run build        # Build for production
npm test             # Run component tests
npm test -- --watchAll=false  # Run tests once
```

### Infrastructure
```bash
docker-compose up -d # Start PostgreSQL and Redis
docker-compose down  # Stop all services
redis-cli            # Access Redis CLI
psql -h localhost -p 5434 -U chat_user -d chat_db  # Access PostgreSQL
```

## Technology Stack

- **Backend**: Node.js + TypeScript + Express + Socket.io
- **Frontend**: React + TypeScript + Tailwind CSS + Socket.io-client
- **Database**: PostgreSQL with date-partitioned message tables
- **Cache**: Redis for user presence and session state
- **Real-time**: WebSocket communication via Socket.io
- **Authentication**: JWT tokens with bcrypt password hashing
- **Testing**: Jest + Supertest + React Testing Library

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Rooms
- `GET /api/rooms/public` - List public rooms
- `GET /api/rooms/my` - Get user's rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/join` - Join room
- `POST /api/rooms/:id/leave` - Leave room
- `GET /api/rooms/:id/messages` - Get message history

### WebSocket Events
- `join_room` / `room_joined` - Room management
- `send_message` / `message_received` - Real-time messaging
- `start_typing` / `user_typing` - Typing indicators
- `update_presence` / `presence_updated` - User status

## Environment Configuration

The backend `.env` file is already configured. If you need to modify it:

```env
DATABASE_URL=postgresql://chat_user:chat_password@localhost:5434/chat_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── models/          # TypeScript interfaces and types
│   │   ├── services/        # Business logic (Auth, Message, Room, WebSocket)
│   │   ├── api/            # REST API routes
│   │   └── index.ts        # Server entry point
│   └── tests/
│       ├── unit/           # Service unit tests
│       ├── integration/    # WebSocket integration tests
│       └── contract/       # API contract tests
├── frontend/
│   ├── src/
│   │   ├── components/     # React UI components
│   │   ├── context/        # Auth and Chat state management
│   │   ├── services/       # API and WebSocket clients
│   │   └── types/          # TypeScript definitions
│   └── tests/
│       └── components/     # Component tests
├── docker-compose.yml      # PostgreSQL and Redis setup
└── specs/                  # Feature specifications and documentation
```

## Troubleshooting

### Common Issues

1. **Docker not running**: Ensure Docker Desktop is running before `docker-compose up -d`
2. **Port conflicts**: If ports 3000, 3001, or 5434 are in use, stop other services
3. **Database connection issues**: Ensure PostgreSQL container is running with `docker ps`
4. **Frontend compilation errors**: Delete `node_modules` and `package-lock.json`, then `npm install`

### Verifying Setup

- **Backend health**: Visit http://localhost:3001/health
- **Frontend**: Visit http://localhost:3000
- **Database**: `docker exec -it chatbot_postgres psql -U chat_user -d chat_db`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Run tests: `npm test` (in both backend and frontend)
4. Commit changes: `git commit -am 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Submit a pull request

## License

MIT License - see LICENSE file for details