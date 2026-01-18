"use client";

import { KeyboardEvent } from "react";
import {
  ArrowUp,
  Paperclip,
  Search,
  BookOpen,
  Image as ImageIcon,
  Mic,
} from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Message PolyPilot...",
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  const actionButtons = [
    { icon: Paperclip, label: "Attach files" },
    { icon: Search, label: "Search markets" },
    { icon: BookOpen, label: "Study market" },
    { icon: ImageIcon, label: "Create image" },
    { icon: Mic, label: "Voice input" },
  ];

  return (
    <div className="border-t border-border bg-background">
      <div className="max-w-4xl mx-auto p-4">
        {/* Action buttons row */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto hide-scrollbar">
          {actionButtons.map((action, index) => (
            <button
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
              aria-label={action.label}
              disabled={disabled}
            >
              <action.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Input container */}
        <div
          className={`relative flex items-end gap-3 p-3 rounded-2xl border-2 transition-all ${
            disabled
              ? "bg-input/50 border-border/50 opacity-60"
              : "bg-input border-border focus-within:border-primary"
          }`}
        >
          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className="flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground min-h-[24px] max-h-[200px] leading-6"
            rows={1}
            style={{
              height: "auto",
              minHeight: "24px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
            }}
            aria-label="Chat message input"
          />

          {/* Send button */}
          <button
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              value.trim() && !disabled
                ? "bg-primary hover:bg-primary/90 text-background"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground text-center mt-3">
          PolyPilot can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
