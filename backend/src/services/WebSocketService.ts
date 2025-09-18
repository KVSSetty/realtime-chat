import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { authService, TokenPayload } from './AuthService';
import { messageService } from './MessageService';
import { roomService } from './RoomService';
import { redis } from './Redis';
import { UserPresence } from '../models';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
  email: string;
}

interface TypingUsers {
  [roomId: string]: {
    [userId: string]: {
      username: string;
      timeout: NodeJS.Timeout;
    };
  };
}

export class WebSocketService {
  private io: SocketIOServer;
  private typingUsers: TypingUsers = {};

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
          throw new Error('No authentication token provided');
        }

        const decoded = authService.verifyToken(token as string);
        const user = await authService.getUserById(decoded.userId);

        if (!user) {
          throw new Error('User not found');
        }

        // Attach user info to socket
        (socket as AuthenticatedSocket).userId = user.id;
        (socket as AuthenticatedSocket).username = user.username;
        (socket as AuthenticatedSocket).email = user.email;

        next();
      } catch (error) {
        console.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware (simple implementation)
    this.io.use((socket: Socket, next) => {
      const rateLimiter = this.createRateLimiter(socket.id);
      (socket as any).rateLimiter = rateLimiter;
      next();
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.username} connected with socket ${socket.id}`);

      try {
        // Set up user session and presence
        await this.handleUserConnection(socket);

        // Connection events
        socket.on('disconnect', () => this.handleDisconnection(socket));

        // Room management events
        socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
        socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));

        // Messaging events
        socket.on('send_message', (data) => this.handleSendMessage(socket, data));
        socket.on('edit_message', (data) => this.handleEditMessage(socket, data));
        socket.on('delete_message', (data) => this.handleDeleteMessage(socket, data));

        // Presence events
        socket.on('update_presence', (data) => this.handleUpdatePresence(socket, data));

        // Typing indicators
        socket.on('start_typing', (data) => this.handleStartTyping(socket, data));
        socket.on('stop_typing', (data) => this.handleStopTyping(socket, data));

        // Health check
        socket.on('ping', () => this.handlePing(socket));

        // Error handling
        socket.on('error', (error) => {
          console.error(`Socket error for user ${socket.username}:`, error);
        });

      } catch (error) {
        console.error('Error setting up socket connection:', error);
        socket.emit('connect_error', {
          error: 'connection_setup_failed',
          message: 'Failed to initialize connection'
        });
        socket.disconnect(true);
      }
    });
  }

  private async handleUserConnection(socket: AuthenticatedSocket): Promise<void> {
    // Store session in Redis
    await redis.setSession(socket.id, socket.userId);

    // Set initial presence
    const presence: UserPresence = {
      userId: socket.userId,
      status: 'online',
      lastActivity: new Date(),
      connectionId: socket.id
    };
    await redis.setUserPresence(presence);

    // Update last seen in database
    await authService.updateLastSeen(socket.userId);

    // Get user's rooms and join socket rooms
    const userRooms = await roomService.getUserRooms(socket.userId);
    for (const room of userRooms) {
      socket.join(room.id);
      await redis.addUserToRoom(socket.userId, room.id);

      // Notify room members that user is online
      socket.to(room.id).emit('user_joined', {
        user: {
          id: socket.userId,
          username: socket.username
        },
        roomId: room.id,
        timestamp: new Date().toISOString()
      });
    }

    // Send connection confirmation
    socket.emit('connected', {
      userId: socket.userId,
      connectionId: socket.id,
      timestamp: new Date().toISOString()
    });
  }

  private async handleDisconnection(socket: AuthenticatedSocket): Promise<void> {
    console.log(`User ${socket.username} disconnected`);

    try {
      // Update presence to offline
      await redis.removeUserPresence(socket.userId);

      // Remove from all rooms in Redis
      const userRooms = await roomService.getUserRooms(socket.userId);
      for (const room of userRooms) {
        await redis.removeUserFromRoom(socket.userId, room.id);

        // Notify room members that user left
        socket.to(room.id).emit('user_left', {
          user: {
            id: socket.userId,
            username: socket.username
          },
          roomId: room.id,
          timestamp: new Date().toISOString()
        });
      }

      // Clean up typing indicators
      this.cleanupTypingForUser(socket.userId);

      // Remove session
      await redis.removeSession(socket.id);

    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  private async handleJoinRoom(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!this.checkRateLimit(socket, 'join_room')) return;

      const { roomId, password } = data;

      if (!roomId) {
        socket.emit('join_room_error', {
          error: 'missing_room_id',
          message: 'Room ID is required'
        });
        return;
      }

      // Join room
      const membership = await roomService.joinRoom(socket.userId, roomId);
      socket.join(roomId);

      // Get room details with recent messages
      const room = await roomService.getRoomById(roomId, socket.userId);
      const messageHistory = await messageService.getMessageHistory(roomId, socket.userId, 50);
      const participants = await roomService.getRoomParticipants(roomId);

      // Send success response
      socket.emit('room_joined', {
        roomId: room!.id,
        roomName: room!.name,
        memberCount: room!.memberCount,
        recentMessages: messageHistory.messages,
        members: participants,
        timestamp: new Date().toISOString()
      });

      // Notify other room members
      socket.to(roomId).emit('user_joined', {
        user: {
          id: socket.userId,
          username: socket.username
        },
        roomId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('join_room_error', {
        error: 'join_failed',
        message: error instanceof Error ? error.message : 'Failed to join room',
        roomId: data.roomId
      });
    }
  }

  private async handleLeaveRoom(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { roomId } = data;

      if (!roomId) {
        socket.emit('leave_room_error', {
          error: 'missing_room_id',
          message: 'Room ID is required'
        });
        return;
      }

      // Leave room
      await roomService.leaveRoom(socket.userId, roomId);
      socket.leave(roomId);

      // Send success response
      socket.emit('room_left', {
        roomId,
        timestamp: new Date().toISOString()
      });

      // Notify other room members
      socket.to(roomId).emit('user_left', {
        user: {
          id: socket.userId,
          username: socket.username
        },
        roomId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit('leave_room_error', {
        error: 'leave_failed',
        message: error instanceof Error ? error.message : 'Failed to leave room',
        roomId: data.roomId
      });
    }
  }

  private async handleSendMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!this.checkRateLimit(socket, 'send_message')) return;

      const { roomId, content, type = 'text', replyTo, metadata = {} } = data;

      if (!roomId || !content) {
        socket.emit('send_message_error', {
          error: 'missing_required_fields',
          message: 'Room ID and content are required'
        });
        return;
      }

      // Create message
      const message = await messageService.createMessage({
        roomId,
        userId: socket.userId,
        content: content.trim(),
        type,
        metadata: { ...metadata, replyTo }
      });

      // Update user activity
      await redis.updateUserActivity(socket.userId);

      // Send success response to sender
      socket.emit('message_sent', {
        messageId: message.id,
        roomId: message.roomId,
        timestamp: message.createdAt.toISOString(),
        status: 'sent'
      });

      // Broadcast to room members (excluding sender)
      socket.to(roomId).emit('message_received', {
        id: message.id,
        roomId: message.roomId,
        content: message.content,
        type: message.type,
        author: {
          id: socket.userId,
          username: socket.username
        },
        replyTo: metadata.replyTo,
        metadata: message.metadata,
        createdAt: message.createdAt.toISOString()
      });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('send_message_error', {
        error: 'send_failed',
        message: error instanceof Error ? error.message : 'Failed to send message',
        roomId: data.roomId
      });
    }
  }

  private async handleEditMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { messageId, content } = data;

      if (!messageId || !content) {
        socket.emit('edit_message_error', {
          error: 'missing_required_fields',
          message: 'Message ID and content are required'
        });
        return;
      }

      // Edit message
      const message = await messageService.updateMessage(messageId, socket.userId, {
        content: content.trim(),
        editedAt: new Date()
      });

      // Send success response
      socket.emit('message_edited', {
        messageId: message.id,
        content: message.content,
        editedAt: message.editedAt!.toISOString()
      });

      // Broadcast update to room members
      this.io.to(message.roomId).emit('message_updated', {
        id: message.id,
        content: message.content,
        editedAt: message.editedAt!.toISOString(),
        roomId: message.roomId
      });

    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('edit_message_error', {
        error: 'edit_failed',
        message: error instanceof Error ? error.message : 'Failed to edit message',
        messageId: data.messageId
      });
    }
  }

  private async handleDeleteMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { messageId } = data;

      if (!messageId) {
        socket.emit('delete_message_error', {
          error: 'missing_message_id',
          message: 'Message ID is required'
        });
        return;
      }

      // Get message details before deletion
      const message = await messageService.getMessageById(messageId);
      if (!message) {
        socket.emit('delete_message_error', {
          error: 'message_not_found',
          message: 'Message not found'
        });
        return;
      }

      // Delete message
      await messageService.deleteMessage(messageId, socket.userId);

      // Send success response
      socket.emit('message_deleted', {
        messageId,
        timestamp: new Date().toISOString()
      });

      // Broadcast removal to room members
      this.io.to(message.roomId).emit('message_removed', {
        messageId,
        roomId: message.roomId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('delete_message_error', {
        error: 'delete_failed',
        message: error instanceof Error ? error.message : 'Failed to delete message',
        messageId: data.messageId
      });
    }
  }

  private async handleUpdatePresence(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!this.checkRateLimit(socket, 'update_presence')) return;

      const { status, currentRoom } = data;

      if (!['online', 'away', 'offline'].includes(status)) {
        socket.emit('update_presence_error', {
          error: 'invalid_status',
          message: 'Status must be online, away, or offline'
        });
        return;
      }

      // Update presence
      const presence: UserPresence = {
        userId: socket.userId,
        status,
        currentRoom,
        lastActivity: new Date(),
        connectionId: socket.id
      };
      await redis.setUserPresence(presence);

      // Send confirmation
      socket.emit('presence_updated', {
        status,
        timestamp: new Date().toISOString()
      });

      // Broadcast to user's rooms
      const userRooms = await roomService.getUserRooms(socket.userId);
      for (const room of userRooms) {
        socket.to(room.id).emit('presence_changed', {
          userId: socket.userId,
          status,
          currentRoom,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error updating presence:', error);
      socket.emit('update_presence_error', {
        error: 'update_failed',
        message: 'Failed to update presence'
      });
    }
  }

  private handleStartTyping(socket: AuthenticatedSocket, data: any): void {
    try {
      if (!this.checkRateLimit(socket, 'start_typing')) return;

      const { roomId } = data;

      if (!roomId) return;

      // Initialize room typing users if needed
      if (!this.typingUsers[roomId]) {
        this.typingUsers[roomId] = {};
      }

      // Clear existing timeout
      if (this.typingUsers[roomId][socket.userId]) {
        clearTimeout(this.typingUsers[roomId][socket.userId].timeout);
      }

      // Set new typing status with auto-clear timeout
      this.typingUsers[roomId][socket.userId] = {
        username: socket.username,
        timeout: setTimeout(() => {
          this.handleStopTyping(socket, { roomId });
        }, 3000) // Auto-clear after 3 seconds
      };

      // Broadcast typing indicator
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        username: socket.username,
        roomId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error handling start typing:', error);
    }
  }

  private handleStopTyping(socket: AuthenticatedSocket, data: any): void {
    try {
      const { roomId } = data;

      if (!roomId || !this.typingUsers[roomId]?.[socket.userId]) return;

      // Clear timeout
      clearTimeout(this.typingUsers[roomId][socket.userId].timeout);

      // Remove from typing users
      delete this.typingUsers[roomId][socket.userId];

      // Broadcast stop typing
      socket.to(roomId).emit('user_stopped_typing', {
        userId: socket.userId,
        roomId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error handling stop typing:', error);
    }
  }

  private handlePing(socket: AuthenticatedSocket): void {
    socket.emit('pong', {
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString()
    });
  }

  private cleanupTypingForUser(userId: string): void {
    for (const roomId in this.typingUsers) {
      if (this.typingUsers[roomId][userId]) {
        clearTimeout(this.typingUsers[roomId][userId].timeout);
        delete this.typingUsers[roomId][userId];
      }
    }
  }

  private createRateLimiter(socketId: string) {
    const limits: { [key: string]: { count: number; resetTime: number } } = {};

    return (action: string): boolean => {
      const now = Date.now();
      const key = `${socketId}:${action}`;

      if (!limits[key] || now > limits[key].resetTime) {
        limits[key] = { count: 1, resetTime: now + 60000 }; // 1 minute window
        return true;
      }

      // Rate limits based on action
      const actionLimits: { [key: string]: number } = {
        send_message: 30,
        join_room: 10,
        update_presence: 60,
        start_typing: 20
      };

      const limit = actionLimits[action] || 100;

      if (limits[key].count >= limit) {
        return false;
      }

      limits[key].count++;
      return true;
    };
  }

  private checkRateLimit(socket: AuthenticatedSocket, action: string): boolean {
    const rateLimiter = (socket as any).rateLimiter;
    if (!rateLimiter(action)) {
      socket.emit('rate_limit_exceeded', {
        error: 'rate_limit_exceeded',
        retryAfter: 60,
        endpoint: action,
        timestamp: new Date().toISOString()
      });
      return false;
    }
    return true;
  }

  // Public methods for external use
  public broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  public sendToUser(userId: string, event: string, data: any): void {
    // Find user's socket and send message
    // This would require maintaining a user-to-socket mapping
    // For simplicity, we'll skip this implementation for now
  }

  public getConnectedUsers(): number {
    return this.io.sockets.sockets.size;
  }
}

export let webSocketService: WebSocketService;