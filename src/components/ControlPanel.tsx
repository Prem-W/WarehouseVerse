/**
 * Simulation Control Panel
 * Start/stop/pause/step controls and configuration
 */

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Square,
  SkipForward,
  RotateCcw,
  Zap,
  Settings2,
} from "lucide-react";

interface ControlPanelProps {
  status: string;
  tick: number;
  isRunning: boolean;
  autoTick: boolean;
  setAutoTick: (v: boolean) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onStep: () => void;
  onReset: () => void;
  isLoading: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  status,
  tick,
  isRunning,
  autoTick,
  setAutoTick,
  onStart,
  onPause,
  onResume,
  onStop,
  onStep,
  onReset,
  isLoading,
}) => {
  const showStart = status === "created" || status === "reset";
  const showResume = status === "paused";
  const showPause = isRunning;
  const showStep = !isRunning;

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-cyan-400" />
          Simulation Control
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Tick:</span>
          <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-cyan-400">
            {tick.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {showStart && (
          <Button
            size="sm"
            onClick={onStart}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </Button>
        )}

        {showResume && (
          <Button
            size="sm"
            onClick={onResume}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="w-4 h-4 mr-1" />
            Resume
          </Button>
        )}

        {showPause && (
          <Button
            size="sm"
            onClick={onPause}
            disabled={isLoading}
            variant="outline"
            className="border-amber-600 text-amber-400 hover:bg-amber-600/20"
          >
            <Pause className="w-4 h-4 mr-1" />
            Pause
          </Button>
        )}

        {showStep && !showStart && (
          <Button
            size="sm"
            onClick={onStep}
            variant="outline"
            className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/20"
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Step
          </Button>
        )}

        <Button
          size="sm"
          onClick={onStop}
          variant="outline"
          className="border-red-600 text-red-400 hover:bg-red-600/20"
        >
          <Square className="w-4 h-4 mr-1" />
          Stop
        </Button>

        <Button
          size="sm"
          onClick={onReset}
          variant="outline"
          className="border-slate-600 text-slate-400 hover:bg-slate-600/20"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setAutoTick(!autoTick)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors ${
            autoTick
              ? "bg-cyan-600/20 border-cyan-500 text-cyan-400"
              : "bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-300"
          }`}
        >
          <Zap className="w-3 h-3" />
          Auto-Step {autoTick ? "ON" : "OFF"}
        </button>

        <div className="text-xs text-slate-500 ml-2">
          Status: <span className="text-slate-300 capitalize">{status}</span>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
