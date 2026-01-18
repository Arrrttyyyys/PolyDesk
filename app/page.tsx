"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { type PolymarketEvent, type PolymarketMarket } from "@/lib/api/polymarket";

type EventCardData = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  tags: string[];
  totalVolumeRaw: number;
  totalLiquidityRaw: number;
  primaryMarketId?: string;
};

export default function Home() {
  const router = useRouter();
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [searchEvents, setSearchEvents] = useState<PolymarketEvent[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/events?limit=250");
        if (!res.ok) throw new Error("Failed to load markets");
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error("Error loading markets:", err);
        setError("Unable to load trending markets right now.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTrending();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchEvents([]);
      setIsSearching(false);
      return;
    }

    let isActive = true;
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/event-search?q=${encodeURIComponent(q)}&limit=500`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (isActive) setSearchEvents(data.events || []);
      } catch (err) {
        console.error("Search error:", err);
        if (isActive) setSearchEvents([]);
      } finally {
        if (isActive) setIsSearching(false);
      }
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(t);
    };
  }, [query]);

  const parseNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    }
    return 0;
  };

  const formatUsd = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${Math.round(value).toString()}`;
  };

  const truncateText = (value: string | undefined, maxLength: number) => {
    if (!value) return "";
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1).trim()}…`;
  };

  const getYesPrice = (market?: PolymarketMarket) => {
    if (!market) return -1;
    if (Array.isArray(market.outcomes) && typeof market.outcomes[0] === "string") {
      const outcomes = market.outcomes as string[];
      const prices = Array.isArray(market.outcomePrices) ? market.outcomePrices : [];
      const yesIdx = outcomes.findIndex((o) => ["yes", "pass", "true"].includes(o.toLowerCase()));
      if (yesIdx >= 0) {
        const price = Number(prices[yesIdx]);
        return Number.isFinite(price) ? price : -1;
      }
    } else if (Array.isArray(market.outcomes)) {
      const outcomes = market.outcomes as { outcome: string; price: string }[];
      const yes = outcomes.find((o) => ["yes", "pass", "true"].includes(o.outcome?.toLowerCase?.() ?? ""));
      const price = yes ? Number(yes.price) : NaN;
      return Number.isFinite(price) ? price : -1;
    }
    return -1;
  };

  const mapEventToCard = (event: PolymarketEvent): EventCardData => {
    const tags = (event.tags || [])
      .map((tag) => {
        if (typeof tag === "string") return tag;
        if (tag && typeof tag === "object") {
          const candidate =
            (tag as { label?: string; slug?: string }).label ??
            (tag as { slug?: string }).slug;
          return candidate || "";
        }
        return "";
      })
      .filter((tag) => tag.trim() !== "");

    const markets = event.markets || [];
    const totalVolumeRaw = markets.reduce((sum, market) => sum + parseNumber(market.volume), 0);
    const totalLiquidityRaw = markets.reduce((sum, market) => sum + parseNumber(market.liquidity), 0);
    const primaryMarket = markets.reduce((best, market) => {
      const bestYes = getYesPrice(best);
      const currentYes = getYesPrice(market);
      if (currentYes > bestYes) return market;
      if (currentYes === bestYes && parseNumber(market.volume) > parseNumber(best.volume)) return market;
      return best;
    }, markets[0] ?? ({} as (typeof markets)[number]));

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      tags,
      totalVolumeRaw,
      totalLiquidityRaw,
      primaryMarketId: primaryMarket?.id,
    };
  };

  const eventCards = useMemo(() => events.map(mapEventToCard), [events]);
  const searchEventCards = useMemo(() => searchEvents.map(mapEventToCard), [searchEvents]);

  const availableCategories = useMemo(() => {
    const tags = new Set<string>();
    eventCards.forEach((event) => {
      event.tags.forEach((tag) => tags.add(tag));
    });
    return ["all", ...Array.from(tags).sort((a, b) => a.localeCompare(b))];
  }, [eventCards]);

  const trendingEvents = useMemo(() => {
    const filteredByCategory =
      category === "all"
        ? eventCards
        : eventCards.filter((event) => event.tags.includes(category));
    const sorted = [...filteredByCategory].sort(
      (a, b) => b.totalVolumeRaw - a.totalVolumeRaw
    );
    return sorted.slice(0, 50);
  }, [eventCards, category]);

  const filteredEvents = useMemo(() => {
    if (query.trim().length >= 2) {
      return category === "all"
        ? searchEventCards
        : searchEventCards.filter((event) => event.tags.includes(category));
    }
    return trendingEvents;
  }, [query, searchEventCards, trendingEvents, category]);

  const handleSelectEvent = (event: EventCardData) => {
    // Navigate to dashboard with eventId so we can show all bets in that event
    // The dashboard will auto-select the first market from this event
    router.push(`/dashboard?eventId=${encodeURIComponent(event.id)}`);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (filteredEvents.length > 0) {
      handleSelectEvent(filteredEvents[0]);
    }
  };

  return (
    <main className="min-h-screen bg-background grid-pattern">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-semibold text-foreground">
              Top 50 Trending Polymarket Bets
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Search across Polymarket and jump into the analytics dashboard.
            </p>
          </div>

          <form className="mb-6 flex flex-col lg:flex-row gap-3" onSubmit={handleSearchSubmit}>
            <input
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Search a market..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {availableCategories.map((tag) => (
                <option key={tag} value={tag}>
                  {tag === "all" ? "All categories" : tag}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open Analytics
            </button>
          </form>

          <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs text-muted-foreground">
              <span>{query.trim().length >= 2 ? "Search Results" : "Trending Bets"}</span>
              <span>{filteredEvents.length}</span>
            </div>

            {isLoading && (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Loading trending markets...
              </div>
            )}

            {!isLoading && error && (
              <div className="px-4 py-6 text-sm text-destructive">{error}</div>
            )}

            {!isLoading && !error && filteredEvents.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                {isSearching ? "Searching..." : "No matches found."}
              </div>
            )}

            {!isLoading && !error && filteredEvents.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 items-stretch">
                {filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => handleSelectEvent(event)}
                    className="text-left rounded-2xl border border-border bg-card/70 p-4 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 h-full flex flex-col min-h-[280px]"
                  >
                    <div className="flex gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                        {event.imageUrl ? (
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "PM"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {truncateText(event.title, 50)}
                        </h3>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {truncateText(event.description, 60)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Volume {formatUsd(event.totalVolumeRaw)}</span>
                      <span>Liquidity {formatUsd(event.totalLiquidityRaw)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {event.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full border border-border px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex-1" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
