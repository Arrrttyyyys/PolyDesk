import { Domain, Market, Article, Thesis } from "./types";

export const domainData: Record<Domain, {
  label: string;
  icon: string;
  description: string;
  sources: string[];
  angles: string[];
  markets: Market[];
  articles: Article[];
  thesis: Thesis;
}> = {
  markets: {
    label: "Markets",
    icon: "TrendingUp",
    description: "Crypto, stocks, macro",
    sources: ["Bloomberg", "Reuters", "WSJ", "CoinDesk"],
    angles: ["macro", "flows", "fundamentals", "sentiment"],
    markets: [
      {
        id: "btc-100k",
        eventId: "crypto-btc",
        title: "BTC to $100k by June 2024",
        yesPrice: 0.58,
        noPrice: 0.42,
        volume: "$2.4M",
        resolution: "2024-06-30",
        probability: 58,
      },
      {
        id: "eth-etf",
        eventId: "crypto-eth",
        title: "ETH ETF approved by May 2024",
        yesPrice: 0.72,
        noPrice: 0.28,
        volume: "$1.8M",
        resolution: "2024-05-31",
        probability: 72,
      },
      {
        id: "fed-cut",
        eventId: "macro-fed",
        title: "Fed cuts rates by 50bp in Q2 2024",
        yesPrice: 0.35,
        noPrice: 0.65,
        volume: "$3.2M",
        resolution: "2024-06-30",
        probability: 35,
      },
      {
        id: "spy-500",
        eventId: "macro-spy",
        title: "SPY above $500 by end of 2024",
        yesPrice: 0.45,
        noPrice: 0.55,
        volume: "$1.2M",
        resolution: "2024-12-31",
        probability: 45,
      },
    ],
    articles: [
      {
        id: "m1",
        title: "Bitcoin surges past $65k as institutional demand grows",
        source: "Bloomberg",
        timestamp: "2h ago",
        relevance: "High",
        compressed: true,
      },
      {
        id: "m2",
        title: "Ethereum ETF applications see record inflows",
        source: "CoinDesk",
        timestamp: "4h ago",
        relevance: "High",
        compressed: true,
      },
      {
        id: "m3",
        title: "Fed signals cautious approach to rate cuts",
        source: "WSJ",
        timestamp: "6h ago",
        relevance: "Medium",
        compressed: true,
      },
    ],
    thesis: {
      summary: "BTC reaching $100k by June is supported by strong institutional adoption and ETF inflows, but faces headwinds from regulatory uncertainty and potential Fed policy shifts.",
      evidence: [
        "Institutional inflows hit record highs in Q1 2024",
        "ETF approval has unlocked new capital flows",
        "Halving event historically precedes major rallies",
      ],
      counterpoints: [
        "Regulatory crackdowns could dampen sentiment",
        "Fed rate policy remains uncertain",
        "Technical resistance at $70k level",
      ],
      catalysts: {
        bullish: [
          "Major institution announces BTC allocation",
          "ETF sees sustained inflows above $500M/day",
          "Fed signals dovish pivot",
        ],
        bearish: [
          "Regulatory enforcement actions",
          "ETF outflows exceed $200M/day",
          "Fed maintains hawkish stance",
        ],
      },
      recommendation: "BUY YES",
      confidence: 65,
      riskLevel: "Medium",
      hedging: {
        strategies: ["Buy ETH NO as hedge", "Short correlation pairs"],
        triggers: ["BTC drops below $60k", "ETF outflows exceed $200M/day"],
        unwindSignals: ["BTC breaks $75k", "ETF inflows resume"],
      },
      riskManagement: {
        takeProfit: ["Take 50% profit at $80k", "Take 25% profit at $90k"],
        stopLoss: ["Exit if BTC drops below $55k", "Reduce position if volatility spikes above 80%"],
        timeStops: ["Exit 7 days before resolution", "Reduce position if no movement for 30 days"],
      },
    },
  },
  news: {
    label: "News",
    icon: "Newspaper",
    description: "Elections, geopolitics, policy",
    sources: ["Reuters", "AP", "NYTimes", "Politico"],
    angles: ["polling", "policy", "geopolitics", "public sentiment"],
    markets: [
      {
        id: "trump-2026",
        eventId: "election-2024",
        title: "Trump wins 2024 election",
        yesPrice: 0.48,
        noPrice: 0.52,
        volume: "$5.2M",
        resolution: "2024-11-05",
        probability: 48,
      },
      {
        id: "recession",
        eventId: "economy-2024",
        title: "US enters recession in 2024",
        yesPrice: 0.25,
        noPrice: 0.75,
        volume: "$2.1M",
        resolution: "2024-12-31",
        probability: 25,
      },
      {
        id: "taiwan",
        eventId: "geopolitics-taiwan",
        title: "Taiwan conflict escalates in 2024",
        yesPrice: 0.15,
        noPrice: 0.85,
        volume: "$1.5M",
        resolution: "2024-12-31",
        probability: 15,
      },
    ],
    articles: [
      {
        id: "n1",
        title: "Latest polls show tight race in key swing states",
        source: "Reuters",
        timestamp: "1h ago",
        relevance: "High",
        compressed: true,
      },
      {
        id: "n2",
        title: "Economic indicators point to soft landing",
        source: "AP",
        timestamp: "3h ago",
        relevance: "Medium",
        compressed: true,
      },
    ],
    thesis: {
      summary: "Election outcome remains highly uncertain with polling margins within error range. Key factors include voter turnout and independent candidate impact.",
      evidence: [
        "Swing state polls show 2-3 point margins",
        "Economic sentiment improving",
        "Third-party candidates gaining traction",
      ],
      counterpoints: [
        "Polling accuracy questioned after 2016/2020",
        "Economic data may not reflect voter sentiment",
        "Unforeseen events could shift dynamics",
      ],
      catalysts: {
        bullish: [
          "Strong debate performance",
          "Economic data improves",
          "Opponent faces scandal",
        ],
        bearish: [
          "Economic downturn",
          "Major policy misstep",
          "Third-party gains momentum",
        ],
      },
      recommendation: "WAIT",
      confidence: 50,
      riskLevel: "High",
      hedging: {
        strategies: ["Buy both YES and NO on swing state markets", "Pair with economic indicators"],
        triggers: ["Poll shifts > 5%", "Major news events"],
        unwindSignals: ["Clear polling trend emerges", "Within 30 days of election"],
      },
      riskManagement: {
        takeProfit: ["Exit on +20% moves", "Scale out as probability approaches 70%"],
        stopLoss: ["Exit if fundamentals change", "Stop at -30%"],
        timeStops: ["Exit 14 days before election", "Reduce position 30 days before election"],
      },
    },
  },
  sports: {
    label: "Sports",
    icon: "Trophy",
    description: "UFC, NBA, NFL, soccer",
    sources: ["ESPN", "The Athletic", "Fox Sports", "Bleacher Report"],
    angles: ["injuries", "form", "head-to-head", "momentum"],
    markets: [
      {
        id: "lakers",
        eventId: "nba-finals-2024",
        title: "Lakers win 2024 NBA Finals",
        yesPrice: 0.22,
        noPrice: 0.78,
        volume: "$850K",
        resolution: "2024-06-15",
        probability: 22,
      },
      {
        id: "mcgregor",
        eventId: "ufc-mcgregor",
        title: "McGregor wins next UFC fight",
        yesPrice: 0.38,
        noPrice: 0.62,
        volume: "$1.1M",
        resolution: "2024-07-10",
        probability: 38,
      },
      {
        id: "chiefs",
        eventId: "superbowl-lix",
        title: "Chiefs win Super Bowl LIX",
        yesPrice: 0.28,
        noPrice: 0.72,
        volume: "$2.3M",
        resolution: "2025-02-09",
        probability: 28,
      },
    ],
    articles: [
      {
        id: "s1",
        title: "Lakers star player returns from injury",
        source: "ESPN",
        timestamp: "5h ago",
        relevance: "High",
        compressed: true,
      },
      {
        id: "s2",
        title: "McGregor training camp reports positive",
        source: "The Athletic",
        timestamp: "8h ago",
        relevance: "Medium",
        compressed: true,
      },
    ],
    thesis: {
      summary: "Lakers face long odds but recent roster improvements and playoff experience provide value at current prices.",
      evidence: [
        "Key player returning from injury",
        "Strong playoff record",
        "Favorable bracket positioning",
      ],
      counterpoints: [
        "Injury concerns remain",
        "Tough Western Conference",
        "Age and fatigue factors",
      ],
      catalysts: {
        bullish: [
          "Full roster health",
          "Home court advantage",
          "Opponent injuries",
        ],
        bearish: [
          "Key player re-injury",
          "Poor shooting streaks",
          "Stronger opponent form",
        ],
      },
      recommendation: "BUY NO",
      confidence: 60,
      riskLevel: "Low",
      hedging: {
        strategies: ["Hedge with top seed markets", "Buy opponent YES"],
        triggers: ["Injury news", "Playoff bracket changes"],
        unwindSignals: ["Lakers advance to finals", "Season ends"],
      },
      riskManagement: {
        takeProfit: ["Exit if odds shift to 30%+", "Take profit at 25% gain"],
        stopLoss: ["Exit if team health improves significantly", "Stop at -20%"],
        timeStops: ["Exit 3 days before finals start", "Reduce position after conference finals"],
      },
    },
  },
};

