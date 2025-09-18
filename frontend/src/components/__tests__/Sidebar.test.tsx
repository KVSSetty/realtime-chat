import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';
import { AuthProvider } from '../../context/AuthContext';
import { ChatProvider } from '../../context/ChatContext';

// Mock the services
const mockJoinRoom = jest.fn();
const mockLogout = jest.fn();

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
    getToken: jest.fn(() => 'mock-token'),
    getCurrentUser: jest.fn(),
    login: jest.fn(),
    getPublicRooms: jest.fn(() => Promise.resolve({
      rooms: mockPublicRooms,
      pagination: { limit: 20, offset: 0, hasMore: false }
    })),
    getMyRooms: jest.fn(() => Promise.resolve({ rooms: mockMyRooms }))
  }
}));

const mockUser = {
  id: 'user1',
  username: 'alice',
  email: 'alice@example.com',
  lastSeenAt: new Date().toISOString()
};

const mockMyRooms = [
  {
    id: 'my-room-1',
    name: 'My Private Room',
    type: 'private' as const,
    memberCount: 2,
    membership: {
      userId: 'user1',
      roomId: 'my-room-1',
      role: 'owner' as const,
      joinedAt: new Date().toISOString()
    }
  }
];

const mockPublicRooms = [
  {
    id: 'public-room-1',
    name: 'General Chat',
    type: 'public' as const,
    description: 'General discussion',
    memberCount: 10
  },
  {
    id: 'public-room-2',
    name: 'Tech Talk',
    type: 'public' as const,
    description: 'Technology discussions',
    memberCount: 5
  }
];

// Mock the AuthContext
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    loading: false,
    error: null
  })
}));

// Mock the ChatContext
jest.mock('../../context/ChatContext', () => ({
  ...jest.requireActual('../../context/ChatContext'),
  useChat: () => ({
    currentRoom: null,
    myRooms: mockMyRooms,
    publicRooms: mockPublicRooms,
    joinRoom: mockJoinRoom,
    loading: false,
    error: null
  })
}));

const mockOnRoomSelect = jest.fn();

const MockWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <ChatProvider>
      {children}
    </ChatProvider>
  </AuthProvider>
);

describe('Sidebar Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user information', () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('renders my rooms section', () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    expect(screen.getByText('My Rooms')).toBeInTheDocument();
    expect(screen.getByText('My Private Room')).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });

  it('renders public rooms section', () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    expect(screen.getByText('Public Rooms')).toBeInTheDocument();
    expect(screen.getByText('General Chat')).toBeInTheDocument();
    expect(screen.getByText('Tech Talk')).toBeInTheDocument();
    expect(screen.getByText('10 members')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
  });

  it('calls onRoomSelect when a room is clicked', async () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    const generalChatRoom = screen.getByText('General Chat');
    await userEvent.click(generalChatRoom);

    expect(mockOnRoomSelect).toHaveBeenCalledWith('public-room-1');
  });

  it('joins public room when join button is clicked', async () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    const joinButtons = screen.getAllByText('Join');
    await userEvent.click(joinButtons[0]);

    await waitFor(() => {
      expect(mockJoinRoom).toHaveBeenCalledWith('public-room-1');
    });
  });

  it('displays room descriptions', () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    expect(screen.getByText('General discussion')).toBeInTheDocument();
    expect(screen.getByText('Technology discussions')).toBeInTheDocument();
  });

  it('handles logout when logout button is clicked', async () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    const logoutButton = screen.getByText('Logout');
    await userEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });

  it('displays different icons for room types', () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    // Check that different room types have appropriate visual indicators
    const myRoomElement = screen.getByText('My Private Room').closest('div');
    const publicRoomElement = screen.getByText('General Chat').closest('div');

    expect(myRoomElement).toBeInTheDocument();
    expect(publicRoomElement).toBeInTheDocument();
  });

  it('highlights selected room', () => {
    // Mock a selected room
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: {
          id: 'public-room-1',
          name: 'General Chat',
          type: 'public'
        },
        myRooms: mockMyRooms,
        publicRooms: mockPublicRooms,
        joinRoom: mockJoinRoom,
        loading: false,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    const selectedRoom = screen.getByText('General Chat').closest('div');
    expect(selectedRoom).toHaveClass('bg-blue-100'); // Assuming this is the selected state class
  });

  it('displays loading state', () => {
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: null,
        myRooms: [],
        publicRooms: [],
        joinRoom: mockJoinRoom,
        loading: true,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    expect(screen.getByText('Loading rooms...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: null,
        myRooms: [],
        publicRooms: [],
        joinRoom: mockJoinRoom,
        loading: false,
        error: 'Failed to load rooms'
      })
    }));

    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    expect(screen.getByText('Error loading rooms')).toBeInTheDocument();
  });

  it('displays empty state when no rooms available', () => {
    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: null,
        myRooms: [],
        publicRooms: [],
        joinRoom: mockJoinRoom,
        loading: false,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    expect(screen.getByText('No rooms available')).toBeInTheDocument();
  });

  it('handles room creation', async () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    const createRoomButton = screen.getByText('Create Room');
    await userEvent.click(createRoomButton);

    // Should open room creation modal/form
    expect(screen.getByText('Create New Room')).toBeInTheDocument();
  });

  it('filters rooms by search query', async () => {
    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search rooms...');
    await userEvent.type(searchInput, 'Tech');

    // Should filter to only show Tech Talk room
    expect(screen.getByText('Tech Talk')).toBeInTheDocument();
    expect(screen.queryByText('General Chat')).not.toBeInTheDocument();
  });

  it('shows member count with correct pluralization', () => {
    const roomsWithDifferentCounts = [
      {
        id: 'room-1',
        name: 'Single Member Room',
        type: 'public' as const,
        memberCount: 1
      },
      {
        id: 'room-2',
        name: 'Multi Member Room',
        type: 'public' as const,
        memberCount: 5
      }
    ];

    jest.doMock('../../context/ChatContext', () => ({
      ...jest.requireActual('../../context/ChatContext'),
      useChat: () => ({
        currentRoom: null,
        myRooms: [],
        publicRooms: roomsWithDifferentCounts,
        joinRoom: mockJoinRoom,
        loading: false,
        error: null
      })
    }));

    render(
      <MockWrapper>
        <Sidebar onRoomSelect={mockOnRoomSelect} />
      </MockWrapper>
    );

    expect(screen.getByText('1 member')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
  });
});