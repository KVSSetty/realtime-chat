import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Register } from '../Register';
import { AuthProvider } from '../../context/AuthContext';

// Mock the useAuth hook
const mockRegister = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: () => ({
    register: mockRegister,
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
    register: jest.fn()
  }
}));

describe('Register Component', () => {
  const mockOnSwitchToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders registration form', () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('calls onSwitchToLogin when sign in link is clicked', () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    const signInLink = screen.getByText('sign in instead');
    fireEvent.click(signInLink);

    expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  it('updates form fields when user types', () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    const usernameInput = screen.getByLabelText('Username') as HTMLInputElement;
    const emailInput = screen.getByLabelText('Email address') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('Confirm Password') as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    expect(usernameInput.value).toBe('testuser');
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
    expect(confirmPasswordInput.value).toBe('password123');
  });

  it('submits form with correct data', async () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockClearError).toHaveBeenCalledTimes(1);
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('prevents submission with empty fields', async () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    // Form should not submit due to required fields
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows validation error for password mismatch', async () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows validation error for weak password', async () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid email format', async () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid username', async () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(usernameInput, { target: { value: 'ab' } }); // Too short
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters long')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('clears error when form is submitted', async () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockClearError).toHaveBeenCalledTimes(1);
    });
  });

  it('displays terms and conditions', () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} />);

    expect(screen.getByText(/By creating an account, you agree to our/)).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });
});

// Test with loading state
describe('Register Component - Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock loading state
    jest.doMock('../../context/AuthContext', () => ({
      ...jest.requireActual('../../context/AuthContext'),
      useAuth: () => ({
        register: mockRegister,
        loading: true,
        error: null,
        clearError: mockClearError
      })
    }));
  });

  it('shows loading state when submitting', () => {
    render(<Register onSwitchToLogin={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: /creating account/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Creating account...')).toBeInTheDocument();
  });
});

// Test with error state
describe('Register Component - Error State', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock error state
    jest.doMock('../../context/AuthContext', () => ({
      ...jest.requireActual('../../context/AuthContext'),
      useAuth: () => ({
        register: mockRegister,
        loading: false,
        error: 'Registration failed. Email already exists.',
        clearError: mockClearError
      })
    }));
  });

  it('displays error message when registration fails', () => {
    render(<Register onSwitchToLogin={jest.fn()} />);

    expect(screen.getByText('Registration failed. Email already exists.')).toBeInTheDocument();
  });
});