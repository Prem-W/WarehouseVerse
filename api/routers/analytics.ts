/**
 * Analytics Router
 * Provides aggregated metrics, historical data, and insights
 */

import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getEngine } from "./simulation-utils";

export const analyticsRouter = createRouter({
  // ─── Real-time Metrics ───────────────────────────────────────────

  currentMetrics: publicQuery
    .query(() => {
      const engine = getEngine();
      const snapshot = engine.getSnapshot();
      return snapshot.metrics;
    }),

  // ─── Metrics History ─────────────────────────────────────────────

  history: publicQuery
    .input(z.object({
      limit: z.number().min(1).max(1000).default(100),
    }).optional())
    .query(({ input }) => {
      const engine = getEngine();
      const history = engine.getMetricsHistory();
      const limit = input?.limit ?? 100;
      return history.slice(-limit);
    }),

  // ─── Robot Analytics ─────────────────────────────────────────────

  robotStats: publicQuery
    .query(() => {
      const engine = getEngine();
      const robots = engine.getRobots();

      const statusCounts: Record<string, number> = {};
      let totalBattery = 0;
      let totalEfficiency = 0;
      let totalTasksCompleted = 0;
      let totalDistance = 0;
      const generationCounts: Record<number, number> = {};

      for (const robot of robots) {
        statusCounts[robot.status] = (statusCounts[robot.status] ?? 0) + 1;
        totalBattery += robot.battery;
        totalEfficiency += robot.efficiency;
        totalTasksCompleted += robot.tasksCompleted;
        totalDistance += robot.totalDistance;
        generationCounts[robot.generation] = (generationCounts[robot.generation] ?? 0) + 1;
      }

      const count = robots.length;

      return {
        count,
        statusDistribution: statusCounts,
        avgBattery: count > 0 ? totalBattery / count : 0,
        avgEfficiency: count > 0 ? totalEfficiency / count : 0,
        totalTasksCompleted,
        totalDistanceTraveled: totalDistance,
        generationDistribution: generationCounts,
      };
    }),

  // ─── Task Analytics ──────────────────────────────────────────────

  taskStats: publicQuery
    .query(() => {
      const engine = getEngine();
      const tasks = engine.getTasks();

      const statusCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      let totalWaitTime = 0;
      let totalReplans = 0;
      let completedCount = 0;
      let totalCompletionTime = 0;

      for (const task of tasks) {
        statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
        typeCounts[task.type] = (typeCounts[task.type] ?? 0) + 1;
        totalWaitTime += task.waitTicks;
        totalReplans += task.replans;

        if (task.status === "completed" && task.completedTick && task.startedTick) {
          completedCount++;
          totalCompletionTime += task.completedTick - task.startedTick;
        }
      }

      return {
        total: tasks.length,
        statusDistribution: statusCounts,
        typeDistribution: typeCounts,
        avgWaitTime: tasks.length > 0 ? totalWaitTime / tasks.length : 0,
        totalReplans,
        avgCompletionTime: completedCount > 0 ? totalCompletionTime / completedCount : 0,
      };
    }),

  // ─── Evolution Analytics ─────────────────────────────────────────

  evolution: publicQuery
    .query(() => {
      const engine = getEngine();
      return {
        stats: engine.getEvolutionStats(),
        generations: engine.getGenerationHistory(),
      };
    }),

  // ─── Learning Analytics ──────────────────────────────────────────

  learning: publicQuery
    .query(() => {
      const engine = getEngine();
      return engine.getLearningStats();
    }),

  // ─── Performance Summary ─────────────────────────────────────────

  summary: publicQuery
    .query(() => {
      const engine = getEngine();
      const snapshot = engine.getSnapshot();
      const metrics = snapshot.metrics;

      return {
        tick: snapshot.tick,
        status: snapshot.status,
        robots: {
          total: metrics.activeRobots + metrics.idleRobots + metrics.chargingRobots,
          active: metrics.activeRobots,
          idle: metrics.idleRobots,
          charging: metrics.chargingRobots,
          moving: metrics.movingRobots,
        },
        tasks: {
          completed: metrics.totalTasksCompleted,
          failed: metrics.totalTasksFailed,
          pending: metrics.pendingTasks,
          inProgress: metrics.inProgressTasks,
          throughput: metrics.throughput,
        },
        performance: {
          avgBattery: metrics.avgBattery,
          avgEfficiency: metrics.avgEfficiency,
          pathEfficiency: metrics.pathEfficiency,
          avgWaitTime: metrics.avgWaitTime,
          cooperationIndex: metrics.cooperationIndex,
        },
        system: {
          collisionAvoidances: metrics.collisionAvoidances,
          messagesExchanged: metrics.messagesExchanged,
        },
      };
    }),
});
