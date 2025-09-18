import React from 'react';
import { useChat } from '../context/ChatContext';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatRoom() {
  const {
    currentRoom,
    currentRoomId,
    messages,
    typingUsers,
    participants,
    sendMessage,
    startTyping,
    stopTyping,
    connectionStatus
  } = useChat();

  if (!currentRoomId || !currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Welcome to Simple Chatbot</h3>
          <p className="text-gray-500 mb-4">Select a room from the sidebar to start chatting</p>
          <div className="text-sm text-gray-400">
            Real-time messaging • Message history • Typing indicators
          </div>
        </div>
      </div>
    );
  }

  const roomMessages = messages[currentRoomId] || [];
  const roomTypingUsers = typingUsers[currentRoomId] || [];
  const roomParticipants = participants[currentRoomId] || [];

  const typingUsernames = roomTypingUsers.map(t => t.username);

  const handleSendMessage = (content: string) => {
    if (currentRoomId) {
      sendMessage(currentRoomId, content);
    }
  };

  const handleStartTyping = () => {
    if (currentRoomId) {
      startTyping(currentRoomId);
    }
  };

  const handleStopTyping = () => {
    if (currentRoomId) {
      stopTyping(currentRoomId);
    }
  };

  const getRoomTypeIcon = () => {
    switch (currentRoom.type) {
      case 'private':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        );
      case 'direct':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Room Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          {getRoomTypeIcon()}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {currentRoom.name}
            </h1>
            {currentRoom.description && (
              <p className="text-sm text-gray-500">{currentRoom.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Participants count */}
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
            <span>{roomParticipants.length} member{roomParticipants.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400' :
              connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <span className="text-sm text-gray-500 capitalize">{connectionStatus}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={roomMessages}
        typingUsers={typingUsernames}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onStartTyping={handleStartTyping}
        onStopTyping={handleStopTyping}
        disabled={connectionStatus !== 'connected'}
        placeholder={
          connectionStatus === 'connected'
            ? `Message #${currentRoom.name}...`
            : 'Connecting...'
        }
      />
    </div>
  );
}