/**
 * EvoTwin Dashboard
 * Main page with warehouse visualization, controls, metrics, and analytics
 */

import React, { useState } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import WarehouseCanvas from "@/components/WarehouseCanvas";
import ControlPanel from "@/components/ControlPanel";
import MetricsPanel from "@/components/MetricsPanel";
import ChartsPanel from "@/components/ChartsPanel";
import RobotList from "@/components/RobotList";
import { trpc } from "@/providers/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Bot,
  BarChart3,
  GitFork,
  Brain,
  Warehouse,
} from "lucide-react";

const Dashboard: React.FC = () => {
  const sim = useSimulation();
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);

  const robotDetailQuery = trpc.robot.get.useQuery(
    { id: selectedRobotId ?? "" },
    { enabled: !!selectedRobotId, refetchInterval: 500 }
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Warehouse className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold tracking-tight">
                Evo<span className="text-cyan-400">Twin</span>
              </h1>
            </div>
            <div className="h-5 w-px bg-slate-700 mx-2" />
            <span className="text-xs text-slate-500">
              Evolutionary Digital Twin
            </span>
            <div className="flex items-center gap-1 ml-4 px-2 py-1 bg-slate-800/60 rounded text-xs">
              <div
                className={`w-2 h-2 rounded-full ${
                  sim.isRunning
                    ? "bg-emerald-400 animate-pulse"
                    : sim.status === "paused"
                    ? "bg-amber-400"
                    : "bg-slate-500"
                }`}
              />
              <span className="text-slate-400 capitalize">{sim.status}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Robots: {sim.snapshot?.robots.length ?? 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Tick: {sim.tick.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-purple-400" />
              <span>
                Gen: {Math.max(...(sim.snapshot?.robots.map(r => r.generation) ?? [0]))}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Controls & Robot List */}
          <div className="col-span-3 space-y-4">
            <ControlPanel
              status={sim.status}
              tick={sim.tick}
              isRunning={sim.isRunning}
              autoTick={sim.autoTick}
              setAutoTick={sim.setAutoTick}
              onStart={() => sim.start()}
              onPause={sim.pause}
              onResume={sim.resume}
              onStop={sim.stop}
              onStep={sim.step}
              onReset={sim.reset}
              isLoading={sim.isLoading}
            />

            <RobotList
              onSelectRobot={setSelectedRobotId}
              selectedRobotId={selectedRobotId}
            />
          </div>

          {/* Center Column - Canvas */}
          <div className="col-span-6">
            <WarehouseCanvas
              snapshot={sim.snapshot}
              onRobotClick={setSelectedRobotId}
              selectedRobotId={selectedRobotId}
            />

            {/* Tabs for Charts/Analytics */}
            <div className="mt-4">
              <Tabs defaultValue="charts" className="w-full">
                <TabsList className="bg-slate-900 border border-slate-700/50">
                  <TabsTrigger
                    value="charts"
                    className="text-xs data-[state=active]:bg-slate-800"
                  >
                    <BarChart3 className="w-3.5 h-3.5 mr-1" />
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger
                    value="robot"
                    className="text-xs data-[state=active]:bg-slate-800"
                  >
                    <Bot className="w-3.5 h-3.5 mr-1" />
                    Robot Detail
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai"
                    className="text-xs data-[state=active]:bg-slate-800"
                  >
                    <Brain className="w-3.5 h-3.5 mr-1" />
                    AI Systems
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="charts" className="mt-2">
                  <ChartsPanel />
                </TabsContent>

                <TabsContent value="robot" className="mt-2">
                  {selectedRobotId && robotDetailQuery.data ? (
                    <RobotDetail robot={robotDetailQuery.data} />
                  ) : (
                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-8 text-center">
                      <Bot className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">
                        Select a robot from the list or click on the warehouse to view details
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ai" className="mt-2">
                  <AISystemsPanel />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Column - Metrics */}
          <div className="col-span-3 space-y-4">
            <MetricsPanel metrics={sim.snapshot?.metrics} />
          </div>
        </div>
      </main>
    </div>
  );
};

// ─── Robot Detail Panel ────────────────────────────────────────────

const RobotDetail: React.FC<{ robot: Record<string, unknown> }> = ({ robot }) => {
  const strategy = (robot.strategyProfile as Record<string, number>) ?? {};

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          {robot.id as string} - {robot.name as string}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
          {robot.status as string}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-500">Position</div>
          <div className="text-slate-200 font-mono">
            ({Math.round((robot.position as Record<string, number>)?.x ?? 0)},{" "}
            {Math.round((robot.position as Record<string, number>)?.y ?? 0)})
          </div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-500">Battery</div>
          <div
            className={`font-mono ${
              (robot.battery as number) < 30 ? "text-red-400" : "text-green-400"
            }`}
          >
            {(robot.battery as number)?.toFixed(1)}%
          </div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-500">Efficiency</div>
          <div className="text-amber-400 font-mono">
            {((robot.efficiency as number) * 100)?.toFixed(1)}%
          </div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-500">Fitness</div>
          <div className="text-purple-400 font-mono">
            {(robot.fitness as number)?.toFixed(1)}
          </div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-500">Generation</div>
          <div className="text-cyan-400 font-mono">{robot.generation as number}</div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-500">Speed</div>
          <div className="text-slate-200 font-mono">
            {(robot.speed as number)?.toFixed(2)} cells/tick
          </div>
        </div>
      </div>

      {/* Strategy Profile */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Strategy Profile</h4>
        <div className="space-y-2">
          {Object.entries(strategy).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-28 capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                  style={{ width: `${(value as number) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-10 text-right">
                {((value as number) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-500">Tasks Done</div>
          <div className="text-emerald-400 font-bold">{robot.tasksCompleted as number}</div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-500">Failed</div>
          <div className="text-red-400 font-bold">{robot.tasksFailed as number}</div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-500">Distance</div>
          <div className="text-blue-400 font-bold">
            {((robot.totalDistance as number) ?? 0).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Recent Memory */}
      {((robot.memory as Array<Record<string, unknown>>) ?? []).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-300 mb-2">Recent Memory</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {((robot.memory as Array<Record<string, unknown>>) ?? [])
              .slice(-5)
              .map((entry, i) => (
                <div
                  key={i}
                  className={`text-xs p-1.5 rounded ${
                    entry.outcome === "success"
                      ? "bg-emerald-900/20 text-emerald-300"
                      : entry.outcome === "failure"
                      ? "bg-red-900/20 text-red-300"
                      : "bg-slate-800/50 text-slate-400"
                  }`}
                >
                  <span className="text-slate-500">t{String(entry.timestamp ?? "")}:</span>{" "}
                  {String(entry.event ?? "")}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── AI Systems Panel ──────────────────────────────────────────────

const AISystemsPanel: React.FC = () => {
  const learningQuery = trpc.analytics.learning.useQuery(undefined, {
    refetchInterval: 2000,
  });
  const evolutionQuery = trpc.analytics.evolution.useQuery(undefined, {
    refetchInterval: 2000,
  });

  const learning = learningQuery.data;
  const evolution = evolutionQuery.data;

  return (
    <div className="space-y-4">
      {/* Learning Stats */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-pink-400" />
          Q-Learning Engine
        </h3>
        {learning ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-500">Learning Updates</div>
              <div className="text-pink-400 font-bold text-lg">
                {learning.learningUpdates?.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-500">Global Knowledge</div>
              <div className="text-purple-400 font-bold text-lg">
                {learning.globalKnowledgeSize?.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-500">Knowledge Transfers</div>
              <div className="text-cyan-400 font-bold">
                {learning.knowledgeTransfers?.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-500">Avg Exploration</div>
              <div className="text-amber-400 font-bold">
                {((learning.avgExplorationRate as number) * 100)?.toFixed(1)}%
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Learning data not available</p>
        )}
      </div>

      {/* Evolution Stats */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <GitFork className="w-4 h-4 text-purple-400" />
          Genetic Algorithm
        </h3>
        {evolution ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-500">Generations</div>
              <div className="text-purple-400 font-bold text-lg">
                {evolution.stats?.totalGenerations}
              </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-500">Best Fitness</div>
              <div className="text-emerald-400 font-bold text-lg">
                {evolution.stats?.bestFitnessEver?.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-500">Diversity</div>
              <div className="text-cyan-400 font-bold">
                {((evolution.stats?.avgDiversity as number) * 100)?.toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-500">Mutation Rate</div>
              <div className="text-amber-400 font-bold">
                {((evolution.stats?.currentMutationRate as number) * 100)?.toFixed(1)}%
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Evolution data not available</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
