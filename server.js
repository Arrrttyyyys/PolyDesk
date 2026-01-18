const http = require("http");
const next = require("next");
const { WebSocketServer } = require("ws");
const { URL } = require("url");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const historyStore = new Map();
const orderbookStore = new Map();
const CLOB_API_URL = "https://clob.polymarket.com";

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSeededHistory(marketId) {
  const rand = seededRandom(marketId);
  const data = [];

  const base = 40 + rand() * 40;
  let level = base;

  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date();
    date.setMinutes(date.getMinutes() - i * 5);

    const shock = (rand() - 0.5) * 6;
    level = 0.85 * level + 0.15 * base + shock;

    const probability = Math.max(5, Math.min(95, level));

    data.push({
      date: date.toISOString(),
      probability: Math.round(probability),
    });
  }

  return { base, level, history: data };
}

function getMarketState(marketId) {
  if (historyStore.has(marketId)) {
    return historyStore.get(marketId);
  }

  const state = generateSeededHistory(marketId);
  historyStore.set(marketId, state);
  return state;
}

function stepMarket(state) {
  const shock = (Math.random() - 0.5) * 4;
  state.level = 0.9 * state.level + 0.1 * state.base + shock;
  const probability = Math.max(5, Math.min(95, state.level));

  const point = {
    date: new Date().toISOString(),
    probability: Math.round(probability),
  };

  state.history.push(point);
  if (state.history.length > 30) {
    state.history.shift();
  }

  return point;
}

function getTickConfig(midPrice) {
  const tickSize = Math.max(midPrice * 0.02, 0.0001);
  return {
    tickSize,
    spread: tickSize * 2,
  };
}

function generateOrderbookLevels(midPrice, previousLevels) {
  const levels = [];
  const { spread, tickSize } = getTickConfig(midPrice);

  const prevAsks = Array.isArray(previousLevels)
    ? previousLevels.filter((level) => level.type === "ask").sort((a, b) => b.price - a.price)
    : [];
  const prevBids = Array.isArray(previousLevels)
    ? previousLevels.filter((level) => level.type === "bid").sort((a, b) => b.price - a.price)
    : [];

  let askCumulative = 0;
  for (let i = 5; i >= 1; i -= 1) {
    const price = Math.max(0.0001, midPrice + spread / 2 + i * tickSize);
    const baseSize = prevAsks[5 - i]?.size ?? Math.random() * 5000 + 2000;
    const size = baseSize * (0.9 + Math.random() * 0.2);
    askCumulative += size;
    levels.push({
      price: Math.round(price * 10000) / 10000,
      size: Math.round(size),
      cumulative: Math.round(askCumulative),
      type: "ask",
    });
  }

  let bidCumulative = 0;
  for (let i = 1; i <= 5; i += 1) {
    const price = Math.max(0.0001, midPrice - spread / 2 - i * tickSize);
    const baseSize = prevBids[i - 1]?.size ?? Math.random() * 5000 + 2000;
    const size = baseSize * (0.9 + Math.random() * 0.2);
    bidCumulative += size;
    levels.push({
      price: Math.round(price * 10000) / 10000,
      size: Math.round(size),
      cumulative: Math.round(bidCumulative),
      type: "bid",
    });
  }

  return levels;
}

function getOrderbookState(marketId, initialMidPrice) {
  if (orderbookStore.has(marketId)) {
    return orderbookStore.get(marketId);
  }

  const basePrice = Number.isFinite(initialMidPrice) && initialMidPrice > 0 ? initialMidPrice : 0.5;
  const state = {
    midPrice: basePrice,
    levels: generateOrderbookLevels(basePrice),
  };
  orderbookStore.set(marketId, state);
  return state;
}

function stepOrderbook(state) {
  const { tickSize } = getTickConfig(state.midPrice);
  const drift = (Math.random() - 0.5) * tickSize * 0.5;
  state.midPrice = Math.max(0.0001, Math.min(0.99, state.midPrice + drift));
  state.levels = generateOrderbookLevels(state.midPrice, state.levels);
  return { midPrice: state.midPrice, levels: state.levels };
}

async function fetchOrderbook(tokenId) {
  if (!tokenId) return null;

  try {
    const response = await fetch(`${CLOB_API_URL}/book?token_id=${tokenId}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const normalizeSide = (side) => {
      if (Array.isArray(side)) return side;
      if (side && typeof side === "object") return Object.entries(side);
      return [];
    };
    const rawBids = normalizeSide(data?.bids);
    const rawAsks = normalizeSide(data?.asks);

    const bidsSorted = rawBids
      .filter((entry) => Array.isArray(entry) && entry.length >= 2)
      .map(([price, size]) => [Number(price), Number(size)])
      .filter(([price, size]) => Number.isFinite(price) && Number.isFinite(size))
      .sort((a, b) => b[0] - a[0])
      .slice(0, 5);

    const asksSorted = rawAsks
      .filter((entry) => Array.isArray(entry) && entry.length >= 2)
      .map(([price, size]) => [Number(price), Number(size)])
      .filter(([price, size]) => Number.isFinite(price) && Number.isFinite(size))
      .sort((a, b) => a[0] - b[0])
      .slice(0, 5);

    let bidCumulative = 0;
    const bids = bidsSorted.map(([price, size]) => {
      bidCumulative = bidCumulative + size;
      return {
        price,
        size,
        cumulative: Math.round(bidCumulative),
        type: "bid",
      };
    });

    let askCumulative = 0;
    const asks = asksSorted.map(([price, size]) => {
      askCumulative = askCumulative + size;
      return {
        price,
        size,
        cumulative: Math.round(askCumulative),
        type: "ask",
      };
    });

    const bestBid = bidsSorted[0]?.[0];
    const bestAsk = asksSorted[0]?.[0];
    const midPrice =
      Number.isFinite(bestBid) && Number.isFinite(bestAsk)
        ? (bestBid + bestAsk) / 2
        : Number.isFinite(bestBid)
          ? bestBid
          : Number.isFinite(bestAsk)
            ? bestAsk
            : 0;

    return { levels: [...asks, ...bids], midPrice };
  } catch (error) {
    console.warn("[CLOB] Failed to fetch orderbook:", error);
    return null;
  }
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    if (pathname === "/ws/price-history") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else if (pathname === "/ws/orderbook") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("orderbook-connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const marketId =
      url.searchParams.get("marketId")?.trim() && url.searchParams.get("marketId").trim().length > 0
        ? url.searchParams.get("marketId").trim()
        : "default";

    const state = getMarketState(marketId);
    ws.send(JSON.stringify({ type: "history", history: state.history }));

    const interval = setInterval(() => {
      const point = stepMarket(state);
      ws.send(JSON.stringify({ type: "tick", point }));
    }, 2000);

    const cleanup = () => clearInterval(interval);
    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  wss.on("orderbook-connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const marketId =
      url.searchParams.get("marketId")?.trim() && url.searchParams.get("marketId").trim().length > 0
        ? url.searchParams.get("marketId").trim()
        : "default";
    const midPrice = Number.parseFloat(url.searchParams.get("midPrice"));
    const tokenId = url.searchParams.get("tokenId")?.trim();

    const useReal = tokenId && tokenId.length > 0;
    const state = getOrderbookState(marketId, midPrice);

    const sendSnapshot = async () => {
      if (useReal) {
        const book = await fetchOrderbook(tokenId);
        if (book?.levels?.length) {
          ws.send(JSON.stringify({ type: "snapshot", ...book }));
          return;
        }
      }
      ws.send(JSON.stringify({ type: "snapshot", midPrice: state.midPrice, levels: state.levels }));
    };

    const sendUpdate = async () => {
      if (useReal) {
        const book = await fetchOrderbook(tokenId);
        if (book?.levels?.length) {
          ws.send(JSON.stringify({ type: "update", ...book }));
          return;
        }
      }
      const update = stepOrderbook(state);
      ws.send(JSON.stringify({ type: "update", ...update }));
    };

    sendSnapshot();

    const interval = setInterval(() => {
      sendUpdate();
    }, 3000);

    const cleanup = () => clearInterval(interval);
    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  server.listen(3000, () => {
    console.log("Server ready on http://localhost:3000");
  });
});
