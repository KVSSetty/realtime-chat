import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Chat } from './components/Chat';

function AuthWrapper() {
  const { isAuthenticated, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" message="Connecting to Simple Chatbot..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  return (
    <ChatProvider>
      <Chat />
    </ChatProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthWrapper />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
