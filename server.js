const http = require("http");
const next = require("next");
const { WebSocketServer } = require("ws");
const { parse } = require("url");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const historyStore = new Map();

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

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname === "/ws/price-history") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    const { query } = parse(req.url, true);
    const marketId =
      typeof query.marketId === "string" && query.marketId.trim().length > 0
        ? query.marketId.trim()
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

  server.listen(3000, () => {
    console.log("Server ready on http://localhost:3000");
  });
});
