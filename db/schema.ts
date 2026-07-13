import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  json,
  int,
  float,
  bigint,
  mysqlEnum,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

/**
 * EvoTwin Database Schema
 * Production-grade schema for autonomous warehouse digital twin
 */

// ─── Warehouse Layouts ─────────────────────────────────────────────
export const warehouseLayouts = mysqlTable("warehouse_layouts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  width: int("width").notNull(),
  height: int("height").notNull(),
  cellSize: int("cell_size").notNull().default(100),
  layoutConfig: json("layout_config").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─── Robots ────────────────────────────────────────────────────────
export const robots = mysqlTable("robots", {
  id: serial("id").primaryKey(),
  robotId: varchar("robot_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  model: varchar("model", { length: 50 }).default("ET-1000"),
  status: mysqlEnum("status", [
    "idle",
    "moving",
    "carrying",
    "charging",
    "waiting",
    "maintenance",
    "offline",
    "error",
  ]).notNull().default("idle"),
  batteryLevel: float("battery_level").notNull().default(100),
  batteryCapacity: float("battery_capacity").notNull().default(5000),
  currentX: float("current_x").default(0),
  currentY: float("current_y").default(0),
  targetX: float("target_x"),
  targetY: float("target_y"),
  speed: float("speed").notNull().default(1.5),
  maxPayload: float("max_payload").notNull().default(50),
  currentPayload: float("current_payload").default(0),
  carryingItem: varchar("carrying_item", { length: 100 }),
  taskId: varchar("task_id", { length: 50 }),
  totalDistance: float("total_distance").default(0),
  tasksCompleted: int("tasks_completed").default(0),
  tasksFailed: int("tasks_failed").default(0),
  chargeCycles: int("charge_cycles").default(0),
  efficiency: float("efficiency").default(1),
  strategyProfile: json("strategy_profile"),
  learnedWeights: json("learned_weights"),
  generation: int("generation").default(0),
  fitness: float("fitness").default(0),
  memory: json("memory"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_robot_status").on(table.status),
  index("idx_robot_generation").on(table.generation),
]);

// ─── Tasks ─────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: serial("id").primaryKey(),
  taskId: varchar("task_id", { length: 50 }).notNull().unique(),
  type: mysqlEnum("type", [
    "pickup",
    "delivery",
    "transport",
    "recharge",
    "inspection",
    "rearrange",
  ]).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "failed",
    "cancelled",
  ]).notNull().default("pending"),
  priority: int("priority").notNull().default(5),
  sourceX: float("source_x").notNull(),
  sourceY: float("source_y").notNull(),
  destX: float("dest_x").notNull(),
  destY: float("dest_y").notNull(),
  itemId: varchar("item_id", { length: 50 }),
  itemWeight: float("item_weight").default(0),
  assignedRobotId: varchar("assigned_robot_id", { length: 50 }),
  estimatedDuration: int("estimated_duration"),
  actualDuration: int("actual_duration"),
  deadline: timestamp("deadline"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  pathTaken: json("path_taken"),
  replans: int("replans").default(0),
  waitTime: int("wait_time").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_task_status").on(table.status),
  index("idx_task_type").on(table.type),
  index("idx_task_assigned").on(table.assignedRobotId),
]);

// ─── Simulation Runs ───────────────────────────────────────────────
export const simulationRuns = mysqlTable("simulation_runs", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  status: mysqlEnum("status", [
    "created",
    "running",
    "paused",
    "completed",
    "error",
  ]).notNull().default("created"),
  layoutId: bigint("layout_id", { mode: "number", unsigned: true }).references(() => warehouseLayouts.id),
  config: json("config").notNull(),
  currentTick: int("current_tick").default(0),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  durationMs: int("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Metrics (Time-Series Aggregated) ──────────────────────────────
export const metrics = mysqlTable("metrics", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id", { length: 50 }).notNull(),
  tick: int("tick").notNull(),
  metricType: mysqlEnum("metric_type", [
    "throughput",
    "efficiency",
    "collision_avoidance",
    "battery_optimization",
    "task_completion",
    "robot_utilization",
    "path_efficiency",
    "queue_length",
    "avg_wait_time",
    "cooperation_index",
  ]).notNull(),
  value: float("value").notNull(),
  metadata: json("metadata"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
}, (table) => [
  index("idx_metrics_run_tick").on(table.runId, table.tick),
  index("idx_metrics_type").on(table.metricType),
]);

// ─── Evolutionary Generations ─────────────────────────────────────
export const evolutionGenerations = mysqlTable("evolution_generations", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id", { length: 50 }).notNull(),
  generation: int("generation").notNull(),
  avgFitness: float("avg_fitness").notNull(),
  maxFitness: float("max_fitness").notNull(),
  minFitness: float("min_fitness").notNull(),
  diversity: float("diversity").notNull(),
  mutationRate: float("mutation_rate").notNull(),
  selectionPressure: float("selection_pressure").notNull(),
  topStrategies: json("top_strategies"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_evo_run_gen").on(table.runId, table.generation),
]);

// ─── Communication Log ─────────────────────────────────────────────
export const communicationLogs = mysqlTable("communication_logs", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id", { length: 50 }).notNull(),
  tick: int("tick").notNull(),
  senderId: varchar("sender_id", { length: 50 }).notNull(),
  receiverId: varchar("receiver_id", { length: 50 }).notNull(),
  messageType: mysqlEnum("message_type", [
    "path_share",
    "task_offer",
    "collision_warning",
    "help_request",
    "knowledge_share",
    "status_update",
    "coordination",
  ]).notNull(),
  content: json("content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_comm_run_tick").on(table.runId, table.tick),
]);

// ─── Robot Events ──────────────────────────────────────────────────
export const robotEvents = mysqlTable("robot_events", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id", { length: 50 }).notNull(),
  robotId: varchar("robot_id", { length: 50 }).notNull(),
  tick: int("tick").notNull(),
  eventType: mysqlEnum("event_type", [
    "spawned",
    "task_accepted",
    "task_completed",
    "task_failed",
    "path_blocked",
    "collision_avoided",
    "started_charging",
    "finished_charging",
    "low_battery",
    "recovered",
    "strategy_updated",
    "knowledge_shared",
    "mutation_occurred",
  ]).notNull(),
  details: json("details"),
  position: json("position"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_event_robot").on(table.robotId),
  index("idx_event_run_tick").on(table.runId, table.tick),
]);

// ─── Knowledge Base (Shared Learnings) ─────────────────────────────
export const knowledgeBase = mysqlTable("knowledge_base", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id", { length: 50 }).notNull(),
  robotId: varchar("robot_id", { length: 50 }).notNull(),
  knowledgeType: mysqlEnum("knowledge_type", [
    "path_preference",
    "zone_congestion",
    "task_strategy",
    "energy_pattern",
    "cooperation_learned",
    "obstacle_memory",
  ]).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: float("value").notNull(),
  confidence: float("confidence").notNull().default(0.5),
  context: json("context"),
  useCount: int("use_count").default(0),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => [
  index("idx_kb_robot").on(table.robotId),
  index("idx_kb_type").on(table.knowledgeType),
]);
