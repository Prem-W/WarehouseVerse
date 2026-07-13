/**
 * Evolution Engine
 * 
 * Implements genetic algorithm for robot strategy optimization:
 * - Fitness evaluation based on task performance, energy efficiency, cooperation
 * - Selection: tournament selection with configurable pressure
 * - Crossover: weighted average of parent strategies
 * - Mutation: Gaussian perturbation with configurable rate
 * - Diversity maintenance to prevent premature convergence
 * - Elitism: preserve top performers across generations
 */

import type { RobotState, StrategyProfile, GenerationData } from "./types";
import { RobotController } from "./robot";

// ─── GA Parameters ─────────────────────────────────────────────────
const DEFAULT_MUTATION_RATE = 0.15;
const DEFAULT_SELECTION_PRESSURE = 2.0;
const TOURNAMENT_SIZE = 3;
const ELITE_FRACTION = 0.15;
const MIN_DIVERSITY_THRESHOLD = 0.2;

/**
 * Evolution Engine for genetic optimization of robot strategies
 */
export class EvolutionEngine {
  private mutationRate: number;
  private selectionPressure: number;
  private generationCount = 0;
  private generationHistory: GenerationData[] = [];
  private populationFitness: Map<string, number> = new Map();

  // Statistics
  totalGenerations = 0;
  bestFitnessEver = 0;
  avgDiversity = 0;

  constructor(options: {
    mutationRate?: number;
    selectionPressure?: number;
  } = {}) {
    this.mutationRate = options.mutationRate ?? DEFAULT_MUTATION_RATE;
    this.selectionPressure = options.selectionPressure ?? DEFAULT_SELECTION_PRESSURE;
  }

  /**
   * Evaluate fitness for all robots in the population
   */
  evaluateFitness(robots: RobotState[]): Map<string, number> {
    const fitnessMap = new Map<string, number>();

    for (const robot of robots) {
      const fitness = RobotController.calculateFitness(robot);
      fitnessMap.set(robot.id, fitness);
      this.populationFitness.set(robot.id, fitness);

      if (fitness > this.bestFitnessEver) {
        this.bestFitnessEver = fitness;
      }
    }

    return fitnessMap;
  }

  /**
   * Run one generation of evolution
   * Returns the new generation of strategy profiles
   */
  evolveGeneration(robots: RobotState[]): Map<string, StrategyProfile> {
    this.generationCount++;
    this.totalGenerations++;

    // Step 1: Evaluate fitness
    const fitnessMap = this.evaluateFitness(robots);

    // Step 2: Calculate population statistics
    const fitnesses = Array.from(fitnessMap.values());
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const maxFitness = Math.max(...fitnesses);
    const minFitness = Math.min(...fitnesses);

    // Step 3: Measure diversity
    const diversity = this.calculateDiversity(robots);
    this.avgDiversity = diversity;

    // Step 4: Adapt mutation rate based on diversity
    const adaptiveMutationRate = this.adaptMutationRate(diversity);

    // Step 5: Record generation data
    const topRobots = this.getTopRobots(robots, fitnessMap, 5);
    const generationData: GenerationData = {
      generation: this.generationCount,
      avgFitness,
      maxFitness,
      minFitness,
      diversity,
      mutationRate: adaptiveMutationRate,
      selectionPressure: this.selectionPressure,
      topStrategies: topRobots.map(r => ({
        profile: { ...r.strategyProfile },
        fitness: fitnessMap.get(r.id) ?? 0,
        robotId: r.id,
      })),
    };
    this.generationHistory.push(generationData);

    // Step 6: Create new generation
    const newProfiles = new Map<string, StrategyProfile>();
    const sortedRobots = [...robots].sort(
      (a, b) => (fitnessMap.get(b.id) ?? 0) - (fitnessMap.get(a.id) ?? 0)
    );

    // Elitism: keep top performers unchanged
    const eliteCount = Math.max(1, Math.floor(robots.length * ELITE_FRACTION));
    const elites = sortedRobots.slice(0, eliteCount);

    for (const elite of elites) {
      newProfiles.set(elite.id, { ...elite.strategyProfile });
    }

    // Generate offspring for the rest
    for (let i = eliteCount; i < robots.length; i++) {
      const robot = sortedRobots[i];

      // Tournament selection
      const parent1 = this.tournamentSelect(sortedRobots, fitnessMap);
      const parent2 = this.tournamentSelect(sortedRobots, fitnessMap);

      // Crossover
      let offspringProfile = RobotController.crossoverStrategy(
        parent1.strategyProfile,
        parent2.strategyProfile
      );

      // Mutation
      this.mutateStrategy(offspringProfile, adaptiveMutationRate);

      newProfiles.set(robot.id, offspringProfile);
    }

    return newProfiles;
  }

  /**
   * Apply evolved strategies to robots
   */
  applyStrategies(robots: RobotState[], profiles: Map<string, StrategyProfile>): void {
    for (const robot of robots) {
      const newProfile = profiles.get(robot.id);
      if (newProfile) {
        robot.strategyProfile = newProfile;
        robot.generation = this.generationCount;
      }
    }
  }

  /**
   * Tournament selection
   */
  private tournamentSelect(
    robots: RobotState[],
    fitnessMap: Map<string, number>
  ): RobotState {
    const tournament: RobotState[] = [];
    for (let i = 0; i < TOURNAMENT_SIZE; i++) {
      tournament.push(robots[Math.floor(Math.random() * robots.length)]);
    }

    // Selection pressure: higher pressure favors better individuals
    tournament.sort((a, b) => {
      const diff = (fitnessMap.get(b.id) ?? 0) - (fitnessMap.get(a.id) ?? 0);
      return diff;
    });

    // Probabilistic selection based on rank
    const rand = Math.random();
    const selectIdx = Math.floor(
      Math.pow(rand, this.selectionPressure) * tournament.length
    );

    return tournament[Math.min(selectIdx, tournament.length - 1)];
  }

  /**
   * Mutate a strategy profile with Gaussian noise
   */
  private mutateStrategy(profile: StrategyProfile, rate: number): void {
    const keys = Object.keys(profile) as (keyof StrategyProfile)[];

    for (const key of keys) {
      if (Math.random() < rate) {
        // Gaussian mutation (Box-Muller transform)
        const u1 = Math.random();
        const u2 = Math.random();
        const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

        const delta = gaussian * 0.15; // Standard deviation
        profile[key] = Math.max(0.05, Math.min(0.95, profile[key] + delta));
      }
    }
  }

  /**
   * Calculate population diversity (average pairwise distance)
   */
  private calculateDiversity(robots: RobotState[]): number {
    if (robots.length <= 1) return 1;

    const profiles = robots.map(r => [
      r.strategyProfile.explorationRate,
      r.strategyProfile.cooperationBias,
      r.strategyProfile.riskTolerance,
      r.strategyProfile.speedPreference,
      r.strategyProfile.energyAwareness,
    ]);

    let totalDistance = 0;
    let comparisons = 0;

    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const dist = this.euclideanDistance(profiles[i], profiles[j]);
        totalDistance += dist;
        comparisons++;
      }
    }

    // Normalize by max possible distance (sqrt(5) for 5D unit hypercube)
    const maxDist = Math.sqrt(5);
    return comparisons > 0
      ? Math.min(1, (totalDistance / comparisons) / (maxDist * 0.5))
      : 0;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  /**
   * Adapt mutation rate based on population diversity
   * High diversity -> lower mutation (explore current solutions)
   * Low diversity -> higher mutation (explore new solutions)
   */
  private adaptMutationRate(diversity: number): number {
    if (diversity < MIN_DIVERSITY_THRESHOLD) {
      // Low diversity: increase mutation to escape local optima
      return Math.min(0.4, this.mutationRate * 1.5);
    }
    if (diversity > 0.6) {
      // High diversity: decrease mutation to exploit good solutions
      return Math.max(0.05, this.mutationRate * 0.7);
    }
    return this.mutationRate;
  }

  /**
   * Get top N robots by fitness
   */
  private getTopRobots(
    robots: RobotState[],
    fitnessMap: Map<string, number>,
    n: number
  ): RobotState[] {
    return [...robots]
      .sort((a, b) => (fitnessMap.get(b.id) ?? 0) - (fitnessMap.get(a.id) ?? 0))
      .slice(0, n);
  }

  /**
   * Get generation history
   */
  getGenerationHistory(): GenerationData[] {
    return [...this.generationHistory];
  }

  /**
   * Get latest generation data
   */
  getLatestGeneration(): GenerationData | null {
    return this.generationHistory[this.generationHistory.length - 1] ?? null;
  }

  /**
   * Get evolution statistics
   */
  getStats(): Record<string, number> {
    return {
      totalGenerations: this.totalGenerations,
      bestFitnessEver: this.bestFitnessEver,
      avgDiversity: this.avgDiversity,
      currentMutationRate: this.mutationRate,
      generationHistorySize: this.generationHistory.length,
    };
  }

  /**
   * Get fitness distribution
   */
  getFitnessDistribution(bins: number = 10): number[] {
    const fitnesses = Array.from(this.populationFitness.values());
    if (fitnesses.length === 0) return new Array(bins).fill(0);

    const min = Math.min(...fitnesses);
    const max = Math.max(...fitnesses);
    const range = max - min || 1;

    const distribution = new Array(bins).fill(0);
    for (const f of fitnesses) {
      const bin = Math.min(bins - 1, Math.floor(((f - min) / range) * bins));
      distribution[bin]++;
    }

    return distribution;
  }

  reset(): void {
    this.generationCount = 0;
    this.generationHistory = [];
    this.populationFitness.clear();
    this.totalGenerations = 0;
    this.bestFitnessEver = 0;
    this.avgDiversity = 0;
  }
}
