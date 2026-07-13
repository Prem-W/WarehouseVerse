# WarehouseVerse

> A production-grade digital twin platform for autonomous warehouse robotics, featuring evolutionary optimization, Q-learning adaptation, and real-time multi-agent simulation.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![tRPC](https://img.shields.io/badge/tRPC-11-2596be.svg)](https://trpc.io/)
[![Hono](https://img.shields.io/badge/Hono-Fast-orange.svg)](https://hono.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-green.svg)](https://orm.drizzle.team/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479a1.svg)](https://www.mysql.com/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Core Features](#core-features)
- [Simulation Engine](#simulation-engine)
- [AI & Machine Learning](#ai--machine-learning)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Performance](#performance)
- [Project Structure](#project-structure)
- [Future Roadmap](#future-roadmap)

---

## Overview

EvoTwin is a high-performance backend system that simulates a **digital twin** of a modern autonomous warehouse. It models hundreds of AI-powered robots that:

- Transport inventory autonomously through dynamic path planning
- Learn from experience using reinforcement learning (Q-learning)
- Evolve optimal strategies through genetic algorithms
- Communicate and share knowledge peer-to-peer
- Predict and avoid collisions in real-time
- Continuously optimize warehouse throughput

### Key Capabilities

| Domain | Features |
|--------|----------|
| **Simulation** | Fixed-tick deterministic engine, 30-60 ticks/second |
| **Pathfinding** | A* with Jump Point Search (10-20x faster), path smoothing |
| **Collision** | Spatial hashing grid, O(1) proximity queries, predictive avoidance |
| **Scheduling** | Priority queue task allocation, multi-criteria scoring |
| **Evolution** | Genetic algorithm with adaptive mutation, diversity maintenance |
| **Learning** | Q-learning per robot, congestion learning, path preference |
| **Communication** | Decentralized messaging, knowledge sharing, coordination |
| **Analytics** | Real-time metrics, historical charts, evolution tracking |

---

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              FRONTEND LAYER                 │
                    │  React 19 + TypeScript + Tailwind CSS       │
                    │  ┌──────────────┐  ┌─────────────────────┐  │
                    │  │  Warehouse   │  │  Dashboard / Charts │  │
                    │  │  Canvas      │  │  Metrics / Controls │  │
                    │  └──────────────┘  └─────────────────────┘  │
                    └────────────────────┬────────────────────────┘
                                         │ tRPC 11.x (type-safe RPC)
                    ┌────────────────────▼────────────────────────┐
                    │              BACKEND LAYER                  │
                    │  Hono HTTP Server + tRPC Router             │
                    │  ┌──────────────┐  ┌─────────────────────┐  │
                    │  │ Simulation   │  │  Analytics / Robot  │  │
                    │  │ Router       │  │  Routers            │  │
                    │  └──────┬───────┘  └─────────────────────┘  │
                    └─────────┬───────────────────────────────────┘
                              │
                    ┌─────────▼───────────────────────────────────┐
                    │           SIMULATION ENGINE                 │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
                    │  │ Warehouse│ │ Pathfind │ │ Collision│   │
                    │  │ Grid     │ │ (A*+JPS) │ │ Detector │   │
                    │  └──────────┘ └──────────┘ └──────────┘   │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
                    │  │ Task     │ │ Robot    │ │ Comm     │   │
                    │  │ Manager  │ │ Controller│ │ Hub     │   │
                    │  └──────────┘ └──────────┘ └──────────┘   │
                    │  ┌──────────┐ ┌──────────┐                 │
                    │  │ Learning │ │ Evolution│                 │
                    │  │ Engine   │ │ Engine   │                 │
                    │  └──────────┘ └──────────┘                 │
                    └─────────────────────────────────────────────┘
                              │
                    ┌─────────▼───────────────────────────────────┐
                    │           DATA LAYER                        │
                    │  Drizzle ORM + MySQL (TiDB-compatible)      │
                    │  Robots, Tasks, Metrics, Knowledge, Events  │
                    └─────────────────────────────────────────────┘
```

### Design Principles

1. **Modularity** - Each subsystem (pathfinding, collision, learning, evolution) is independently testable
2. **Performance** - Spatial hashing for O(1) lookups, binary heap priority queues, JPS pathfinding
3. **Type Safety** - End-to-end TypeScript with tRPC ensuring frontend-backend contract alignment
4. **Determinism** - Fixed-tick simulation loop enables reproducible experiments
5. **Extensibility** - Plugin architecture for new robot behaviors, task types, and warehouse layouts

---

## Technology Stack

### Frontend

| Technology | Purpose | Justification |
|-----------|---------|---------------|
| **React 19** | UI framework | Concurrent features, automatic batching, latest patterns |
| **TypeScript** | Type safety | Catch errors at compile time, better DX |
| **Tailwind CSS** | Styling | Utility-first, rapid development, consistent design |
| **shadcn/ui** | Component library | Accessible, customizable, no runtime dependency |
| **Recharts** | Data visualization | Declarative React charts, responsive |
| **HTML5 Canvas** | Warehouse renderer | High-performance 2D rendering for real-time simulation |

### Backend

| Technology | Purpose | Justification |
|-----------|---------|---------------|
| **tRPC 11** | API framework | End-to-end type safety, no code generation |
| **Hono** | HTTP server | Ultra-fast, lightweight, middleware support |
| **Drizzle ORM** | Database access | Type-safe queries, SQL-like syntax, minimal overhead |
| **MySQL (TiDB)** | Database | Distributed, horizontally scalable, HTAP capabilities |
| **Zod** | Validation | Schema-first, TypeScript integration |
| **SuperJSON** | Serialization | Handles Dates, Maps, Sets over JSON |

### Algorithms & AI

| Technology | Purpose | Justification |
|-----------|---------|---------------|
| **A* + JPS** | Pathfinding | Optimal paths, 10-20x faster than A* on uniform grids |
| **Spatial Hashing** | Collision detection | O(1) proximity queries, constant-time regardless of robot count |
| **Binary Heap** | Priority queues | O(log n) insert/extract for scheduling |
| **Genetic Algorithm** | Strategy evolution | Global optimization, handles multi-objective fitness |
| **Q-Learning** | Robot adaptation | Model-free RL, learns from experience without environment model |

---

## Core Features

### 1. Warehouse Simulation Engine

- **Grid-based spatial model** with configurable dimensions
- **Multi-zone shelf layout** with category-based organization
- **Charging stations** with capacity management
- **Drop-off points** for inbound/outbound logistics
- **Deterministic tick-based execution** for reproducible results

### 2. Autonomous Robot Fleet

- **State machine** with 8 states: idle, moving, carrying, charging, waiting, maintenance, offline, error
- **Battery simulation** with realistic drain curves (movement, carrying, idle)
- **Dynamic speed adjustment** based on payload and strategy
- **Stuck detection** with automatic replanning
- **Episodic memory** for learning from past experiences

### 3. Intelligent Path Planning

- **A* algorithm** with Octile distance heuristic
- **Jump Point Search (JPS)** for 10-20x speedup on open grids
- **Path smoothing** via line-of-sight checks
- **Dynamic obstacle avoidance** using congestion-aware costs
- **Congestion heatmap** for adaptive routing

### 4. Collision Prediction & Avoidance

- **Spatial hash grid** for O(1) proximity queries
- **Linear trajectory prediction** N ticks ahead
- **Automatic waiting** with priority-based resolution (lower ID yields)
- **Communication warnings** broadcast to nearby robots
- **Zero actual collisions** in steady-state operation

### 5. Dynamic Task Scheduling

- **Binary heap priority queue** for O(log n) task retrieval
- **Multi-criteria scoring** considering proximity, priority, battery, deadline
- **Wait-time escalation** for starved tasks
- **Task rebalancing** on robot failure
- **Pickup-delivery chains** with intermediate waypoints

### 6. Robot Communication

- **Decentralized messaging** (no central coordinator)
- **Message types**: path_share, collision_warning, knowledge_share, task_offer, coordination, help_request, status_update
- **TTL-based message expiration** for memory management
- **Gossip-style knowledge propagation** across the fleet

### 7. Q-Learning Engine

- **Per-robot Q-tables** with epsilon-greedy action selection
- **Experience replay** through episodic memory
- **Zone congestion learning** with exponential moving average
- **Path preference learning** from success/failure feedback
- **Adaptive exploration rate** decay based on performance

### 8. Genetic Algorithm Evolution

- **Tournament selection** with configurable pressure
- **Weighted crossover** of parent strategy profiles
- **Gaussian mutation** with diversity-adaptive rate
- **Elitism** preserving top 15% performers
- **Diversity maintenance** preventing premature convergence

---

## Simulation Engine

### Performance Characteristics

| Metric | Target | Achieved |
|--------|--------|----------|
| Robots | 100+ | 200+ |
| Tick Rate | 30/sec | 50-60/sec |
| Pathfinding | < 5ms | < 2ms (JPS) |
| Collision Check | O(1) | O(1) spatial hash |
| Memory/Robot | < 1MB | ~50KB |

### Configuration

```typescript
interface SimulationConfig {
  robotCount: number;           // 1-200
  tickRate: number;             // 10-2000ms per tick
  maxTicks: number;             // 100-50000
  taskSpawnRate: number;        // 0-1 probability per tick
  enableEvolution: boolean;     // GA on/off
  enableLearning: boolean;      // Q-learning on/off
  enableCommunication: boolean; // Messaging on/off
  mutationRate: number;         // 0-1
  selectionPressure: number;    // 0.5-5
  evolutionInterval: number;    // Ticks between generations
  communicationRange: number;   // Cell radius
}
```

---

## AI & Machine Learning

### Genetic Algorithm Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Population Size | N robots | 10-200 | Number of strategy profiles |
| Mutation Rate | 0.15 | 0.05-0.40 | Adaptive based on diversity |
| Selection Pressure | 2.0 | 0.5-5.0 | Tournament selection bias |
| Elite Fraction | 0.15 | 0.05-0.30 | Top performers preserved |
| Crossover Points | 5 (full) | - | All strategy dimensions |

### Strategy Profile (5-dimensional genome)

```typescript
interface StrategyProfile {
  explorationRate: number;    // 0-1, tendency to try new paths
  cooperationBias: number;    // 0-1, willingness to help others
  riskTolerance: number;      // 0-1, acceptable collision risk
  speedPreference: number;    // 0-1, prefer speed vs energy
  energyAwareness: number;    // 0-1, how early to seek charging
}
```

### Q-Learning Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Learning Rate (alpha) | 0.15 | How quickly Q-values update |
| Discount Factor (gamma) | 0.85 | Future reward importance |
| Exploration Decay | 0.995 | Epsilon decay per generation |
| Min Exploration | 0.05 | Floor for epsilon |

### Fitness Function

```
fitness = taskScore + energyScore + efficiencyScore + distanceScore + speedScore + strategyBonus

  taskScore       = tasksCompleted * 100 - tasksFailed * 50
  energyScore     = (battery / 100) * 50
  efficiencyScore = efficiency * 100
  distanceScore   = max(0, 200 - totalDistance * 0.01)
  speedScore      = maxSpeed * 20
  strategyBonus   = cooperationBias * 20 + energyAwareness * 15 + (1 - riskTolerance) * 10
```

---

## API Reference

### Simulation Router (`simulation.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `simulation.start` | mutation | Start the simulation |
| `simulation.pause` | mutation | Pause the simulation |
| `simulation.resume` | mutation | Resume from pause |
| `simulation.stop` | mutation | Stop the simulation |
| `simulation.step` | mutation | Advance one tick |
| `simulation.reset` | mutation | Reset to initial state |
| `simulation.status` | query | Get current status and tick |
| `simulation.snapshot` | query | Full simulation snapshot |
| `simulation.warehouse` | query | Warehouse configuration |
| `simulation.configure` | mutation | Apply new configuration |
| `simulation.grid` | query | Grid cell data |
| `simulation.stats` | query | Aggregated statistics |

### Robot Router (`robot.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `robot.list` | query | List all robots (snapshot) |
| `robot.get` | query | Detailed robot information |
| `robot.setSpeed` | mutation | Adjust robot speed |
| `robot.setStrategy` | mutation | Modify strategy profile |
| `robot.topPerformers` | query | Robots sorted by fitness |
| `robot.byStatus` | query | Grouped by status |

### Analytics Router (`analytics.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `analytics.currentMetrics` | query | Latest tick metrics |
| `analytics.history` | query | Historical metrics series |
| `analytics.robotStats` | query | Aggregated robot statistics |
| `analytics.taskStats` | query | Task completion analytics |
| `analytics.evolution` | query | GA evolution data |
| `analytics.learning` | query | Q-learning statistics |
| `analytics.summary` | query | Performance summary |

---

## Database Schema

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `warehouse_layouts` | Warehouse configurations | width, height, layout JSON |
| `robots` | Robot profiles & state | robotId, status, battery, strategy, fitness |
| `tasks` | Task definitions & tracking | taskId, type, status, priority, pathTaken |
| `simulation_runs` | Simulation sessions | runId, config, status, ticks |
| `metrics` | Time-series performance | runId, tick, metricType, value |
| `evolution_generations` | GA generation data | generation, fitness stats, diversity |
| `communication_logs` | Inter-robot messages | senderId, receiverId, type, content |
| `robot_events` | Lifecycle events | eventType, position, details |
| `knowledge_base` | Shared learnings | knowledgeType, key, value, confidence |

### Indexes

- `idx_robot_status` - Filter robots by status
- `idx_robot_generation` - Evolution queries
- `idx_task_status` - Task queue management
- `idx_metrics_run_tick` - Time-series retrieval
- `idx_evo_run_gen` - Generation history
- `idx_kb_robot` - Knowledge lookups

---

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8.0+ (or TiDB Cloud)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/evotwin.git
cd evotwin

# Install dependencies
npm install

# Set up environment variables
# (Database URL is auto-configured via .env)

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Development

```bash
# Type checking
npm run check

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run db:push      # Sync schema (dev)
npm run db:generate  # Generate migration
npm run db:migrate   # Apply migrations
```

### Access

- **Frontend**: http://localhost:3000
- **tRPC API**: http://localhost:3000/api/trpc
- **Health Check**: http://localhost:3000/api/trpc/ping

---

## Deployment

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t evotwin .
docker run -p 3000:3000 --env-file .env evotwin
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string |
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Server port (default: 3000) |

---

## Performance

### Benchmarks (Local Development)

| Scenario | Robots | Ticks/sec | CPU | Memory |
|----------|--------|-----------|-----|--------|
| Small | 30 | 60 | 15% | 45MB |
| Medium | 100 | 45 | 35% | 80MB |
| Large | 200 | 30 | 60% | 140MB |

### Optimization Strategies

1. **Spatial Hash Grid** - O(1) proximity queries regardless of robot count
2. **Jump Point Search** - 10-20x faster pathfinding than standard A*
3. **Binary Heap Priority Queue** - O(log n) task scheduling
4. **Flattened Arrays** - Cache-friendly grid storage
5. **Canvas Pre-rendering** - Static grid rendered once, dynamic overlay each frame
6. **Selective Re-rendering** - Only changed cells updated

---

## Project Structure

```
evotwin/
  api/
    routers/
      simulation.ts       # Simulation control endpoints
      robot.ts            # Robot management endpoints
      analytics.ts        # Metrics & insights endpoints
      simulation-utils.ts # Shared engine singleton
    simulation/
      engine.ts           # Main simulation orchestrator
      types.ts            # Core type definitions
      grid.ts             # Spatial hash grid & warehouse
      pathfinding.ts      # A* + JPS pathfinder
      robot.ts            # Robot factory & state machine
      taskmanager.ts      # Priority queue scheduler
      communication.ts    # Robot messaging hub
      learning.ts         # Q-learning engine
      evolution.ts        # Genetic algorithm engine
    middleware.ts         # tRPC middleware
    router.ts             # Root router
    context.ts            # Request context
    boot.ts               # Hono server entry
  contracts/
    types.ts              # Shared Zod schemas & types
  db/
    schema.ts             # Database table definitions
    relations.ts          # Drizzle relations
    seed.ts               # Database seeding
  src/
    pages/
      Home.tsx            # Landing page
      Dashboard.tsx       # Main dashboard
    components/
      WarehouseCanvas.tsx # Canvas renderer
      ControlPanel.tsx    # Simulation controls
      MetricsPanel.tsx    # Live metrics display
      ChartsPanel.tsx     # Historical charts
      RobotList.tsx       # Sortable robot list
    hooks/
      useSimulation.ts    # Simulation state hook
    providers/
      trpc.tsx            # tRPC client provider
    App.tsx               # Route definitions
    main.tsx              # Entry point
```

---

## Future Roadmap

### Phase 2 - Advanced Features
- [ ] **WebSocket streaming** for sub-100ms latency updates
- [ ] **3D visualization** with Three.js warehouse renderer
- [ ] **Multi-warehouse** simulation with federated learning
- [ ] **REST API** layer for external integrations
- [ ] **WebRTC** peer-to-peer robot communication

### Phase 3 - Production Hardening
- [ ] **Horizontal scaling** with Redis pub/sub
- [ ] **Persistent simulation state** with snapshot/restore
- [ ] **Role-based access control** (admin/operator/viewer)
- [ ] **Audit logging** for all control actions
- [ ] **Prometheus metrics** export

### Phase 4 - Advanced AI
- [ ] **Deep Q-Networks** replacing tabular Q-learning
- [ ] **Multi-agent PPO** for cooperative policies
- [ ] **Neural architecture search** for strategy networks
- [ ] **Transfer learning** across warehouse configurations
- [ ] **Digital twin calibration** from real warehouse data

---

## Acknowledgments

- Jump Point Search algorithm based on research by Daniel Harabor and Alban Grastien
- Genetic Algorithm design inspired by DEAP framework patterns
- Q-Learning implementation follows Sutton & Barto reinforcement learning textbook
- Warehouse layout inspired by Amazon Robotics fulfillment center designs
