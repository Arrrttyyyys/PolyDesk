"use client";

import { TradeDossier } from "@/lib/agent/schemas";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

interface LegendDossierTabProps {
  dossier?: TradeDossier | null;
}

export function LegendDossierTab({ dossier }: LegendDossierTabProps) {
  if (!dossier) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No dossier data available</p>
      </div>
    );
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDirectionIcon = (direction?: string) => {
    switch (direction) {
      case "bullish":
        return <TrendingDown className="w-3 h-3 text-green-500 rotate-180" />;
      case "bearish":
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      default:
        return <AlertCircle className="w-3 h-3 text-gray-500" />;
    }
  };

  // Generate theta decay chart data
  const thetaData = dossier.thetaSignals
    ? Array.from({ length: dossier.thetaSignals.daysToResolution || 30 }, (_, i) => ({
        day: i,
        decay: Math.exp(-i * (dossier.thetaSignals?.decayRate || 0.05)),
      }))
    : [];

  // Resolution risk score (0-100)
  const resolutionRiskScore = dossier.resolutionRisk
    ? dossier.resolutionRisk.clarity === "high"
      ? 20
      : dossier.resolutionRisk.clarity === "medium"
      ? 50
      : 80
    : 50;

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-green-500";
    if (score < 70) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="p-4 space-y-4">
      {/* Confidence Score */}
      {dossier.confidence !== undefined && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">
              Overall Confidence
            </h3>
            <div className="text-2xl font-bold text-blue-500">
              {(dossier.confidence * 100).toFixed(0)}%
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${dossier.confidence * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline Markers */}
      {dossier.timelineMarkers && dossier.timelineMarkers.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Event Timeline
          </h3>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-white/20" />

            <div className="space-y-4">
              {dossier.timelineMarkers.map((marker, i) => (
                <div key={i} className="relative pl-8">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 w-6 h-6 rounded-full ${getImpactColor(
                      marker.impact
                    )} flex items-center justify-center`}
                  >
                    {getDirectionIcon(marker.direction)}
                  </div>

                  {/* Event content */}
                  <div className="bg-white/5 rounded p-3 border border-white/5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold text-white">
                        {marker.event}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(marker.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          marker.impact === "high"
                            ? "bg-red-500/20 text-red-400"
                            : marker.impact === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {marker.impact} impact
                      </span>
                      {marker.direction && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            marker.direction === "bullish"
                              ? "bg-green-500/20 text-green-400"
                              : marker.direction === "bearish"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {marker.direction}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Theta Signals */}
      {dossier.thetaSignals && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Theta Signals (Time Decay)
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-gray-400">Days to Resolution</div>
              <div className="text-xl font-bold text-white">
                {dossier.thetaSignals.daysToResolution}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Decay Rate</div>
              <div className="text-xl font-bold text-purple-500">
                {(dossier.thetaSignals.decayRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Entry Window</div>
              <div className="text-sm font-semibold text-green-500">
                {dossier.thetaSignals.optimalEntryWindow}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Exit Window</div>
              <div className="text-sm font-semibold text-red-500">
                {dossier.thetaSignals.optimalExitWindow}
              </div>
            </div>
          </div>

          {thetaData.length > 0 && (
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={thetaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="day"
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: "10px" }}
                  label={{ value: "Days", fontSize: 10 }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: "10px" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="decay"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.3}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Resolution Risk */}
      {dossier.resolutionRisk && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Resolution Risk
          </h3>

          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">Risk Score</span>
              <span className={`text-2xl font-bold ${getRiskColor(resolutionRiskScore)}`}>
                {resolutionRiskScore}/100
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  resolutionRiskScore < 30
                    ? "bg-green-500"
                    : resolutionRiskScore < 70
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${resolutionRiskScore}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-xs text-gray-400 mb-1">Clarity Level</div>
              <div
                className={`text-sm font-semibold capitalize ${
                  dossier.resolutionRisk.clarity === "high"
                    ? "text-green-500"
                    : dossier.resolutionRisk.clarity === "medium"
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {dossier.resolutionRisk.clarity}
              </div>
            </div>

            {dossier.resolutionRisk.ambiguityRisk && (
              <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                <div className="text-xs text-red-400">
                  {dossier.resolutionRisk.ambiguityRisk}
                </div>
              </div>
            )}

            {dossier.resolutionRisk.precedents &&
              dossier.resolutionRisk.precedents.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Precedents</div>
                  <ul className="space-y-1">
                    {dossier.resolutionRisk.precedents.map((precedent, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-300 flex items-start gap-1"
                      >
                        <span className="text-blue-500">•</span>
                        {precedent}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {dossier.resolutionRisk.criteriaCheck && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Criteria Check</div>
                <div className="text-xs text-gray-300">
                  {dossier.resolutionRisk.criteriaCheck}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rule-to-Trade */}
      {dossier.ruleToTrade && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Rule-to-Trade Checklist
          </h3>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-white mb-1">Rule</div>
              <div className="text-xs text-gray-300 bg-white/5 rounded p-2">
                {dossier.ruleToTrade.rule}
              </div>
            </div>

            {dossier.ruleToTrade.implications &&
              dossier.ruleToTrade.implications.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-white mb-1">
                    Implications
                  </div>
                  <ul className="space-y-1">
                    {dossier.ruleToTrade.implications.map((implication, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-300 flex items-start gap-2"
                      >
                        <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {implication}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {dossier.ruleToTrade.edgeCases &&
              dossier.ruleToTrade.edgeCases.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-white mb-1">
                    Edge Cases
                  </div>
                  <ul className="space-y-1">
                    {dossier.ruleToTrade.edgeCases.map((edgeCase, i) => (
                      <li
                        key={i}
                        className="text-xs text-yellow-400 flex items-start gap-2"
                      >
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {edgeCase}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Unknowns */}
      {dossier.unknowns && dossier.unknowns.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Key Unknowns
          </h3>

          <ul className="space-y-2">
            {dossier.unknowns.map((unknown, i) => (
              <li
                key={i}
                className="text-xs text-gray-300 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded p-2"
              >
                <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                {unknown}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
