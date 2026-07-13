/**
 * EvoTwin Simulation Engine
 * 
 * The main orchestrator that integrates all subsystems:
 * - Warehouse grid management
 * - Robot fleet state machines
 * - Dynamic task scheduling
 * - A* pathfinding with JPS
 * - Collision prediction and avoidance
 * - Robot communication
 * - Q-learning adaptation
 * - Genetic algorithm evolution
 * - Real-time metrics collection
 * 
 * Design: Fixed-tick simulation loop with deterministic execution
 * Performance target: 1000+ robots at 30 ticks/second
 */

import type {
  WarehouseConfig,
  SimulationConfig,
  RobotState,
  Task,
  SimulationSnapshot,
  RobotSnapshot,
  TaskSnapshot,
  TickMetrics,
  Point,
} from "./types";

import { WarehouseGrid } from "./grid";
import { Pathfinder } from "./pathfinding";
import {
  createRobot,
  generateRobotId,
  RobotController,
  createDefaultStrategy,
} from "./robot";
import { TaskManager } from "./taskmanager";
import { CommunicationHub } from "./communication";
import { LearningEngine } from "./learning";
import { EvolutionEngine } from "./evolution";

// ─── Default Warehouse Layout ──────────────────────────────────────
export function createDefaultWarehouseConfig(): WarehouseConfig {
  const width = 60;
  const height = 40;
  const shelves: WarehouseConfig["shelves"] = [];
  const chargingStations: WarehouseConfig["chargingStations"] = [];
  const dropOffPoints: WarehouseConfig["dropOffPoints"] = [];
  const obstacles: WarehouseConfig["obstacles"] = [];

  // Create shelf zones (organized in rows with aisles between)
  const zones = ["A", "B", "C", "D", "E"];
  for (let z = 0; z < zones.length; z++) {
    const baseX = 4 + z * 11;
    // Two rows of shelves per zone
    for (let row = 0; row < 2; row++) {
      const baseY = 3 + row * 18;
      shelves.push({
        id: `shelf-${zones[z]}-${row}`,
        rect: { x: baseX, y: baseY, w: 8, h: 4 },
        zone: zones[z],
        category: "general",
      });
      shelves.push({
        id: `shelf-${zones[z]}-${row}-2`,
        rect: { x: baseX, y: baseY + 6, w: 8, h: 4 },
        zone: zones[z],
        category: "general",
      });
    }
  }

  // Charging stations along the walls
  for (let i = 0; i < 6; i++) {
    chargingStations.push({
      id: `charger-${i}`,
      position: { x: 1, y: 5 + i * 6 },
      capacity: 2,
      occupiedBy: [],
    });
  }
  for (let i = 0; i < 6; i++) {
    chargingStations.push({
      id: `charger-right-${i}`,
      position: { x: width - 2, y: 5 + i * 6 },
      capacity: 2,
      occupiedBy: [],
    });
  }

  // Drop-off points
  dropOffPoints.push({ id: "dock-1", position: { x: 2, y: 2 }, label: "Inbound" });
  dropOffPoints.push({ id: "dock-2", position: { x: width - 3, y: 2 }, label: "Outbound" });
  dropOffPoints.push({ id: "dock-3", position: { x: Math.floor(width / 2), y: height - 2 }, label: "Sorting" });

  return {
    width,
    height,
    cellSize: 100,
    shelves,
    chargingStations,
    dropOffPoints,
    obstacles,
    aisles: [],
  };
}

// ─── Simulation Engine ─────────────────────────────────────────────
export class SimulationEngine {
  // Core systems
  private grid!: WarehouseGrid;
  private pathfinder: Pathfinder;
  private taskManager: TaskManager;
  private commHub: CommunicationHub;
  private learningEngine: LearningEngine;
  private evolutionEngine: EvolutionEngine;

  // State
  private robots: Map<string, RobotState> = new Map();
  private config: SimulationConfig;
  private warehouseConfig: WarehouseConfig;
  private tick = 0;
  private status: "created" | "running" | "paused" | "completed" | "error" = "created";
  private walkablePositions: Point[] = [];

  // Metrics
  private metrics: TickMetrics[] = [];
  private collisionAvoidances = 0;
  private messagesExchanged = 0;

  // Callbacks
  private onTickCallback?: (snapshot: SimulationSnapshot) => void;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = {
      warehouseId: 1,
      robotCount: config.robotCount ?? 30,
      tickRate: config.tickRate ?? 100,
      maxTicks: config.maxTicks ?? 10000,
      taskSpawnRate: config.taskSpawnRate ?? 0.3,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 50,
      enableEvolution: config.enableEvolution ?? true,
      enableLearning: config.enableLearning ?? true,
      enableCommunication: config.enableCommunication ?? true,
      mutationRate: config.mutationRate ?? 0.15,
      selectionPressure: config.selectionPressure ?? 2.0,
      evolutionInterval: config.evolutionInterval ?? 200,
      communicationRange: config.communicationRange ?? 8,
      collisionPredictionWindow: config.collisionPredictionWindow ?? 5,
      lowBatteryThreshold: config.lowBatteryThreshold ?? 20,
      stuckThreshold: config.stuckThreshold ?? 8,
    };

    this.warehouseConfig = createDefaultWarehouseConfig();
    this.pathfinder = new Pathfinder({ useJPS: true });
    this.taskManager = new TaskManager();
    this.commHub = new CommunicationHub(this.config.communicationRange);
    this.learningEngine = new LearningEngine();
    this.evolutionEngine = new EvolutionEngine({
      mutationRate: this.config.mutationRate,
      selectionPressure: this.config.selectionPressure,
    });
  }

  // ─── Initialization ──────────────────────────────────────────────

  initialize(warehouseConfig?: WarehouseConfig): void {
    if (warehouseConfig) {
      this.warehouseConfig = warehouseConfig;
    }

    this.grid = new WarehouseGrid(this.warehouseConfig);

    // Precompute walkable positions
    this.walkablePositions = [];
    for (let y = 0; y < this.warehouseConfig.height; y++) {
      for (let x = 0; x < this.warehouseConfig.width; x++) {
        if (this.grid.isWalkable(x, y) && !this.grid.isChargingStation(x, y)) {
          this.walkablePositions.push({ x, y });
        }
      }
    }

    // Spawn robots
    this.spawnRobots();

    // Initial tasks
    this.taskManager.spawnRandomTasks(
      15,
      this.walkablePositions,
      this.warehouseConfig.dropOffPoints.map(d => d.position),
      0
    );

    this.status = "created";
    this.tick = 0;
  }

  private spawnRobots(): void {
    this.robots.clear();

    // Distribute robots across walkable positions
    const shuffled = [...this.walkablePositions].sort(() => Math.random() - 0.5);

    for (let i = 0; i < this.config.robotCount && i < shuffled.length; i++) {
      const pos = shuffled[i];
      const id = generateRobotId();
      const strategy = createDefaultStrategy();

      // Vary initial strategies for genetic diversity
      strategy.explorationRate = 0.1 + Math.random() * 0.5;
      strategy.cooperationBias = 0.2 + Math.random() * 0.6;
      strategy.riskTolerance = 0.2 + Math.random() * 0.5;
      strategy.speedPreference = 0.4 + Math.random() * 0.5;
      strategy.energyAwareness = 0.3 + Math.random() * 0.5;

      const robot = createRobot(
        id,
        `Robot ${i + 1}`,
        { x: pos.x, y: pos.y },
        0,
        strategy
      );

      this.robots.set(id, robot);
      this.grid.setRobotPosition(id, pos.x, pos.y);
      this.learningEngine.initializeRobot(robot);
    }
  }

  // ─── Simulation Control ──────────────────────────────────────────

  start(onTick?: (snapshot: SimulationSnapshot) => void): void {
    if (this.status === "running") return;

    this.onTickCallback = onTick;
    this.status = "running";

    this.intervalId = setInterval(() => {
      this.step();
    }, this.config.tickRate);
  }

  pause(): void {
    this.status = "paused";
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resume(): void {
    if (this.status === "paused") {
      this.status = "running";
      this.intervalId = setInterval(() => {
        this.step();
      }, this.config.tickRate);
    }
  }

  stop(): void {
    this.status = "completed";
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  step(): SimulationSnapshot | null {
    if (this.status !== "running") return null;

    this.tick++;

    // Run all subsystems
    this.spawnTasks();
    this.updateRobots();
    this.processCollisions();
    if (this.config.enableCommunication) {
      this.processCommunication();
    }
    if (this.config.enableLearning) {
      this.processLearning();
    }
    if (this.config.enableEvolution && this.tick % this.config.evolutionInterval === 0) {
      this.processEvolution();
    }
    this.taskManager.tickTasks(this.tick);
    this.grid.decayCongestion(0.99);

    // Collect metrics
    const metrics = this.computeMetrics();
    this.metrics.push(metrics);

    // Create snapshot
    const snapshot = this.createSnapshot(metrics);

    // Invoke callback
    if (this.onTickCallback) {
      this.onTickCallback(snapshot);
    }

    // Check completion
    if (this.tick >= this.config.maxTicks) {
      this.stop();
    }

    return snapshot;
  }

  // ─── Robot Update ────────────────────────────────────────────────

  private updateRobots(): void {
    for (const robot of this.robots.values()) {
      // Update nearby robots
      robot.nearbyRobots = this.grid.getNearbyRobots(robot.id, this.config.communicationRange);

      // State machine tick
      RobotController.tick(robot, this.tick);

      // Handle task assignment for idle robots
      if (robot.status === "idle" && !robot.currentTaskId) {
        this.assignTaskToRobot(robot);
      }

      // Check battery
      if (robot.battery < this.config.lowBatteryThreshold && robot.status !== "charging") {
        this.sendRobotToCharge(robot);
      }

      // Handle replanning
      if (robot.isReplanning) {
        this.replanRobotPath(robot);
        robot.isReplanning = false;
      }

      // Update grid position
      this.grid.setRobotPosition(
        robot.id,
        Math.round(robot.position.x),
        Math.round(robot.position.y)
      );
    }
  }

  private assignTaskToRobot(robot: RobotState): void {
    const task = this.taskManager.findBestTask(robot, this.tick);
    if (!task) return;

    // Plan path from robot to task source
    const path = this.planPath(robot.position, task.source, robot.id);
    if (path.length === 0) return;

    // Assign task
    if (this.taskManager.assignTask(task.id, robot.id, this.tick)) {
      RobotController.assignTask(robot, task, path);

      // Continue path to destination after pickup
      if (task.type === "pickup" || task.type === "transport") {
        // Will be handled when robot reaches source
      }

      RobotController.addMemory(
        robot,
        this.tick,
        `Assigned task ${task.id} (${task.type})`,
        robot.position,
        "success"
      );
    }
  }

  private sendRobotToCharge(robot: RobotState): void {
    const station = this.grid.getAvailableChargingStation();
    if (!station) return;

    const path = this.planPath(robot.position, station, robot.id);
    if (path.length === 0) return;

    RobotController.setPath(robot, path);
    robot.destination = station;

    // Create recharge task
    const task = this.taskManager.createTask("recharge", robot.position, station, {
      priority: 10,
    });
    this.taskManager.assignTask(task.id, robot.id, this.tick);
    robot.currentTaskId = task.id;
  }

  private replanRobotPath(robot: RobotState): void {
    if (!robot.target && !robot.destination) return;

    const goal = robot.destination ?? robot.target;
    if (!goal) return;

    const path = this.planPath(robot.position, goal, robot.id);
    if (path.length > 0) {
      RobotController.setPath(robot, path);

      // Update task replan count
      if (robot.currentTaskId) {
        const task = this.taskManager.getTask(robot.currentTaskId);
        if (task) {
          task.replans++;
        }
      }
    }
  }

  // ─── Path Planning ───────────────────────────────────────────────

  private planPath(from: Point, to: Point, excludeRobotId?: string): Point[] {
    const grid = this.grid.createPathfinderGrid(excludeRobotId);
    let path = this.pathfinder.findPath(grid, from, to, { maxIterations: 5000 });

    if (path.length > 2) {
      path = this.pathfinder.smoothPath(grid, path);
    }

    return path;
  }

  // ─── Collision Detection ─────────────────────────────────────────

  private processCollisions(): void {
    for (const robot of this.robots.values()) {
      if (robot.status !== "moving") continue;

      // Check for potential collisions with nearby robots
      const nearby = this.grid.getRobotsNear(
        robot.position.x,
        robot.position.y,
        3
      );

      for (const other of nearby) {
        if (other.id === robot.id) continue;

        const otherRobot = this.robots.get(other.id);
        if (!otherRobot || otherRobot.status !== "moving") continue;

        // Predict collision
        if (this.predictCollision(robot, otherRobot)) {
          this.avoidCollision(robot, otherRobot);
          this.collisionAvoidances++;
        }
      }

      // Check if destination cell is occupied
      if (robot.target) {
        const targetCell = this.grid.getCell(
          Math.round(robot.target.x),
          Math.round(robot.target.y)
        );
        if (targetCell?.occupiedBy && targetCell.occupiedBy !== robot.id) {
          robot.status = "waiting";
          robot.waitTicks = 0;
        }
      }
    }
  }

  private predictCollision(a: RobotState, b: RobotState): boolean {
    if (!a.target || !b.target) return false;

    // Simple linear prediction
    const predictA = this.predictPosition(a, this.config.collisionPredictionWindow);
    const predictB = this.predictPosition(b, this.config.collisionPredictionWindow);

    const dx = predictA.x - predictB.x;
    const dy = predictA.y - predictB.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist < 1.5;
  }

  private predictPosition(robot: RobotState, ticks: number): Point {
    if (!robot.target) return robot.position;

    const dx = robot.target.x - robot.position.x;
    const dy = robot.target.y - robot.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return robot.position;

    const moveX = (dx / dist) * robot.speed * ticks;
    const moveY = (dy / dist) * robot.speed * ticks;

    return {
      x: robot.position.x + moveX,
      y: robot.position.y + moveY,
    };
  }

  private avoidCollision(a: RobotState, b: RobotState): void {
    // Determine priority (lower ID yields)
    const yielding = a.id > b.id ? a : b;

    yielding.status = "waiting";
    yielding.waitTicks = 0;

    // Communicate warning
    if (this.config.enableCommunication) {
      this.commHub.warnCollision(
        a,
        b.id,
        {
          x: (a.position.x + b.position.x) / 2,
          y: (a.position.y + b.position.y) / 2,
        },
        this.tick
      );
    }
  }

  // ─── Communication ───────────────────────────────────────────────

  private processCommunication(): void {
    const positions = new Map<string, Point>();
    for (const [id, robot] of this.robots) {
      positions.set(id, robot.position);
    }

    for (const robot of this.robots.values()) {
      if (robot.nearbyRobots.length === 0) continue;

      // Process incoming messages
      this.commHub.processIncoming(robot, this.tick);

      // Share knowledge periodically
      if (this.tick % 20 === 0 && robot.memory.length > 5) {
        const msgs = this.commHub.shareKnowledge(robot, positions, this.tick);
        this.messagesExchanged += msgs.length;
      }

      // Coordinate to avoid deadlocks
      if (robot.status === "moving" && robot.nearbyRobots.length > 1) {
        const msgs = this.commHub.coordinate(
          robot,
          robot.nearbyRobots,
          positions,
          this.tick
        );
        this.messagesExchanged += msgs.length;
      }
    }
  }

  // ─── Learning ────────────────────────────────────────────────────

  private processLearning(): void {
    for (const robot of this.robots.values()) {
      // Learn from congestion
      const congestion = this.grid.getCongestionAt(
        Math.round(robot.position.x),
        Math.round(robot.position.y)
      );
      this.learningEngine.learnCongestion(robot, robot.position, congestion);

      // Learn from task outcomes
      if (robot.tasksCompleted > 0 && this.tick % 50 === 0) {
        this.learningEngine.rewardTaskCompletion(
          robot,
          this.tick,
          robot.totalDistance
        );
      }

      // Learn energy patterns
      if (robot.currentTaskId) {
        const task = this.taskManager.getTask(robot.currentTaskId);
        if (task) {
          this.learningEngine.learnEnergyPattern(
            robot,
            task.type,
            100 - robot.battery
          );
        }
      }
    }

    // Decay exploration periodically
    if (this.tick % 500 === 0) {
      this.learningEngine.decayExploration();
    }
  }

  // ─── Evolution ───────────────────────────────────────────────────

  private processEvolution(): void {
    const robotArray = Array.from(this.robots.values());

    // Run one generation
    const newProfiles = this.evolutionEngine.evolveGeneration(robotArray);

    // Apply to robots
    this.evolutionEngine.applyStrategies(robotArray, newProfiles);
  }

  // ─── Task Spawning ───────────────────────────────────────────────

  private spawnTasks(): void {
    if (Math.random() > this.config.taskSpawnRate) return;

    const pendingCount = this.taskManager.getPendingCount();
    const inProgressCount = this.taskManager.getInProgressCount();

    if (pendingCount + inProgressCount >= this.config.maxConcurrentTasks) return;

    const spawnCount = Math.floor(Math.random() * 3) + 1;
    this.taskManager.spawnRandomTasks(
      spawnCount,
      this.walkablePositions,
      this.warehouseConfig.dropOffPoints.map(d => d.position),
      this.tick
    );
  }

  // ─── Metrics ─────────────────────────────────────────────────────

  private computeMetrics(): TickMetrics {
    const robotList = Array.from(this.robots.values());
    const activeRobots = robotList.filter(r => r.status !== "offline" && r.status !== "error").length;
    const idleRobots = robotList.filter(r => r.status === "idle").length;
    const chargingRobots = robotList.filter(r => r.status === "charging").length;
    const movingRobots = robotList.filter(r => r.status === "moving").length;
    const carryingRobots = robotList.filter(r => r.status === "carrying").length;

    const avgBattery = robotList.length > 0
      ? robotList.reduce((sum, r) => sum + r.battery, 0) / robotList.length
      : 0;

    const avgEfficiency = robotList.length > 0
      ? robotList.reduce((sum, r) => sum + r.efficiency, 0) / robotList.length
      : 0;

    const throughput = this.taskManager.getThroughput(this.tick);
    const pendingTasks = this.taskManager.getPendingCount();
    const inProgressTasks = this.taskManager.getInProgressCount();
    const totalCompleted = this.taskManager.totalCompleted;
    const totalFailed = this.taskManager.totalFailed;

    // Calculate average wait time
    const pendingTaskList = this.taskManager.getPendingTasks();
    const avgWaitTime = pendingTaskList.length > 0
      ? pendingTaskList.reduce((sum, t) => sum + t.waitTicks, 0) / pendingTaskList.length
      : 0;

    // Path efficiency (distance traveled vs optimal)
    const pathEfficiency = this.calculatePathEfficiency();

    // Cooperation index
    const cooperationIndex = robotList.length > 0
      ? robotList.reduce((sum, r) => sum + r.strategyProfile.cooperationBias, 0) / robotList.length
      : 0;

    return {
      tick: this.tick,
      activeRobots,
      idleRobots,
      chargingRobots,
      movingRobots,
      carryingRobots,
      totalTasksCompleted: totalCompleted,
      totalTasksFailed: totalFailed,
      pendingTasks,
      inProgressTasks,
      avgBattery,
      avgEfficiency,
      throughput,
      collisionAvoidances: this.collisionAvoidances,
      messagesExchanged: this.messagesExchanged,
      avgWaitTime,
      pathEfficiency,
      cooperationIndex,
      energyPerTask: totalCompleted > 0
        ? (100 - avgBattery) / totalCompleted
        : 0,
    };
  }

  private calculatePathEfficiency(): number {
    const completedTasks = this.taskManager.getCompletedTasks();
    if (completedTasks.length === 0) return 1;

    let totalRatio = 0;
    for (const task of completedTasks.slice(-20)) {
      const optimal = Math.sqrt(
        (task.destination.x - task.source.x) ** 2 +
        (task.destination.y - task.source.y) ** 2
      );
      const actual = task.pathTaken.length;
      if (optimal > 0) {
        totalRatio += Math.min(1, optimal / Math.max(actual, 1));
      }
    }

    return totalRatio / Math.min(completedTasks.length, 20);
  }

  // ─── Snapshot ────────────────────────────────────────────────────

  private createSnapshot(metrics: TickMetrics): SimulationSnapshot {
    const robotSnapshots: RobotSnapshot[] = [];
    for (const robot of this.robots.values()) {
      robotSnapshots.push({
        id: robot.id,
        name: robot.name,
        status: robot.status,
        position: { ...robot.position },
        target: robot.target ? { ...robot.target } : null,
        battery: robot.battery,
        speed: robot.speed,
        currentPayload: robot.currentPayload,
        carryingItem: robot.carryingItem,
        currentTaskId: robot.currentTaskId,
        efficiency: robot.efficiency,
        generation: robot.generation,
        fitness: robot.fitness,
        memorySize: robot.memory.length,
        pathLength: robot.path.length - robot.pathIndex,
        nearbyRobots: robot.nearbyRobots.length,
      });
    }

    const taskSnapshots: TaskSnapshot[] = this.taskManager
      .getActiveTasks()
      .concat(this.taskManager.getPendingTasks().slice(0, 20))
      .map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        priority: t.priority,
        source: t.source,
        destination: t.destination,
        assignedRobotId: t.assignedRobotId,
        progress: t.startedTick ? Math.min(1, (this.tick - t.startedTick) / (t.estimatedDuration || 100)) : 0,
      }));

    return {
      tick: this.tick,
      status: this.status,
      robots: robotSnapshots,
      tasks: taskSnapshots,
      metrics,
      messages: this.commHub.getRecentMessages(20),
    };
  }

  // ─── Public API ──────────────────────────────────────────────────

  getSnapshot(): SimulationSnapshot {
    const metrics = this.metrics[this.metrics.length - 1] ?? this.computeMetrics();
    return this.createSnapshot(metrics);
  }

  getRobots(): RobotState[] {
    return Array.from(this.robots.values());
  }

  getRobot(id: string): RobotState | undefined {
    return this.robots.get(id);
  }

  getTasks(): Task[] {
    return this.taskManager.getAllTasks();
  }

  getMetricsHistory(): TickMetrics[] {
    return [...this.metrics];
  }

  getStatus(): string {
    return this.status;
  }

  getCurrentTick(): number {
    return this.tick;
  }

  getWarehouseConfig(): WarehouseConfig {
    return { ...this.warehouseConfig };
  }

  getGrid(): WarehouseGrid {
    return this.grid;
  }

  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  getEvolutionStats(): Record<string, number> {
    return this.evolutionEngine.getStats();
  }

  getLearningStats(): Record<string, number> {
    return this.learningEngine.getStats();
  }

  getGenerationHistory() {
    return this.evolutionEngine.getGenerationHistory();
  }

  // Control individual robot
  setRobotSpeed(robotId: string, speed: number): boolean {
    const robot = this.robots.get(robotId);
    if (!robot) return false;
    robot.maxSpeed = Math.max(0.1, Math.min(3, speed));
    return true;
  }

  setRobotStrategy(robotId: string, strategy: Partial<RobotState["strategyProfile"]>): boolean {
    const robot = this.robots.get(robotId);
    if (!robot) return false;
    robot.strategyProfile = { ...robot.strategyProfile, ...strategy };
    return true;
  }

  getStats(): Record<string, unknown> {
    return {
      tick: this.tick,
      status: this.status,
      robotCount: this.robots.size,
      taskStats: {
        created: this.taskManager.totalCreated,
        completed: this.taskManager.totalCompleted,
        failed: this.taskManager.totalFailed,
        pending: this.taskManager.getPendingCount(),
      },
      evolution: this.evolutionEngine.getStats(),
      learning: this.learningEngine.getStats(),
      communication: this.commHub.getStats(),
      grid: {
        width: this.warehouseConfig.width,
        height: this.warehouseConfig.height,
        walkableCells: this.grid.getWalkableCount(),
      },
    };
  }

  reset(): void {
    this.stop();
    this.tick = 0;
    this.metrics = [];
    this.collisionAvoidances = 0;
    this.messagesExchanged = 0;
    this.robots.clear();
    this.taskManager.reset();
    this.commHub.reset();
    this.learningEngine.reset();
    this.evolutionEngine.reset();
    this.initialize();
  }
}
