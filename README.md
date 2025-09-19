# Realtime Chat

Real-time chat system with WebSocket messaging, message persistence, and user presence tracking.

## Features

- 🚀 **Real-time messaging** with Socket.io WebSockets
- 👥 **Room-based chat** with public and private rooms
- 🏗️ **Room creation & management** with intuitive UI modals
- 🔍 **Room discovery** to browse and join public rooms
- 📋 **Room sharing** with one-click invitation links
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

## How to Use

### 🏁 Getting Started

1. **Sign up** or **log in** using the demo accounts above
2. After login, you'll see the main chat interface with:
   - **Sidebar**: Room list and controls
   - **Main area**: Chat messages and input
   - **Header**: Room info and sharing options

### 🏗️ Creating Chat Rooms

1. **Click the "+" button** next to "Chat Rooms" in the sidebar
2. **Fill out the form**:
   - **Room Name**: Display name (e.g., "General Discussion")
   - **Room ID**: Unique identifier (auto-generated from name)
   - **Description**: Optional room purpose
   - **Type**:
     - **Public**: Anyone can discover and join
     - **Private**: Invite-only access
3. **Click "Create Room"** to create and auto-join

### 🔍 Discovering & Joining Rooms

#### Browse Public Rooms
1. **Click the search icon (🔍)** next to "Chat Rooms"
2. **Browse available rooms** with member counts and descriptions
3. **Click "Join"** on any room to join instantly
4. **Copy room links** using the copy button for sharing

#### Join via Direct Link
- If someone shares a room link, simply **click it**
- You'll be prompted to join the room directly

### 📋 Sharing & Inviting Others

#### Share Room Links
1. **Open any public room** you want to share
2. **Click "Share"** in the room header
3. **Link is auto-copied** to clipboard with format:
   ```
   Join me in "Room Name" chat room: https://yoursite.com/?room=room-id
   ```
4. **Paste anywhere**: Email, messaging apps, social media

#### Invitation Methods
- **Direct sharing**: Copy-paste room links
- **Email invites**: Send room links via email
- **Social media**: Share on platforms
- **Messaging apps**: Send links via WhatsApp, Slack, etc.

### 💬 Chatting Features

#### Basic Messaging
- **Type in the input** at bottom of chat
- **Press Enter** to send messages
- **See real-time messages** from other users

#### Advanced Features
- **Typing indicators**: See when others are typing
- **User presence**: Green/yellow/red status indicators
- **Message history**: Scroll up to see older messages
- **Member list**: View member count in room header

### 🎯 Room Types Explained

#### Public Rooms 🌐
- **Discoverable**: Appear in room browser
- **Open access**: Anyone can join via link or browser
- **Shareable**: Have share buttons and copy links
- **Best for**: Communities, open discussions, public channels

#### Private Rooms 🔒
- **Hidden**: Don't appear in public discovery
- **Invite-only**: Owner controls membership
- **Secure**: Links don't work for non-members
- **Best for**: Teams, private groups, sensitive discussions

### 🚀 Pro Tips

1. **Create themed rooms**: Make rooms for specific topics
2. **Use descriptive names**: Help others understand room purpose
3. **Share strategically**: Use public rooms for open communities
4. **Bookmark room links**: Save important room URLs
5. **Check member counts**: See room activity levels
6. **Use room descriptions**: Explain the room's purpose clearly

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

#### Room Management
- `join_room` / `room_joined` - Join existing rooms
- `leave_room` / `room_left` - Leave rooms
- `user_joined` / `user_left` - Member join/leave notifications

#### Messaging
- `send_message` / `message_received` - Real-time messaging
- `edit_message` / `message_updated` - Message editing
- `delete_message` / `message_removed` - Message deletion

#### User Interaction
- `start_typing` / `user_typing` - Typing indicators
- `stop_typing` / `user_stopped_typing` - Stop typing notifications
- `update_presence` / `presence_changed` - User status updates

#### Connection & Errors
- `connected` - WebSocket authentication confirmed
- `connect_error` - Connection failures
- `rate_limit_exceeded` - Rate limiting notifications

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
│   │   │   ├── Chat.tsx           # Main chat layout
│   │   │   ├── ChatRoom.tsx       # Room view with messages
│   │   │   ├── Sidebar.tsx        # Room list and navigation
│   │   │   ├── MessageList.tsx    # Message display
│   │   │   ├── MessageInput.tsx   # Message composition
│   │   │   ├── RoomCreationModal.tsx    # Room creation form
│   │   │   ├── RoomBrowserModal.tsx     # Public room discovery
│   │   │   ├── Login.tsx          # Authentication forms
│   │   │   └── Register.tsx
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

### Room & Feature Issues

5. **"Only logout button shows"**: Create your first room using the "+" button or "Create Your First Room"
6. **WebSocket disconnected after login**: Refresh the page - connection should be stable after our fixes
7. **Room links not working**: Ensure room is public and URL format is correct: `?room=room-id`
8. **Can't join room**: Check if room is private (requires invitation) or if room ID is correct
9. **Share button not copying**: Check browser clipboard permissions or use manual copy fallback
10. **Room browser empty**: Create some public rooms first, or check if other users have created public rooms

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