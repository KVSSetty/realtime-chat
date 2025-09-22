import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatRoom } from '../ChatRoom';
import { AuthProvider } from '../../context/AuthContext';
import { ChatProvider } from '../../context/ChatContext';

// Mock the services
const mockJoinRoom = jest.fn();
const mockLeaveRoom = jest.fn();
const mockLoadMessages = jest.fn();

jest.mock('../../services/websocket', () => ({
  webSocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}));

jest.mock('../../services/api', () => ({
  apiService: {
    getToken: jest.fn(() => null),
    getCurrentUser: jest.fn(),
    login: jest.fn()
  }
}));

const mockMessages = [
  {
    id: 'msg1',
    content: 'Hello everyone!',
    type: 'text',
    author: {
      id: 'user1',
      username: 'alice',
      email: 'ram@example.com'
    },
    createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
    roomId: 'room1'
  }
];

const mockRoom = {
  id: 'room1',
  name: 'General Chat',
  type: 'public' as const,
  description: 'Welcome to the general chat room',
  memberCount: 5,
  membership: {
    userId: 'user1',
    roomId: 'room1',
    role: 'member' as const,
    joinedAt: new Date().toISOString()
  }
};

// Mock the ChatContext
jest.mock('../../context/ChatContext', () => ({
  ...jest.requireActual('../../context/ChatContext'),
  useChat: () => ({
    currentRoom: mockRoom,
    messages: mockMessages,
    joinRoom: mockJoinRoom,
    leaveRoom: mockLeaveRoom,
    loadMessages: mockLoadMessages,
    typing: [],
    loading: false,
    error: null
  })
}));

// Mock child components
jest.mock('../MessageList', () => ({
  MessageList: ({ messages }: any) => (
    <div data-testid="message-list">
      {messages.map((msg: any) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  )
}));

jest.mock('../MessageInput', () => ({
  MessageInput: () => <div data-testid="message-input">Message Input</div>
}));

const MockWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <ChatProvider>
      {children}
    </ChatProvider>
  </AuthProvider>
);

describe('ChatRoom Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders room header with room information', () => {
    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    expect(screen.getByText('General Chat')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the general chat room')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
  });

  it('renders message list and input', () => {
    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
  });

  it('joins room on mount when roomId changes', async () => {
    const { rerender } = render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    await waitFor(() => {
      expect(mockJoinRoom).toHaveBeenCalledWith('room1');
    });

    // Change room
    rerender(
      <MockWrapper>
        <ChatRoom roomId="room2" />
      </MockWrapper>
    );

    await waitFor(() => {
      expect(mockJoinRoom).toHaveBeenCalledWith('room2');
    });
  });

  it('displays typing indicators when users are typing', () => {
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: mockRoom,
        messages: mockMessages,
        joinRoom: mockJoinRoom,
        leaveRoom: mockLeaveRoom,
        loadMessages: mockLoadMessages,
        typing: [
          { userId: 'user2', username: 'bob' },
          { userId: 'user3', username: 'charlie' }
        ],
        loading: false,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    expect(screen.getByText('bob, charlie are typing...')).toBeInTheDocument();
  });

  it('displays single user typing indicator', () => {
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: mockRoom,
        messages: mockMessages,
        joinRoom: mockJoinRoom,
        leaveRoom: mockLeaveRoom,
        loadMessages: mockLoadMessages,
        typing: [{ userId: 'user2', username: 'bob' }],
        loading: false,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    expect(screen.getByText('bob is typing...')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: null,
        messages: [],
        joinRoom: mockJoinRoom,
        leaveRoom: mockLeaveRoom,
        loadMessages: mockLoadMessages,
        typing: [],
        loading: true,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    expect(screen.getByText('Loading room...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: null,
        messages: [],
        joinRoom: mockJoinRoom,
        leaveRoom: mockLeaveRoom,
        loadMessages: mockLoadMessages,
        typing: [],
        loading: false,
        error: 'Failed to join room'
      })
    }));

    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    expect(screen.getByText('Error: Failed to join room')).toBeInTheDocument();
  });

  it('displays room not found state', () => {
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: null,
        messages: [],
        joinRoom: mockJoinRoom,
        leaveRoom: mockLeaveRoom,
        loadMessages: mockLoadMessages,
        typing: [],
        loading: false,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    expect(screen.getByText('Room not found')).toBeInTheDocument();
    expect(screen.getByText('The room you are looking for does not exist or you do not have access to it.')).toBeInTheDocument();
  });

  it('handles room without description', () => {
    const roomWithoutDescription = {
      ...mockRoom,
      description: undefined
    };

    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: roomWithoutDescription,
        messages: mockMessages,
        joinRoom: mockJoinRoom,
        leaveRoom: mockLeaveRoom,
        loadMessages: mockLoadMessages,
        typing: [],
        loading: false,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    expect(screen.getByText('General Chat')).toBeInTheDocument();
    expect(screen.queryByText('Welcome to the general chat room')).not.toBeInTheDocument();
  });

  it('displays member count correctly', () => {
    const roomWithDifferentCount = {
      ...mockRoom,
      memberCount: 1
    };

    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: roomWithDifferentCount,
        messages: mockMessages,
        joinRoom: mockJoinRoom,
        leaveRoom: mockLeaveRoom,
        loadMessages: mockLoadMessages,
        typing: [],
        loading: false,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  it('loads more messages when scrolled to top', async () => {
    render(
      <MockWrapper>
        <ChatRoom roomId="room1" />
      </MockWrapper>
    );

    // Simulate scroll to top event
    const messageContainer = screen.getByTestId('message-list').parentElement;
    if (messageContainer) {
      Object.defineProperty(messageContainer, 'scrollTop', { value: 0 });
      Object.defineProperty(messageContainer, 'scrollHeight', { value: 1000 });
      Object.defineProperty(messageContainer, 'clientHeight', { value: 400 });

      // Trigger scroll event
      const scrollEvent = new Event('scroll');
      messageContainer.dispatchEvent(scrollEvent);
    }

    // Should attempt to load more messages
    await waitFor(() => {
      expect(mockLoadMessages).toHaveBeenCalledWith('room1');
    });
  });
});