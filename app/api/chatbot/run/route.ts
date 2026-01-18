import { NextRequest } from "next/server";
import { tool_searchMarkets, tool_getMarketSnapshot, tool_getPriceHistory, tool_getOrderbook } from "@/lib/agent/tools/polymarket";
import { tool_searchNews, tool_extractArticle, tool_scoreStanceSentiment } from "@/lib/agent/tools/news";
import { tool_computeMarketMetrics, tool_detectInefficiencies } from "@/lib/agent/tools/analytics";
import { tool_suggestHedges } from "@/lib/agent/tools/strategy";
import { tool_generateTradeDossier } from "@/lib/agent/tools/dossier";
import { tool_compressText } from "@/lib/agent/tools/compression";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type UIState = {
  markets?: any[];
  sources?: any[];
  graph?: any;
  dossier?: any;
  strategy?: any;
  analysisBoard?: any;
};

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { chatId, messages, uiState } = body as {
      chatId: string;
      messages: Message[];
      uiState?: UIState;
    };

    if (!messages || messages.length === 0) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "error", content: "Messages array is required" })}\n\n`),
        { status: 400, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "error", content: "GEMINI_API_KEY not configured" })}\n\n`),
        { status: 500, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Detect intent from user message
          const intent = detectIntent(lastUserMessage);
          console.log(`[CHATBOT] Detected intent: ${intent} for message: "${lastUserMessage}"`);

          // Send initial step update
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: "step", 
            content: getStepMessage(intent) 
          })}\n\n`));

          // Execute based on intent
          switch (intent) {
            case "market_search":
              await handleMarketSearch(controller, encoder, lastUserMessage);
              break;
            case "market_analysis":
              await handleMarketAnalysis(controller, encoder, lastUserMessage, uiState);
              break;
            case "research":
              await handleResearch(controller, encoder, lastUserMessage, uiState);
              break;
            case "strategy_building":
              await handleStrategyBuilding(controller, encoder, lastUserMessage, uiState);
              break;
            case "dossier_generation":
              await handleDossierGeneration(controller, encoder, lastUserMessage, uiState);
              break;
            default:
              await handleGeneral(controller, encoder, messages);
              break;
          }

          controller.close();
        } catch (error) {
          console.error("[CHATBOT] Stream error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: "error", 
            content: error instanceof Error ? error.message : "Unknown error" 
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      }
    });
  } catch (error) {
    console.error("[CHATBOT] Request error:", error);
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ 
        type: "error", 
        content: error instanceof Error ? error.message : "Unknown error" 
      })}\n\n`),
      { status: 500, headers: { "Content-Type": "text/event-stream" } }
    );
  }
}

// Intent detection
function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes("search") || lower.includes("find") || lower.includes("show me") || lower.includes("markets about")) {
    return "market_search";
  }
  if (lower.includes("analyze") || lower.includes("analysis of") || lower.includes("examine")) {
    return "market_analysis";
  }
  if (lower.includes("research") || lower.includes("news about") || lower.includes("find articles")) {
    return "research";
  }
  if (lower.includes("hedge") || lower.includes("strategy") || lower.includes("build")) {
    return "strategy_building";
  }
  if (lower.includes("dossier") || lower.includes("generate dossier") || lower.includes("trade report")) {
    return "dossier_generation";
  }
  
  return "general";
}

function getStepMessage(intent: string): string {
  switch (intent) {
    case "market_search": return "🔍 Discovering markets...";
    case "market_analysis": return "📊 Analyzing market data...";
    case "research": return "📰 Fetching news articles...";
    case "strategy_building": return "🎯 Building strategy...";
    case "dossier_generation": return "📋 Generating dossier...";
    default: return "💭 Processing...";
  }
}

// Handler: Market Search
async function handleMarketSearch(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  query: string
) {
  try {
    const { markets, error } = await tool_searchMarkets({ query, limit: 10 });
    
    if (error || markets.length === 0) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: `I couldn't find any markets matching "${query}". ${error || "Try a different search term."}` 
      })}\n\n`));
      return;
    }

    // Send markets artifact
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "artifact", 
      artifactType: "markets",
      content: markets 
    })}\n\n`));

    // Generate response text
    const responseText = `Found ${markets.length} markets matching your search. The top result is "${markets[0].question}" with a YES price of ${(markets[0].yesPrice * 100).toFixed(1)}%.`;
    
    // Stream response token by token
    for (const token of responseText.split(" ")) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: token + " " 
      })}\n\n`));
      await new Promise(resolve => setTimeout(resolve, 30)); // Simulate streaming
    }
  } catch (error) {
    console.error("[CHATBOT] Market search error:", error);
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "error", 
      content: error instanceof Error ? error.message : "Market search failed" 
    })}\n\n`));
  }
}

// Handler: Market Analysis
async function handleMarketAnalysis(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  query: string,
  uiState?: UIState
) {
  try {
    // Extract market from query or uiState
    const selectedMarket = uiState?.markets?.[0];
    
    if (!selectedMarket) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: "Please select a market first to analyze." 
      })}\n\n`));
      return;
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "step", 
      content: "📈 Fetching price history..." 
    })}\n\n`));

    // Get price history
    const tokenId = selectedMarket.yesTokenId || selectedMarket.id;
    const { history, error: histError } = await tool_getPriceHistory({ tokenId, interval: "1h", fidelity: 100 });
    
    if (histError || history.length === 0) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: `Unable to fetch price history. ${histError}` 
      })}\n\n`));
      return;
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "step", 
      content: "📊 Analyzing orderbook..." 
    })}\n\n`));

    // Get orderbook
    const { orderbook } = await tool_getOrderbook({ tokenId });

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "step", 
      content: "🧮 Computing metrics..." 
    })}\n\n`));

    // Compute metrics
    const metrics = await tool_computeMarketMetrics({ 
      priceHistory: history, 
      orderbookFeatures: orderbook || undefined 
    });

    // Send analysis board artifact
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "artifact", 
      artifactType: "analysisBoard",
      content: {
        microstructure: metrics.microstructure,
        trendRegime: metrics.trendRegime,
        relationships: [],
        inefficiencies: [],
        recommendations: [],
        context: `Analysis for ${selectedMarket.question}`
      }
    })}\n\n`));

    // Generate summary
    const summary = `Market Analysis Complete:\n\n` +
      `• Volatility: ${(metrics.volatility * 100).toFixed(2)}%\n` +
      `• Momentum: ${(metrics.momentum * 100).toFixed(2)}%\n` +
      `• Trend: ${metrics.trendRegime.trend}\n` +
      `• Health Score: ${(metrics.healthScore * 100).toFixed(0)}%\n\n` +
      `The market is currently in a ${metrics.trendRegime.trend} regime with ${metrics.trendRegime.strength > 0.5 ? "strong" : "weak"} trend strength.`;

    for (const token of summary.split(" ")) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: token + " " 
      })}\n\n`));
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (error) {
    console.error("[CHATBOT] Market analysis error:", error);
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "error", 
      content: error instanceof Error ? error.message : "Analysis failed" 
    })}\n\n`));
  }
}

// Handler: Research
async function handleResearch(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  query: string,
  uiState?: UIState
) {
  try {
    const { articles, error } = await tool_searchNews({ query, limit: 5, timeframeDays: 7 });
    
    if (error || articles.length === 0) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: `No recent articles found about "${query}". ${error || ""}` 
      })}\n\n`));
      return;
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "step", 
      content: `📰 Extracting ${articles.length} articles...` 
    })}\n\n`));

    // Extract and compress articles
    const sources = [];
    for (const article of articles.slice(0, 3)) {
      const { source } = await tool_extractArticle({ url: article.url });
      if (source) {
        // Compress the extracted text
        const { compressedText } = await tool_compressText({ 
          text: source.extractedText || "", 
          aggressiveness: 0.7 
        });
        sources.push({ ...source, compressedText });
      }
    }

    // Send sources artifact
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "artifact", 
      artifactType: "sources",
      content: sources 
    })}\n\n`));

    const responseText = `Found ${articles.length} recent articles. Extracted and compressed ${sources.length} for analysis. Key sources include ${sources.map(s => s.publisher).join(", ")}.`;
    
    for (const token of responseText.split(" ")) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: token + " " 
      })}\n\n`));
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (error) {
    console.error("[CHATBOT] Research error:", error);
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "error", 
      content: error instanceof Error ? error.message : "Research failed" 
    })}\n\n`));
  }
}

// Handler: Strategy Building
async function handleStrategyBuilding(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  query: string,
  uiState?: UIState
) {
  try {
    const primaryMarket = uiState?.markets?.[0];
    
    if (!primaryMarket) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: "Please select a primary market to build a strategy." 
      })}\n\n`));
      return;
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "step", 
      content: "🔍 Finding hedge opportunities..." 
    })}\n\n`));

    // Find candidate hedge markets
    const { markets: candidates } = await tool_searchMarkets({ 
      query: primaryMarket.question.split(" ").slice(0, 3).join(" "), 
      limit: 20 
    });

    // Mock correlations (in production, compute from historical data)
    const correlations = candidates.map(m => ({
      token1: primaryMarket.yesTokenId || primaryMarket.id,
      token2: m.yesTokenId || m.id,
      correlation: (Math.random() - 0.5) * 2
    }));

    const { hedges } = await tool_suggestHedges({
      primaryMarket,
      candidateMarkets: candidates,
      correlations,
    });

    // Send strategy artifact
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "artifact", 
      artifactType: "strategy",
      content: {
        legs: [
          {
            marketId: primaryMarket.id,
            marketTitle: primaryMarket.question,
            side: "buy",
            outcome: "yes",
            size: 100,
            entryPrice: primaryMarket.yesPrice,
            currentPrice: primaryMarket.yesPrice,
            rationale: "Primary position"
          },
          ...hedges.slice(0, 2).map(h => ({
            marketId: h.market.id,
            marketTitle: h.market.question,
            side: "buy",
            outcome: "no",
            size: h.hedgeRatio * 100,
            entryPrice: h.market.noPrice,
            currentPrice: h.market.noPrice,
            rationale: h.rationale
          }))
        ],
        payoffCurve: [],
        scenarioGrid: [],
        triggers: [],
        backtestResults: []
      }
    })}\n\n`));

    const responseText = hedges.length > 0
      ? `Found ${hedges.length} potential hedge opportunities. Top hedge: ${hedges[0].market.question} with ${(hedges[0].correlation * 100).toFixed(0)}% correlation.`
      : "No strong hedge opportunities found for this market.";

    for (const token of responseText.split(" ")) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: token + " " 
      })}\n\n`));
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (error) {
    console.error("[CHATBOT] Strategy building error:", error);
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "error", 
      content: error instanceof Error ? error.message : "Strategy building failed" 
    })}\n\n`));
  }
}

// Handler: Dossier Generation
async function handleDossierGeneration(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  query: string,
  uiState?: UIState
) {
  try {
    const market = uiState?.markets?.[0];
    const sources = uiState?.sources || [];

    if (!market) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: "Please select a market to generate a dossier." 
      })}\n\n`));
      return;
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "step", 
      content: "📋 Compiling evidence..." 
    })}\n\n`));

    // Compress all evidence
    const evidenceTexts = sources.map((s: any) => s.extractedText || "").join("\n\n");
    const { compressedText } = await tool_compressText({ 
      text: evidenceTexts, 
      aggressiveness: 0.7 
    });

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "step", 
      content: "🎯 Generating dossier..." 
    })}\n\n`));

    const { dossier } = await tool_generateTradeDossier({
      market,
      compressedEvidenceBundle: compressedText,
      sources
    });

    // Send dossier artifact
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "artifact", 
      artifactType: "dossier",
      content: dossier 
    })}\n\n`));

    const responseText = `Dossier generated for "${market.question}". ` +
      `Timeline: ${dossier.timelineMarkers?.length || 0} events tracked. ` +
      (dossier.thetaSignals ? `Resolution in ${dossier.thetaSignals.daysToResolution} days. ` : "") +
      `Confidence: ${((dossier.confidence || 0.5) * 100).toFixed(0)}%.`;

    for (const token of responseText.split(" ")) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: token + " " 
      })}\n\n`));
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (error) {
    console.error("[CHATBOT] Dossier generation error:", error);
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "error", 
      content: error instanceof Error ? error.message : "Dossier generation failed" 
    })}\n\n`));
  }
}

// Handler: General conversation
async function handleGeneral(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  messages: Message[]
) {
  try {
    // Compress conversation history
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join("\n");
    const { compressedText } = await tool_compressText({ 
      text: conversationText, 
      aggressiveness: 0.5 
    });

    // Call Gemini with compressed context
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are PolyPilot, an AI assistant for Polymarket prediction markets. Help users find, analyze, and trade on markets.\n\nConversation history (compressed):\n${compressedText}\n\nRespond naturally and helpfully.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to respond to that.";

    // Stream response
    for (const token of text.split(" ")) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: "text", 
        content: token + " " 
      })}\n\n`));
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (error) {
    console.error("[CHATBOT] General handler error:", error);
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: "error", 
      content: error instanceof Error ? error.message : "Failed to generate response" 
    })}\n\n`));
  }
}
