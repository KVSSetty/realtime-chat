import React, { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled = false,
  placeholder = "Type a message..."
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || disabled) {
      return;
    }

    onSendMessage(message.trim());
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Stop typing indicator
    handleStopTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStartTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onStartTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  }, [isTyping, onStartTyping]);

  const handleStopTyping = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      onStopTyping();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [isTyping, onStopTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

    // Handle typing indicators
    if (value.trim()) {
      handleStartTyping();
    } else {
      handleStopTyping();
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? "Connecting..." : placeholder}
            rows={1}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{
              minHeight: '48px',
              maxHeight: '120px'
            }}
          />

          {/* Character limit indicator */}
          {message.length > 1800 && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {message.length}/2000
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || !message.trim() || message.length > 2000}
          className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Send message (Enter)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>

      {/* Typing indicator status */}
      {isTyping && (
        <div className="mt-2 text-xs text-gray-500">
          Typing...
        </div>
      )}

      {/* Message length warning */}
      {message.length > 2000 && (
        <div className="mt-2 text-xs text-red-600">
          Message is too long. Maximum 2000 characters allowed.
        </div>
      )}
    </div>
  );
}