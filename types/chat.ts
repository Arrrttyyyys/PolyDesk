export interface ChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  markets?: string[]; // Market IDs referenced
  sources?: string[]; // Source IDs
  metadata?: {
    pipelineStatus?: string[];
    tokensSaved?: number;
    keywords?: string[];
  };
}

export interface Chat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  context?: {
    markets: string[];
    articles: string[];
    compressionMetrics?: {
      totalTokensBefore: number;
      totalTokensAfter: number;
      totalSaved: number;
    };
  };
}
