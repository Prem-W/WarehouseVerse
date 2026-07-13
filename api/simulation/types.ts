/**
 * EvoTwin Simulation Core Types
 * Defines all interfaces and types for the warehouse digital twin simulation
 */

// ─── Core Geometry ─────────────────────────────────────────────────
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ─── Warehouse Configuration ───────────────────────────────────────
export interface ShelfZone {
  id: string;
  rect: Rect;
  zone: string; // e.g., "A", "B", "C"
  category?: string;
}

export interface ChargingStation {
  id: string;
  position: Point;
  capacity: number;
  occupiedBy: string[]; // robot IDs
}

export interface DropOffPoint {
  id: string;
  position: Point;
  label: string;
}

export interface Obstacle {
  id: string;
  rect: Rect;
  type: "wall" | "equipment" | "temporary";
}

export interface Aisle {
  id: string;
  start: Point;
  end: Point;
  width: number;
}

export interface WarehouseConfig {
  width: number;
  height: number;
  cellSize: number;
  shelves: ShelfZone[];
  chargingStations: ChargingStation[];
  dropOffPoints: DropOffPoint[];
  obstacles: Obstacle[];
  aisles: Aisle[];
}

// ─── Robot Definitions ─────────────────────────────────────────────
export type RobotStatus =
  | "idle"
  | "moving"
  | "carrying"
  | "charging"
  | "waiting"
  | "maintenance"
  | "offline"
  | "error";

export interface StrategyProfile {
  explorationRate: number;    // 0-1, tendency to try new paths
  cooperationBias: number;    // 0-1, willingness to help others
  riskTolerance: number;      // 0-1, acceptable collision risk
  speedPreference: number;    // 0-1, prefer speed vs energy
  energyAwareness: number;    // 0-1, how early to seek charging
}

export interface RobotMemoryEntry {
  timestamp: number;
  event: string;
  position: Point;
  outcome: "success" | "failure" | "neutral";
  metadata?: Record<string, unknown>;
}

export interface RobotState {
  id: string;
  name: string;
  model: string;
  status: RobotStatus;
  position: Point;
  target: Point | null;
  destination: Point | null; // final destination (for deliveries)
  velocity: Point;
  speed: number;
  maxSpeed: number;
  battery: number;
  batteryCapacity: number;
  maxPayload: number;
  currentPayload: number;
  carryingItem: string | null;
  currentTaskId: string | null;
  totalDistance: number;
  tasksCompleted: number;
  tasksFailed: number;
  chargeCycles: number;
  efficiency: number;
  strategyProfile: StrategyProfile;
  learnedWeights: Map<string, number>;
  generation: number;
  fitness: number;
  memory: RobotMemoryEntry[];
  // Runtime state
  path: Point[];
  pathIndex: number;
  stuckCounter: number;
  waitTicks: number;
  nearbyRobots: string[];
  messages: RobotMessage[];
  isReplanning: boolean;
  lastPosition: Point;
  distanceSinceLastCheck: number;
}

// ─── Task Definitions ──────────────────────────────────────────────
export type TaskType =
  | "pickup"
  | "delivery"
  | "transport"
  | "recharge"
  | "inspection"
  | "rearrange";

export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  priority: number; // 1-10
  source: Point;
  destination: Point;
  itemId: string | null;
  itemWeight: number;
  assignedRobotId: string | null;
  estimatedDuration: number;
  actualDuration: number;
  deadline: number | null; // tick number
  createdTick: number;
  startedTick: number | null;
  completedTick: number | null;
  pathTaken: Array<{ x: number; y: number; t: number }>;
  replans: number;
  waitTicks: number;
}

// ─── Communication ─────────────────────────────────────────────────
export type MessageType =
  | "path_share"
  | "task_offer"
  | "collision_warning"
  | "help_request"
  | "knowledge_share"
  | "status_update"
  | "coordination";

export interface RobotMessage {
  id: string;
  senderId: string;
  receiverId: string; // "broadcast" for all
  type: MessageType;
  content: Record<string, unknown>;
  tick: number;
  ttl: number; // time to live in ticks
}

// ─── Knowledge ─────────────────────────────────────────────────────
export type KnowledgeType =
  | "path_preference"
  | "zone_congestion"
  | "task_strategy"
  | "energy_pattern"
  | "cooperation_learned"
  | "obstacle_memory";

export interface KnowledgeEntry {
  robotId: string;
  type: KnowledgeType;
  key: string;
  value: number;
  confidence: number;
  context?: Record<string, unknown>;
  useCount: number;
  tick: number;
}

// ─── Simulation Configuration ──────────────────────────────────────
export interface SimulationConfig {
  warehouseId: number;
  robotCount: number;
  tickRate: number; // ms per tick
  maxTicks: number;
  taskSpawnRate: number; // probability per tick
  maxConcurrentTasks: number;
  enableEvolution: boolean;
  enableLearning: boolean;
  enableCommunication: boolean;
  mutationRate: number;
  selectionPressure: number;
  evolutionInterval: number; // ticks between generations
  communicationRange: number; // cells
  collisionPredictionWindow: number; // ticks ahead
  lowBatteryThreshold: number; // percentage
  stuckThreshold: number; // ticks without movement
}

// ─── Simulation State ──────────────────────────────────────────────
export interface SimulationSnapshot {
  tick: number;
  status: "created" | "running" | "paused" | "completed" | "error";
  robots: RobotSnapshot[];
  tasks: TaskSnapshot[];
  metrics: TickMetrics;
  messages: RobotMessage[];
}

export interface RobotSnapshot {
  id: string;
  name: string;
  status: RobotStatus;
  position: Point;
  target: Point | null;
  battery: number;
  speed: number;
  currentPayload: number;
  carryingItem: string | null;
  currentTaskId: string | null;
  efficiency: number;
  generation: number;
  fitness: number;
  memorySize: number;
  pathLength: number;
  nearbyRobots: number;
}

export interface TaskSnapshot {
  id: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  source: Point;
  destination: Point;
  assignedRobotId: string | null;
  progress: number; // 0-1
}

export interface TickMetrics {
  tick: number;
  activeRobots: number;
  idleRobots: number;
  chargingRobots: number;
  movingRobots: number;
  carryingRobots: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  pendingTasks: number;
  inProgressTasks: number;
  avgBattery: number;
  avgEfficiency: number;
  throughput: number; // tasks per 100 ticks
  collisionAvoidances: number;
  messagesExchanged: number;
  avgWaitTime: number;
  pathEfficiency: number;
  energyPerTask: number;
  cooperationIndex: number;
}

// ─── Evolution ─────────────────────────────────────────────────────
export interface GenerationData {
  generation: number;
  avgFitness: number;
  maxFitness: number;
  minFitness: number;
  diversity: number;
  mutationRate: number;
  selectionPressure: number;
  topStrategies: Array<{
    profile: StrategyProfile;
    fitness: number;
    robotId: string;
  }>;
}

// ─── Grid Cell ─────────────────────────────────────────────────────
export interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
  occupiedBy: string | null; // robot ID
  shelfZone: string | null;
  isChargingStation: boolean;
  isDropOffPoint: boolean;
  congestion: number; // 0-1 accumulated traffic
  lastVisited: number; // tick
}
