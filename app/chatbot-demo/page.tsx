"use client";

import { useState } from "react";
import {
  ChatShell,
  ChatSidebar,
  ChatMessage,
  ChatInput,
  ClickersRow,
  MarketCards,
  SourcesBlock,
  PipelineTrace,
  type ChatItem,
  type Clicker,
  type Market,
  type Source,
  type PipelineStep,
} from "@/components/chatbot";
import { Sparkles } from "lucide-react";

// Demo data
const demoChats: ChatItem[] = [
  { id: "1", title: "Market analysis on 2024 elections", timestamp: new Date(Date.now() - 3600000) },
  { id: "2", title: "Soccer predictions for World Cup", timestamp: new Date(Date.now() - 7200000) },
  { id: "3", title: "Crypto market dossier", timestamp: new Date(Date.now() - 86400000) },
];

const demoClickers: Clicker[] = [
  { id: "1", label: "Soccer", action: "search_soccer" },
  { id: "2", label: "Elections", action: "search_elections" },
  { id: "3", label: "Crypto", action: "search_crypto" },
  { id: "4", label: "Breaking News", action: "breaking_news" },
  { id: "5", label: "Build Dossier", action: "build_dossier" },
  { id: "6", label: "Open Analysis", action: "open_analysis" },
];

const demoMarkets: Market[] = [
  {
    id: "m1",
    question: "Will Trump win the 2024 presidential election?",
    yesPrice: 62,
    noPrice: 38,
    volume: 5240000,
    probability: 62,
  },
  {
    id: "m2",
    question: "Will Bitcoin reach $100k by end of 2024?",
    yesPrice: 45,
    noPrice: 55,
    volume: 2100000,
    probability: 45,
  },
];

const demoSources: Source[] = [
  {
    id: "s1",
    title: "Latest polling shows Trump leading in key swing states",
    publisher: "Reuters",
    url: "https://example.com/article1",
    timestamp: new Date(Date.now() - 3600000),
    stance: "supportive",
    snippet: "Recent polls indicate a significant lead for Trump in Pennsylvania, Michigan, and Wisconsin...",
  },
  {
    id: "s2",
    title: "Economic indicators suggest close race ahead",
    publisher: "Bloomberg",
    url: "https://example.com/article2",
    timestamp: new Date(Date.now() - 7200000),
    stance: "neutral",
    snippet: "Economists point to mixed signals in the economy that could influence voter decisions...",
  },
  {
    id: "s3",
    title: "Democrats express confidence in battleground strategy",
    publisher: "The Hill",
    url: "https://example.com/article3",
    timestamp: new Date(Date.now() - 10800000),
    stance: "contradicts",
  },
];

const demoPipelineSteps: PipelineStep[] = [
  { id: "1", label: "Market Discovery", status: "complete" },
  { id: "2", label: "Fetch Prices", status: "complete" },
  { id: "3", label: "Historical Data", status: "complete" },
  { id: "4", label: "News Aggregation", status: "active" },
  { id: "5", label: "Content Compression", status: "pending" },
  { id: "6", label: "AI Analysis", status: "pending" },
  { id: "7", label: "Generate Report", status: "pending" },
];

export default function ChatbotDemo() {
  const [currentChatId, setCurrentChatId] = useState("1");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; streaming?: boolean }>>([
    {
      role: "assistant",
      content: "Hello! I'm PolyPilot, your AI assistant for prediction markets. How can I help you today?",
    },
  ]);

  const handleNewChat = () => {
    console.log("New chat clicked");
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleClickerClick = (clicker: Clicker) => {
    console.log("Clicker clicked:", clicker);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: clicker.label },
      {
        role: "assistant",
        content: `Let me help you with ${clicker.label}. Here are some relevant markets and sources...`,
      },
    ]);
  };

  const handleSelectMarket = (market: Market) => {
    console.log("Market selected:", market);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: inputValue },
      {
        role: "assistant",
        content: "I'm analyzing your request and gathering relevant information...",
        streaming: true,
      },
    ]);
    setInputValue("");
  };

  return (
    <ChatShell
      sidebar={
        <ChatSidebar
          chats={demoChats}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
        />
      }
      showSidebar
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="max-w-2xl w-full space-y-8 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-background" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-foreground">
                What can I help with?
              </h1>
              <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
                {demoClickers.slice(0, 4).map((clicker) => (
                  <button
                    key={clicker.id}
                    onClick={() => handleClickerClick(clicker)}
                    className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-card/80 transition-all text-left"
                  >
                    <div className="font-medium text-foreground">
                      {clicker.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Get started with {clicker.label.toLowerCase()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Messages
          <div className="space-y-0">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} {...msg} />
            ))}
            {/* Demo content blocks */}
            {messages.length > 2 && (
              <div className="space-y-4 px-4 py-6 max-w-4xl mx-auto">
                <MarketCards
                  markets={demoMarkets}
                  onSelectMarket={handleSelectMarket}
                />
                <SourcesBlock sources={demoSources} />
                <PipelineTrace steps={demoPipelineSteps} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <ClickersRow clickers={demoClickers} onClickerClick={handleClickerClick} />

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        placeholder="Message PolyPilot..."
      />
    </ChatShell>
  );
}
