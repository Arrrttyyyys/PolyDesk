# Chatbot Components Quick Reference

## Component Hierarchy

```
ChatShell (Container)
├── ChatSidebar (Left Panel)
│   ├── New Chat Button
│   └── Chat History List
├── Main Area
│   ├── Messages Container
│   │   └── ChatMessage (repeated)
│   ├── ClickersRow (Quick Actions)
│   └── ChatInput (Bottom)
└── Right Panel (Optional)
```

## Quick Import

```tsx
import {
  ChatShell,
  ChatSidebar,
  ChatMessage,
  ChatInput,
  ClickersRow,
  MarketCards,
  SourcesBlock,
  PipelineTrace,
} from "@/components/chatbot";
```

## Minimal Example

```tsx
export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
  }>>([]);

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
        onSubmit={() => {
          setMessages([...messages, { role: "user", content: input }]);
          setInput("");
        }}
      />
    </ChatShell>
  );
}
```

## Component Props Quick Reference

### ChatShell
```tsx
<ChatShell
  sidebar={<ReactNode>}
  rightPanel={<ReactNode>}  // optional
  showSidebar={true}         // optional
  showRightPanel={false}     // optional
>
  {children}
</ChatShell>
```

### ChatSidebar
```tsx
<ChatSidebar
  chats={ChatItem[]}
  currentChatId="1"          // optional
  onNewChat={() => void}
  onSelectChat={(id) => void}
/>

// ChatItem type
{ id: string, title: string, timestamp: Date | string }
```

### ChatMessage
```tsx
<ChatMessage
  role="user" | "assistant"
  content={string}
  streaming={false}          // optional
/>
```

### ChatInput
```tsx
<ChatInput
  value={string}
  onChange={(val) => void}
  onSubmit={() => void}
  disabled={false}           // optional
  placeholder="Message..."   // optional
/>
```

### ClickersRow
```tsx
<ClickersRow
  clickers={Clicker[]}
  onClickerClick={(clicker) => void}
/>

// Clicker type
{ id: string, label: string, action: string }
```

### MarketCards
```tsx
<MarketCards
  markets={Market[]}
  onSelectMarket={(market) => void}
/>

// Market type
{
  id: string,
  question: string,
  yesPrice: number,
  noPrice: number,
  volume: number,
  probability: number
}
```

### SourcesBlock
```tsx
<SourcesBlock sources={Source[]} />

// Source type
{
  id: string,
  title: string,
  publisher: string,
  url?: string,
  timestamp: Date | string,
  stance: "supportive" | "neutral" | "contradicts",
  snippet?: string
}
```

### PipelineTrace
```tsx
<PipelineTrace steps={PipelineStep[]} />

// PipelineStep type
{
  id: string,
  label: string,
  status: "pending" | "active" | "complete" | "error"
}
```

## Common Patterns

### Empty State
```tsx
{messages.length === 0 && (
  <div className="flex flex-col items-center justify-center h-full">
    <h1 className="text-4xl font-bold text-foreground">
      What can I help with?
    </h1>
    {/* Quick action tiles */}
  </div>
)}
```

### Message Flow with Content
```tsx
<div className="space-y-0">
  {messages.map((msg, i) => (
    <ChatMessage key={i} {...msg} />
  ))}
  {/* Add content blocks after messages */}
  <div className="space-y-4 px-4 py-6 max-w-4xl mx-auto">
    <MarketCards markets={markets} onSelectMarket={handleSelect} />
    <SourcesBlock sources={sources} />
    <PipelineTrace steps={steps} />
  </div>
</div>
```

### Streaming Response
```tsx
const [streamingContent, setStreamingContent] = useState("");
const [isStreaming, setIsStreaming] = useState(false);

// Add streaming message
setMessages([...messages, {
  role: "assistant",
  content: streamingContent,
  streaming: true
}]);
```

## Styling Tips

### Custom Colors
Use the theme colors for consistency:
- `text-primary` - Green accent
- `text-accent` - Orange/red accent
- `text-foreground` - Main text
- `text-muted-foreground` - Secondary text
- `bg-background` - Dark background
- `bg-card` - Slightly lighter background
- `bg-secondary` - Element background
- `border-border` - Subtle borders

### Glassmorphism Effect
```tsx
className="bg-card/30 backdrop-blur-sm border border-border"
```

### Hover Effects
```tsx
className="hover:border-primary/50 hover:bg-secondary/80 transition-all"
```

## Icons from lucide-react

All available icons used:
- `Plus`, `MessageSquare` - Sidebar
- `Bot`, `User` - Messages
- `ArrowUp` - Send
- `Paperclip`, `Search`, `BookOpen`, `Image`, `Mic` - Input actions
- `Sparkles` - Clickers
- `TrendingUp`, `TrendingDown`, `DollarSign` - Markets
- `ExternalLink`, `ChevronDown`, `ChevronUp` - Sources
- `Check`, `Loader2`, `AlertCircle` - Pipeline

Import as needed:
```tsx
import { Plus, Bot, ArrowUp } from "lucide-react";
```
