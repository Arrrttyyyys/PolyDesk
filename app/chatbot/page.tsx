"use client";

import { useState } from "react";
import { Search, TrendingUp, Newspaper, Target, MessageSquarePlus } from "lucide-react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import Disclaimer from "@/components/shared/Disclaimer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { generateId } from "@/lib/utils/formatting";

const quickPrompts = [
  {
    icon: "⚽",
    label: "Soccer",
    query: "Show me soccer markets",
  },
  {
    icon: "🗳️",
    label: "Elections",
    query: "US election markets",
  },
  {
    icon: "₿",
    label: "Crypto",
    query: "Bitcoin and crypto markets",
  },
  {
    icon: "📈",
    label: "Trending",
    query: "What are the trending markets?",
  },
];

const actionButtons = [
  { icon: Search, label: "Search", color: "text-blue-400" },
  { icon: TrendingUp, label: "Analyze", color: "text-emerald-400" },
  { icon: Newspaper, label: "News", color: "text-purple-400" },
  { icon: Target, label: "Strategy", color: "text-amber-400" },
];

export default function ChatbotHomePage() {
  const [input, setInput] = useState("");
  const router = useRouter();

  const handleSubmit = (query: string) => {
    if (!query.trim()) return;
    
    const chatId = generateId();
    // Store the initial query in sessionStorage
    sessionStorage.setItem(`chat-${chatId}-initial`, query);
    router.push(`/chatbot/${chatId}`);
  };

  const handleQuickPrompt = (query: string) => {
    handleSubmit(query);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl space-y-8">
          {/* Welcome Message */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-white">
              What markets can I analyze?
            </h1>
            <p className="text-gray-400 text-lg">
              Deep research + market analytics + cross-market strategy for Polymarket
            </p>
          </div>

          {/* Search Input */}
          <Card className="border-gray-800 bg-[#12121a]">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmit(input);
                    }
                  }}
                  placeholder="Ask about any prediction market..."
                  className="text-lg h-14"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {actionButtons.map((action) => (
                      <Button
                        key={action.label}
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                      >
                        <action.icon className={`w-4 h-4 ${action.color}`} />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    onClick={() => handleSubmit(input)}
                    disabled={!input.trim()}
                    className="gap-2"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    Start Chat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Prompts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickPrompts.map((prompt) => (
              <Card
                key={prompt.label}
                className="border-gray-800 bg-[#12121a] hover:bg-[#1a1a24] cursor-pointer transition-colors"
                onClick={() => handleQuickPrompt(prompt.query)}
              >
                <CardContent className="p-4 text-center space-y-2">
                  <div className="text-3xl">{prompt.icon}</div>
                  <div className="text-sm font-medium text-gray-300">
                    {prompt.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Disclaimer */}
          <Disclaimer variant="compact" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
