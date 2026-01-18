"use client";

import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export function ChatMessage({ role, content, streaming = false }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex gap-4 px-4 py-6 ${
        isUser ? "bg-background" : "bg-card/30"
      }`}
    >
      <div className="flex max-w-4xl mx-auto w-full gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <User className="w-5 h-5 text-background" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground mb-1 font-medium">
            {isUser ? "You" : "PolyPilot"}
          </div>
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
            {streaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
