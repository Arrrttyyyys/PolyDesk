"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ClipboardList,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
} from "lucide-react";
import type { Article, Market, PriceHistoryPoint } from "@/lib/types";
import ProbabilityChart from "@/components/probability-chart";

type KeyDate = {
  id: string;
  label: string;
  date: string;
  note: string;
};

type ResolutionAnswers = {
  objectiveCriteria: boolean;
  singleSource: boolean;
  ambiguity: boolean;
  disputeRisk: boolean;
  delayRisk: "low" | "medium" | "high";
};

type CompiledRules = {
  triggers: string[];
  sources: string[];
  deadlines: string[];
  exceptions: string[];
  checklist: string[];
  unknowns: string[];
};

interface TradeDossierProps {
  market: Market | null;
  articles: Article[];
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
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

function generateSeededHistory(marketId: string): PriceHistoryPoint[] {
  const rand = seededRandom(marketId);
  const data: PriceHistoryPoint[] = [];
  const base = 40 + rand() * 40;
  let level = base;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const shock = (rand() - 0.5) * 6;
    level = 0.85 * level + 0.15 * base + shock;
    const probability = Math.max(5, Math.min(95, level));
    data.push({
      date: date.toISOString().split("T")[0],
      probability: Math.round(probability),
    });
  }
  return data;
}

function useMarketHistory(marketId?: string) {
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const fallback = useMemo(
    () => (marketId ? generateSeededHistory(marketId) : []),
    [marketId]
  );

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    let reconnectDelay = 500;

    setData(fallback);

    const connect = () => {
      if (cancelled) return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const wsUrl = `${protocol}://${window.location.host}/ws/price-history?marketId=${encodeURIComponent(
        marketId
      )}`;

      const socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as
            | { type: "history"; history: PriceHistoryPoint[] }
            | { type: "tick"; point: PriceHistoryPoint };

          if (payload.type === "history" && payload.history?.length) {
            setData(payload.history);
          } else if (payload.type === "tick") {
            setData((prev) => {
              const next = [...prev, payload.point];
              return next.length > 30 ? next.slice(-30) : next;
            });
          }
        } catch {
          // Ignore malformed payloads.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        reconnectDelay = Math.min(reconnectDelay * 1.5, 5000);
        window.setTimeout(connect, reconnectDelay);
      };

      socket.onerror = () => socket.close();
    };

    connect();
    return () => {
      cancelled = true;
    };
  }, [marketId, fallback]);

  return data.length ? data : fallback;
}

function extractMatches(text: string, pattern: RegExp) {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags);
  while ((m = re.exec(text)) !== null) {
    const value = (m[2] || m[1] || "").trim();
    if (value) matches.push(value);
  }
  return matches;
}

function compileRules(text: string): CompiledRules {
  const triggers = extractMatches(text, /(if|when|once)\s+([^.;\n]+)/gi);
  const deadlines = extractMatches(
    text,
    /(by|before|no later than|until)\s+([^.;\n]+)/gi
  );
  const exceptions = extractMatches(
    text,
    /(unless|except|excluding|other than)\s+([^.;\n]+)/gi
  );
  const sources = extractMatches(
    text,
    /(according to|source|official|court|commission|agency|oracle|report|statement|announcement)\s+([^.;\n]+)/gi
  );

  const checklist = [
    ...sources.map((s) => `Monitor source: ${s}`),
    ...deadlines.map((d) => `Confirm deadline: ${d}`),
    ...triggers.map((t) => `Validate trigger: ${t}`),
  ];

  const unknowns: string[] = [];
  if (sources.length === 0) unknowns.push("Primary resolution source not specified");
  if (deadlines.length === 0) unknowns.push("Resolution deadline not specified");
  if (triggers.length === 0) unknowns.push("Explicit trigger condition not specified");

  return { triggers, sources, deadlines, exceptions, checklist, unknowns };
}

export default function TradeDossier({ market, articles }: TradeDossierProps) {
  const [resolutionText, setResolutionText] = useState("");
  const [keyDates, setKeyDates] = useState<KeyDate[]>([]);
  const [draftDate, setDraftDate] = useState({ label: "", date: "", note: "" });
  const [answers, setAnswers] = useState<ResolutionAnswers>({
    objectiveCriteria: true,
    singleSource: true,
    ambiguity: false,
    disputeRisk: false,
    delayRisk: "medium",
  });

  useEffect(() => {
    if (!market) return;
    const defaultText = `Market: ${market.title}\nResolution date: ${
      market.resolution || "TBD"
    }\n\nPaste market rules here.`;
    setResolutionText(defaultText);
    const initialKeyDates: KeyDate[] = market.resolution
      ? [
          {
            id: "resolution",
            label: "Resolution",
            date: market.resolution,
            note: "Expected settlement window",
          },
        ]
      : [];
    setKeyDates(initialKeyDates);
  }, [market?.id]);

  const history = useMarketHistory(market?.id);

  const timelineStats = useMemo(() => {
    const deltas = history
      .slice(1)
      .map((p, i) => Math.abs(p.probability - history[i].probability));
    const avgAbsMove = deltas.length
      ? deltas.reduce((a, b) => a + b, 0) / deltas.length
      : 0;
    const variance =
      deltas.length > 0
        ? deltas.reduce((sum, d) => sum + Math.pow(d - avgAbsMove, 2), 0) /
          deltas.length
        : 0;
    const volatility = Math.sqrt(variance);
    const resolutionDate = market?.resolution ? new Date(market.resolution) : null;
    const timeToEvent = resolutionDate ? daysBetween(new Date(), resolutionDate) : null;

    const thetaScore = clamp(
      Math.round(
        volatility * 3 +
          avgAbsMove * 2 +
          (timeToEvent !== null
            ? timeToEvent <= 7
              ? 20
              : timeToEvent <= 30
                ? 10
                : 0
            : 0)
      ),
      0,
      100
    );

    const thetaLabel = thetaScore >= 70 ? "High" : thetaScore >= 40 ? "Medium" : "Low";
    return { avgAbsMove, volatility, thetaScore, thetaLabel, timeToEvent };
  }, [history, market?.resolution]);

  const riskScore = useMemo(() => {
    let score = 30;
    if (!answers.objectiveCriteria) score += 15;
    if (!answers.singleSource) score += 15;
    if (answers.ambiguity) score += 15;
    if (answers.disputeRisk) score += 20;
    if (answers.delayRisk === "medium") score += 10;
    if (answers.delayRisk === "high") score += 20;
    return clamp(score, 0, 100);
  }, [answers]);

  const riskReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!answers.objectiveCriteria) reasons.push("Resolution criteria may be subjective");
    if (!answers.singleSource) reasons.push("Multiple sources could conflict");
    if (answers.ambiguity) reasons.push("Rule language appears ambiguous");
    if (answers.disputeRisk) reasons.push("High risk of dispute or challenge");
    if (answers.delayRisk !== "low") reasons.push("Potential settlement delays");
    return reasons;
  }, [answers]);

  const resolutionWindow = useMemo(() => {
    const timeToEvent = timelineStats.timeToEvent;
    if (timeToEvent === null) return "Unknown (no resolution date)";
    if (answers.delayRisk === "high") return "7–30 days after event";
    if (answers.delayRisk === "medium") return "2–7 days after event";
    return "0–2 days after event";
  }, [answers.delayRisk, timelineStats.timeToEvent]);

  const compiled = useMemo(() => compileRules(resolutionText), [resolutionText]);

  const articleSources = useMemo(() => {
    const sources = Array.from(
      new Set(articles.map((a) => a.source).filter(Boolean))
    );
    return sources.length ? sources : ["No sources loaded"];
  }, [articles]);

  if (!market) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Select a market to build the Trade Dossier</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* B1: Timeline (Theta) */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Event Timeline (Theta)</h3>
        </div>

        <div className="h-36 mb-4">
          <ProbabilityChart marketId={market.id} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Avg Daily Move</div>
            <div className="font-mono font-semibold text-foreground">
              {timelineStats.avgAbsMove.toFixed(1)}%
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Volatility</div>
            <div className="font-mono font-semibold text-foreground">
              {timelineStats.volatility.toFixed(1)}
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Theta Risk</div>
            <div className="font-mono font-semibold text-foreground">
              {timelineStats.thetaLabel} ({timelineStats.thetaScore})
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-2">Key Dates</div>
          <div className="space-y-2">
            {keyDates.map((d) => (
              <div key={d.id} className="bg-secondary/30 rounded-lg p-2 text-sm">
                <div className="font-medium text-foreground">{d.label}</div>
                <div className="text-xs text-muted-foreground">
                  {d.date} {d.note ? `• ${d.note}` : ""}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <input
              className="bg-input border border-border/50 rounded-lg px-2 py-1 text-xs"
              placeholder="Label"
              value={draftDate.label}
              onChange={(e) => setDraftDate({ ...draftDate, label: e.target.value })}
            />
            <input
              type="date"
              className="bg-input border border-border/50 rounded-lg px-2 py-1 text-xs"
              value={draftDate.date}
              onChange={(e) => setDraftDate({ ...draftDate, date: e.target.value })}
            />
            <input
              className="bg-input border border-border/50 rounded-lg px-2 py-1 text-xs"
              placeholder="Note"
              value={draftDate.note}
              onChange={(e) => setDraftDate({ ...draftDate, note: e.target.value })}
            />
          </div>
          <button
            className="mt-2 text-xs px-3 py-1 rounded bg-primary/20 text-primary border border-primary/30"
            onClick={() => {
              if (!draftDate.label || !draftDate.date) return;
              setKeyDates((prev) => [
                ...prev,
                {
                  id: `${draftDate.label}-${draftDate.date}-${Math.random()
                    .toString(36)
                    .slice(2, 6)}`,
                  label: draftDate.label,
                  date: draftDate.date,
                  note: draftDate.note,
                },
              ]);
              setDraftDate({ label: "", date: "", note: "" });
            }}
          >
            Add Date
          </button>
        </div>
      </div>

      {/* B2: Resolution Risk */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Resolution Risk & Oracle Simulator</h3>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <label className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
            <input
              type="checkbox"
              checked={answers.objectiveCriteria}
              onChange={(e) =>
                setAnswers({ ...answers, objectiveCriteria: e.target.checked })
              }
            />
            Objective criteria?
          </label>
          <label className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
            <input
              type="checkbox"
              checked={answers.singleSource}
              onChange={(e) => setAnswers({ ...answers, singleSource: e.target.checked })}
            />
            Single authoritative source?
          </label>
          <label className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
            <input
              type="checkbox"
              checked={answers.ambiguity}
              onChange={(e) => setAnswers({ ...answers, ambiguity: e.target.checked })}
            />
            Ambiguous language?
          </label>
          <label className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
            <input
              type="checkbox"
              checked={answers.disputeRisk}
              onChange={(e) => setAnswers({ ...answers, disputeRisk: e.target.checked })}
            />
            Dispute risk?
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Risk Score</div>
            <div className="font-mono font-semibold text-foreground">{riskScore}</div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Resolution Window</div>
            <div className="font-mono font-semibold text-foreground">{resolutionWindow}</div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Delay Risk</div>
            <select
              value={answers.delayRisk}
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  delayRisk: e.target.value as ResolutionAnswers["delayRisk"],
                })
              }
              className="w-full bg-input border border-border/50 rounded text-xs px-2 py-1"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {riskReasons.length > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-accent" />
              <span className="font-medium text-accent">Risk Factors</span>
            </div>
            <ul className="text-muted-foreground space-y-1">
              {riskReasons.map((r, i) => (
                <li key={`${r}-${i}`}>• {r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          Sources in context: {articleSources.join(", ")}
        </div>
      </div>

      {/* B3: Rule-to-Trade Compiler */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Rule-to-Trade Compiler</h3>
        </div>

        <textarea
          className="w-full min-h-[140px] bg-input border border-border/50 rounded-lg p-3 text-sm text-foreground"
          value={resolutionText}
          onChange={(e) => setResolutionText(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          <div className="bg-secondary/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Structured Conditions
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">TRIGGERS</div>
                {compiled.triggers.length ? (
                  compiled.triggers.map((t, i) => <div key={i}>• {t}</div>)
                ) : (
                  <div className="text-muted-foreground">None detected</div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">SOURCES</div>
                {compiled.sources.length ? (
                  compiled.sources.map((s, i) => <div key={i}>• {s}</div>)
                ) : (
                  <div className="text-muted-foreground">None detected</div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">DEADLINES</div>
                {compiled.deadlines.length ? (
                  compiled.deadlines.map((d, i) => <div key={i}>• {d}</div>)
                ) : (
                  <div className="text-muted-foreground">None detected</div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">EXCEPTIONS</div>
                {compiled.exceptions.length ? (
                  compiled.exceptions.map((e, i) => <div key={i}>• {e}</div>)
                ) : (
                  <div className="text-muted-foreground">None detected</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-secondary/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Monitoring Checklist
            </div>
            <div className="space-y-1">
              {compiled.checklist.length ? (
                compiled.checklist.map((c, i) => <div key={i}>• {c}</div>)
              ) : (
                <div className="text-muted-foreground">No checklist items yet</div>
              )}
            </div>

            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Unknowns
              </div>
              {compiled.unknowns.length ? (
                compiled.unknowns.map((u, i) => <div key={i}>• {u}</div>)
              ) : (
                <div className="text-muted-foreground">None</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

