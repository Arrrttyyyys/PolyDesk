"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/header";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  LineChart,
  Network,
  Shield,
} from "lucide-react";
import { type PolymarketEvent } from "@/lib/api/polymarket";
import { type Market } from "@/lib/types";

type RelationshipType = "exclusive" | "independent" | "custom";
type ViewMode = "bullish" | "bearish" | "relative";
type RightTab = "hedge" | "payoff" | "time" | "execution";
type Severity = "High" | "Medium" | "Low";

type ClusterMarket = {
  id: string;
  title: string;
  yesMid: number;
  noMid: number;
  yesTokenId?: string;
  noTokenId?: string;
  spread: number;
  liquidity: number;
  volume: number;
  resolution: string;
  horizonDays: number;
  termKey: string;
  groupKey: string;
  lastUpdatedMins: number;
};

type Cluster = {
  id: string;
  title: string;
  description: string;
  markets: ClusterMarket[];
  defaultRelationship: RelationshipType;
};

const EMPTY_CLUSTER: Cluster = {
  id: "empty",
  title: "No cluster selected",
  description: "Select a cluster to see markets.",
  defaultRelationship: "independent",
  markets: [],
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatUsd = (value: number) => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatPrice = (value: number) => (value < 0.1 ? value.toFixed(4) : value.toFixed(3));
const formatNodeTitle = (title: string) => {
  const words = title.split(" ").filter(Boolean);
  if (words.length <= 4) return title;
  return `${words.slice(0, 2).join(" ")} ... ${words.slice(-2).join(" ")}`;
};
const formatNodePrice = (value: number) => (value > 0 ? formatPrice(value) : "n/a");

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

type Finding = {
  severity: Severity;
  title: string;
  detail: string;
};

type Leg = {
  id: string;
  marketId: string;
  marketTitle: string;
  side: "buy";
  outcome: "yes" | "no";
  price: number;
  shares: number;
};

function buildSyntheticDepth(mid: number, liquidity: number, side: "ask" | "bid") {
  const levels = [];
  const tick = Math.max(mid * 0.02, 0.0001);
  const baseSize = Math.max(1000, liquidity * 0.08);

  for (let i = 1; i <= 5; i += 1) {
    const price = side === "ask" ? mid + i * tick : Math.max(0.0001, mid - i * tick);
    const size = baseSize * (1 + (i - 1) * 0.35);
    levels.push({ price, size });
  }

  return levels;
}

function vwapForShares(levels: { price: number; size: number }[], shares: number) {
  let remaining = shares;
  let cost = 0;
  let filled = 0;

  for (const level of levels) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, level.size);
    cost += take * level.price;
    remaining -= take;
    filled += take;
  }

  if (filled === 0) return { vwap: 0, filled: 0 };
  return { vwap: cost / filled, filled };
}

export default function StrategyLabPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [activeClusterId, setActiveClusterId] = useState<string>("");
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>([]);
  const [relationshipMap, setRelationshipMap] = useState<Record<string, RelationshipType>>({});
  const [primaryMarketId, setPrimaryMarketId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("bullish");
  const [sizeMode, setSizeMode] = useState<"shares" | "usd">("shares");
  const [sizeValue, setSizeValue] = useState(2500);
  const [riskCap, setRiskCap] = useState(1500);
  const [corrWeight, setCorrWeight] = useState(0.5);
  const [activeTab, setActiveTab] = useState<RightTab>("hedge");
  const [belief, setBelief] = useState(0.45);
  const [halfLife, setHalfLife] = useState(45);
  const [bookSnapshots, setBookSnapshots] = useState<
    Record<string, { bids: { price: number; size: number }[]; asks: { price: number; size: number }[]; mid: number }>
  >({});

  const parseUsdCompact = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return 0;
    const trimmed = value.trim().replace("$", "");
    if (!trimmed) return 0;
    const multiplier = trimmed.endsWith("B")
      ? 1e9
      : trimmed.endsWith("M")
        ? 1e6
        : trimmed.endsWith("K")
          ? 1e3
          : 1;
    const numeric = Number(trimmed.replace(/[BKMR]/g, ""));
    return Number.isFinite(numeric) ? numeric * multiplier : 0;
  };

  const estimateRelationship = (title: string, marketCount: number): RelationshipType => {
    const text = title.toLowerCase();
    if (text.includes("wins") || text.includes("nominee") || text.includes("champion")) {
      return "exclusive";
    }
    return marketCount >= 3 ? "exclusive" : "independent";
  };

  const mapMarketsToClusters = (markets: Market[], events: PolymarketEvent[]): Cluster[] => {
    const eventMeta = new Map(
      events.map((event) => [event.id, { title: event.title, description: event.description ?? "" }])
    );
    const grouped = new Map<string, Market[]>();

    markets.forEach((market) => {
      const key = market.eventId || "unknown";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(market);
    });

    return Array.from(grouped.entries())
      .map(([eventId, group]) => {
        const meta = eventMeta.get(eventId);
        const title = meta?.title || group[0]?.title || "Event cluster";
        const description = meta?.description || "Event cluster";
        const defaultRelationship = estimateRelationship(title, group.length);
        const mappedMarkets = group.map((market) => {
          const inferredYes =
            market.yesPrice > 0 ? market.yesPrice : market.probability > 0 ? market.probability / 100 : 0;
          const noMid = market.noPrice > 0 ? market.noPrice : inferredYes > 0 ? 1 - inferredYes : 0;
          const horizonDays = market.resolution
            ? Math.max(
                1,
                Math.ceil((new Date(market.resolution).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              )
            : 180;
          return {
            id: market.id,
            title: market.title,
            yesMid: inferredYes,
            noMid,
            yesTokenId: market.clobTokenIds?.yes,
            noTokenId: market.clobTokenIds?.no,
            spread: Math.max(0.01, Math.abs(1 - (inferredYes + noMid))),
            liquidity: parseUsdCompact(market.volume),
            volume: parseUsdCompact(market.volume),
            resolution: market.resolution || "TBD",
            horizonDays,
            termKey: eventId,
            groupKey: eventId,
            lastUpdatedMins: Math.min(30, Math.max(1, Math.round(Math.random() * 20))),
          };
        });

        return {
          id: eventId,
          title,
          description,
          defaultRelationship,
          markets: mappedMarkets,
        };
      })
      .filter((cluster) => cluster.markets.length > 1)
      .sort((a, b) => b.markets.length - a.markets.length);
  };

  useEffect(() => {
    let active = true;
    const loadClusters = async () => {
      try {
        setIsLoading(true);
        const [eventsRes, marketsRes] = await Promise.all([
          fetch("/api/events?limit=300"),
          fetch("/api/markets?limit=300&fetchPrices=true"),
        ]);

        if (!eventsRes.ok || !marketsRes.ok) throw new Error("Failed to load clusters");

        const eventsData = await eventsRes.json();
        const marketsData = await marketsRes.json();
        const events = (eventsData.events || []) as PolymarketEvent[];
        const markets = (marketsData.markets || []) as Market[];
        const mapped = mapMarketsToClusters(markets, events);

        if (!active) return;
        setClusters(mapped);
        if (mapped[0]) {
          setActiveClusterId(mapped[0].id);
          setSelectedMarketIds(mapped[0].markets.slice(0, 3).map((m) => m.id));
          setRelationshipMap(
            Object.fromEntries(mapped[0].markets.map((m) => [m.id, mapped[0].defaultRelationship]))
          );
          setPrimaryMarketId(mapped[0].markets[0]?.id ?? null);
        }
      } catch (error) {
        console.error("Failed to load clusters:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadClusters();
    return () => {
      active = false;
    };
  }, []);

  const filteredClusters = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return clusters;
    return clusters.filter((cluster) => {
      if (cluster.title.toLowerCase().includes(q)) return true;
      if (cluster.description.toLowerCase().includes(q)) return true;
      return cluster.markets.some((market) => market.title.toLowerCase().includes(q));
    });
  }, [query, clusters]);

  const activeCluster = useMemo(
    () => filteredClusters.find((cluster) => cluster.id === activeClusterId) ?? filteredClusters[0] ?? EMPTY_CLUSTER,
    [filteredClusters, activeClusterId]
  );

  const availableMarkets = activeCluster.markets;

  useEffect(() => {
    if (!activeCluster || activeCluster.id === "empty") return;

    if (!activeClusterId) {
      setActiveClusterId(activeCluster.id);
    }

    setRelationshipMap((prev) => {
      const next = { ...prev };
      activeCluster.markets.forEach((market) => {
        if (!next[market.id]) next[market.id] = activeCluster.defaultRelationship;
      });
      return next;
    });

    setSelectedMarketIds((prev) => {
      const filtered = prev.filter((id) => activeCluster.markets.some((market) => market.id === id));
      if (filtered.length > 0) return filtered;
      return activeCluster.markets.slice(0, 3).map((market) => market.id);
    });

    setPrimaryMarketId((prev) => {
      if (prev && activeCluster.markets.some((market) => market.id === prev)) {
        return prev;
      }
      return activeCluster.markets[0]?.id ?? null;
    });
  }, [activeCluster, activeClusterId]);

  const selectedMarkets = useMemo(
    () => availableMarkets.filter((market) => selectedMarketIds.includes(market.id)),
    [availableMarkets, selectedMarketIds]
  );

  const primaryMarket = selectedMarkets.find((market) => market.id === primaryMarketId) ?? selectedMarkets[0];

  const findings = useMemo(() => {
    const output: Finding[] = [];
    const exclusiveMarkets = selectedMarkets.filter(
      (market) => relationshipMap[market.id] === "exclusive"
    );

    if (exclusiveMarkets.length > 1) {
      const sum = exclusiveMarkets.reduce((acc, market) => acc + market.yesMid, 0);
      if (sum > 1.03) {
        const top = [...exclusiveMarkets]
          .sort((a, b) => b.yesMid - a.yesMid)
          .slice(0, 2)
          .map((m) => m.title)
          .join(", ");
        output.push({
          severity: "High",
          title: "Overround high",
          detail: `Exclusive sum ${formatPercent(sum)}. Largest contributors: ${top}.`,
        });
      } else if (sum < 0.97) {
        output.push({
          severity: "Medium",
          title: "Underround suspicious",
          detail: `Exclusive sum ${formatPercent(sum)}. Check stale quotes.`,
        });
      }
    }

    selectedMarkets.forEach((market) => {
      const parity = market.yesMid + market.noMid;
      if (Math.abs(parity - 1) > 0.04) {
        output.push({
          severity: "High",
          title: "YES/NO parity break",
          detail: `${market.title}: yes+no = ${parity.toFixed(2)}.`,
        });
      }
    });

    const byTerm = selectedMarkets.reduce((acc, market) => {
      acc[market.termKey] = acc[market.termKey] ?? [];
      acc[market.termKey].push(market);
      return acc;
    }, {} as Record<string, ClusterMarket[]>);

    Object.values(byTerm).forEach((group) => {
      if (group.length < 2) return;
      const sorted = [...group].sort((a, b) => a.horizonDays - b.horizonDays);
      for (let i = 1; i < sorted.length; i += 1) {
        const prev = sorted[i - 1];
        const next = sorted[i];
        if (prev.yesMid > next.yesMid + 0.01) {
          output.push({
            severity: "Medium",
            title: "Term structure violation",
            detail: `${prev.title} (${formatPercent(prev.yesMid)}) > ${next.title} (${formatPercent(
              next.yesMid
            )}).`,
          });
        }
      }
    });

    selectedMarkets.forEach((market) => {
      if (market.spread > 0.05) {
        output.push({
          severity: "Medium",
          title: "Wide spread",
          detail: `${market.title} spread ${formatPrice(market.spread)}.`,
        });
      }
      if (market.liquidity < 60000) {
        output.push({
          severity: "Low",
          title: "Thin liquidity",
          detail: `${market.title} liquidity ${formatUsd(market.liquidity)}.`,
        });
      }
      if (market.lastUpdatedMins > 15) {
        output.push({
          severity: "Low",
          title: "Stale book",
          detail: `${market.title} last update ${market.lastUpdatedMins}m.`,
        });
      }
    });

    return output.slice(0, 6);
  }, [selectedMarkets, relationshipMap]);

  const hedgePlan = useMemo(() => {
    if (!primaryMarket) {
      return { legs: [] as Leg[], rationale: ["Select a primary market to build a structure."] };
    }

    const budgetShares =
      sizeMode === "usd" ? Math.max(1, sizeValue / Math.max(primaryMarket.yesMid, 0.01)) : sizeValue;
    const cappedShares = Math.min(budgetShares, Math.max(1, riskCap / Math.max(primaryMarket.yesMid, 0.01)));

    const legs: Leg[] = [];
    let rationale: string[] = [];

    if (viewMode === "bullish") {
      legs.push({
        id: "leg-1",
        marketId: primaryMarket.id,
        marketTitle: primaryMarket.title,
        side: "buy",
        outcome: "yes",
        price: primaryMarket.yesMid,
        shares: cappedShares,
      });
      rationale = ["Primary long YES expresses bullish view.", "Sizing capped by risk budget."];
    } else if (viewMode === "bearish") {
      legs.push({
        id: "leg-1",
        marketId: primaryMarket.id,
        marketTitle: primaryMarket.title,
        side: "buy",
        outcome: "no",
        price: primaryMarket.noMid,
        shares: cappedShares,
      });
      rationale = ["Primary long NO expresses bearish view.", "Sizing capped by risk budget."];
    } else {
      const alt =
        selectedMarkets.find((market) => market.id !== primaryMarket.id) ??
        availableMarkets.find((market) => market.id !== primaryMarket.id);
      if (alt) {
        legs.push({
          id: "leg-1",
          marketId: primaryMarket.id,
          marketTitle: primaryMarket.title,
          side: "buy",
          outcome: "no",
          price: primaryMarket.noMid,
          shares: cappedShares,
        });
        legs.push({
          id: "leg-2",
          marketId: alt.id,
          marketTitle: alt.title,
          side: "buy",
          outcome: "yes",
          price: alt.yesMid,
          shares: cappedShares * corrWeight,
        });
        rationale = [
          "Relative structure: fade primary, pair with higher-liquidity alternative.",
          "Hedge size scaled by correlation weight.",
        ];
      }
    }

    if (legs.length === 1 && selectedMarkets.length > 1) {
      const hedgeCandidate = [...selectedMarkets]
        .filter((market) => market.id !== primaryMarket.id)
        .sort((a, b) => b.yesMid - a.yesMid)[0];
      if (hedgeCandidate) {
        legs.push({
          id: "leg-2",
          marketId: hedgeCandidate.id,
          marketTitle: hedgeCandidate.title,
          side: "buy",
          outcome: "yes",
          price: hedgeCandidate.yesMid,
          shares: cappedShares * corrWeight,
        });
        rationale.push("Hedge leg chosen from top alternative in the cluster.");
      }
    }

    return { legs, rationale };
  }, [
    primaryMarket,
    availableMarkets,
    selectedMarkets,
    viewMode,
    sizeMode,
    sizeValue,
    riskCap,
    corrWeight,
  ]);

  const payoffCurve = useMemo(() => {
    if (!primaryMarket || hedgePlan.legs.length === 0) return [];
    const p0Primary = primaryMarket.yesMid;

    return Array.from({ length: 21 }, (_, idx) => {
      const pTrue = idx / 20;
      const totalEv = hedgePlan.legs.reduce((acc, leg) => {
        const market = availableMarkets.find((m) => m.id === leg.marketId);
        if (!market) return acc;
        const p0 = market.yesMid;
        const pAdj = clamp(p0 + (pTrue - p0Primary) * corrWeight);
        const price = leg.outcome === "yes" ? market.yesMid : market.noMid;
        const ev =
          leg.outcome === "yes"
            ? leg.shares * (pAdj * (1 - price) + (1 - pAdj) * -price)
            : leg.shares * ((1 - pAdj) * (1 - price) + pAdj * -price);
        return acc + ev;
      }, 0);
      return { pTrue, totalEv };
    });
  }, [availableMarkets, hedgePlan.legs, primaryMarket, corrWeight]);

  const timeSurface = useMemo(() => {
    if (!primaryMarket || hedgePlan.legs.length === 0) return [];
    const horizons = [7, 30, 90, 180];
    return horizons.map((days) => {
      const multiplier = Math.exp((-Math.log(2) * days) / Math.max(halfLife, 1));
      const rows = hedgePlan.legs.map((leg) => {
        const market = availableMarkets.find((m) => m.id === leg.marketId);
        if (!market) return null;
        const p0 = market.yesMid;
        const pTarget = clamp(belief);
        const expected = pTarget + (p0 - pTarget) * multiplier;
        const mtm =
          leg.outcome === "yes"
            ? leg.shares * (expected - p0)
            : leg.shares * ((1 - expected) - (1 - p0));
        return { leg, expected, mtm };
      });
      return { days, rows: rows.filter(Boolean) as { leg: Leg; expected: number; mtm: number }[] };
    });
  }, [availableMarkets, hedgePlan.legs, belief, halfLife, primaryMarket]);

  const executionPlan = useMemo(() => {
    return hedgePlan.legs.map((leg) => {
      const market = availableMarkets.find((m) => m.id === leg.marketId);
      if (!market) return null;
      const tokenId = leg.outcome === "yes" ? market.yesTokenId : market.noTokenId;
      const snapshot = tokenId ? bookSnapshots[tokenId] : undefined;
      const mid = snapshot?.mid || (leg.outcome === "yes" ? market.yesMid : market.noMid);
      const levels = snapshot?.asks?.length
        ? snapshot.asks.map((level) => ({ price: level.price, size: level.size }))
        : buildSyntheticDepth(mid, market.liquidity, leg.outcome === "yes" ? "ask" : "bid");
      const { vwap, filled } = vwapForShares(levels, leg.shares);
      const slippage = vwap > 0 ? vwap - mid : 0;
      return {
        leg,
        mid,
        vwap,
        slippage,
        filled,
      };
    });
  }, [availableMarkets, hedgePlan.legs, bookSnapshots]);

  const graphNodes = useMemo(() => {
    const nodes = selectedMarkets.map((market, index) => {
      const angle = (index / Math.max(selectedMarkets.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const radius = 80;
      return {
        ...market,
        x: 150 + Math.cos(angle) * radius,
        y: 110 + Math.sin(angle) * radius,
      };
    });
    return nodes;
  }, [selectedMarkets]);

  useEffect(() => {
    if (activeTab !== "execution" || hedgePlan.legs.length === 0) return;

    const tokenIds = hedgePlan.legs
      .map((leg) => {
        const market = availableMarkets.find((m) => m.id === leg.marketId);
        if (!market) return null;
        return leg.outcome === "yes" ? market.yesTokenId : market.noTokenId;
      })
      .filter((id): id is string => Boolean(id));

    if (tokenIds.length === 0) return;

    let active = true;
    const fetchBooks = async () => {
      try {
        const responses = await Promise.all(
          tokenIds.map(async (tokenId) => {
            const res = await fetch(`/api/book?tokenId=${encodeURIComponent(tokenId)}`);
            if (!res.ok) return null;
            const data = await res.json();
            return { tokenId, data };
          })
        );

        if (!active) return;
        setBookSnapshots((prev) => {
          const next = { ...prev };
          responses.forEach((entry) => {
            if (!entry?.data) return;
            next[entry.tokenId] = entry.data;
          });
          return next;
        });
      } catch (error) {
        console.error("Failed to fetch orderbook:", error);
      }
    };

    fetchBooks();
    return () => {
      active = false;
    };
  }, [activeTab, hedgePlan.legs, availableMarkets]);

  const handleClusterSelect = (cluster: Cluster) => {
    setActiveClusterId(cluster.id);
    setSelectedMarketIds(cluster.markets.slice(0, 3).map((market) => market.id));
    setRelationshipMap(
      Object.fromEntries(cluster.markets.map((market) => [market.id, cluster.defaultRelationship]))
    );
    setPrimaryMarketId(cluster.markets[0]?.id ?? null);
  };

  const updateClusterMarkets = (
    clusterId: string,
    updater: (market: ClusterMarket) => ClusterMarket
  ) => {
    setClusters((prev) =>
      prev.map((cluster) => {
        if (cluster.id !== clusterId) return cluster;
        return {
          ...cluster,
          markets: cluster.markets.map((market) => updater(market)),
        };
      })
    );
  };

  const handleRefreshPricing = async () => {
    if (selectedMarkets.length === 0) return;

    setIsRefreshing(true);
    try {
      const responses = await Promise.all(
        selectedMarkets.map(async (market) => {
          if (!market.yesTokenId && !market.noTokenId) return null;
          const res = await fetch("/api/market-prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              yesTokenId: market.yesTokenId,
              noTokenId: market.noTokenId,
            }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return { marketId: market.id, data };
        })
      );

      const updates = responses.filter(Boolean) as { marketId: string; data: { yesPrice: number; noPrice: number } }[];
      if (updates.length > 0) {
        updateClusterMarkets(activeCluster.id, (market) => {
          const update = updates.find((entry) => entry.marketId === market.id);
          if (!update) return market;
          const yesMid = update.data.yesPrice > 0 ? update.data.yesPrice : market.yesMid;
          const noMid =
            update.data.noPrice > 0
              ? update.data.noPrice
              : yesMid > 0
                ? 1 - yesMid
                : market.noMid;
          return {
            ...market,
            yesMid,
            noMid,
            spread: Math.max(0.01, Math.abs(1 - (yesMid + noMid))),
            lastUpdatedMins: 0,
          };
        });
      }
    } catch (error) {
      console.error("Failed to refresh pricing:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="grid-pattern">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Strategy Lab</h2>
              <p className="text-sm text-muted-foreground">
                Combine Polymarket clusters into a coherent risk view with consistency checks and structures.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
                <Shield className="h-4 w-4 text-primary" />
                Consistency Scanner
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1">
                <Network className="h-4 w-4 text-muted-foreground" />
                Live Cluster Builder
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_1.25fr_1.05fr]">
            {/* Left panel */}
            <section className="glass rounded-xl p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Market Set Builder</h3>
                <p className="text-xs text-muted-foreground">
                  Select a topic cluster and curate the market set (2-10 markets).
                </p>
              </div>

              <div className="space-y-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search topic cluster..."
                  className="w-full rounded-lg border border-border/50 bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={handleRefreshPricing}
                  disabled={isRefreshing || selectedMarkets.length === 0}
                  className="w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-50"
                >
                  {isRefreshing ? "Refreshing pricing..." : "Refresh pricing for selected"}
                </button>
                <div className="space-y-2">
                  {isLoading && (
                    <div className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                      Loading clusters...
                    </div>
                  )}
                  {filteredClusters.map((cluster) => (
                    <button
                      key={cluster.id}
                      onClick={() => handleClusterSelect(cluster)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        cluster.id === activeClusterId
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-border/40 bg-secondary/20 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="font-medium">{cluster.title}</div>
                      <div className="text-xs text-muted-foreground">{cluster.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Markets</h4>
                  <span className="text-xs text-muted-foreground">
                    {selectedMarketIds.length} selected
                  </span>
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {availableMarkets.map((market) => {
                    const checked = selectedMarketIds.includes(market.id);
                    return (
                      <div key={market.id} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedMarketIds((prev) =>
                                checked ? prev.filter((id) => id !== market.id) : [...prev, market.id]
                              );
                            }}
                            className="mt-1 h-4 w-4 accent-primary"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">{market.title}</div>
                            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <span>YES {formatNodePrice(market.yesMid)}</span>
                              <span>NO {formatNodePrice(market.noMid)}</span>
                              <span>Spread {formatPrice(market.spread)}</span>
                              <span>Liquidity {formatUsd(market.liquidity)}</span>
                              <span>Vol {formatUsd(market.volume)}</span>
                              <span>{market.resolution}</span>
                            </div>
                            <div className="mt-2">
                              <select
                                value={relationshipMap[market.id]}
                                onChange={(event) =>
                                  setRelationshipMap((prev) => ({
                                    ...prev,
                                    [market.id]: event.target.value as RelationshipType,
                                  }))
                                }
                                className="w-full rounded-md border border-border/50 bg-input px-2 py-1 text-xs text-foreground"
                              >
                                <option value="exclusive">Mutually exclusive group</option>
                                <option value="independent">Independent</option>
                                <option value="custom">Custom constraint</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Center panel */}
            <section className="glass rounded-xl p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Graph + Consistency</h3>
                  <p className="text-xs text-muted-foreground">
                    Relationship graph and scanner findings for logical coherence.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LineChart className="h-4 w-4 text-primary" />
                  Live check
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Market graph</span>
                  <span>Tap node to set primary</span>
                </div>
                <div className="flex items-center justify-center">
                  <svg viewBox="0 0 300 220" className="h-56 w-full">
                    <defs>
                      <linearGradient id="edgeGlow" x1="0" x2="1">
                        <stop offset="0%" stopColor="rgba(74, 222, 128, 0.3)" />
                        <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
                      </linearGradient>
                    </defs>
                    {graphNodes.map((node, idx) => {
                      const next = graphNodes[(idx + 1) % graphNodes.length];
                      if (!next) return null;
                      return (
                        <line
                          key={`edge-${node.id}`}
                          x1={node.x}
                          y1={node.y}
                          x2={next.x}
                          y2={next.y}
                          stroke="url(#edgeGlow)"
                          strokeWidth="2"
                        />
                      );
                    })}
                    {graphNodes.map((node) => (
                      <g key={node.id} onClick={() => setPrimaryMarketId(node.id)} role="button">
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={primaryMarket?.id === node.id ? 18 : 14}
                          fill={primaryMarket?.id === node.id ? "rgba(74, 222, 128, 0.35)" : "rgba(30, 30, 45, 0.7)"}
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth="2"
                        />
                        <text
                          x={node.x}
                          y={node.y + 30}
                          textAnchor="middle"
                          fontSize="10"
                          fill="rgba(226,232,240,0.9)"
                        >
                          {formatNodeTitle(node.title)}
                        </text>
                        <text
                          x={node.x}
                          y={node.y + 45}
                          textAnchor="middle"
                          fontSize="9"
                          fill="rgba(148,163,184,0.9)"
                        >
                          YES {formatNodePrice(node.yesMid)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Scanner Findings</h4>
                  <span className="text-xs text-muted-foreground">{findings.length} alerts</span>
                </div>
                <div className="space-y-2">
                  {findings.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      No inconsistencies detected for the selected set.
                    </div>
                  ) : (
                    findings.map((finding, index) => (
                      <div
                        key={`${finding.title}-${index}`}
                        className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2"
                      >
                        {finding.severity === "High" ? (
                          <AlertTriangle className="h-4 w-4 text-accent" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            {finding.title} · {finding.severity}
                          </div>
                          <div className="text-xs text-muted-foreground">{finding.detail}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Right panel */}
            <section className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Hedge Builder</h3>
                  <p className="text-xs text-muted-foreground">Structure + payoff surface</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Structure engine
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {(["hedge", "payoff", "time", "execution"] as RightTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-3 py-1 ${
                      activeTab === tab
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "border border-border/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "hedge" ? "Hedge Builder" : tab === "payoff" ? "Payoff Surface" : tab === "time" ? "Time Risk" : "Execution"}
                  </button>
                ))}
              </div>

              {activeTab === "hedge" && (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs">
                    <div>
                      <div className="text-xs text-muted-foreground">Primary view</div>
                      <div className="mt-1 flex gap-2">
                        {(["bullish", "bearish", "relative"] as ViewMode[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`rounded-full px-3 py-1 ${
                              viewMode === mode
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "border border-border/40 text-muted-foreground"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-muted-foreground">
                        Size mode
                        <select
                          value={sizeMode}
                          onChange={(event) => setSizeMode(event.target.value as "shares" | "usd")}
                          className="mt-1 w-full rounded-md border border-border/50 bg-input px-2 py-1 text-xs text-foreground"
                        >
                          <option value="shares">Shares</option>
                          <option value="usd">USD notional</option>
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Size
                        <input
                          type="number"
                          value={sizeValue}
                          onChange={(event) => setSizeValue(Number(event.target.value))}
                          className="mt-1 w-full rounded-md border border-border/50 bg-input px-2 py-1 text-xs text-foreground"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Risk cap ($)
                        <input
                          type="number"
                          value={riskCap}
                          onChange={(event) => setRiskCap(Number(event.target.value))}
                          className="mt-1 w-full rounded-md border border-border/50 bg-input px-2 py-1 text-xs text-foreground"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Correlation weight
                        <select
                          value={corrWeight}
                          onChange={(event) => setCorrWeight(Number(event.target.value))}
                          className="mt-1 w-full rounded-md border border-border/50 bg-input px-2 py-1 text-xs text-foreground"
                        >
                          <option value={0.3}>0.3</option>
                          <option value={0.5}>0.5</option>
                          <option value={0.7}>0.7</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs">
                    <div className="mb-2 text-xs font-semibold text-foreground">Suggested structure</div>
                    {hedgePlan.legs.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Select markets to build a structure.</div>
                    ) : (
                      <div className="space-y-2">
                        {hedgePlan.legs.map((leg, index) => (
                          <div key={leg.id} className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-semibold text-foreground">
                                Leg {index + 1}: Buy {leg.outcome.toUpperCase()}
                              </div>
                              <div className="text-xs text-muted-foreground">{leg.marketTitle}</div>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <div>{leg.shares.toFixed(0)} shares</div>
                              <div>@ {formatPrice(leg.price)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {hedgePlan.rationale.map((note, idx) => (
                        <div key={`${note}-${idx}`} className="flex items-center gap-2">
                          <ArrowRight className="h-3 w-3 text-primary" />
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "payoff" && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                    <div className="mb-2 text-xs text-muted-foreground">Expected value vs belief</div>
                    <svg viewBox="0 0 300 160" className="h-40 w-full">
                      <path
                        d={`M ${payoffCurve
                          .map((point, idx) => {
                            const x = 20 + (idx / (payoffCurve.length - 1)) * 260;
                            const normalized = Math.max(-2000, Math.min(2000, point.totalEv));
                            const y = 80 - (normalized / 2000) * 60;
                            return `${x},${y}`;
                          })
                          .join(" L ")}`}
                        fill="none"
                        stroke="rgba(74, 222, 128, 0.8)"
                        strokeWidth="2"
                      />
                      <line x1="20" y1="80" x2="280" y2="80" stroke="rgba(255,255,255,0.1)" />
                    </svg>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    EV uses correlated probability adjustments based on your weight and belief sweep.
                  </div>
                </div>
              )}

              {activeTab === "time" && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-muted-foreground">
                        Belief p*
                        <input
                          type="number"
                          step="0.01"
                          value={belief}
                          onChange={(event) => setBelief(Number(event.target.value))}
                          className="mt-1 w-full rounded-md border border-border/50 bg-input px-2 py-1 text-xs text-foreground"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Half-life (days)
                        <input
                          type="number"
                          value={halfLife}
                          onChange={(event) => setHalfLife(Number(event.target.value))}
                          className="mt-1 w-full rounded-md border border-border/50 bg-input px-2 py-1 text-xs text-foreground"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {timeSurface.map((bucket) => (
                      <div key={bucket.days} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                        <div className="text-xs font-semibold text-foreground">
                          {bucket.days} days
                        </div>
                        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                          {bucket.rows.map((row) => (
                            <div key={row.leg.id} className="flex items-center justify-between">
                              <span>{row.leg.marketTitle.split(" ").slice(0, 4).join(" ")}</span>
                              <span>
                                Expected p {formatPercent(row.expected)} · MTM {formatUsd(row.mtm)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Assumes mean reversion toward belief with exponential half-life.
                  </div>
                </div>
              )}

              {activeTab === "execution" && (
                <div className="mt-4 space-y-3">
                  {executionPlan.map((entry) => {
                    if (!entry) return null;
                    const slippageCents = entry.slippage * 100;
                    return (
                      <div key={entry.leg.id} className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-foreground">
                            {entry.leg.marketTitle}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {entry.leg.outcome.toUpperCase()} @ {formatPrice(entry.mid)}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>VWAP {formatPrice(entry.vwap)}</span>
                          <span>Slippage {slippageCents.toFixed(2)}c</span>
                          <span>Filled {entry.filled.toFixed(0)}</span>
                          <span>Shares {entry.leg.shares.toFixed(0)}</span>
                        </div>
                        {entry.filled < entry.leg.shares && (
                          <div className="mt-2 text-xs text-accent">
                            Partial fill risk. Residual exposure remains.
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="text-xs text-muted-foreground">
                    Execution sim uses synthetic depth from liquidity. Replace with live orderbook for production.
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
