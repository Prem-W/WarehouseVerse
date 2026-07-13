import { createRouter, publicQuery } from "./middleware";
import { simulationRouter } from "./routers/simulation";
import { robotRouter } from "./routers/robot";
import { analyticsRouter } from "./routers/analytics";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  simulation: simulationRouter,
  robot: robotRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
