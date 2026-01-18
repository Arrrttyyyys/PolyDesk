# PolyPilot Chatbot UI Components

ChatGPT-style chatbot interface for the PolyPilot Terminal with dark theme styling.

## Components

### ChatShell
Main container component with flex layout.

```tsx
import { ChatShell } from "@/components/chatbot";

<ChatShell
  sidebar={<ChatSidebar />}
  rightPanel={<div>Optional right panel</div>}
  showSidebar={true}
  showRightPanel={false}
>
  {/* Main chat area content */}
</ChatShell>
```

**Props:**
- `sidebar`: ReactNode - Left sidebar content
- `children`: ReactNode - Main chat area content
- `rightPanel?`: ReactNode - Optional right panel
- `showSidebar?`: boolean - Toggle sidebar visibility (default: true)
- `showRightPanel?`: boolean - Toggle right panel visibility (default: false)

---

### ChatSidebar
Left sidebar with chat history and new chat button.

```tsx
import { ChatSidebar, ChatItem } from "@/components/chatbot";

const chats: ChatItem[] = [
  { id: "1", title: "Market analysis", timestamp: new Date() }
];

<ChatSidebar
  chats={chats}
  currentChatId="1"
  onNewChat={() => console.log("New chat")}
  onSelectChat={(id) => console.log("Selected:", id)}
/>
```

**Props:**
- `chats`: ChatItem[] - Array of chat history items
- `currentChatId?`: string - Currently selected chat ID
- `onNewChat`: () => void - Handler for new chat button
- `onSelectChat`: (chatId: string) => void - Handler for chat selection

**Types:**
```ts
interface ChatItem {
  id: string;
  title: string;
  timestamp: Date | string;
}
```

---

### ChatMessage
Message bubble component for user and assistant messages.

```tsx
import { ChatMessage } from "@/components/chatbot";

<ChatMessage
  role="assistant"
  content="Hello! How can I help?"
  streaming={false}
/>
```

**Props:**
- `role`: "user" | "assistant" - Message sender
- `content`: string - Message text
- `streaming?`: boolean - Show typing indicator (default: false)

---

### ChatInput
Input component with action buttons and send button.

```tsx
import { ChatInput } from "@/components/chatbot";

<ChatInput
  value={inputValue}
  onChange={setInputValue}
  onSubmit={handleSubmit}
  disabled={false}
  placeholder="Message PolyPilot..."
/>
```

**Props:**
- `value`: string - Input value
- `onChange`: (value: string) => void - Change handler
- `onSubmit`: () => void - Submit handler (Enter key or send button)
- `disabled?`: boolean - Disable input (default: false)
- `placeholder?`: string - Placeholder text

---

### ClickersRow
Horizontal scrollable row of quick action buttons.

```tsx
import { ClickersRow, Clicker } from "@/components/chatbot";

const clickers: Clicker[] = [
  { id: "1", label: "Soccer", action: "search_soccer" },
  { id: "2", label: "Elections", action: "search_elections" }
];

<ClickersRow
  clickers={clickers}
  onClickerClick={(clicker) => console.log(clicker)}
/>
```

**Props:**
- `clickers`: Clicker[] - Array of action buttons
- `onClickerClick`: (clicker: Clicker) => void - Click handler

**Types:**
```ts
interface Clicker {
  id: string;
  label: string;
  action: string;
}
```

---

### MarketCards
Grid of market display cards.

```tsx
import { MarketCards, Market } from "@/components/chatbot";

const markets: Market[] = [
  {
    id: "m1",
    question: "Will Trump win 2024?",
    yesPrice: 62,
    noPrice: 38,
    volume: 5240000,
    probability: 62
  }
];

<MarketCards
  markets={markets}
  onSelectMarket={(market) => console.log(market)}
/>
```

**Props:**
- `markets`: Market[] - Array of markets to display
- `onSelectMarket`: (market: Market) => void - Selection handler

**Types:**
```ts
interface Market {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  probability: number;
}
```

---

### SourcesBlock
Compact list of article sources with expandable snippets.

```tsx
import { SourcesBlock, Source } from "@/components/chatbot";

const sources: Source[] = [
  {
    id: "s1",
    title: "Article title",
    publisher: "Reuters",
    url: "https://example.com",
    timestamp: new Date(),
    stance: "supportive",
    snippet: "Article preview text..."
  }
];

<SourcesBlock sources={sources} />
```

**Props:**
- `sources`: Source[] - Array of sources to display

**Types:**
```ts
type Stance = "supportive" | "neutral" | "contradicts";

interface Source {
  id: string;
  title: string;
  publisher: string;
  url?: string;
  timestamp: Date | string;
  stance: Stance;
  snippet?: string;
}
```

---

### PipelineTrace
Pipeline step indicators with progress bar.

```tsx
import { PipelineTrace, PipelineStep } from "@/components/chatbot";

const steps: PipelineStep[] = [
  { id: "1", label: "Market Discovery", status: "complete" },
  { id: "2", label: "News Aggregation", status: "active" },
  { id: "3", label: "AI Analysis", status: "pending" }
];

<PipelineTrace steps={steps} />
```

**Props:**
- `steps`: PipelineStep[] - Array of pipeline steps

**Types:**
```ts
type StepStatus = "pending" | "active" | "complete" | "error";

interface PipelineStep {
  id: string;
  label: string;
  status: StepStatus;
}
```

---

## Styling

All components use:
- **Dark theme** with oklch colors from `tailwind.config.ts`
- **Glassmorphism** effects (backdrop-blur, transparency)
- **Responsive** design (collapsible on mobile)
- **Smooth animations** and transitions
- **Accessibility** features (ARIA labels, keyboard navigation)

### Color Scheme
```css
background: oklch(0.08 0.01 240)   /* Dark blue-gray */
card: oklch(0.12 0.01 240)         /* Slightly lighter */
primary: oklch(0.75 0.2 145)       /* Green */
accent: oklch(0.65 0.2 25)         /* Orange/Red */
foreground: oklch(0.95 0 0)        /* Near white */
border: oklch(0.25 0.01 240)       /* Subtle border */
secondary: oklch(0.18 0.01 240)    /* Muted background */
```

---

## Demo

View the demo at `/chatbot-demo` to see all components in action.

---

## Icons

All icons use `lucide-react` library, which is already installed.

---

## Usage Example

Complete example showing all components together:

```tsx
"use client";

import { useState } from "react";
import {
  ChatShell,
  ChatSidebar,
  ChatMessage,
  ChatInput,
  ClickersRow,
  type ChatItem,
  type Clicker,
} from "@/components/chatbot";

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
  }>>([]);
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, 
      { role: "user", content: input },
      { role: "assistant", content: "Response..." }
    ]);
    setInput("");
  };

  return (
    <ChatShell
      sidebar={
        <ChatSidebar
          chats={[]}
          onNewChat={() => {}}
          onSelectChat={() => {}}
        />
      }
    >
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
      </div>
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
      />
    </ChatShell>
  );
}
```
