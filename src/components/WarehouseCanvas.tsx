/**
 * Warehouse Canvas Renderer
 * High-performance 2D visualization of the warehouse simulation
 * Uses HTML5 Canvas with optimized rendering for real-time updates
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import type { SimulationSnapshot, Point } from "@contracts/types";

interface WarehouseCanvasProps {
  snapshot: SimulationSnapshot | undefined;
  width?: number;
  height?: number;
  onRobotClick?: (robotId: string) => void;
  selectedRobotId?: string | null;
}

// Cell size in pixels
const CELL_SIZE = 14;
const GRID_GAP = 1;

// Colors
const COLORS = {
  background: "#0a0e1a",
  gridLine: "#1a2035",
  shelf: "#2a3048",
  shelfZone: {
    A: "#3a4058",
    B: "#3a4858",
    C: "#3a5058",
    D: "#3a5858",
    E: "#3a6048",
  },
  chargingStation: "#2d5016",
  dropOff: "#4a2040",
  walkable: "#111827",
  robot: {
    idle: "#22d3ee",
    moving: "#34d399",
    carrying: "#f59e0b",
    charging: "#a78bfa",
    waiting: "#f97316",
    error: "#ef4444",
    maintenance: "#6b7280",
    offline: "#374151",
  },
  robotSelected: "#ffffff",
  task: {
    pickup: "#60a5fa",
    delivery: "#f472b6",
    transport: "#a3e635",
    recharge: "#c084fc",
    inspection: "#fbbf24",
    rearrange: "#9ca3af",
  },
  path: "rgba(52, 211, 153, 0.3)",
  congestion: "rgba(239, 68, 68, ", // alpha added dynamically
  text: "#94a3b8",
  highlight: "rgba(255, 255, 255, 0.1)",
};

export const WarehouseCanvas: React.FC<WarehouseCanvasProps> = ({
  snapshot,
  width = 840,
  height = 560,
  onRobotClick,
  selectedRobotId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredRobot, setHoveredRobot] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });

  // Grid dimensions
  const gridW = 60;
  const gridH = 40;

  // Pre-render static grid elements
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawStaticGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const cellSize = CELL_SIZE;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const px = x * (cellSize + GRID_GAP);
        const py = y * (cellSize + GRID_GAP);

        // Default walkable
        ctx.fillStyle = COLORS.walkable;

        // Shelves (approximate positions matching the backend)
        const zone = getZoneFromPosition(x, y);
        if (zone) {
          ctx.fillStyle = COLORS.shelfZone[zone as keyof typeof COLORS.shelfZone] || COLORS.shelf;
        }

        // Charging stations
        if (isChargingStation(x, y)) {
          ctx.fillStyle = COLORS.chargingStation;
        }

        // Drop-off points
        if (isDropOffPoint(x, y)) {
          ctx.fillStyle = COLORS.dropOff;
        }

        ctx.fillRect(px, py, cellSize, cellSize);
      }
    }
  }, [width, height]);

  useEffect(() => {
    const staticCanvas = document.createElement("canvas");
    staticCanvas.width = width;
    staticCanvas.height = height;
    const ctx = staticCanvas.getContext("2d");
    if (ctx) {
      drawStaticGrid(ctx);
      staticCanvasRef.current = staticCanvas;
    }
  }, [drawStaticGrid, width, height]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw static background
    if (staticCanvasRef.current) {
      ctx.drawImage(staticCanvasRef.current, 0, 0);
    } else {
      drawStaticGrid(ctx);
    }

    if (!snapshot) return;

    const cellSize = CELL_SIZE;

    // Draw congestion heatmap (subtle overlay)
    // (Would need congestion data from backend - simplified for now)

    // Draw tasks
    for (const task of snapshot.tasks) {
      if (task.status === "pending" || task.status === "assigned") {
        const px = task.source.x * (cellSize + GRID_GAP) + cellSize / 2;
        const py = task.source.y * (cellSize + GRID_GAP) + cellSize / 2;

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.task[task.type] || COLORS.task.transport;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw robots
    for (const robot of snapshot.robots) {
      const px = robot.position.x * (cellSize + GRID_GAP) + cellSize / 2;
      const py = robot.position.y * (cellSize + GRID_GAP) + cellSize / 2;

      // Draw target line if moving
      if (robot.target && robot.status === "moving") {
        const tx = robot.target.x * (cellSize + GRID_GAP) + cellSize / 2;
        const ty = robot.target.y * (cellSize + GRID_GAP) + cellSize / 2;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = COLORS.path;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Robot body
      const isSelected = robot.id === selectedRobotId;
      const isHovered = robot.id === hoveredRobot;
      const radius = isSelected ? 6 : isHovered ? 5 : 4;

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.robot[robot.status] || COLORS.robot.idle;
      ctx.fill();

      // Selection/hover ring
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(px, py, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? COLORS.robotSelected : "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Battery indicator (small arc)
      if (robot.battery < 30) {
        ctx.beginPath();
        ctx.arc(px, py, radius + 1, 0, Math.PI * 2 * (robot.battery / 100));
        ctx.strokeStyle = robot.battery < 15 ? "#ef4444" : "#f59e0b";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Robot ID (only for selected or hovered)
      if (isSelected || isHovered) {
        ctx.fillStyle = COLORS.text;
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(robot.id, px, py - radius - 4);
      }
    }

    // Draw legend overlay
    drawLegend(ctx);

  }, [snapshot, drawStaticGrid, hoveredRobot, selectedRobotId, width, height]);

  const drawLegend = (ctx: CanvasRenderingContext2D) => {
    const legendX = width - 130;
    const legendY = 10;

    ctx.fillStyle = "rgba(10, 14, 26, 0.85)";
    ctx.fillRect(legendX - 5, legendY - 5, 125, 140);
    ctx.strokeStyle = "#2a3048";
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 5, legendY - 5, 125, 140);

    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("ROBOTS", legendX, legendY + 10);

    const statuses = ["idle", "moving", "carrying", "charging", "waiting", "error"] as const;
    let y = legendY + 24;

    for (const status of statuses) {
      ctx.beginPath();
      ctx.arc(legendX + 6, y - 3, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.robot[status];
      ctx.fill();

      ctx.fillStyle = COLORS.text;
      ctx.font = "9px system-ui";
      ctx.fillText(status, legendX + 14, y);
      y += 14;
    }

    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 10px system-ui";
    ctx.fillText("TASKS", legendX, y + 6);
    y += 18;

    const taskTypes = ["pickup", "delivery", "transport"] as const;
    for (const type of taskTypes) {
      ctx.beginPath();
      ctx.arc(legendX + 6, y - 3, 3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.task[type];
      ctx.fill();

      ctx.fillStyle = COLORS.text;
      ctx.font = "9px system-ui";
      ctx.fillText(type, legendX + 14, y);
      y += 12;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Find hovered robot
    if (!snapshot) return;

    let closest: string | null = null;
    let closestDist = Infinity;

    for (const robot of snapshot.robots) {
      const px = robot.position.x * (CELL_SIZE + GRID_GAP) + CELL_SIZE / 2;
      const py = robot.position.y * (CELL_SIZE + GRID_GAP) + CELL_SIZE / 2;
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

      if (dist < 10 && dist < closestDist) {
        closestDist = dist;
        closest = robot.id;
      }
    }

    setHoveredRobot(closest);
  };

  const handleClick = () => {
    if (hoveredRobot && onRobotClick) {
      onRobotClick(hoveredRobot);
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-700/50">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="cursor-crosshair"
        style={{ width: `${width}px`, height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      {hoveredRobot && snapshot && (
        <RobotTooltip
          robot={snapshot.robots.find(r => r.id === hoveredRobot)!}
          mousePos={mousePos}
        />
      )}
    </div>
  );
};

// Tooltip component for hovered robot
const RobotTooltip: React.FC<{
  robot: SimulationSnapshot["robots"][0];
  mousePos: Point;
}> = ({ robot, mousePos }) => {
  return (
    <div
      className="absolute pointer-events-none bg-slate-900/95 border border-slate-600 rounded-md px-3 py-2 text-xs z-10"
      style={{
        left: Math.min(mousePos.x + 15, 700),
        top: Math.max(mousePos.y - 60, 5),
      }}
    >
      <div className="font-bold text-cyan-400">{robot.id} - {robot.name}</div>
      <div className="text-slate-300">Status: <span className="text-white capitalize">{robot.status}</span></div>
      <div className="text-slate-300">Battery: <span className={robot.battery < 30 ? "text-red-400" : "text-green-400"}>{Math.round(robot.battery)}%</span></div>
      <div className="text-slate-300">Efficiency: {Math.round(robot.efficiency * 100)}%</div>
      {robot.currentPayload > 0 && (
        <div className="text-amber-400">Carrying: {Math.round(robot.currentPayload)}kg</div>
      )}
    </div>
  );
};

// Helper functions for grid layout (must match backend)
function getZoneFromPosition(x: number, y: number): string | null {
  const zones = ["A", "B", "C", "D", "E"];
  for (let z = 0; z < zones.length; z++) {
    const baseX = 4 + z * 11;
    for (let row = 0; row < 2; row++) {
      const baseY = 3 + row * 18;
      if (
        x >= baseX && x < baseX + 8 &&
        ((y >= baseY && y < baseY + 4) || (y >= baseY + 6 && y < baseY + 10))
      ) {
        return zones[z];
      }
    }
  }
  return null;
}

function isChargingStation(x: number, y: number): boolean {
  for (let i = 0; i < 6; i++) {
    if (x === 1 && y === 5 + i * 6) return true;
    if (x === 58 && y === 5 + i * 6) return true;
  }
  return false;
}

function isDropOffPoint(x: number, y: number): boolean {
  if (x === 2 && y === 2) return true;
  if (x === 57 && y === 2) return true;
  if (x === 30 && y === 38) return true;
  return false;
}

export default WarehouseCanvas;
