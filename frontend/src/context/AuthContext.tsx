import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, UserSession, LoginRequest, RegisterRequest } from '../types';
import { apiService } from '../services/api';
import { webSocketService } from '../services/websocket';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: UserSession }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
        isAuthenticated: true
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
        isAuthenticated: false
      };

    case 'AUTH_LOGOUT':
      return {
        ...initialState
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        loading: false
      };

    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = apiService.getToken();
      if (token) {
        dispatch({ type: 'AUTH_START' });
        try {
          const user = await apiService.getCurrentUser();
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, token }
          });

          // Connect to WebSocket
          await webSocketService.connect(token);
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          // Only logout if it's definitely a token issue
          if (error instanceof Error && error.message.includes('Token has expired')) {
            console.log('Token expired during initialization, clearing session');
            apiService.logout();
            dispatch({ type: 'AUTH_LOGOUT' });
          } else {
            // For other errors, just mark as not loading but keep trying
            dispatch({ type: 'CLEAR_ERROR' });
          }
        }
      }
    };

    initializeAuth();
  }, []);

  // Periodic token validation (every 30 minutes)
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const validateToken = async () => {
      try {
        await apiService.getCurrentUser();
      } catch (error) {
        console.error('Token validation failed:', error);
        if (error instanceof Error && error.message.includes('Token has expired')) {
          console.log('Token expired during validation, logging out');
          logout();
        }
      }
    };

    // Validate immediately, then every 30 minutes
    validateToken();
    const interval = setInterval(validateToken, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated]);

  // Cleanup WebSocket on unmount or logout
  useEffect(() => {
    return () => {
      if (!state.isAuthenticated) {
        webSocketService.disconnect();
      }
    };
  }, [state.isAuthenticated]);

  const login = async (credentials: LoginRequest) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const session = await apiService.login(credentials);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: session
      });

      // Connect to WebSocket - this will establish connection before ChatContext initializes
      await webSocketService.connect(session.token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({
        type: 'AUTH_ERROR',
        payload: message
      });
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const session = await apiService.register(userData);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: session
      });

      // Connect to WebSocket
      await webSocketService.connect(session.token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch({
        type: 'AUTH_ERROR',
        payload: message
      });
      throw error;
    }
  };

  const logout = () => {
    apiService.logout();
    webSocketService.disconnect();
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const refreshAuth = async () => {
    if (!state.token) return;

    try {
      const session = await apiService.refreshToken();
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: session
      });
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}