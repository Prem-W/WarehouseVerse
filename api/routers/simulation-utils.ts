/**
 * Shared simulation engine instance
 * All routers access the same singleton simulation engine
 */

import { SimulationEngine } from "../simulation/engine";
import type { SimulationConfig } from "@contracts/types";

let engine: SimulationEngine | null = null;

export function getEngine(): SimulationEngine {
  if (!engine) {
    engine = new SimulationEngine();
    engine.initialize();
  }
  return engine;
}

export function resetEngine(config?: Partial<SimulationConfig>): SimulationEngine {
  if (engine) {
    engine.reset();
  }
  engine = new SimulationEngine(config);
  engine.initialize();
  return engine;
}

export function setEngine(newEngine: SimulationEngine): void {
  engine = newEngine;
}
