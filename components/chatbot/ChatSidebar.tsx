"use client";

import { Plus, MessageSquare } from "lucide-react";

export interface ChatItem {
  id: string;
  title: string;
  timestamp: Date | string;
}

interface ChatSidebarProps {
  chats: ChatItem[];
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
}

export function ChatSidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
}: ChatSidebarProps) {
  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-sm">
      {/* New Chat Button */}
      <div className="p-3 border-b border-border/50">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-foreground font-medium"
          aria-label="Start new chat"
        >
          <Plus className="w-5 h-5" />
          <span>New chat</span>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                currentChatId === chat.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
              aria-label={`Select chat: ${chat.title}`}
              aria-current={currentChatId === chat.id ? "true" : "false"}
            >
              <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{chat.title}</div>
                <div className="text-xs opacity-70 mt-0.5">
                  {formatTimestamp(chat.timestamp)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
