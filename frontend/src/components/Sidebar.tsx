import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { RoomWithMembership } from '../types';

export function Sidebar() {
  const { user, logout } = useAuth();
  const {
    rooms,
    currentRoomId,
    setCurrentRoom,
    connectionStatus,
    loading
  } = useChat();

  const handleRoomClick = (roomId: string) => {
    setCurrentRoom(roomId);
  };

  const formatLastMessage = (room: RoomWithMembership) => {
    if (!room.lastMessage) return 'No messages yet';

    const { content, user: messageUser } = room.lastMessage;
    const truncated = content.length > 50 ? content.substring(0, 50) + '...' : content;
    return `${messageUser.username}: ${truncated}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-900">{user?.username}</h2>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400' :
                connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-xs text-gray-500 capitalize">{connectionStatus}</span>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-gray-400 hover:text-gray-600 focus:outline-none"
          title="Logout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Chat Rooms
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No rooms available</p>
              <p className="text-xs text-gray-400 mt-1">Join a room to start chatting</p>
            </div>
          ) : (
            <div className="space-y-1">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(room.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentRoomId === room.id
                      ? 'bg-indigo-100 border border-indigo-200'
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-medium truncate ${
                      currentRoomId === room.id ? 'text-indigo-900' : 'text-gray-900'
                    }`}>
                      # {room.name}
                    </h4>
                    <div className="flex items-center space-x-1">
                      {room.type === 'private' && (
                        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="text-xs text-gray-500">{room.memberCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 truncate flex-1">
                      {formatLastMessage(room)}
                    </p>
                    {room.lastMessage && (
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {formatTime(room.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="text-xs text-gray-500 text-center">
          Simple Chatbot v1.0
        </div>
      </div>
    </div>
  );
}