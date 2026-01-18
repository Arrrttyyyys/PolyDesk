import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "@/lib/storage/chatStorage";
import type {
  MarketCard,
  Source,
  EvidenceGraph,
  TradeDossier,
  Strategy,
  AnalysisBoard,
} from "@/lib/agent/schemas";

export type PipelineStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
  timestamp: string;
};

export type Artifacts = {
  markets?: MarketCard[];
  sources?: Source[];
  graph?: EvidenceGraph;
  dossier?: TradeDossier;
  strategy?: Strategy;
  analysisBoard?: AnalysisBoard;
};

type SSEEvent = {
  type: "step" | "message" | "markets" | "sources" | "graph" | "dossier" | "strategy" | "analysis" | "error" | "done";
  content?: string;
  data?: any;
};

export function useChatStream(chatId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentMessageRef = useRef<string>("");

  const addStep = useCallback((message: string, status: PipelineStep["status"] = "active") => {
    const step: PipelineStep = {
      id: `step-${Date.now()}-${Math.random()}`,
      label: message,
      status,
      timestamp: new Date().toISOString(),
    };
    setPipelineSteps(prev => [...prev, step]);
    return step.id;
  }, []);

  const updateStep = useCallback((id: string, updates: Partial<PipelineStep>) => {
    setPipelineSteps(prev => 
      prev.map(step => step.id === id ? { ...step, ...updates } : step)
    );
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming) return;

    setIsStreaming(true);
    setPipelineSteps([]);
    currentMessageRef.current = "";

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Prepare assistant message placeholder
    const assistantMessageId = `msg-${Date.now() + 1}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/chatbot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          uiState: artifacts,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6)) as SSEEvent;

            switch (data.type) {
              case "step":
                addStep(data.content || "Processing...", "active");
                break;

              case "message":
                currentMessageRef.current += data.content || "";
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, content: currentMessageRef.current }
                      : m
                  )
                );
                break;

              case "markets":
                setArtifacts(prev => ({ ...prev, markets: data.data }));
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, markets: data.data }
                      : m
                  )
                );
                break;

              case "sources":
                setArtifacts(prev => ({ ...prev, sources: data.data }));
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, sources: data.data }
                      : m
                  )
                );
                break;

              case "graph":
                setArtifacts(prev => ({ ...prev, graph: data.data }));
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, graph: data.data }
                      : m
                  )
                );
                break;

              case "dossier":
                setArtifacts(prev => ({ ...prev, dossier: data.data }));
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, dossier: data.data }
                      : m
                  )
                );
                break;

              case "strategy":
                setArtifacts(prev => ({ ...prev, strategy: data.data }));
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, strategy: data.data }
                      : m
                  )
                );
                break;

              case "analysis":
                setArtifacts(prev => ({ ...prev, analysisBoard: data.data }));
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, analysisBoard: data.data }
                      : m
                  )
                );
                break;

              case "error":
                console.error("Stream error:", data.content);
                addStep(`Error: ${data.content}`, "error");
                break;

              case "done":
                setPipelineSteps(prev =>
                  prev.map(s => ({ ...s, status: "complete" as const }))
                );
                break;
            }
          } catch (parseError) {
            console.error("Failed to parse SSE event:", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Chat stream error:", error);
      addStep(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setIsStreaming(false);
    }
  }, [chatId, messages, artifacts, isStreaming, addStep]);

  const reset = useCallback(() => {
    setMessages([]);
    setPipelineSteps([]);
    setArtifacts({});
    currentMessageRef.current = "";
  }, []);

  return {
    messages,
    setMessages,
    isStreaming,
    pipelineSteps,
    artifacts,
    sendMessage,
    reset,
  };
}
