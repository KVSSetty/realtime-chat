import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from '../Login';
import { AuthProvider } from '../../context/AuthContext';

// Mock the useAuth hook
const mockLogin = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: () => ({
    login: mockLogin,
    loading: false,
    error: null,
    clearError: mockClearError
  })
}));

// Mock the websocket service
jest.mock('../../services/websocket', () => ({
  webSocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}));

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    getToken: jest.fn(() => null),
    getCurrentUser: jest.fn(),
    login: jest.fn()
  }
}));

describe('Login Component', () => {
  const mockOnSwitchToRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form', () => {
    render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    expect(screen.getByText('Sign in to Realtime Chat')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays demo account information', () => {
    render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    expect(screen.getByText('Demo accounts available after seeding the database:')).toBeInTheDocument();
    expect(screen.getByText('ram@example.com / password123')).toBeInTheDocument();
    expect(screen.getByText('krishna@example.com / password123')).toBeInTheDocument();
    expect(screen.getByText('vishnu@example.com / password123')).toBeInTheDocument();
  });

  it('calls onSwitchToRegister when create account link is clicked', () => {
    render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    const createAccountLink = screen.getByText('create a new account');
    fireEvent.click(createAccountLink);

    expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
  });

  it('updates form fields when user types', () => {
    render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    const emailInput = screen.getByLabelText('Email address') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('submits form with correct data', async () => {
    render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockClearError).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('prevents submission with empty fields', async () => {
    render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    // Form should not submit due to required fields
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('clears error when form is submitted', async () => {
    render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockClearError).toHaveBeenCalledTimes(1);
    });
  });
});

// Test with loading state
describe('Login Component - Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock loading state
    jest.doMock('../../context/AuthContext', () => ({
      ...jest.requireActual('../../context/AuthContext'),
      useAuth: () => ({
        login: mockLogin,
        loading: true,
        error: null,
        clearError: mockClearError
      })
    }));
  });

  it('shows loading state when submitting', () => {
    render(<Login onSwitchToRegister={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: /signing in/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
  });
});

// Test with error state
describe('Login Component - Error State', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock error state
    jest.doMock('../../context/AuthContext', () => ({
      ...jest.requireActual('../../context/AuthContext'),
      useAuth: () => ({
        login: mockLogin,
        loading: false,
        error: 'Invalid email or password',
        clearError: mockClearError
      })
    }));
  });

  it('displays error message when login fails', () => {
    render(<Login onSwitchToRegister={jest.fn()} />);

    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });
});