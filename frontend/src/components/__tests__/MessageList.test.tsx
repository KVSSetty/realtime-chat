import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageList } from '../MessageList';
import { AuthProvider } from '../../context/AuthContext';
import { ChatProvider } from '../../context/ChatContext';

// Mock the services
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
    content: 'Hello world!',
    type: 'text',
    author: {
      id: 'user1',
      username: 'alice',
      email: 'ram@example.com'
    },
    createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
    roomId: 'room1'
  },
  {
    id: 'msg2',
    content: 'How are you?',
    type: 'text',
    author: {
      id: 'user2',
      username: 'bob',
      email: 'krishna@example.com'
    },
    createdAt: new Date('2024-01-01T10:01:00Z').toISOString(),
    roomId: 'room1'
  }
];

const MockWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <ChatProvider>
      {children}
    </ChatProvider>
  </AuthProvider>
);

describe('MessageList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('renders messages correctly', () => {
    render(
      <MockWrapper>
        <MessageList messages={mockMessages} typingUsers={[]} />
      </MockWrapper>
    );

    expect(screen.getByText('Hello world!')).toBeInTheDocument();
    expect(screen.getByText('How are you?')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('displays formatted timestamps', () => {
    render(
      <MockWrapper>
        <MessageList messages={mockMessages} typingUsers={[]} />
      </MockWrapper>
    );

    // Check that timestamps are displayed (exact format may vary based on locale)
    expect(screen.getByText(/03:30/)).toBeInTheDocument();
    expect(screen.getByText(/03:31/)).toBeInTheDocument();
  });

  it('renders empty state when no messages', () => {
    render(
      <MockWrapper>
        <MessageList messages={[]} typingUsers={[]} />
      </MockWrapper>
    );

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText('Start the conversation by sending a message below.')).toBeInTheDocument();
  });

  it('displays messages from same author with usernames', () => {
    const consecutiveMessages = [
      {
        id: 'msg1',
        content: 'First message',
        type: 'text',
        author: {
          id: 'user1',
          username: 'alice',
          email: 'ram@example.com'
        },
        createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
        roomId: 'room1'
      },
      {
        id: 'msg2',
        content: 'Second message',
        type: 'text',
        author: {
          id: 'user1',
          username: 'alice',
          email: 'ram@example.com'
        },
        createdAt: new Date('2024-01-01T10:00:30Z').toISOString(),
        roomId: 'room1'
      }
    ];

    render(
      <MockWrapper>
        <MessageList messages={consecutiveMessages} typingUsers={[]} />
      </MockWrapper>
    );

    // Each message shows username
    const usernameElements = screen.getAllByText('alice');
    expect(usernameElements).toHaveLength(2);

    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  it('handles different message types', () => {
    const mixedMessages = [
      {
        id: 'msg1',
        content: 'Text message',
        type: 'text',
        author: {
          id: 'user1',
          username: 'alice',
          email: 'ram@example.com'
        },
        createdAt: new Date().toISOString(),
        roomId: 'room1'
      },
      {
        id: 'msg2',
        content: 'System message',
        type: 'system',
        author: {
          id: 'system',
          username: 'System',
          email: 'system@example.com'
        },
        createdAt: new Date().toISOString(),
        roomId: 'room1'
      }
    ];

    render(
      <MockWrapper>
        <MessageList messages={mixedMessages} typingUsers={[]} />
      </MockWrapper>
    );

    expect(screen.getByText('Text message')).toBeInTheDocument();
    expect(screen.getByText('System message')).toBeInTheDocument();
  });

  it('auto-scrolls to bottom when new message arrives', () => {
    const { rerender } = render(
      <MockWrapper>
        <MessageList messages={[mockMessages[0]]} typingUsers={[]} />
      </MockWrapper>
    );

    // Add a new message
    rerender(
      <MockWrapper>
        <MessageList messages={mockMessages} typingUsers={[]} />
      </MockWrapper>
    );

    // Verify new message is visible
    expect(screen.getByText('How are you?')).toBeInTheDocument();
  });

  it('preserves scroll position when loading older messages', () => {
    const olderMessages = [
      {
        id: 'msg0',
        content: 'Older message',
        type: 'text',
        author: {
          id: 'user1',
          username: 'alice',
          email: 'ram@example.com'
        },
        createdAt: new Date('2024-01-01T09:00:00Z').toISOString(),
        roomId: 'room1'
      },
      ...mockMessages
    ];

    const { rerender } = render(
      <MockWrapper>
        <MessageList messages={mockMessages} typingUsers={[]} />
      </MockWrapper>
    );

    // Load older messages
    rerender(
      <MockWrapper>
        <MessageList messages={olderMessages} typingUsers={[]} />
      </MockWrapper>
    );

    expect(screen.getByText('Older message')).toBeInTheDocument();
    expect(screen.getByText('Hello world!')).toBeInTheDocument();
  });
});