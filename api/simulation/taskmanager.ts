/**
 * Dynamic Task Manager
 * 
 * Features:
 * - Priority queue-based task scheduling (O(log n))
 * - Dynamic task assignment based on robot proximity, capability, and battery
 * - Task rebalancing when robots fail or get stuck
 * - Adaptive priority based on wait time and deadline proximity
 * - Support for pickup/delivery chains
 */

import type { Task, TaskType, RobotState, Point } from "./types";

// ─── Task ID Generator ─────────────────────────────────────────────
let taskCounter = 0;
export function generateTaskId(): string {
  taskCounter++;
  return `T-${String(taskCounter).padStart(5, "0")}`;
}

/**
 * Priority queue entry for task scheduling
 */
interface QueueEntry {
  task: Task;
  priority: number; // computed priority (higher = more urgent)
  insertOrder: number;
}

/**
 * Dynamic Task Manager
 * Uses a binary heap priority queue for efficient O(log n) operations
 */
export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private pendingQueue: QueueEntry[] = [];
  private pendingSet: Set<string> = new Set();
  private insertCounter = 0;

  // Metrics
  totalCreated = 0;
  totalCompleted = 0;
  totalFailed = 0;

  // ─── Task Creation ───────────────────────────────────────────────

  createTask(
    type: TaskType,
    source: Point,
    destination: Point,
    options: {
      priority?: number;
      itemId?: string;
      itemWeight?: number;
      deadline?: number;
    } = {}
  ): Task {
    const task: Task = {
      id: generateTaskId(),
      type,
      status: "pending",
      priority: options.priority ?? this.randomPriority(),
      source,
      destination,
      itemId: options.itemId ?? null,
      itemWeight: options.itemWeight ?? 0,
      assignedRobotId: null,
      estimatedDuration: this.estimateDuration(source, destination),
      actualDuration: 0,
      deadline: options.deadline ?? null,
      createdTick: 0, // Will be set by simulation
      startedTick: null,
      completedTick: null,
      pathTaken: [],
      replans: 0,
      waitTicks: 0,
    };

    this.tasks.set(task.id, task);
    this.enqueue(task);
    this.totalCreated++;

    return task;
  }

  /**
   * Spawn random tasks for the warehouse
   */
  spawnRandomTasks(
    count: number,
    walkablePositions: Point[],
    dropOffPoints: Point[],
    currentTick: number
  ): Task[] {
    const newTasks: Task[] = [];
    const types: TaskType[] = ["pickup", "delivery", "transport"];

    for (let i = 0; i < count && walkablePositions.length >= 2; i++) {
      const type = types[Math.floor(Math.random() * types.length)];

      let source: Point;
      let destination: Point;

      if (type === "delivery" && dropOffPoints.length > 0) {
        source = this.randomPick(walkablePositions);
        destination = this.randomPick(dropOffPoints);
      } else if (type === "pickup" && dropOffPoints.length > 0) {
        source = this.randomPick(dropOffPoints);
        destination = this.randomPick(walkablePositions);
      } else {
        source = this.randomPick(walkablePositions);
        destination = this.randomPick(walkablePositions);
        // Ensure different positions
        if (source.x === destination.x && source.y === destination.y) {
          destination = this.randomPick(walkablePositions);
        }
      }

      const task = this.createTask(type, source, destination, {
        priority: Math.floor(Math.random() * 8) + 2,
        itemId: `ITEM-${Math.floor(Math.random() * 10000)}`,
        itemWeight: Math.random() * 30 + 5,
        deadline: currentTick + 500 + Math.floor(Math.random() * 1000),
      });

      task.createdTick = currentTick;
      newTasks.push(task);
    }

    return newTasks;
  }

  // ─── Task Assignment ─────────────────────────────────────────────

  /**
   * Find the best task for a given robot using multi-criteria scoring
   * Returns null if no suitable task available
   */
  findBestTask(robot: RobotState, currentTick: number): Task | null {
    if (this.pendingQueue.length === 0) return null;

    let bestTask: Task | null = null;
    let bestScore = -Infinity;

    // Check top N tasks from the queue for efficiency
    const candidates = this.peekTop(Math.min(this.pendingQueue.length, 20));

    for (const entry of candidates) {
      const task = entry.task;

      // Skip if robot can't handle the payload
      if (task.itemWeight && task.itemWeight > robot.maxPayload) continue;

      // Calculate assignment score
      const score = this.scoreAssignment(robot, task, currentTick);

      if (score > bestScore) {
        bestScore = score;
        bestTask = task;
      }
    }

    return bestTask;
  }

  /**
   * Score a robot-task assignment using multiple criteria
   */
  private scoreAssignment(robot: RobotState, task: Task, currentTick: number): number {
    const dx = task.source.x - robot.position.x;
    const dy = task.source.y - robot.position.y;
    const distanceToTask = Math.sqrt(dx * dx + dy * dy);

    const taskDx = task.destination.x - task.source.x;
    const taskDy = task.destination.y - task.source.y;
    const taskDistance = Math.sqrt(taskDx * taskDx + taskDy * taskDy);

    // Proximity score (closer is better) - exponential decay
    const proximityScore = 100 * Math.exp(-distanceToTask * 0.1);

    // Task priority score
    const priorityScore = task.priority * 10;

    // Battery adequacy - can robot complete and return?
    const estimatedBatteryNeeded = (distanceToTask + taskDistance) * 0.12;
    const batteryScore = robot.battery > estimatedBatteryNeeded + 20
      ? 50
      : Math.max(0, robot.battery - estimatedBatteryNeeded);

    // Efficiency match - robots good at the task type
    const efficiencyScore = robot.efficiency * 30;

    // Deadline urgency
    let deadlineScore = 0;
    if (task.deadline) {
      const ticksRemaining = task.deadline - currentTick;
      if (ticksRemaining <= 0) {
        deadlineScore = -1000; // Overdue
      } else {
        deadlineScore = Math.max(0, 100 - ticksRemaining * 0.1);
      }
    }

    // Wait penalty - tasks waiting too long get boosted
    const waitScore = task.waitTicks * 0.5;

    // Strategy-based preferences
    const explorationBonus = robot.strategyProfile.explorationRate * 10;
    const speedBonus = robot.strategyProfile.speedPreference * 5;

    return proximityScore + priorityScore + batteryScore + efficiencyScore +
           deadlineScore + waitScore + explorationBonus + speedBonus;
  }

  /**
   * Assign a task to a robot
   */
  assignTask(taskId: string, robotId: string, currentTick: number): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "pending") return false;

    task.assignedRobotId = robotId;
    task.status = "assigned";
    task.startedTick = currentTick;

    // Remove from pending queue
    this.removeFromPending(taskId);

    return true;
  }

  /**
   * Mark task as in progress
   */
  startTask(taskId: string, currentTick: number): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "assigned") return false;

    task.status = "in_progress";
    if (task.startedTick === null) {
      task.startedTick = currentTick;
    }

    return true;
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, currentTick: number): Task | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "in_progress") return null;

    task.status = "completed";
    task.completedTick = currentTick;
    task.actualDuration = currentTick - (task.startedTick ?? task.createdTick);

    this.totalCompleted++;
    return task;
  }

  /**
   * Fail a task - returns it to pending for reassignment
   */
  failTask(taskId: string, _currentTick: number): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = "failed";
    task.assignedRobotId = null;
    this.totalFailed++;

    // Re-queue with higher priority after a delay
    setTimeout(() => {
      task.status = "pending";
      task.priority = Math.min(10, task.priority + 1);
      task.waitTicks = 0;
      this.enqueue(task);
    }, 100);

    return true;
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = "cancelled";
    this.removeFromPending(taskId);
    return true;
  }

  /**
   * Update task progress (called each tick)
   */
  tickTasks(currentTick: number): void {
    for (const task of this.tasks.values()) {
      if (task.status === "pending") {
        task.waitTicks++;
        // Increase priority for tasks waiting too long
        if (task.waitTicks > 100 && task.priority < 10) {
          task.priority = Math.min(10, task.priority + 1);
          // Re-sort queue
          if (this.pendingSet.has(task.id)) {
            this.removeFromPending(task.id);
            this.enqueue(task);
          }
        }
      }

      // Check deadline
      if (task.deadline && task.status === "in_progress" && currentTick > task.deadline) {
        // Still try to complete, but mark as late
      }
    }
  }

  // ─── Queue Operations ────────────────────────────────────────────

  private enqueue(task: Task): void {
    if (task.status !== "pending") return;
    if (this.pendingSet.has(task.id)) return;

    const entry: QueueEntry = {
      task,
      priority: this.computeDynamicPriority(task),
      insertOrder: this.insertCounter++,
    };

    this.pendingSet.add(task.id);
    this.pendingQueue.push(entry);
    this.siftUp(this.pendingQueue.length - 1);
  }

  private peekTop(n: number): QueueEntry[] {
    // Create a copy and return top N (without removing)
    const sorted = [...this.pendingQueue].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.insertOrder - b.insertOrder;
    });
    return sorted.slice(0, n);
  }

  private computeDynamicPriority(task: Task): number {
    let score = task.priority * 100;

    // Boost tasks waiting longer
    score += task.waitTicks * 0.5;

    // Urgent deadlines
    if (task.deadline) {
      const urgency = Math.max(0, 500 - task.waitTicks);
      score += urgency * 0.1;
    }

    return score;
  }

  // ─── Binary Heap Operations ──────────────────────────────────────

  private siftUp(i: number): void {
    const entry = this.pendingQueue[i];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const parentEntry = this.pendingQueue[parent];
      if (
        entry.priority < parentEntry.priority ||
        (entry.priority === parentEntry.priority && entry.insertOrder > parentEntry.insertOrder)
      ) {
        break;
      }
      this.pendingQueue[i] = parentEntry;
      i = parent;
    }
    this.pendingQueue[i] = entry;
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private removeFromPending(taskId: string): void {
    this.pendingSet.delete(taskId);
    // Rebuild heap to maintain invariant
    const filtered = this.pendingQueue.filter(e => e.task.id !== taskId);
    this.pendingQueue = [];
    for (const entry of filtered) {
      this.pendingQueue.push(entry);
      this.siftUp(this.pendingQueue.length - 1);
    }
  }

  private estimateDuration(source: Point, destination: Point): number {
    const dx = destination.x - source.x;
    const dy = destination.y - source.y;
    return Math.ceil(Math.sqrt(dx * dx + dy * dy) * 1.5);
  }

  private randomPriority(): number {
    return Math.floor(Math.random() * 7) + 3;
  }

  private randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ─── Queries ─────────────────────────────────────────────────────

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getPendingTasks(): Task[] {
    return this.peekTop(this.pendingQueue.length).map(e => e.task);
  }

  getActiveTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(
      t => t.status === "in_progress" || t.status === "assigned"
    );
  }

  getCompletedTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === "completed");
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getPendingCount(): number {
    return this.pendingQueue.length;
  }

  getInProgressCount(): number {
    return Array.from(this.tasks.values()).filter(t => t.status === "in_progress").length;
  }

  /**
   * Get throughput metric (tasks per 100 ticks)
   */
  getThroughput(currentTick: number): number {
    if (currentTick === 0) return 0;
    return (this.totalCompleted / currentTick) * 100;
  }

  /**
   * Clean up old completed tasks to manage memory
   */
  cleanupOldTasks(keepCount: number = 500): void {
    const completed = Array.from(this.tasks.values())
      .filter(t => t.status === "completed" || t.status === "cancelled")
      .sort((a, b) => (b.completedTick ?? 0) - (a.completedTick ?? 0));

    if (completed.length > keepCount) {
      const toRemove = completed.slice(keepCount);
      for (const task of toRemove) {
        this.tasks.delete(task.id);
      }
    }
  }

  reset(): void {
    this.tasks.clear();
    this.pendingQueue = [];
    this.pendingSet.clear();
    this.totalCreated = 0;
    this.totalCompleted = 0;
    this.totalFailed = 0;
    taskCounter = 0;
  }
}
