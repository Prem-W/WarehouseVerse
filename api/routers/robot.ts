/**
 * Robot Router
 * Individual robot management - details, control, strategy adjustment
 */

import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getEngine } from "./simulation-utils";

export const robotRouter = createRouter({
  // ─── Robot Queries ───────────────────────────────────────────────

  list: publicQuery
    .query(() => {
      const engine = getEngine();
      const snapshot = engine.getSnapshot();
      return snapshot.robots;
    }),

  get: publicQuery
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const engine = getEngine();
      const robots = engine.getRobots();
      const robot = robots.find(r => r.id === input.id);

      if (!robot) {
        return null;
      }

      return {
        id: robot.id,
        name: robot.name,
        model: robot.model,
        status: robot.status,
        position: robot.position,
        battery: robot.battery,
        batteryCapacity: robot.batteryCapacity,
        speed: robot.speed,
        maxSpeed: robot.maxSpeed,
        currentPayload: robot.currentPayload,
        maxPayload: robot.maxPayload,
        carryingItem: robot.carryingItem,
        currentTaskId: robot.currentTaskId,
        efficiency: robot.efficiency,
        generation: robot.generation,
        fitness: robot.fitness,
        tasksCompleted: robot.tasksCompleted,
        tasksFailed: robot.tasksFailed,
        totalDistance: robot.totalDistance,
        chargeCycles: robot.chargeCycles,
        strategyProfile: robot.strategyProfile,
        memory: robot.memory.slice(-20),
        learnedWeights: Object.fromEntries(robot.learnedWeights),
        path: robot.path.slice(robot.pathIndex),
        nearbyRobots: robot.nearbyRobots,
      };
    }),

  // ─── Robot Control ───────────────────────────────────────────────

  setSpeed: publicQuery
    .input(z.object({
      id: z.string(),
      speed: z.number().min(0.1).max(3),
    }))
    .mutation(({ input }) => {
      const engine = getEngine();
      const success = engine.setRobotSpeed(input.id, input.speed);
      return { success, speed: input.speed };
    }),

  setStrategy: publicQuery
    .input(z.object({
      id: z.string(),
      strategy: z.object({
        explorationRate: z.number().min(0).max(1).optional(),
        cooperationBias: z.number().min(0).max(1).optional(),
        riskTolerance: z.number().min(0).max(1).optional(),
        speedPreference: z.number().min(0).max(1).optional(),
        energyAwareness: z.number().min(0).max(1).optional(),
      }),
    }))
    .mutation(({ input }) => {
      const engine = getEngine();
      const success = engine.setRobotStrategy(input.id, input.strategy);
      return { success };
    }),

  // ─── Batch Operations ────────────────────────────────────────────

  topPerformers: publicQuery
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(({ input }) => {
      const engine = getEngine();
      const robots = engine.getRobots();
      const limit = input?.limit ?? 10;

      return robots
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, limit)
        .map(r => ({
          id: r.id,
          name: r.name,
          fitness: r.fitness,
          tasksCompleted: r.tasksCompleted,
          efficiency: r.efficiency,
          generation: r.generation,
          strategyProfile: r.strategyProfile,
        }));
    }),

  byStatus: publicQuery
    .query(() => {
      const engine = getEngine();
      const robots = engine.getRobots();
      const grouped: Record<string, Array<{ id: string; name: string; status: string }>> = {};

      for (const robot of robots) {
        if (!grouped[robot.status]) {
          grouped[robot.status] = [];
        }
        grouped[robot.status].push({
          id: robot.id,
          name: robot.name,
          status: robot.status,
        });
      }

      return grouped;
    }),
});
