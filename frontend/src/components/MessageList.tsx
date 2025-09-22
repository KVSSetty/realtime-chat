import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { useAuth } from '../context/AuthContext';

interface MessageListProps {
  messages: Message[];
  typingUsers: string[];
}

export function MessageList({ messages, typingUsers }: MessageListProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Don't render if user is not available
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const shouldShowDateDivider = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;

    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);

    return currentDate.toDateString() !== previousDate.toDateString();
  };

  const isFromCurrentUser = (message: Message) => {
    return user && message.author && message.author.id === user.id;
  };

  const renderMessage = (message: Message) => {
    // Safety check for message structure
    if (!message || !message.id || !message.author) {
      return null;
    }

    const isCurrentUser = isFromCurrentUser(message);
    const isSystemMessage = message.type !== 'text';

    if (isSystemMessage) {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isCurrentUser
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}>
          {!isCurrentUser && (
            <div className="text-xs font-medium mb-1 text-gray-500">
              {message.author.username}
            </div>
          )}

          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>

          <div className={`text-xs mt-1 ${
            isCurrentUser ? 'text-indigo-100' : 'text-gray-500'
          }`}>
            <span>{formatTime(message.createdAt)}</span>
            {message.editedAt && (
              <span className="ml-1">(edited)</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    const typingText = typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : typingUsers.length === 2
      ? `${typingUsers.join(' and ')} are typing...`
      : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`;

    return (
      <div className="flex justify-start mb-4">
        <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg">
          <div className="flex items-center space-x-1">
            <span className="text-sm">{typingText}</span>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-500">Start the conversation by sending a message below.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {messages
        .filter(message => message && message.id && message.author) // Filter out invalid messages
        .map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : undefined;
          const showDateDivider = shouldShowDateDivider(message, previousMessage);

          return (
            <React.Fragment key={message.id}>
              {showDateDivider && (
                <div className="flex justify-center my-6">
                  <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {formatDate(message.createdAt)}
                  </div>
                </div>
              )}
              {renderMessage(message)}
            </React.Fragment>
          );
        })}

      {renderTypingIndicator()}
      <div ref={messagesEndRef} />
    </div>
  );
}