import {
  User,
  UserSession,
  LoginRequest,
  RegisterRequest,
  ChatRoom,
  RoomWithMembership,
  MessageHistory,
  RoomParticipant
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('chatbot_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<UserSession> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    // Store token in localStorage
    localStorage.setItem('chatbot_token', response.token);

    return {
      user: response.user,
      token: response.token
    };
  }

  async register(userData: RegisterRequest): Promise<UserSession> {
    const response = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    // Store token in localStorage
    localStorage.setItem('chatbot_token', response.token);

    return {
      user: response.user,
      token: response.token
    };
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{ user: User }>('/auth/me');
    return response.user;
  }

  async refreshToken(): Promise<UserSession> {
    const token = localStorage.getItem('chatbot_token');
    if (!token) {
      throw new Error('No token to refresh');
    }

    const response = await this.request<{ user: User; token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token })
    });

    localStorage.setItem('chatbot_token', response.token);

    return {
      user: response.user,
      token: response.token
    };
  }

  logout(): void {
    localStorage.removeItem('chatbot_token');
  }

  // Rooms
  async getPublicRooms(limit: number = 20, offset: number = 0): Promise<ChatRoom[]> {
    const response = await this.request<{ rooms: ChatRoom[] }>(
      `/rooms/public?limit=${limit}&offset=${offset}`
    );
    return response.rooms;
  }

  async getUserRooms(): Promise<RoomWithMembership[]> {
    const response = await this.request<{ rooms: RoomWithMembership[] }>('/rooms/my');
    return response.rooms;
  }

  async getRoomById(roomId: string): Promise<RoomWithMembership> {
    const response = await this.request<{ room: RoomWithMembership }>(`/rooms/${roomId}`);
    return response.room;
  }

  async createRoom(roomData: {
    id: string;
    name: string;
    description?: string;
    type: 'public' | 'private';
    settings?: Record<string, any>;
  }): Promise<ChatRoom> {
    const response = await this.request<{ room: ChatRoom }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData)
    });
    return response.room;
  }

  async joinRoom(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}/join`, {
      method: 'POST'
    });
  }

  async leaveRoom(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}/leave`, {
      method: 'POST'
    });
  }

  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    const response = await this.request<{ participants: RoomParticipant[] }>(
      `/rooms/${roomId}/participants`
    );
    return response.participants;
  }

  async getMessageHistory(
    roomId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<MessageHistory> {
    let url = `/rooms/${roomId}/messages?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }

    return await this.request<MessageHistory>(url);
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!localStorage.getItem('chatbot_token');
  }

  getToken(): string | null {
    return localStorage.getItem('chatbot_token');
  }
}

export const apiService = new ApiService();