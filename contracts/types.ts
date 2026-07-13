/**
 * EvoTwin Shared Contract Types
 * These types are shared between frontend and backend via tRPC
 */

import { z } from "zod";

// ─── Core Geometry ─────────────────────────────────────────────────
export const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point = z.infer<typeof pointSchema>;

// ─── Warehouse Configuration ───────────────────────────────────────
export const warehouseConfigSchema = z.object({
  width: z.number(),
  height: z.number(),
  cellSize: z.number(),
  shelves: z.array(z.object({
    id: z.string(),
    rect: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
    zone: z.string(),
  })),
  chargingStations: z.array(z.object({
    id: z.string(),
    position: pointSchema,
  })),
  dropOffPoints: z.array(z.object({
    id: z.string(),
    position: pointSchema,
    label: z.string(),
  })),
});

export type WarehouseConfig = z.infer<typeof warehouseConfigSchema>;

// ─── Robot Status ──────────────────────────────────────────────────
export const robotStatusSchema = z.enum([
  "idle",
  "moving",
  "carrying",
  "charging",
  "waiting",
  "maintenance",
  "offline",
  "error",
]);

export type RobotStatus = z.infer<typeof robotStatusSchema>;

// ─── Strategy Profile ──────────────────────────────────────────────
export const strategyProfileSchema = z.object({
  explorationRate: z.number(),
  cooperationBias: z.number(),
  riskTolerance: z.number(),
  speedPreference: z.number(),
  energyAwareness: z.number(),
});

export type StrategyProfile = z.infer<typeof strategyProfileSchema>;

// ─── Robot Snapshot (for frontend display) ─────────────────────────
export const robotSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: robotStatusSchema,
  position: pointSchema,
  target: pointSchema.nullable(),
  battery: z.number(),
  speed: z.number(),
  currentPayload: z.number(),
  carryingItem: z.string().nullable(),
  currentTaskId: z.string().nullable(),
  efficiency: z.number(),
  generation: z.number(),
  fitness: z.number(),
  memorySize: z.number(),
  pathLength: z.number(),
  nearbyRobots: z.number(),
});

export type RobotSnapshot = z.infer<typeof robotSnapshotSchema>;

// ─── Task Types ────────────────────────────────────────────────────
export const taskTypeSchema = z.enum([
  "pickup",
  "delivery",
  "transport",
  "recharge",
  "inspection",
  "rearrange",
]);

export const taskStatusSchema = z.enum([
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
]);

export const taskSnapshotSchema = z.object({
  id: z.string(),
  type: taskTypeSchema,
  status: taskStatusSchema,
  priority: z.number(),
  source: pointSchema,
  destination: pointSchema,
  assignedRobotId: z.string().nullable(),
  progress: z.number(),
});

export type TaskSnapshot = z.infer<typeof taskSnapshotSchema>;

// ─── Metrics ───────────────────────────────────────────────────────
export const tickMetricsSchema = z.object({
  tick: z.number(),
  activeRobots: z.number(),
  idleRobots: z.number(),
  chargingRobots: z.number(),
  movingRobots: z.number(),
  carryingRobots: z.number(),
  totalTasksCompleted: z.number(),
  totalTasksFailed: z.number(),
  pendingTasks: z.number(),
  inProgressTasks: z.number(),
  avgBattery: z.number(),
  avgEfficiency: z.number(),
  throughput: z.number(),
  collisionAvoidances: z.number(),
  messagesExchanged: z.number(),
  avgWaitTime: z.number(),
  pathEfficiency: z.number(),
  cooperationIndex: z.number(),
});

export type TickMetrics = z.infer<typeof tickMetricsSchema>;

// ─── Simulation Snapshot ───────────────────────────────────────────
export const simulationSnapshotSchema = z.object({
  tick: z.number(),
  status: z.enum(["created", "running", "paused", "completed", "error"]),
  robots: z.array(robotSnapshotSchema),
  tasks: z.array(taskSnapshotSchema),
  metrics: tickMetricsSchema,
});

export type SimulationSnapshot = z.infer<typeof simulationSnapshotSchema>;

// ─── Simulation Config ─────────────────────────────────────────────
export const simulationConfigSchema = z.object({
  robotCount: z.number().min(1).max(200),
  tickRate: z.number().min(10).max(2000),
  maxTicks: z.number().min(100).max(50000),
  taskSpawnRate: z.number().min(0).max(1),
  enableEvolution: z.boolean(),
  enableLearning: z.boolean(),
  enableCommunication: z.boolean(),
  mutationRate: z.number().min(0).max(1),
  selectionPressure: z.number().min(0.5).max(5),
});

export type SimulationConfig = z.infer<typeof simulationConfigSchema>;

// ─── Message Types ─────────────────────────────────────────────────
export const messageTypeSchema = z.enum([
  "path_share",
  "task_offer",
  "collision_warning",
  "help_request",
  "knowledge_share",
  "status_update",
  "coordination",
]);

export const robotMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  type: messageTypeSchema,
  content: z.record(z.string(), z.any()),
  tick: z.number(),
});

export type RobotMessage = z.infer<typeof robotMessageSchema>;

// ─── Generation Data ───────────────────────────────────────────────
export const generationDataSchema = z.object({
  generation: z.number(),
  avgFitness: z.number(),
  maxFitness: z.number(),
  minFitness: z.number(),
  diversity: z.number(),
  mutationRate: z.number(),
  selectionPressure: z.number(),
  topStrategies: z.array(z.object({
    profile: strategyProfileSchema,
    fitness: z.number(),
    robotId: z.string(),
  })),
});

export type GenerationData = z.infer<typeof generationDataSchema>;

// ─── Grid Cell ─────────────────────────────────────────────────────
export const gridCellSchema = z.object({
  x: z.number(),
  y: z.number(),
  walkable: z.boolean(),
  occupiedBy: z.string().nullable(),
  shelfZone: z.string().nullable(),
  isChargingStation: z.boolean(),
  isDropOffPoint: z.boolean(),
  congestion: z.number(),
});

export type GridCellContract = z.infer<typeof gridCellSchema>;
