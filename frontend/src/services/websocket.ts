import { io, Socket } from 'socket.io-client';
import {
  Message,
  RoomParticipant,
  UserPresence,
  TypingIndicator,
  WebSocketError,
  SendMessageRequest
} from '../types';

const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';

export interface WebSocketEvents {
  // Connection events
  connected: (data: { userId: string; connectionId: string; timestamp: string }) => void;
  connect_error: (error: WebSocketError) => void;
  disconnect: (reason: string) => void;

  // Room events
  room_joined: (data: {
    roomId: string;
    roomName: string;
    memberCount: number;
    recentMessages: Message[];
    members: RoomParticipant[];
    timestamp: string;
  }) => void;
  room_left: (data: { roomId: string; timestamp: string }) => void;
  join_room_error: (error: WebSocketError & { roomId: string }) => void;
  leave_room_error: (error: WebSocketError & { roomId: string }) => void;

  // User events
  user_joined: (data: {
    user: { id: string; username: string };
    roomId: string;
    timestamp: string;
  }) => void;
  user_left: (data: {
    user: { id: string; username: string };
    roomId: string;
    timestamp: string;
  }) => void;

  // Message events
  message_received: (message: Message) => void;
  message_sent: (data: {
    messageId: string;
    roomId: string;
    timestamp: string;
    status: string;
  }) => void;
  message_updated: (data: {
    id: string;
    content: string;
    editedAt: string;
    roomId: string;
  }) => void;
  message_removed: (data: {
    messageId: string;
    roomId: string;
    timestamp: string;
  }) => void;
  send_message_error: (error: WebSocketError & { roomId: string }) => void;
  edit_message_error: (error: WebSocketError & { messageId: string }) => void;
  delete_message_error: (error: WebSocketError & { messageId: string }) => void;

  // Presence events
  presence_updated: (data: { status: string; timestamp: string }) => void;
  presence_changed: (presence: UserPresence) => void;
  update_presence_error: (error: WebSocketError) => void;

  // Typing events
  user_typing: (indicator: TypingIndicator) => void;
  user_stopped_typing: (data: { userId: string; roomId: string; timestamp: string }) => void;

  // System events
  system_message: (data: {
    type: string;
    content: string;
    priority: string;
    timestamp: string;
  }) => void;
  rate_limit_exceeded: (data: {
    error: string;
    retryAfter: number;
    endpoint: string;
    timestamp: string;
  }) => void;

  // Health check
  pong: (data: { timestamp: string; serverTime: string }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners: Map<keyof WebSocketEvents, Function[]> = new Map();

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(WEBSOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      // Connection successful
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      // Server confirms connection with user data
      this.socket.on('connected', (data) => {
        console.log('Connection confirmed:', data);
        this.emit('connected', data);
        resolve();
      });

      // Connection failed
      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection failed:', error);
        this.isConnected = false;
        this.emit('connect_error', {
          error: 'connection_failed',
          message: error.message || 'Failed to connect',
          timestamp: new Date().toISOString()
        });
        reject(error);
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnected = false;
        this.emit('disconnect', reason);

        // Auto-reconnect for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          this.handleReconnection(token);
        }
      });

      // Set up all event listeners
      this.setupEventListeners();
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Room events
    this.socket.on('room_joined', (data) => this.emit('room_joined', data));
    this.socket.on('room_left', (data) => this.emit('room_left', data));
    this.socket.on('join_room_error', (error) => this.emit('join_room_error', error));
    this.socket.on('leave_room_error', (error) => this.emit('leave_room_error', error));

    // User events
    this.socket.on('user_joined', (data) => this.emit('user_joined', data));
    this.socket.on('user_left', (data) => this.emit('user_left', data));

    // Message events
    this.socket.on('message_received', (message) => this.emit('message_received', message));
    this.socket.on('message_sent', (data) => this.emit('message_sent', data));
    this.socket.on('message_updated', (data) => this.emit('message_updated', data));
    this.socket.on('message_removed', (data) => this.emit('message_removed', data));
    this.socket.on('send_message_error', (error) => this.emit('send_message_error', error));
    this.socket.on('edit_message_error', (error) => this.emit('edit_message_error', error));
    this.socket.on('delete_message_error', (error) => this.emit('delete_message_error', error));

    // Presence events
    this.socket.on('presence_updated', (data) => this.emit('presence_updated', data));
    this.socket.on('presence_changed', (presence) => this.emit('presence_changed', presence));
    this.socket.on('update_presence_error', (error) => this.emit('update_presence_error', error));

    // Typing events
    this.socket.on('user_typing', (indicator) => this.emit('user_typing', indicator));
    this.socket.on('user_stopped_typing', (data) => this.emit('user_stopped_typing', data));

    // System events
    this.socket.on('system_message', (data) => this.emit('system_message', data));
    this.socket.on('rate_limit_exceeded', (data) => this.emit('rate_limit_exceeded', data));

    // Health check
    this.socket.on('pong', (data) => this.emit('pong', data));
  }

  private handleReconnection(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(token).catch(console.error);
    }, delay);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventListeners.clear();
  }

  // Event emitter methods
  on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof WebSocketEvents>(event: K, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Room actions
  joinRoom(roomId: string, password?: string): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('join_room', { roomId, password });
  }

  leaveRoom(roomId: string): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('leave_room', { roomId });
  }

  // Message actions
  sendMessage(messageData: SendMessageRequest): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('send_message', messageData);
  }

  editMessage(messageId: string, content: string): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('edit_message', { messageId, content });
  }

  deleteMessage(messageId: string): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('delete_message', { messageId });
  }

  // Presence actions
  updatePresence(status: 'online' | 'away' | 'offline', currentRoom?: string): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('update_presence', { status, currentRoom });
  }

  // Typing indicators
  startTyping(roomId: string): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('start_typing', { roomId });
  }

  stopTyping(roomId: string): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('stop_typing', { roomId });
  }

  // Health check
  ping(): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('ping');
  }

  // Status getters
  get connected(): boolean {
    return this.isConnected && !!this.socket?.connected;
  }

  get connectionState(): string {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }
}

export const webSocketService = new WebSocketService();