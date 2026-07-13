/**
 * Robot List Panel
 * Shows all robots with sortable/filterable list
 */

import React, { useState } from "react";
import { trpc } from "@/providers/trpc";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Battery,
  Trophy,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface RobotListProps {
  onSelectRobot: (id: string) => void;
  selectedRobotId?: string | null;
}

export const RobotList: React.FC<RobotListProps> = ({
  onSelectRobot,
  selectedRobotId,
}) => {
  const robotQuery = trpc.robot.list.useQuery(undefined, {
    refetchInterval: 500,
  });

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"fitness" | "battery" | "efficiency">("fitness");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const robots = robotQuery.data ?? [];

  const filtered = robots
    .filter((r) => {
      const q = search.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const multiplier = sortDir === "asc" ? 1 : -1;
      if (sortBy === "fitness") return (a.fitness - b.fitness) * multiplier;
      if (sortBy === "battery") return (a.battery - b.battery) * multiplier;
      return (a.efficiency - b.efficiency) * multiplier;
    });

  const toggleSort = (key: "fitness" | "battery" | "efficiency") => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const statusColors: Record<string, string> = {
    idle: "text-cyan-400 bg-cyan-900/30",
    moving: "text-emerald-400 bg-emerald-900/30",
    carrying: "text-amber-400 bg-amber-900/30",
    charging: "text-purple-400 bg-purple-900/30",
    waiting: "text-orange-400 bg-orange-900/30",
    error: "text-red-400 bg-red-900/30",
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          Robots ({robots.length})
        </h3>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <Input
          placeholder="Search robots..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-7 h-8 text-xs bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
        />
      </div>

      {/* Sort buttons */}
      <div className="flex gap-1 mb-2">
        {(["fitness", "battery", "efficiency"] as const).map((key) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              sortBy === key
                ? "bg-slate-700 border-slate-500 text-slate-200"
                : "bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-300"
            }`}
          >
            {key === "fitness" && <Trophy className="w-3 h-3 inline mr-1" />}
            {key === "battery" && <Battery className="w-3 h-3 inline mr-1" />}
            {key.charAt(0).toUpperCase() + key.slice(1)}
            {sortBy === key &&
              (sortDir === "asc" ? (
                <ChevronUp className="w-3 h-3 inline ml-0.5" />
              ) : (
                <ChevronDown className="w-3 h-3 inline ml-0.5" />
              ))}
          </button>
        ))}
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-1">
          {filtered.map((robot) => (
            <button
              key={robot.id}
              onClick={() => onSelectRobot(robot.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                selectedRobotId === robot.id
                  ? "bg-cyan-900/40 border border-cyan-600/50"
                  : "hover:bg-slate-800 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      robot.status === "moving"
                        ? "bg-emerald-400"
                        : robot.status === "charging"
                        ? "bg-purple-400"
                        : robot.status === "carrying"
                        ? "bg-amber-400"
                        : "bg-cyan-400"
                    }`}
                  />
                  <span className="font-medium text-slate-200">{robot.id}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${
                    statusColors[robot.status] || "text-slate-400 bg-slate-800"
                  }`}
                >
                  {robot.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 ml-4 text-slate-500">
                <span>Bat:{Math.round(robot.battery)}%</span>
                <span>Eff:{(robot.efficiency * 100).toFixed(0)}%</span>
                <span>Fit:{Math.round(robot.fitness)}</span>
                {robot.currentPayload > 0 && (
                  <span className="text-amber-400">Ld:{Math.round(robot.currentPayload)}kg</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default RobotList;
