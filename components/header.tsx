"use client";

import Link from "next/link";
import { Activity, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full pulse-glow border-2 border-background" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">PolyDesk Risk Terminal</h1>
              <p className="text-xs text-muted-foreground">
                Trade prediction markets with institutional-grade research
              </p>
            </div>
          </div>

          {/* Center: Status */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
              <div className="w-2 h-2 bg-primary rounded-full pulse-glow" />
              <span className="text-sm font-medium text-primary">Markets Live</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
              <span>Updated {formatTime(lastUpdated)}</span>
            </div>
          </div>

          {/* Right: Navigation */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/"
              className="rounded-full border border-border/50 px-3 py-1 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Markets
            </Link>
            <Link
              href="/strategy-lab"
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary transition hover:bg-primary/20"
            >
              Strategy Lab
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
