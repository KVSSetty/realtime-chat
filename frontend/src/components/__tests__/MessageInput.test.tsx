import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '../MessageInput';
import { AuthProvider } from '../../context/AuthContext';
import { ChatProvider } from '../../context/ChatContext';

// Mock the services
const mockSendMessage = jest.fn();
const mockStartTyping = jest.fn();
const mockStopTyping = jest.fn();

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

// Mock the ChatContext
jest.mock('../../context/ChatContext', () => ({
  ...jest.requireActual('../../context/ChatContext'),
  useChat: () => ({
    sendMessage: mockSendMessage,
    startTyping: mockStartTyping,
    stopTyping: mockStopTyping,
    currentRoom: {
      id: 'room1',
      name: 'Test Room',
      type: 'public'
    }
  })
}));

const MockWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <ChatProvider>
      {children}
    </ChatProvider>
  </AuthProvider>
);

describe('MessageInput Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders message input field', () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'Hello world!');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('room1', 'Hello world!');
    });

    // Input should be cleared after sending
    expect(input).toHaveValue('');
  });

  it('sends message when Enter key is pressed', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const input = screen.getByPlaceholderText('Type a message...');

    await userEvent.type(input, 'Hello world!');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('room1', 'Hello world!');
    });
  });

  it('does not send message when Shift+Enter is pressed', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const input = screen.getByPlaceholderText('Type a message...');

    await userEvent.type(input, 'Line 1');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await userEvent.type(input, 'Line 2');

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(input).toHaveValue('Line 1\nLine 2');
  });

  it('prevents sending empty messages', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.click(sendButton);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('trims whitespace from messages', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const input = screen.getByPlaceholderText('Type a message...');

    await userEvent.type(input, '  Hello world!  ');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('room1', 'Hello world!');
    });
  });

  it('handles typing indicators', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const input = screen.getByPlaceholderText('Type a message...');

    // Start typing
    await userEvent.type(input, 'H');

    await waitFor(() => {
      expect(mockStartTyping).toHaveBeenCalledWith('room1');
    });

    // Continue typing (should not trigger start typing again)
    await userEvent.type(input, 'ello');

    expect(mockStartTyping).toHaveBeenCalledTimes(1);

    // Clear input (should trigger stop typing)
    await userEvent.clear(input);

    await waitFor(() => {
      expect(mockStopTyping).toHaveBeenCalledWith('room1');
    });
  });

  it('stops typing when message is sent', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const input = screen.getByPlaceholderText('Type a message...');

    await userEvent.type(input, 'Hello world!');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockStopTyping).toHaveBeenCalledWith('room1');
      expect(mockSendMessage).toHaveBeenCalledWith('room1', 'Hello world!');
    });
  });

  it('disables send button when no room is selected', () => {
    // Mock no current room
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        sendMessage: mockSendMessage,
        startTyping: mockStartTyping,
        stopTyping: mockStopTyping,
        currentRoom: null
      })
    }));

    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('handles long messages gracefully', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const input = screen.getByPlaceholderText('Type a message...');
    const longMessage = 'a'.repeat(1000);

    await userEvent.type(input, longMessage);
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('room1', longMessage);
    });
  });

  it('handles special characters in messages', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const input = screen.getByPlaceholderText('Type a message...');
    const specialMessage = 'Hello! 🎉 How are you? <script>alert("test")</script>';

    await userEvent.type(input, specialMessage);
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('room1', specialMessage);
    });
  });

  it('maintains focus after sending message', async () => {
    render(
      <MockWrapper>
        <MessageInput />
      </MockWrapper>
    );

    const input = screen.getByPlaceholderText('Type a message...');

    await userEvent.type(input, 'Hello world!');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });
});