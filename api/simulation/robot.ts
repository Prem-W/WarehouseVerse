/**
 * Robot Factory & State Machine
 * 
 * Creates and manages robot instances with:
 * - State machine for lifecycle management
 * - Battery simulation with realistic drain/charge curves
 * - Memory accumulation and knowledge learning
 * - Fitness evaluation for evolutionary optimization
 */

import type {
  RobotState,
  StrategyProfile,
  RobotMemoryEntry,
  Point,
  Task,
} from "./types";

// ─── Constants ─────────────────────────────────────────────────────
const BATTERY_DRAIN_MOVE = 0.08;        // per cell moved
const BATTERY_DRAIN_CARRY = 0.04;       // per cell with payload
const BATTERY_DRAIN_IDLE = 0.005;       // per tick
const BATTERY_DRAIN_WAIT = 0.003;       // per tick waiting
const BATTERY_CHARGE_RATE = 2.0;        // per tick charging
const MIN_BATTERY_TO_WORK = 15;         // %
const CRITICAL_BATTERY = 10;            // %
const STUCK_THRESHOLD = 8;              // ticks without movement
const MAX_MEMORY_ENTRIES = 200;
const MAX_SPEED_CARRYING = 0.7;         // speed multiplier when carrying

/**
 * Generate a unique robot ID
 */
let robotCounter = 0;
export function generateRobotId(): string {
  robotCounter++;
  return `R-${String(robotCounter).padStart(3, "0")}`;
}

/**
 * Create a default strategy profile
 */
export function createDefaultStrategy(): StrategyProfile {
  return {
    explorationRate: 0.2 + Math.random() * 0.3,
    cooperationBias: 0.3 + Math.random() * 0.4,
    riskTolerance: 0.3 + Math.random() * 0.4,
    speedPreference: 0.5 + Math.random() * 0.4,
    energyAwareness: 0.4 + Math.random() * 0.4,
  };
}

/**
 * Create a new robot with the given configuration
 */
export function createRobot(
  id: string,
  name: string,
  position: Point,
  generation: number = 0,
  strategy?: StrategyProfile
): RobotState {
  return {
    id,
    name: name || `Robot ${id}`,
    model: "ET-1000",
    status: "idle",
    position: { ...position },
    target: null,
    destination: null,
    velocity: { x: 0, y: 0 },
    speed: 0,
    maxSpeed: 1.0 + Math.random() * 0.5,
    battery: 85 + Math.random() * 15,
    batteryCapacity: 5000,
    maxPayload: 40 + Math.random() * 20,
    currentPayload: 0,
    carryingItem: null,
    currentTaskId: null,
    totalDistance: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    chargeCycles: 0,
    efficiency: 1.0,
    strategyProfile: strategy ?? createDefaultStrategy(),
    learnedWeights: new Map(),
    generation,
    fitness: 0,
    memory: [],
    // Runtime
    path: [],
    pathIndex: 0,
    stuckCounter: 0,
    waitTicks: 0,
    nearbyRobots: [],
    messages: [],
    isReplanning: false,
    lastPosition: { ...position },
    distanceSinceLastCheck: 0,
  };
}

/**
 * Robot state machine transitions
 */
export class RobotController {
  /**
   * Update robot state for one tick
   * Returns true if state changed
   */
  static tick(robot: RobotState, tick: number): boolean {
    let stateChanged = false;

    switch (robot.status) {
      case "idle":
        stateChanged = this.tickIdle(robot, tick);
        break;
      case "moving":
        stateChanged = this.tickMoving(robot, tick);
        break;
      case "carrying":
        stateChanged = this.tickCarrying(robot, tick);
        break;
      case "charging":
        stateChanged = this.tickCharging(robot, tick);
        break;
      case "waiting":
        stateChanged = this.tickWaiting(robot, tick);
        break;
      case "error":
        stateChanged = this.tickError(robot, tick);
        break;
    }

    // Check battery levels
    if (robot.battery <= CRITICAL_BATTERY && robot.status !== "charging" && robot.status !== "error") {
      robot.status = "error";
      this.addMemory(robot, tick, "Battery critically low - entering error state", robot.position, "failure");
      stateChanged = true;
    }

    // Update efficiency based on performance
    this.updateEfficiency(robot);

    return stateChanged;
  }

  private static tickIdle(robot: RobotState, tick: number): boolean {
    robot.battery = Math.max(0, robot.battery - BATTERY_DRAIN_IDLE);
    robot.speed = 0;
    robot.velocity = { x: 0, y: 0 };

    // If battery is low, transition to charging
    if (robot.battery < MIN_BATTERY_TO_WORK) {
      robot.status = "charging";
      this.addMemory(robot, tick, "Battery low - seeking charger", robot.position, "neutral");
      return true;
    }

    return false;
  }

  private static tickMoving(robot: RobotState, tick: number): boolean {
    if (!robot.target) {
      robot.status = "idle";
      return true;
    }

    // Calculate movement
    const dx = robot.target.x - robot.position.x;
    const dy = robot.target.y - robot.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      // Reached target
      robot.position = { ...robot.target };
      robot.pathIndex++;

      if (robot.pathIndex >= robot.path.length) {
        // Path complete
        robot.status = robot.currentPayload > 0 ? "carrying" : "idle";
        robot.target = null;
        robot.velocity = { x: 0, y: 0 };
        robot.speed = 0;
        robot.stuckCounter = 0;
      } else {
        // Next waypoint
        robot.target = robot.path[robot.pathIndex];
        this.updateVelocity(robot);
      }

      return true;
    }

    // Move towards target
    this.updateVelocity(robot);
    const moveAmount = Math.min(dist, robot.speed);
    robot.position.x += (dx / dist) * moveAmount;
    robot.position.y += (dy / dist) * moveAmount;
    robot.totalDistance += moveAmount;
    robot.distanceSinceLastCheck += moveAmount;

    // Battery drain
    const drain = BATTERY_DRAIN_MOVE + (robot.currentPayload > 0 ? BATTERY_DRAIN_CARRY * (robot.currentPayload / robot.maxPayload) : 0);
    robot.battery = Math.max(0, robot.battery - drain * moveAmount);

    // Check if stuck
    const distFromLast = Math.sqrt(
      (robot.position.x - robot.lastPosition.x) ** 2 +
      (robot.position.y - robot.lastPosition.y) ** 2
    );

    if (distFromLast < 0.05) {
      robot.stuckCounter++;
      if (robot.stuckCounter > STUCK_THRESHOLD) {
        robot.status = "waiting";
        robot.waitTicks = 0;
        this.addMemory(robot, tick, "Stuck - waiting for path to clear", robot.position, "neutral");
        return true;
      }
    } else {
      robot.stuckCounter = 0;
      robot.lastPosition = { ...robot.position };
    }

    return false;
  }

  private static tickCarrying(robot: RobotState, _tick: number): boolean {
    robot.battery = Math.max(0, robot.battery - BATTERY_DRAIN_IDLE);

    // If has destination, start moving
    if (robot.destination && robot.status === "carrying") {
      // Will be handled by task manager setting target
    }

    return false;
  }

  private static tickCharging(robot: RobotState, tick: number): boolean {
    robot.battery = Math.min(100, robot.battery + BATTERY_CHARGE_RATE);
    robot.speed = 0;
    robot.velocity = { x: 0, y: 0 };

    if (robot.battery >= 95) {
      robot.chargeCycles++;
      robot.status = "idle";
      this.addMemory(robot, tick, "Charging complete", robot.position, "success");
      return true;
    }

    return false;
  }

  private static tickWaiting(robot: RobotState, _tick: number): boolean {
    robot.battery = Math.max(0, robot.battery - BATTERY_DRAIN_WAIT);
    robot.waitTicks++;
    robot.speed = 0;

    // After waiting, try to replan
    if (robot.waitTicks > 5) {
      robot.stuckCounter = 0;
      robot.waitTicks = 0;
      robot.isReplanning = true;

      if (robot.path.length > 0 && robot.pathIndex < robot.path.length) {
        robot.status = "moving";
        robot.target = robot.path[robot.pathIndex];
        this.updateVelocity(robot);
      } else {
        robot.status = "idle";
      }

      return true;
    }

    return false;
  }

  private static tickError(robot: RobotState, tick: number): boolean {
    // Attempt recovery
    if (robot.battery > CRITICAL_BATTERY + 5) {
      robot.status = "idle";
      this.addMemory(robot, tick, "Recovered from error state", robot.position, "success");
      return true;
    }
    robot.battery = Math.max(0, robot.battery - BATTERY_DRAIN_IDLE * 0.5);
    return false;
  }

  /**
   * Assign a task to a robot
   */
  static assignTask(robot: RobotState, task: Task, path: Point[]): boolean {
    if (robot.status === "charging" || robot.status === "error") return false;

    robot.currentTaskId = task.id;
    robot.destination = task.destination;
    robot.path = path;
    robot.pathIndex = 0;
    robot.stuckCounter = 0;
    robot.isReplanning = false;

    if (path.length > 0) {
      robot.target = path[0];
      robot.status = task.type === "pickup" ? "moving" : "carrying";
      this.updateVelocity(robot);
    }

    return true;
  }

  /**
   * Set a path for the robot (for navigation)
   */
  static setPath(robot: RobotState, path: Point[]): void {
    if (path.length === 0) return;
    robot.path = path;
    robot.pathIndex = 0;
    robot.target = path[0];
    robot.stuckCounter = 0;
    if (robot.status === "idle" || robot.status === "waiting") {
      robot.status = "moving";
    }
    this.updateVelocity(robot);
  }

  /**
   * Pick up an item at the current position
   */
  static pickUp(robot: RobotState, itemId: string, weight: number): boolean {
    if (robot.currentPayload + weight > robot.maxPayload) return false;
    robot.carryingItem = itemId;
    robot.currentPayload += weight;
    return true;
  }

  /**
   * Deliver/drop off the carried item
   */
  static deliver(robot: RobotState): { itemId: string; weight: number } | null {
    if (!robot.carryingItem) return null;
    const item = { itemId: robot.carryingItem, weight: robot.currentPayload };
    robot.carryingItem = null;
    robot.currentPayload = 0;
    return item;
  }

  /**
   * Send robot to charge
   */
  static sendToCharge(robot: RobotState, stationPos: Point): void {
    robot.destination = stationPos;
    robot.status = "moving";
  }

  /**
   * Start charging at current position
   */
  static startCharging(robot: RobotState): void {
    robot.status = "charging";
    robot.speed = 0;
    robot.velocity = { x: 0, y: 0 };
  }

  /**
   * Calculate fitness score for evolutionary optimization
   */
  static calculateFitness(robot: RobotState): number {
    const taskScore = robot.tasksCompleted * 100 - robot.tasksFailed * 50;
    const energyScore = (robot.battery / 100) * 50;
    const efficiencyScore = robot.efficiency * 100;
    const distanceScore = Math.max(0, 200 - robot.totalDistance * 0.01);
    const speedScore = robot.maxSpeed * 20;

    // Strategy-dependent scoring
    const strategyBonus =
      robot.strategyProfile.cooperationBias * 20 +
      robot.strategyProfile.energyAwareness * 15 +
      (1 - robot.strategyProfile.riskTolerance) * 10;

    const fitness = taskScore + energyScore + efficiencyScore + distanceScore + speedScore + strategyBonus;
    robot.fitness = Math.max(0, fitness);
    return robot.fitness;
  }

  // ─── Private helpers ─────────────────────────────────────────────

  private static updateVelocity(robot: RobotState): void {
    if (!robot.target) {
      robot.velocity = { x: 0, y: 0 };
      robot.speed = 0;
      return;
    }

    const speedMultiplier = robot.currentPayload > 0 ? MAX_SPEED_CARRYING : 1.0;
    robot.speed = robot.maxSpeed * speedMultiplier * (0.8 + robot.strategyProfile.speedPreference * 0.2);

    const dx = robot.target.x - robot.position.x;
    const dy = robot.target.y - robot.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      robot.velocity = {
        x: (dx / dist) * robot.speed,
        y: (dy / dist) * robot.speed,
      };
    }
  }

  private static updateEfficiency(robot: RobotState): void {
    const taskRatio = robot.tasksCompleted > 0
      ? robot.tasksCompleted / (robot.tasksCompleted + robot.tasksFailed)
      : 0.5;

    const energyRatio = robot.battery / 100;
    const speedFactor = robot.maxSpeed / 2.0;

    robot.efficiency = Math.min(2.0,
      taskRatio * 0.5 + energyRatio * 0.2 + speedFactor * 0.3
    );
  }

  /**
   * Add a memory entry to the robot's episodic memory
   */
  static addMemory(
    robot: RobotState,
    tick: number,
    event: string,
    position: Point,
    outcome: "success" | "failure" | "neutral",
    metadata?: Record<string, unknown>
  ): void {
    const entry: RobotMemoryEntry = {
      timestamp: tick,
      event,
      position: { ...position },
      outcome,
      metadata,
    };

    robot.memory.push(entry);

    // Keep memory bounded
    if (robot.memory.length > MAX_MEMORY_ENTRIES) {
      robot.memory = robot.memory.slice(-MAX_MEMORY_ENTRIES);
    }
  }

  /**
   * Get recent memories relevant to a position
   */
  static getRelevantMemories(
    robot: RobotState,
    position: Point,
    radius: number = 5,
    limit: number = 10
  ): RobotMemoryEntry[] {
    return robot.memory
      .filter(m => {
        const dx = m.position.x - position.x;
        const dy = m.position.y - position.y;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
      })
      .slice(-limit);
  }

  /**
   * Apply a learned weight adjustment
   */
  static learn(robot: RobotState, key: string, value: number, confidence: number): void {
    const current = robot.learnedWeights.get(key) ?? 0.5;
    const adjusted = current * (1 - confidence) + value * confidence;
    robot.learnedWeights.set(key, Math.max(0, Math.min(1, adjusted)));
  }

  /**
   * Get a learned value
   */
  static getLearned(robot: RobotState, key: string, defaultValue: number = 0.5): number {
    return robot.learnedWeights.get(key) ?? defaultValue;
  }

  /**
   * Mutate the robot's strategy profile (for evolution)
   */
  static mutateStrategy(robot: RobotState, mutationRate: number): void {
    const profile = robot.strategyProfile;
    const keys = Object.keys(profile) as (keyof StrategyProfile)[];

    for (const key of keys) {
      if (Math.random() < mutationRate) {
        const delta = (Math.random() - 0.5) * 0.3;
        profile[key] = Math.max(0.05, Math.min(0.95, profile[key] + delta));
      }
    }
  }

  /**
   * Crossover two parent strategies to create offspring
   */
  static crossoverStrategy(
    parent1: StrategyProfile,
    parent2: StrategyProfile
  ): StrategyProfile {
    const child = { ...parent1 };
    const keys = Object.keys(parent1) as (keyof StrategyProfile)[];

    for (const key of keys) {
      if (Math.random() < 0.5) {
        child[key] = parent2[key];
      }
      // Slight mutation
      if (Math.random() < 0.1) {
        child[key] += (Math.random() - 0.5) * 0.1;
        child[key] = Math.max(0.05, Math.min(0.95, child[key]));
      }
    }

    return child;
  }

  /**
   * Serialize robot state for storage/transmission
   */
  static serialize(robot: RobotState): Record<string, unknown> {
    return {
      id: robot.id,
      name: robot.name,
      status: robot.status,
      position: robot.position,
      battery: robot.battery,
      speed: robot.speed,
      currentPayload: robot.currentPayload,
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
      memorySize: robot.memory.length,
      pathLength: robot.path.length - robot.pathIndex,
      nearbyRobots: robot.nearbyRobots.length,
    };
  }
}
