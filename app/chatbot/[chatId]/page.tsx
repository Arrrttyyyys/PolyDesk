"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import Disclaimer from "@/components/shared/Disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Send, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import MarketCard from "@/components/chatbot/MarketCard";
import { Market } from "@/types/market";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  markets?: Market[];
}

export default function ChatConversationPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for initial query
    const initialQuery = sessionStorage.getItem(`chat-${chatId}-initial`);
    if (initialQuery) {
      sessionStorage.removeItem(`chat-${chatId}-initial`);
      handleSendMessage(initialQuery);
    }
  }, [chatId]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the chatbot API
      const response = await fetch("/api/chatbot/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: message,
          action: "search",
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response || "I received your request but couldn't generate a response.",
        markets: data.markets || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f]">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Chat History (Placeholder) */}
        <div className="w-64 border-r border-gray-800 bg-[#0a0a0f] p-4 space-y-4">
          <Button variant="primary" className="w-full" onClick={() => window.location.href = '/chatbot'}>
            + New Chat
          </Button>
          <div className="text-sm text-gray-500">
            <p className="font-semibold mb-2">Recent Chats</p>
            <p className="text-xs text-gray-600">Chat history coming soon</p>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Start a conversation by typing a message below</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id}>
                <Card
                  className={`${
                    message.role === "user"
                      ? "bg-[#1a1a24] border-gray-700 ml-12"
                      : "bg-[#12121a] border-gray-800 mr-12"
                  }`}
                >
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-300">{message.content}</p>
                  </CardContent>
                </Card>
                
                {/* Display markets if present */}
                {message.markets && message.markets.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 mr-12">
                    {message.markets.map((market) => (
                      <MarketCard key={market.id} market={market} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <Card className="bg-[#12121a] border-gray-800 mr-12">
                <CardContent className="p-4 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <p className="text-sm text-gray-400">Thinking...</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-800 p-4">
            <Disclaimer variant="compact" />
            <div className="mt-4 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(input);
                  }
                }}
                placeholder="Type a message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Legend (Placeholder) */}
        <div className="w-96 border-l border-gray-800 bg-[#0a0a0f] overflow-y-auto">
          <Tabs defaultValue="market" className="w-full">
            <TabsList className="w-full grid grid-cols-3 border-b border-gray-800">
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
            </TabsList>

            <TabsContent value="market" className="p-4">
              <Card className="bg-[#12121a] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm">Market Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Select a market from the chat to view details, live prices, and orderbook data.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="p-4">
              <Card className="bg-[#12121a] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm">Market Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Analytics including correlations, inefficiencies, and recommendations will appear here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strategy" className="p-4">
              <Card className="bg-[#12121a] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm">Strategy Builder</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Build multi-leg strategies with payoff curves and scenario analysis.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
}
