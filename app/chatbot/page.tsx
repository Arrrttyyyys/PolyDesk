"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Paperclip, Search, Lightbulb, Image, Mic, Send } from "lucide-react";

const presetTiles = [
  { label: "Soccer", icon: "⚽", query: "Soccer markets and betting trends" },
  { label: "Elections", icon: "🗳️", query: "US election prediction markets" },
  { label: "Crypto", icon: "₿", query: "Cryptocurrency and DeFi markets" },
  { label: "Breaking News", icon: "📰", query: "Latest breaking news markets" },
];

export default function ChatbotPage() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const handleStartChat = (query: string) => {
    const chatId = `chat-${Date.now()}`;
    router.push(`/chatbot/${chatId}?q=${encodeURIComponent(query)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleStartChat(input.trim());
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 pb-16">
      <div className="w-full max-w-3xl space-y-12">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold text-foreground">
            What can I help with?
          </h1>
          <p className="text-lg text-muted-foreground">
            Ask about Polymarket markets, get research-driven insights
          </p>
        </div>

        {/* Preset tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {presetTiles.map((tile) => (
            <button
              key={tile.label}
              onClick={() => handleStartChat(tile.query)}
              className="group relative p-6 bg-card hover:bg-secondary border border-border rounded-xl transition-all hover:scale-105 hover:shadow-lg"
            >
              <div className="text-4xl mb-2">{tile.icon}</div>
              <div className="text-sm font-medium text-foreground">
                {tile.label}
              </div>
            </button>
          ))}
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center bg-card border border-border rounded-3xl shadow-lg hover:shadow-xl transition-shadow">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message PolyPilot..."
              className="flex-1 px-6 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {input.trim() && (
              <button
                type="submit"
                className="mr-3 p-2 bg-primary text-background rounded-full hover:bg-primary/90 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              type="button"
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Search"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Study"
            >
              <Lightbulb className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Create image"
            >
              <Image className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Voice"
            >
              <Mic className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
