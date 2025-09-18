import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatRoom } from './ChatRoom';

export function Chat() {
  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatRoom />
      </div>
    </div>
  );
}