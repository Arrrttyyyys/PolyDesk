# PolyPilot Terminal

A ChatGPT-style multi-thread "deep research + market analytics + cross-market strategy" terminal for Polymarket. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎯 **Market Discovery**: Search and analyze Polymarket prediction markets by intent
- 📊 **Live Data**: Real-time prices, orderbooks, and market data via Gamma + CLOB APIs
- 📰 **News Integration**: Fetch and analyze news articles with sentiment analysis
- 🗜️ **Smart Compression**: Token Company bear-1 compression for efficient LLM processing
- 📈 **Analytics**: Correlations, inefficiency detection, and trade recommendations
- 🎨 **Professional UI**: Dark trading terminal aesthetic inspired by TradingView and Robinhood
- ⚠️ **Safety First**: Prominent disclaimers throughout - not financial advice

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Arrrttyyyys/PolyDesk.git
cd PolyDesk
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:

```env
# Required for LLM inference
GEMINI_API_KEY=your_gemini_api_key_here

# Required for text compression
TOKEN_COMPANY_API_KEY=your_token_company_api_key_here
TOKEN_COMPANY_API_URL=https://api.thetokencompany.com/v1

# Polymarket Builder (for advanced features)
POLYMARKET_BUILDER_KEY=your_polymarket_builder_key_here

# Optional - Google News (falls back to GDELT if not set)
GOOGLE_NEWS_API_KEY=your_google_news_api_key_here
GOOGLE_NEWS_CX=your_custom_search_engine_id_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000/chatbot](http://localhost:3000/chatbot) in your browser.

## Project Structure

```
PolyDesk/
├── app/                          # Next.js app directory
│   ├── chatbot/                  # Chatbot pages
│   │   ├── page.tsx              # Home page with search
│   │   └── [chatId]/             # Individual chat conversations
│   │       └── page.tsx
│   ├── api/                      # API routes
│   │   ├── markets/              # Market data endpoints
│   │   ├── prices/               # Price data
│   │   ├── orderbook/            # Orderbook data
│   │   ├── news/                 # News fetching
│   │   ├── compress/             # Token compression
│   │   └── chatbot/              # Agent endpoints
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Tabs.tsx
│   │   ├── Badge.tsx
│   │   └── Tooltip.tsx
│   ├── shared/                   # Shared layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Disclaimer.tsx
│   ├── chatbot/                  # Chat interface components (WIP)
│   ├── legend/                   # Right panel analytics (WIP)
│   └── charts/                   # Chart components (WIP)
├── lib/
│   ├── api/                      # API client libraries
│   │   ├── polymarket.ts         # Gamma API integration
│   │   └── clob.ts               # CLOB API integration
│   ├── utils/                    # Utility functions
│   │   ├── formatting.ts         # Format USD, dates, etc.
│   │   └── validation.ts         # Input validation
│   ├── types.ts                  # Legacy type definitions
│   └── domain-data.ts            # Mock data for testing
├── types/                        # TypeScript type definitions
│   ├── market.ts                 # Market and orderbook types
│   ├── chat.ts                   # Chat message types
│   ├── analysis.ts               # Analytics types
│   ├── strategy.ts               # Strategy builder types
│   └── dossier.ts                # Trade dossier types
├── .env.local.example            # Environment variables template
└── README.md                     # This file
```

## Color Scheme

The terminal uses a professional dark trading theme:

- **Background**: Deep dark blue/black (`#0a0a0f`)
- **Cards**: Slightly lighter (`#12121a`)
- **Primary Accent**: Emerald green (`#10b981`) for positive/buy/YES
- **Secondary Accent**: Red (`#ef4444`) for negative/sell/NO
- **Text**: White (`#ffffff`) and muted gray (`#9ca3af`)
- **Borders**: Subtle dark borders (`#1f2937`)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Charts**: Recharts (for market visualizations)
- **State Management**: React hooks and sessionStorage
- **APIs**: 
  - Polymarket Gamma API (market data)
  - Polymarket CLOB API (prices, orderbook)
  - Token Company API (compression)
  - Google Gemini API (LLM)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## API Integration

### Polymarket APIs

The terminal integrates with two Polymarket APIs:

1. **Gamma API** (`https://gamma-api.polymarket.com`):
   - Market discovery and metadata
   - Event and market information
   - No authentication required

2. **CLOB API** (`https://clob.polymarket.com`):
   - Real-time prices
   - Orderbook data
   - Price history
   - No authentication required for read operations

### Token Company

Text compression using the bear-1 model to reduce token usage before LLM inference.

### Google Gemini

LLM agent for market analysis, research synthesis, and recommendations.

## Development Status

### ✅ Completed
- Project setup and dependencies
- Type definitions for all major entities
- Utility functions (formatting, validation)
- Base UI components (Button, Card, Input, Tabs, Badge, Tooltip)
- Shared layout components (Header, Footer, Disclaimer)
- Home page with search and quick prompts
- Conversation page with three-column layout
- Dark trading terminal aesthetic
- Existing API integrations (Polymarket, CLOB, Token Company)

### 🚧 In Progress
- Chart components for market visualization
- Legend panel tabs (Market, Analysis, Strategy, Dossier, Sources, Graph)
- Chat history persistence
- Market cards and action buttons

### 📋 Planned
- LLM agent orchestration with Gemini
- Analytics engine (correlations, inefficiencies, recommendations)
- News fetching and sentiment analysis
- Strategy builder with payoff visualization
- Trade dossier generation
- React Flow graph visualization

## Contributing

This is a startup product in active development. Contributions welcome!

## Disclaimer

⚠️ **Not Financial Advice**: This tool is for educational and research purposes only. All recommendations are hypotheses and simulations. Always conduct your own research and consult with financial professionals before making any decisions.

## License

Proprietary - All rights reserved


