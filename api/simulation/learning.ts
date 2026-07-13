/**
 * Learning Engine
 * 
 * Implements reinforcement learning-inspired behavior adaptation:
 * - Q-value updates based on task outcomes
 * - Zone congestion learning
 * - Path preference learning through experience
 * - Cooperative behavior emergence
 * - Adaptive strategy tuning
 */

import type { RobotState, KnowledgeEntry, Point } from "./types";

// ─── Q-Learning Parameters ─────────────────────────────────────────
const LEARNING_RATE = 0.15;
const DISCOUNT_FACTOR = 0.85;
const EXPLORATION_DECAY = 0.995;
const MIN_EXPLORATION = 0.05;

/**
 * Learning Engine manages robot adaptation
 */
export class LearningEngine {
  private qTable: Map<string, Map<string, number>> = new Map();
  private globalKnowledge: Map<string, KnowledgeEntry> = new Map();
  private explorationRates: Map<string, number> = new Map();

  // Statistics
  learningUpdates = 0;
  knowledgeTransfers = 0;

  /**
   * Initialize learning state for a robot
   */
  initializeRobot(robot: RobotState): void {
    const stateMap = new Map<string, number>();
    this.qTable.set(robot.id, stateMap);
    this.explorationRates.set(robot.id, 0.3);

    // Initialize default Q-values
    stateMap.set("idle_high_battery", 0.5);
    stateMap.set("idle_low_battery", -0.5);
    stateMap.set("move_clear", 0.3);
    stateMap.set("move_congested", -0.3);
    stateMap.set("task_nearby", 0.8);
    stateMap.set("task_far", -0.2);
    stateMap.set("charge_needed", -0.5);
    stateMap.set("charge_full", -0.8);
    stateMap.set("cooperate_yes", 0.4);
    stateMap.set("cooperate_no", 0.1);
  }

  /**
   * Select action using epsilon-greedy policy
   */
  selectAction(robot: RobotState, state: string, actions: string[]): string {
    const qValues = this.qTable.get(robot.id);
    const epsilon = this.explorationRates.get(robot.id) ?? 0.2;

    // Exploration: try random action
    if (Math.random() < epsilon * robot.strategyProfile.explorationRate) {
      return actions[Math.floor(Math.random() * actions.length)];
    }

    // Exploitation: choose best known action
    let bestAction = actions[0];
    let bestValue = -Infinity;

    for (const action of actions) {
      const key = `${state}_${action}`;
      const value = qValues?.get(key) ?? 0;
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Update Q-value based on experience
   */
  updateQValue(
    robot: RobotState,
    state: string,
    action: string,
    reward: number,
    nextState: string,
    nextActions: string[]
  ): void {
    const qValues = this.qTable.get(robot.id);
    if (!qValues) return;

    const key = `${state}_${action}`;
    const currentQ = qValues.get(key) ?? 0;

    // Calculate max Q-value for next state
    let maxNextQ = 0;
    if (nextActions.length > 0) {
      maxNextQ = Math.max(
        ...nextActions.map(a => qValues.get(`${nextState}_${a}`) ?? 0)
      );
    }

    // Q-learning update rule
    const newQ = currentQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - currentQ);
    qValues.set(key, Math.max(-1, Math.min(1, newQ)));

    this.learningUpdates++;
  }

  /**
   * Reward a robot for successful task completion
   */
  rewardTaskCompletion(robot: RobotState, taskDuration: number, pathLength: number): void {
    const efficiency = 1 / (1 + taskDuration * 0.01 + pathLength * 0.005);
    const reward = 0.5 + efficiency * 0.5;

    this.updateQValue(
      robot,
      "task_nearby",
      "accept",
      reward,
      "task_completed",
      ["seek_next", "rest"]
    );

    // Boost exploration rate slightly on success
    const currentExploration = this.explorationRates.get(robot.id) ?? 0.2;
    this.explorationRates.set(robot.id, Math.min(0.5, currentExploration + 0.02));
  }

  /**
   * Penalize for task failure
   */
  penalizeFailure(robot: RobotState, reason: string): void {
    let penalty = -0.3;

    if (reason === "battery") penalty = -0.6;
    if (reason === "collision") penalty = -0.4;
    if (reason === "stuck") penalty = -0.3;

    this.updateQValue(
      robot,
      "task_nearby",
      "accept",
      penalty,
      "task_failed",
      ["retry", "abandon", "seek_help"]
    );

    // Reduce exploration rate on failure (be more conservative)
    const currentExploration = this.explorationRates.get(robot.id) ?? 0.2;
    this.explorationRates.set(robot.id, Math.max(MIN_EXPLORATION, currentExploration * 0.95));
  }

  /**
   * Learn from zone congestion
   */
  learnCongestion(robot: RobotState, position: Point, congestionLevel: number): void {
    const zoneKey = `zone_${Math.floor(position.x / 10)}_${Math.floor(position.y / 10)}`;
    const currentVal = robot.learnedWeights.get(zoneKey) ?? 0.5;

    // Update with moving average
    const newVal = currentVal * 0.9 + congestionLevel * 0.1;
    robot.learnedWeights.set(zoneKey, newVal);

    // Also store in global knowledge
    this.globalKnowledge.set(`${robot.id}_${zoneKey}`, {
      robotId: robot.id,
      type: "zone_congestion",
      key: zoneKey,
      value: newVal,
      confidence: 0.6,
      tick: 0,
      useCount: 0,
    });
  }

  /**
   * Learn path preference
   */
  learnPathPreference(
    robot: RobotState,
    from: Point,
    to: Point,
    success: boolean,
    duration: number
  ): void {
    const pathKey = `path_${Math.floor(from.x)}_${Math.floor(from.y)}_${Math.floor(to.x)}_${Math.floor(to.y)}`;
    const currentVal = robot.learnedWeights.get(pathKey) ?? 0.5;

    const outcome = success ? 1 : 0;
    const timeFactor = Math.max(0, 1 - duration * 0.002);
    const newVal = currentVal * 0.7 + (outcome * 0.5 + timeFactor * 0.5) * 0.3;

    robot.learnedWeights.set(pathKey, Math.max(0, Math.min(1, newVal)));
  }

  /**
   * Learn energy patterns
   */
  learnEnergyPattern(robot: RobotState, taskType: string, batteryDrain: number): void {
    const energyKey = `energy_${taskType}`;
    const currentVal = robot.learnedWeights.get(energyKey) ?? 0.5;
    const normalizedDrain = Math.min(1, batteryDrain / 50); // Normalize

    const newVal = currentVal * 0.8 + normalizedDrain * 0.2;
    robot.learnedWeights.set(energyKey, newVal);

    // Adjust energy awareness strategy
    if (normalizedDrain > 0.7) {
      robot.strategyProfile.energyAwareness = Math.min(1, robot.strategyProfile.energyAwareness + 0.05);
    }
  }

  /**
   * Learn cooperation effectiveness
   */
  learnCooperation(robot: RobotState, helpedRobotId: string, success: boolean): void {
    const coopKey = `coop_${helpedRobotId}`;
    const currentVal = robot.learnedWeights.get(coopKey) ?? 0.5;

    const reward = success ? 0.3 : -0.1;
    const newVal = currentVal + reward;
    robot.learnedWeights.set(coopKey, Math.max(0, Math.min(1, newVal)));

    // Adjust cooperation bias
    if (success) {
      robot.strategyProfile.cooperationBias = Math.min(1, robot.strategyProfile.cooperationBias + 0.02);
    }
  }

  /**
   * Get learned congestion for a zone
   */
  getLearnedCongestion(robot: RobotState, position: Point): number {
    const zoneKey = `zone_${Math.floor(position.x / 10)}_${Math.floor(position.y / 10)}`;
    return robot.learnedWeights.get(zoneKey) ?? 0.5;
  }

  /**
   * Get learned path quality
   */
  getPathQuality(robot: RobotState, from: Point, to: Point): number {
    const pathKey = `path_${Math.floor(from.x)}_${Math.floor(from.y)}_${Math.floor(to.x)}_${Math.floor(to.y)}`;
    return robot.learnedWeights.get(pathKey) ?? 0.5;
  }

  /**
   * Get Q-value for a state-action pair
   */
  getQValue(robot: RobotState, state: string, action: string): number {
    const qValues = this.qTable.get(robot.id);
    if (!qValues) return 0;
    return qValues.get(`${state}_${action}`) ?? 0;
  }

  /**
   * Get exploration rate for a robot
   */
  getExplorationRate(robot: RobotState): number {
    return this.explorationRates.get(robot.id) ?? 0.2;
  }

  /**
   * Decay all exploration rates (called each generation)
   */
  decayExploration(): void {
    for (const [robotId, rate] of this.explorationRates) {
      this.explorationRates.set(robotId, Math.max(MIN_EXPLORATION, rate * EXPLORATION_DECAY));
    }
  }

  /**
   * Get learning statistics
   */
  getStats(): Record<string, number> {
    return {
      learningUpdates: this.learningUpdates,
      knowledgeTransfers: this.knowledgeTransfers,
      globalKnowledgeSize: this.globalKnowledge.size,
      avgExplorationRate: this.getAverageExplorationRate(),
    };
  }

  private getAverageExplorationRate(): number {
    if (this.explorationRates.size === 0) return 0;
    let sum = 0;
    for (const rate of this.explorationRates.values()) {
      sum += rate;
    }
    return sum / this.explorationRates.size;
  }

  /**
   * Get all Q-values for a robot (for inspection)
   */
  getRobotQValues(robotId: string): Record<string, number> {
    const qValues = this.qTable.get(robotId);
    if (!qValues) return {};

    const result: Record<string, number> = {};
    for (const [key, value] of qValues) {
      result[key] = value;
    }
    return result;
  }

  reset(): void {
    this.qTable.clear();
    this.globalKnowledge.clear();
    this.explorationRates.clear();
    this.learningUpdates = 0;
    this.knowledgeTransfers = 0;
  }
}
