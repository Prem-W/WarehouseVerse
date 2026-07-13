/**
 * Charts Panel
 * Historical metrics visualization using Recharts
 */

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { trpc } from "@/providers/trpc";
import { Activity, BarChart3 } from "lucide-react";

export const ChartsPanel: React.FC = () => {
  const historyQuery = trpc.analytics.history.useQuery({ limit: 200 });
  const evolutionQuery = trpc.analytics.evolution.useQuery(undefined, {
    refetchInterval: 2000,
  });

  const history = historyQuery.data ?? [];
  const evolution = evolutionQuery.data;

  return (
    <div className="space-y-4">
      {/* Throughput Chart */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Throughput Over Time
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="tick"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(v) => `${v}`}
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Area
                type="monotone"
                dataKey="throughput"
                stroke="#34d399"
                fillOpacity={1}
                fill="url(#throughputGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Battery & Efficiency Chart */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Battery & Efficiency
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="tick"
                tick={{ fontSize: 10, fill: "#64748b" }}
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="avgBattery"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                name="Battery %"
              />
              <Line
                type="monotone"
                dataKey="avgEfficiency"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Efficiency"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolution Chart */}
      {evolution && evolution.generations.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Evolution Progress
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolution.generations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="generation"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  label={{ value: "Generation", fontSize: 10, fill: "#64748b" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgFitness"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  name="Avg Fitness"
                />
                <Line
                  type="monotone"
                  dataKey="maxFitness"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  name="Max Fitness"
                />
                <Line
                  type="monotone"
                  dataKey="diversity"
                  stroke="#f472b6"
                  strokeWidth={2}
                  dot={false}
                  name="Diversity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartsPanel;
