/**
 * useSimulation Hook
 * Manages simulation state, controls, and auto-polling
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/providers/trpc";
import type { SimulationSnapshot, SimulationConfig } from "@contracts/types";

export function useSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [autoTick, setAutoTick] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tRPC queries and mutations
  const statusQuery = trpc.simulation.status.useQuery(undefined, {
    refetchInterval: isRunning ? 500 : false,
  });

  const snapshotQuery = trpc.simulation.snapshot.useQuery(undefined, {
    refetchInterval: isRunning ? 200 : false,
  });

  const startMutation = trpc.simulation.start.useMutation({
    onSuccess: () => setIsRunning(true),
  });

  const pauseMutation = trpc.simulation.pause.useMutation({
    onSuccess: () => setIsRunning(false),
  });

  const resumeMutation = trpc.simulation.resume.useMutation({
    onSuccess: () => setIsRunning(true),
  });

  const stopMutation = trpc.simulation.stop.useMutation({
    onSuccess: () => setIsRunning(false),
  });

  const stepMutation = trpc.simulation.step.useMutation();

  const resetMutation = trpc.simulation.reset.useMutation({
    onSuccess: () => {
      setIsRunning(false);
      setAutoTick(false);
    },
  });

  const utils = trpc.useUtils();

  // Auto-tick interval for smoother animation
  useEffect(() => {
    if (autoTick && isRunning) {
      intervalRef.current = setInterval(() => {
        stepMutation.mutate(undefined, {
          onSuccess: () => {
            utils.simulation.snapshot.invalidate();
          },
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoTick, isRunning]);

  const start = useCallback((config?: Partial<SimulationConfig>) => {
    startMutation.mutate({ config });
  }, [startMutation]);

  const pause = useCallback(() => {
    pauseMutation.mutate();
  }, [pauseMutation]);

  const resume = useCallback(() => {
    resumeMutation.mutate();
  }, [resumeMutation]);

  const stop = useCallback(() => {
    stopMutation.mutate();
  }, [stopMutation]);

  const step = useCallback(() => {
    stepMutation.mutate(undefined, {
      onSuccess: () => {
        utils.simulation.snapshot.invalidate();
      },
    });
  }, [stepMutation, utils]);

  const reset = useCallback(() => {
    resetMutation.mutate();
  }, [resetMutation]);

  const snapshot: SimulationSnapshot | undefined = snapshotQuery.data;

  return {
    status: statusQuery.data?.status ?? "created",
    tick: statusQuery.data?.tick ?? 0,
    snapshot,
    isRunning,
    autoTick,
    setAutoTick,
    isLoading: startMutation.isPending || pauseMutation.isPending,
    start,
    pause,
    resume,
    stop,
    step,
    reset,
    refetch: () => {
      utils.simulation.snapshot.invalidate();
      utils.simulation.status.invalidate();
    },
  };
}
