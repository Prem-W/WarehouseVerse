/**
 * Simulation Router
 * Controls the EvoTwin simulation engine - start, stop, pause, configure
 */

import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { simulationConfigSchema } from "@contracts/types";
import { getEngine, resetEngine } from "./simulation-utils";

export const simulationRouter = createRouter({
  // ─── Control ─────────────────────────────────────────────────────

  start: publicQuery
    .input(z.object({
      config: simulationConfigSchema.partial().optional(),
    }).optional())
    .mutation(({ input }) => {
      if (input?.config) {
        resetEngine(input.config);
      }

      getEngine().start();

      return { status: "running", tick: getEngine().getCurrentTick() };
    }),

  pause: publicQuery
    .mutation(() => {
      getEngine().pause();
      return { status: "paused", tick: getEngine().getCurrentTick() };
    }),

  resume: publicQuery
    .mutation(() => {
      getEngine().resume();
      return { status: "running", tick: getEngine().getCurrentTick() };
    }),

  stop: publicQuery
    .mutation(() => {
      getEngine().stop();
      return { status: "stopped", tick: getEngine().getCurrentTick() };
    }),

  step: publicQuery
    .mutation(() => {
      const snapshot = getEngine().step();
      return snapshot ?? getEngine().getSnapshot();
    }),

  reset: publicQuery
    .mutation(() => {
      resetEngine();
      return { status: "reset" };
    }),

  // ─── State Queries ───────────────────────────────────────────────

  status: publicQuery
    .query(() => {
      return {
        status: getEngine().getStatus(),
        tick: getEngine().getCurrentTick(),
        config: getEngine().getConfig(),
      };
    }),

  snapshot: publicQuery
    .query(() => {
      return getEngine().getSnapshot();
    }),

  warehouse: publicQuery
    .query(() => {
      return getEngine().getWarehouseConfig();
    }),

  // ─── Configuration ───────────────────────────────────────────────

  configure: publicQuery
    .input(simulationConfigSchema)
    .mutation(({ input }) => {
      resetEngine(input);
      return { status: "configured", config: input };
    }),

  // ─── Statistics ──────────────────────────────────────────────────

  stats: publicQuery
    .query(() => {
      return getEngine().getStats();
    }),

  // ─── Grid Data ───────────────────────────────────────────────────

  grid: publicQuery
    .query(() => {
      const grid = getEngine().getGrid();
      const config = getEngine().getWarehouseConfig();
      const cells: Array<{
        x: number;
        y: number;
        walkable: boolean;
        occupiedBy: string | null;
        shelfZone: string | null;
        isChargingStation: boolean;
        isDropOffPoint: boolean;
        congestion: number;
      }> = [];

      for (let y = 0; y < config.height; y++) {
        for (let x = 0; x < config.width; x++) {
          const cell = grid.getCell(x, y);
          if (cell) {
            cells.push({
              x: cell.x,
              y: cell.y,
              walkable: cell.walkable,
              occupiedBy: cell.occupiedBy,
              shelfZone: cell.shelfZone,
              isChargingStation: cell.isChargingStation,
              isDropOffPoint: cell.isDropOffPoint,
              congestion: cell.congestion,
            });
          }
        }
      }

      return { cells, width: config.width, height: config.height };
    }),
});
