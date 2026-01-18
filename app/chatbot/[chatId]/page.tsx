"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useChatStream } from "@/lib/hooks/useChatStream";
import { saveChat, loadChat, listChats } from "@/lib/storage/chatStorage";
import {
  ChatSidebar,
  ChatMessage,
  ChatInput,
  MarketCards,
  SourcesBlock,
  PipelineTrace,
} from "@/components/chatbot";
import { LegendPanel } from "@/components/legend";
import type { MarketCard } from "@/lib/agent/schemas";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const chatId = params.chatId as string;
  const initialQuery = searchParams.get("q");

  const {
    messages,
    setMessages,
    isStreaming,
    pipelineSteps,
    artifacts,
    sendMessage,
  } = useChatStream(chatId);

  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [chats, setChats] = useState<Array<{ id: string; title: string; timestamp: string }>>(
    []
  );
  const [inputValue, setInputValue] = useState("");

  // Load chat from storage on mount
  useEffect(() => {
    const savedMessages = loadChat(chatId);
    if (savedMessages && savedMessages.length > 0) {
      setMessages(savedMessages);
    } else if (initialQuery) {
      // Start with initial query
      sendMessage(initialQuery);
    }
  }, [chatId, initialQuery, setMessages, sendMessage]);

  // Load chat list
  useEffect(() => {
    setChats(listChats());
  }, [messages]);

  // Save chat to storage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChat(chatId, messages);
    }
  }, [chatId, messages]);

  const handleSelectMarket = (market: any) => {
    setSelectedMarket(market);
  };

  const handleNewChat = () => {
    router.push("/chatbot");
  };

  const handleSelectChat = (newChatId: string) => {
    router.push(`/chatbot/${newChatId}`);
  };

  const handleInputSubmit = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar - Chat History */}
      <div className="w-64 border-r border-border">
        <ChatSidebar
          chats={chats}
          currentChatId={chatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            <div key={message.id}>
              <ChatMessage
                role={message.role}
                content={message.content}
                streaming={false}
              />

              {/* Show markets if present */}
              {message.markets && message.markets.length > 0 && (
                <div className="mt-4">
                  <MarketCards
                    markets={message.markets}
                    onSelectMarket={handleSelectMarket}
                  />
                </div>
              )}

              {/* Show sources if present */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-4">
                  <SourcesBlock sources={message.sources} />
                </div>
              )}
            </div>
          ))}

          {/* Pipeline trace during streaming */}
          {isStreaming && pipelineSteps.length > 0 && (
            <div className="mt-4">
              <PipelineTrace steps={pipelineSteps} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-4">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleInputSubmit}
            disabled={isStreaming}
            placeholder="Ask about markets, request analysis..."
          />
        </div>
      </div>

      {/* Right Panel - Legend */}
      <div className="w-96 border-l border-border bg-card overflow-hidden">
        <LegendPanel
          selectedMarket={selectedMarket}
          sources={artifacts.sources}
          graph={artifacts.graph}
          strategy={artifacts.strategy}
          dossier={artifacts.dossier}
          analysisBoard={artifacts.analysisBoard}
        />
      </div>
    </div>
  );
}
