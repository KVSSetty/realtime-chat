import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  Message,
  RoomWithMembership,
  RoomParticipant,
  TypingIndicator,
  UserPresence
} from '../types';
import { webSocketService } from '../services/websocket';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface ChatState {
  rooms: RoomWithMembership[];
  currentRoomId: string | null;
  currentRoom: RoomWithMembership | null;
  messages: { [roomId: string]: Message[] };
  participants: { [roomId: string]: RoomParticipant[] };
  typingUsers: { [roomId: string]: TypingIndicator[] };
  presenceStatus: { [userId: string]: UserPresence };
  loading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connecting' | 'connected' | 'disconnected' }
  | { type: 'SET_ROOMS'; payload: RoomWithMembership[] }
  | { type: 'ADD_ROOM'; payload: RoomWithMembership }
  | { type: 'UPDATE_ROOM'; payload: RoomWithMembership }
  | { type: 'SET_CURRENT_ROOM'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: { roomId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { roomId: string; messageId: string; content: string; editedAt: string } }
  | { type: 'REMOVE_MESSAGE'; payload: { roomId: string; messageId: string } }
  | { type: 'SET_PARTICIPANTS'; payload: { roomId: string; participants: RoomParticipant[] } }
  | { type: 'ADD_PARTICIPANT'; payload: { roomId: string; participant: RoomParticipant } }
  | { type: 'REMOVE_PARTICIPANT'; payload: { roomId: string; userId: string } }
  | { type: 'SET_TYPING'; payload: { roomId: string; users: TypingIndicator[] } }
  | { type: 'ADD_TYPING'; payload: TypingIndicator }
  | { type: 'REMOVE_TYPING'; payload: { roomId: string; userId: string } }
  | { type: 'UPDATE_PRESENCE'; payload: UserPresence }
  | { type: 'CLEAR_CHAT_DATA' };

const initialState: ChatState = {
  rooms: [],
  currentRoomId: null,
  currentRoom: null,
  messages: {},
  participants: {},
  typingUsers: {},
  presenceStatus: {},
  loading: false,
  error: null,
  connectionStatus: 'disconnected'
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_ROOMS':
      return { ...state, rooms: action.payload };

    case 'ADD_ROOM':
      return {
        ...state,
        rooms: [...state.rooms, action.payload]
      };

    case 'UPDATE_ROOM':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.payload.id ? action.payload : room
        ),
        currentRoom: state.currentRoomId === action.payload.id ? action.payload : state.currentRoom
      };

    case 'SET_CURRENT_ROOM':
      return {
        ...state,
        currentRoomId: action.payload,
        currentRoom: action.payload
          ? state.rooms.find(room => room.id === action.payload) || null
          : null
      };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: action.payload.messages
        }
      };

    case 'ADD_MESSAGE':
      const roomMessages = state.messages[action.payload.roomId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: [...roomMessages, action.payload]
        }
      };

    case 'UPDATE_MESSAGE':
      const { roomId, messageId, content, editedAt } = action.payload;
      const updatedMessages = (state.messages[roomId] || []).map(msg =>
        msg.id === messageId
          ? { ...msg, content, editedAt }
          : msg
      );
      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: updatedMessages
        }
      };

    case 'REMOVE_MESSAGE':
      const filteredMessages = (state.messages[action.payload.roomId] || []).filter(
        msg => msg.id !== action.payload.messageId
      );
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: filteredMessages
        }
      };

    case 'SET_PARTICIPANTS':
      return {
        ...state,
        participants: {
          ...state.participants,
          [action.payload.roomId]: action.payload.participants
        }
      };

    case 'ADD_PARTICIPANT':
      const roomParticipants = state.participants[action.payload.roomId] || [];
      return {
        ...state,
        participants: {
          ...state.participants,
          [action.payload.roomId]: [...roomParticipants, action.payload.participant]
        }
      };

    case 'REMOVE_PARTICIPANT':
      const updatedParticipants = (state.participants[action.payload.roomId] || []).filter(
        p => p.userId !== action.payload.userId
      );
      return {
        ...state,
        participants: {
          ...state.participants,
          [action.payload.roomId]: updatedParticipants
        }
      };

    case 'SET_TYPING':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.roomId]: action.payload.users
        }
      };

    case 'ADD_TYPING':
      const currentTyping = state.typingUsers[action.payload.roomId] || [];
      const isAlreadyTyping = currentTyping.some(t => t.userId === action.payload.userId);
      if (isAlreadyTyping) return state;

      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.roomId]: [...currentTyping, action.payload]
        }
      };

    case 'REMOVE_TYPING':
      const filteredTyping = (state.typingUsers[action.payload.roomId] || []).filter(
        t => t.userId !== action.payload.userId
      );
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.roomId]: filteredTyping
        }
      };

    case 'UPDATE_PRESENCE':
      return {
        ...state,
        presenceStatus: {
          ...state.presenceStatus,
          [action.payload.userId]: action.payload
        }
      };

    case 'CLEAR_CHAT_DATA':
      return initialState;

    default:
      return state;
  }
}

interface ChatContextType extends ChatState {
  // Room actions
  loadRooms: () => Promise<void>;
  createRoom: (roomData: {
    id: string;
    name: string;
    description?: string;
    type: 'public' | 'private';
  }) => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  setCurrentRoom: (roomId: string | null) => void;

  // Message actions
  sendMessage: (roomId: string, content: string) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  loadMessages: (roomId: string) => Promise<void>;

  // Typing actions
  startTyping: (roomId: string) => void;
  stopTyping: (roomId: string) => void;

  // Utility
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'CLEAR_CHAT_DATA' });
      return;
    }

    // Check current connection status when setting up listeners
    const checkConnectionStatus = () => {
      const currentConnectionState = webSocketService.connectionState;
      if (currentConnectionState === 'connected') {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      } else if (currentConnectionState === 'disconnected') {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
      } else {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
      }
    };

    // Initial check
    checkConnectionStatus();

    // Check again after a short delay to catch any race conditions
    const statusCheckTimeout = setTimeout(checkConnectionStatus, 100);

    // Connection events
    webSocketService.on('connected', (data) => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
    });

    webSocketService.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    });

    webSocketService.on('connect_error', (error) => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
      dispatch({ type: 'SET_ERROR', payload: error.message });
    });

    // Room events
    webSocketService.on('room_joined', (data) => {
      // Update messages and participants when joining a room
      dispatch({
        type: 'SET_MESSAGES',
        payload: { roomId: data.roomId, messages: data.recentMessages }
      });
      dispatch({
        type: 'SET_PARTICIPANTS',
        payload: { roomId: data.roomId, participants: data.members }
      });
    });

    webSocketService.on('user_joined', (data) => {
      if (user) {
        const participant: RoomParticipant = {
          userId: data.user.id,
          username: data.user.username,
          role: 'member',
          joinedAt: data.timestamp,
          isOnline: true
        };
        dispatch({
          type: 'ADD_PARTICIPANT',
          payload: { roomId: data.roomId, participant }
        });
      }
    });

    webSocketService.on('user_left', (data) => {
      dispatch({
        type: 'REMOVE_PARTICIPANT',
        payload: { roomId: data.roomId, userId: data.user.id }
      });
    });

    // Message events
    webSocketService.on('message_received', (message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    });

    webSocketService.on('message_updated', (data) => {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          roomId: data.roomId,
          messageId: data.id,
          content: data.content,
          editedAt: data.editedAt
        }
      });
    });

    webSocketService.on('message_removed', (data) => {
      dispatch({
        type: 'REMOVE_MESSAGE',
        payload: { roomId: data.roomId, messageId: data.messageId }
      });
    });

    // Typing events
    webSocketService.on('user_typing', (indicator) => {
      dispatch({ type: 'ADD_TYPING', payload: indicator });

      // Auto-remove typing indicator after 3 seconds
      setTimeout(() => {
        dispatch({
          type: 'REMOVE_TYPING',
          payload: { roomId: indicator.roomId, userId: indicator.userId }
        });
      }, 3000);
    });

    webSocketService.on('user_stopped_typing', (data) => {
      dispatch({
        type: 'REMOVE_TYPING',
        payload: { roomId: data.roomId, userId: data.userId }
      });
    });

    // Presence events
    webSocketService.on('presence_changed', (presence) => {
      dispatch({ type: 'UPDATE_PRESENCE', payload: presence });
    });

    // Error handling
    webSocketService.on('send_message_error', (error) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    });

    // Cleanup function
    return () => {
      // Clear the status check timeout
      clearTimeout(statusCheckTimeout);
      // Remove all listeners (WebSocketService handles this internally)
    };
  }, [isAuthenticated, user]);

  // Load user's rooms on authentication
  useEffect(() => {
    if (isAuthenticated) {
      loadRooms();
    }
  }, [isAuthenticated]);

  const loadRooms = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const rooms = await apiService.getUserRooms();
      dispatch({ type: 'SET_ROOMS', payload: rooms });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load rooms';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createRoom = async (roomData: {
    id: string;
    name: string;
    description?: string;
    type: 'public' | 'private';
  }) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Create room via API
      const room = await apiService.createRoom(roomData);

      // Add to local state as RoomWithMembership
      const roomWithMembership: RoomWithMembership = {
        ...room,
        membership: {
          id: `${room.id}-${user!.id}`,
          userId: user!.id,
          roomId: room.id,
          role: 'owner',
          joinedAt: new Date().toISOString(),
          lastReadAt: new Date().toISOString(),
          notifications: true
        },
        memberCount: 1,
        lastMessage: undefined
      };

      dispatch({ type: 'ADD_ROOM', payload: roomWithMembership });

      // Auto-join the room via WebSocket
      webSocketService.joinRoom(room.id);

      // Set as current room
      dispatch({ type: 'SET_CURRENT_ROOM', payload: room.id });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create room';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const joinRoom = async (roomId: string) => {
    try {
      // Join via API first
      await apiService.joinRoom(roomId);

      // Then join via WebSocket
      webSocketService.joinRoom(roomId);

      // Reload rooms to get updated membership
      await loadRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join room';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const leaveRoom = async (roomId: string) => {
    try {
      // Leave via WebSocket first
      webSocketService.leaveRoom(roomId);

      // Then via API
      await apiService.leaveRoom(roomId);

      // Clear current room if it's the one being left
      if (state.currentRoomId === roomId) {
        dispatch({ type: 'SET_CURRENT_ROOM', payload: null });
      }

      // Reload rooms
      await loadRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to leave room';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const setCurrentRoom = (roomId: string | null) => {
    dispatch({ type: 'SET_CURRENT_ROOM', payload: roomId });

    // Join the room via WebSocket and load messages
    if (roomId) {
      // Join via WebSocket to receive real-time updates
      try {
        webSocketService.joinRoom(roomId);
      } catch (error) {
        console.error('Failed to join room via WebSocket:', error);
      }

      // Load messages if not already loaded
      if (!state.messages[roomId]) {
        loadMessages(roomId);
      }
    }
  };

  const sendMessage = (roomId: string, content: string) => {
    if (!content.trim()) return;

    webSocketService.sendMessage({
      roomId,
      content: content.trim(),
      type: 'text'
    });
  };

  const editMessage = (messageId: string, content: string) => {
    webSocketService.editMessage(messageId, content);
  };

  const deleteMessage = (messageId: string) => {
    webSocketService.deleteMessage(messageId);
  };

  const loadMessages = async (roomId: string) => {
    try {
      const messageHistory = await apiService.getMessageHistory(roomId, 50);
      dispatch({
        type: 'SET_MESSAGES',
        payload: { roomId, messages: messageHistory.messages }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load messages';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  };

  const startTyping = (roomId: string) => {
    webSocketService.startTyping(roomId);
  };

  const stopTyping = (roomId: string) => {
    webSocketService.stopTyping(roomId);
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const value: ChatContextType = {
    ...state,
    loadRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    setCurrentRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMessages,
    startTyping,
    stopTyping,
    clearError
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}