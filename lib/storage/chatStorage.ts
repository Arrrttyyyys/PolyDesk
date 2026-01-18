export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  markets?: any[];
  sources?: any[];
  graph?: any;
  dossier?: any;
  strategy?: any;
  analysisBoard?: any;
};

export type ChatSummary = {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
};

const CHATS_KEY = "polypilot_chats";
const CHAT_PREFIX = "polypilot_chat_";

/**
 * Save chat messages to localStorage
 */
export function saveChat(chatId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  
  try {
    const key = `${CHAT_PREFIX}${chatId}`;
    localStorage.setItem(key, JSON.stringify(messages));
    
    // Update chat list with summary
    const title = messages.find(m => m.role === "user")?.content.slice(0, 50) || "New chat";
    const timestamp = messages[messages.length - 1]?.timestamp || new Date().toISOString();
    const preview = messages[messages.length - 1]?.content.slice(0, 100) || "";
    
    updateChatList(chatId, title, timestamp, preview);
  } catch (error) {
    console.error("Failed to save chat:", error);
  }
}

/**
 * Load chat messages from localStorage
 */
export function loadChat(chatId: string): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  
  try {
    const key = `${CHAT_PREFIX}${chatId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load chat:", error);
    return null;
  }
}

/**
 * List all chat summaries
 */
export function listChats(): ChatSummary[] {
  if (typeof window === "undefined") return [];
  
  try {
    const data = localStorage.getItem(CHATS_KEY);
    if (!data) return [];
    
    const chats = JSON.parse(data) as ChatSummary[];
    return chats.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error("Failed to list chats:", error);
    return [];
  }
}

/**
 * Delete a chat
 */
export function deleteChat(chatId: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const key = `${CHAT_PREFIX}${chatId}`;
    localStorage.removeItem(key);
    
    // Remove from chat list
    const data = localStorage.getItem(CHATS_KEY);
    if (data) {
      const chats = JSON.parse(data) as ChatSummary[];
      const filtered = chats.filter(c => c.id !== chatId);
      localStorage.setItem(CHATS_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error("Failed to delete chat:", error);
  }
}

/**
 * Update the chat list with a summary
 */
function updateChatList(
  chatId: string, 
  title: string, 
  timestamp: string,
  preview: string
): void {
  try {
    const data = localStorage.getItem(CHATS_KEY);
    let chats: ChatSummary[] = data ? JSON.parse(data) : [];
    
    // Update or add
    const index = chats.findIndex(c => c.id === chatId);
    const summary: ChatSummary = { id: chatId, title, timestamp, preview };
    
    if (index >= 0) {
      chats[index] = summary;
    } else {
      chats.push(summary);
    }
    
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error("Failed to update chat list:", error);
  }
}
