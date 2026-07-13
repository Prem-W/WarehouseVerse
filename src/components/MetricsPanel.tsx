/**
 * Real-time Metrics Panel
 * Displays key simulation performance indicators
 */

import React from "react";
import type { TickMetrics } from "@contracts/types";
import {
  Cpu,
  Battery,
  Zap,
  TrendingUp,
  Clock,
  Shield,
  Users,
  Package,
  Route,
  Handshake,
} from "lucide-react";

interface MetricsPanelProps {
  metrics: TickMetrics | undefined;
}

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}> = ({ label, value, icon, color, suffix }) => (
  <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3">
    <div className="flex items-center gap-2 mb-1">
      <div className={`${color}`}>{icon}</div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
    <div className="text-lg font-bold text-slate-100 font-mono">
      {typeof value === "number" ? value.toFixed(1) : value}
      {suffix && <span className="text-xs text-slate-500 ml-1">{suffix}</span>}
    </div>
  </div>
);

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Live Metrics</h3>
        <div className="text-sm text-slate-500">Start simulation to see metrics</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        Live Metrics
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Active Robots"
          value={metrics.activeRobots}
          icon={<Users className="w-3.5 h-3.5" />}
          color="text-cyan-400"
        />
        <MetricCard
          label="Throughput"
          value={metrics.throughput.toFixed(2)}
          icon={<Package className="w-3.5 h-3.5" />}
          color="text-emerald-400"
          suffix="/100t"
        />
        <MetricCard
          label="Avg Battery"
          value={metrics.avgBattery.toFixed(1)}
          icon={<Battery className="w-3.5 h-3.5" />}
          color={metrics.avgBattery < 30 ? "text-red-400" : "text-green-400"}
          suffix="%"
        />
        <MetricCard
          label="Efficiency"
          value={(metrics.avgEfficiency * 100).toFixed(1)}
          icon={<Zap className="w-3.5 h-3.5" />}
          color="text-amber-400"
          suffix="%"
        />
        <MetricCard
          label="Tasks Done"
          value={metrics.totalTasksCompleted}
          icon={<Cpu className="w-3.5 h-3.5" />}
          color="text-blue-400"
        />
        <MetricCard
          label="Pending"
          value={metrics.pendingTasks}
          icon={<Clock className="w-3.5 h-3.5" />}
          color="text-orange-400"
        />
        <MetricCard
          label="Collisions Avoided"
          value={metrics.collisionAvoidances}
          icon={<Shield className="w-3.5 h-3.5" />}
          color="text-purple-400"
        />
        <MetricCard
          label="Path Efficiency"
          value={(metrics.pathEfficiency * 100).toFixed(1)}
          icon={<Route className="w-3.5 h-3.5" />}
          color="text-teal-400"
          suffix="%"
        />
        <MetricCard
          label="Cooperation"
          value={(metrics.cooperationIndex * 100).toFixed(1)}
          icon={<Handshake className="w-3.5 h-3.5" />}
          color="text-pink-400"
          suffix="%"
        />
        <MetricCard
          label="Wait Time"
          value={metrics.avgWaitTime.toFixed(1)}
          icon={<Clock className="w-3.5 h-3.5" />}
          color="text-yellow-400"
          suffix="t"
        />
      </div>

      {/* Robot Status Distribution */}
      <div className="mt-3">
        <div className="text-xs text-slate-400 mb-1">Robot Status</div>
        <div className="flex gap-1 text-xs">
          {metrics.movingRobots > 0 && (
            <span className="bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">
              {metrics.movingRobots} moving
            </span>
          )}
          {metrics.carryingRobots > 0 && (
            <span className="bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded">
              {metrics.carryingRobots} carrying
            </span>
          )}
          {metrics.idleRobots > 0 && (
            <span className="bg-cyan-900/50 text-cyan-400 px-1.5 py-0.5 rounded">
              {metrics.idleRobots} idle
            </span>
          )}
          {metrics.chargingRobots > 0 && (
            <span className="bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded">
              {metrics.chargingRobots} charging
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
