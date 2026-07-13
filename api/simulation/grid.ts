/**
 * Spatial Hash Grid & Warehouse Grid System
 * 
 * Provides:
 * - O(1) cell lookups for walkability
 * - O(1) neighbor queries for collision detection
 * - Dynamic congestion tracking
 * - Spatial hashing for efficient proximity queries
 */

import type { Point, WarehouseConfig, GridCell, ChargingStation } from "./types";

/**
 * Spatial Hash Grid for O(1) proximity queries
 * Divides space into buckets, each containing entities in that region
 */
export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, Set<string>> = new Map();
  private positions: Map<string, Point> = new Map();

  constructor(cellSize: number = 5) {
    this.cellSize = cellSize;
  }

  private key(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  /**
   * Insert or update an entity's position
   */
  update(id: string, x: number, y: number): void {
    // Remove from old position
    const oldPos = this.positions.get(id);
    if (oldPos) {
      const oldKey = this.key(oldPos.x, oldPos.y);
      const bucket = this.grid.get(oldKey);
      if (bucket) {
        bucket.delete(id);
        if (bucket.size === 0) {
          this.grid.delete(oldKey);
        }
      }
    }

    // Insert into new position
    const newKey = this.key(x, y);
    let bucket = this.grid.get(newKey);
    if (!bucket) {
      bucket = new Set();
      this.grid.set(newKey, bucket);
    }
    bucket.add(id);
    this.positions.set(id, { x, y });
  }

  /**
   * Remove an entity
   */
  remove(id: string): void {
    const pos = this.positions.get(id);
    if (pos) {
      const k = this.key(pos.x, pos.y);
      const bucket = this.grid.get(k);
      if (bucket) {
        bucket.delete(id);
        if (bucket.size === 0) {
          this.grid.delete(k);
        }
      }
      this.positions.delete(id);
    }
  }

  /**
   * Query all entities within radius of a point
   * Returns array of [id, distance] sorted by distance
   */
  queryRadius(x: number, y: number, radius: number): Array<{ id: string; dist: number }> {
    const results: Array<{ id: string; dist: number }> = [];
    const rSq = radius * radius;
    const cellRadius = Math.ceil(radius / this.cellSize);

    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const k = `${cx + dx},${cy + dy}`;
        const bucket = this.grid.get(k);
        if (!bucket) continue;

        for (const id of bucket) {
          const pos = this.positions.get(id)!;
          const dSq = (pos.x - x) ** 2 + (pos.y - y) ** 2;
          if (dSq <= rSq) {
            results.push({ id, dist: Math.sqrt(dSq) });
          }
        }
      }
    }

    results.sort((a, b) => a.dist - b.dist);
    return results;
  }

  /**
   * Get all neighbors in adjacent cells (including diagonals)
   */
  getNeighbors(x: number, y: number): string[] {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const results: string[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const k = `${cx + dx},${cy + dy}`;
        const bucket = this.grid.get(k);
        if (bucket) {
          results.push(...bucket);
        }
      }
    }

    return results;
  }

  /**
   * Get count of entities near a point
   */
  countNear(x: number, y: number, radius: number): number {
    return this.queryRadius(x, y, radius).length;
  }

  /**
   * Get all tracked entity positions
   */
  getAllPositions(): Map<string, Point> {
    return new Map(this.positions);
  }

  /**
   * Get position of a specific entity
   */
  getPosition(id: string): Point | undefined {
    return this.positions.get(id);
  }

  clear(): void {
    this.grid.clear();
    this.positions.clear();
  }

  get size(): number {
    return this.positions.size;
  }
}

/**
 * Warehouse Grid - the core spatial data structure
 * 
 * Manages:
 * - Walkability map with fast lookups
   - Congestion heatmap for dynamic routing
 * - Entity positions and occupancy
 * - Zone management
 */
export class WarehouseGrid {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;

  private cells: GridCell[];
  private walkableMap: boolean[];
  private congestionMap: Float32Array;
  private spatialGrid: SpatialHashGrid;
  private robotPositions: Map<string, Point> = new Map();
  private chargingStations: Map<string, ChargingStation> = new Map();
  private stationPositions: Set<string> = new Set();

  // Change tracking for incremental updates
  changedCells: Set<number> = new Set();

  constructor(config: WarehouseConfig) {
    this.width = config.width;
    this.height = config.height;
    this.cellSize = config.cellSize;
    this.spatialGrid = new SpatialHashGrid(4);

    const size = config.width * config.height;
    this.cells = new Array(size);
    this.walkableMap = new Array(size);
    this.congestionMap = new Float32Array(size);

    this.initializeCells(config);
  }

  private initializeCells(config: WarehouseConfig): void {
    const size = config.width * config.height;

    // Initialize all cells as walkable
    for (let y = 0; y < config.height; y++) {
      for (let x = 0; x < config.width; x++) {
        const idx = y * config.width + x;
        this.cells[idx] = {
          x, y,
          walkable: true,
          occupiedBy: null,
          shelfZone: null,
          isChargingStation: false,
          isDropOffPoint: false,
          congestion: 0,
          lastVisited: 0,
        };
        this.walkableMap[idx] = true;
      }
    }

    // Mark shelves as unwalkable
    for (const shelf of config.shelves) {
      for (let y = shelf.rect.y; y < shelf.rect.y + shelf.rect.h; y++) {
        for (let x = shelf.rect.x; x < shelf.rect.x + shelf.rect.w; x++) {
          if (x >= 0 && x < config.width && y >= 0 && y < config.height) {
            const idx = y * config.width + x;
            this.cells[idx].walkable = false;
            this.cells[idx].shelfZone = shelf.zone;
            this.walkableMap[idx] = false;
          }
        }
      }
    }

    // Mark obstacles
    for (const obs of config.obstacles) {
      for (let y = obs.rect.y; y < obs.rect.y + obs.rect.h; y++) {
        for (let x = obs.rect.x; x < obs.rect.x + obs.rect.w; x++) {
          if (x >= 0 && x < config.width && y >= 0 && y < config.height) {
            const idx = y * config.width + x;
            this.cells[idx].walkable = false;
            this.walkableMap[idx] = false;
          }
        }
      }
    }

    // Mark charging stations (walkable but reserved)
    for (const station of config.chargingStations) {
      const idx = station.position.y * config.width + station.position.x;
      if (idx >= 0 && idx < size) {
        this.cells[idx].isChargingStation = true;
        this.chargingStations.set(station.id, { ...station, occupiedBy: [] });
        this.stationPositions.add(`${station.position.x},${station.position.y}`);
      }
    }

    // Mark drop-off points
    for (const point of config.dropOffPoints) {
      const idx = point.position.y * config.width + point.position.x;
      if (idx >= 0 && idx < size) {
        this.cells[idx].isDropOffPoint = true;
      }
    }
  }

  // ─── Cell Access ─────────────────────────────────────────────────

  getCell(x: number, y: number): GridCell | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.cells[y * this.width + x];
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.walkableMap[y * this.width + x];
  }

  isWalkableWithRobots(x: number, y: number, excludeRobotId?: string): boolean {
    if (!this.isWalkable(x, y)) return false;
    const cell = this.cells[y * this.width + x];
    if (cell.occupiedBy && cell.occupiedBy !== excludeRobotId) return false;
    return true;
  }

  getCost(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return Infinity;
    const idx = y * this.width + x;
    return 1 + this.congestionMap[idx] * 2;
  }

  // ─── Occupancy Management ────────────────────────────────────────

  setRobotPosition(robotId: string, x: number, y: number): void {
    // Clear old position
    const oldPos = this.robotPositions.get(robotId);
    if (oldPos) {
      const oldIdx = oldPos.y * this.width + oldPos.x;
      this.cells[oldIdx].occupiedBy = null;
      this.changedCells.add(oldIdx);
    }

    // Set new position
    const newIdx = y * this.width + x;
    this.cells[newIdx].occupiedBy = robotId;
    this.cells[newIdx].lastVisited = Date.now();
    this.robotPositions.set(robotId, { x, y });
    this.spatialGrid.update(robotId, x, y);
    this.changedCells.add(newIdx);

    // Update congestion
    this.congestionMap[newIdx] = Math.min(1, this.congestionMap[newIdx] + 0.05);
  }

  removeRobot(robotId: string): void {
    const pos = this.robotPositions.get(robotId);
    if (pos) {
      const idx = pos.y * this.width + pos.x;
      this.cells[idx].occupiedBy = null;
      this.changedCells.add(idx);
      this.robotPositions.delete(robotId);
      this.spatialGrid.remove(robotId);
    }
  }

  getRobotPosition(robotId: string): Point | undefined {
    return this.robotPositions.get(robotId);
  }

  // ─── Spatial Queries ─────────────────────────────────────────────

  getRobotsNear(x: number, y: number, radius: number): Array<{ id: string; dist: number }> {
    return this.spatialGrid.queryRadius(x, y, radius);
  }

  getNearbyRobots(robotId: string, radius: number): string[] {
    const pos = this.robotPositions.get(robotId);
    if (!pos) return [];
    return this.spatialGrid.queryRadius(pos.x, pos.y, radius)
      .filter(r => r.id !== robotId)
      .map(r => r.id);
  }

  isPositionOccupied(x: number, y: number, excludeId?: string): boolean {
    const cell = this.getCell(x, y);
    if (!cell || !cell.walkable) return true;
    if (cell.occupiedBy && cell.occupiedBy !== excludeId) return true;
    return false;
  }

  // ─── Charging Station Management ─────────────────────────────────

  getAvailableChargingStation(): Point | null {
    for (const [, station] of this.chargingStations) {
      if (station.occupiedBy.length < station.capacity) {
        return { ...station.position };
      }
    }
    return null;
  }

  occupyChargingStation(stationPos: Point, robotId: string): boolean {
    for (const [, station] of this.chargingStations) {
      if (station.position.x === stationPos.x && station.position.y === stationPos.y) {
        if (!station.occupiedBy.includes(robotId)) {
          station.occupiedBy.push(robotId);
        }
        return true;
      }
    }
    return false;
  }

  releaseChargingStation(robotId: string): void {
    for (const [, station] of this.chargingStations) {
      const idx = station.occupiedBy.indexOf(robotId);
      if (idx >= 0) {
        station.occupiedBy.splice(idx, 1);
      }
    }
  }

  isChargingStation(x: number, y: number): boolean {
    return this.stationPositions.has(`${x},${y}`);
  }

  // ─── Congestion ──────────────────────────────────────────────────

  /**
   * Get congestion-adjusted costs as a Float32Array for pathfinding
   */
  getCongestionCosts(): Float32Array {
    const costs = new Float32Array(this.width * this.height);
    for (let i = 0; i < costs.length; i++) {
      costs[i] = 1 + this.congestionMap[i] * 3;
    }
    return costs;
  }

  /**
   * Decay congestion over time
   */
  decayCongestion(factor: number = 0.98): void {
    for (let i = 0; i < this.congestionMap.length; i++) {
      this.congestionMap[i] *= factor;
    }
  }

  getCongestionAt(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.congestionMap[y * this.width + x];
  }

  // ─── Grid Stats ──────────────────────────────────────────────────

  getWalkableCount(): number {
    let count = 0;
    for (let i = 0; i < this.walkableMap.length; i++) {
      if (this.walkableMap[i]) count++;
    }
    return count;
  }

  getDimensions(): { width: number; height: number; cellSize: number } {
    return { width: this.width, height: this.height, cellSize: this.cellSize };
  }

  /**
   * Create a GridMap compatible with the Pathfinder
   */
  createPathfinderGrid(excludeRobotId?: string) {
    return {
      width: this.width,
      height: this.height,
      isWalkable: (x: number, y: number) => this.isWalkableWithRobots(x, y, excludeRobotId),
      getCost: (x: number, y: number) => this.getCost(x, y),
    };
  }

  /**
   * Reset changed cells tracking
   */
  resetChanges(): void {
    this.changedCells.clear();
  }
}
