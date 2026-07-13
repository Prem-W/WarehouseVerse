/**
 * Robot Communication Hub
 * 
 * Simulates decentralized robot-to-robot communication:
 * - Broadcast messages within communication range
 * - Knowledge sharing between nearby robots
 * - Task offers and coordination
 * - Collision warnings
 */

import type { RobotMessage, MessageType, RobotState, KnowledgeEntry, Point } from "./types";

let messageCounter = 0;

export function generateMessageId(): string {
  return `MSG-${++messageCounter}`;
}

/**
 * Communication Hub manages inter-robot messaging
 */
export class CommunicationHub {
  private messages: RobotMessage[] = [];
  private globalMessageQueue: RobotMessage[] = [];

  // Statistics
  totalMessagesSent = 0;
  messagesByType: Map<MessageType, number> = new Map();

  private communicationRange: number;

  constructor(communicationRange: number = 8) {
    this.communicationRange = communicationRange;
  }

  /**
   * Send a message from one robot to another (or broadcast)
   */
  send(
    senderId: string,
    receiverId: string | "broadcast",
    type: MessageType,
    content: Record<string, unknown>,
    tick: number,
    ttl: number = 5
  ): RobotMessage {
    const message: RobotMessage = {
      id: generateMessageId(),
      senderId,
      receiverId: receiverId === "broadcast" ? "broadcast" : receiverId,
      type,
      content,
      tick,
      ttl,
    };

    this.messages.push(message);
    this.globalMessageQueue.push(message);
    this.totalMessagesSent++;

    const count = this.messagesByType.get(type) ?? 0;
    this.messagesByType.set(type, count + 1);

    return message;
  }

  /**
   * Broadcast a message to all robots in range
   */
  broadcast(
    senderId: string,
    senderPos: Point,
    robotPositions: Map<string, Point>,
    type: MessageType,
    content: Record<string, unknown>,
    tick: number
  ): RobotMessage[] {
    const sent: RobotMessage[] = [];

    for (const [robotId, pos] of robotPositions) {
      if (robotId === senderId) continue;

      const dx = pos.x - senderPos.x;
      const dy = pos.y - senderPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.communicationRange) {
        const msg = this.send(senderId, robotId, type, content, tick);
        sent.push(msg);
      }
    }

    // Also add a broadcast entry
    const broadcast = this.send(senderId, "broadcast", type, content, tick);
    sent.push(broadcast);

    return sent;
  }

  /**
   * Process incoming messages for a robot
   */
  processIncoming(robot: RobotState, currentTick: number): void {
    const relevant = this.messages.filter(
      m =>
        m.receiverId === robot.id ||
        m.receiverId === "broadcast" ||
        m.senderId === robot.id
    );

    for (const msg of relevant) {
      // Check TTL
      if (currentTick - msg.tick > msg.ttl) continue;

      // Skip self-messages
      if (msg.senderId === robot.id) continue;

      robot.messages.push(msg);

      // Process based on message type
      this.processMessage(robot, msg, currentTick);
    }
  }

  private processMessage(
    robot: RobotState,
    msg: RobotMessage,
    _currentTick: number
  ): void {
    switch (msg.type) {
      case "collision_warning": {
        const collisionPoint = msg.content.position as Point;
        if (collisionPoint) {
          const dx = collisionPoint.x - robot.position.x;
          const dy = collisionPoint.y - robot.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 5) {
            robot.strategyProfile.riskTolerance *= 0.7;
            robot.isReplanning = true;
          }
        }
        break;
      }

      case "path_share": {
        const path = msg.content.path as Array<{ x: number; y: number }>;
        const congestion = msg.content.congestion as number;

        if (path && congestion) {
          for (const point of path) {
            const key = `congestion_${point.x}_${point.y}`;
            const current = robot.learnedWeights.get(key) ?? 0;
            robot.learnedWeights.set(key, Math.max(current, congestion * 0.5));
          }
        }
        break;
      }

      case "task_offer": {
        const offeredTaskId = msg.content.taskId as string;

        if (
          robot.currentTaskId === offeredTaskId &&
          robot.efficiency < 0.5
        ) {
          // Consider releasing the task
        }
        break;
      }

      case "knowledge_share": {
        const knowledge = msg.content.knowledge as KnowledgeEntry[];
        if (knowledge) {
          for (const k of knowledge) {
            this.integrateKnowledge(robot, k);
          }
        }
        break;
      }

      case "coordination": {
        const suggestedWait = msg.content.suggestedWait as number;
        if (suggestedWait && robot.status === "moving") {
          robot.waitTicks = Math.max(robot.waitTicks, suggestedWait);
        }
        break;
      }

      case "help_request": {
        const helpPos = msg.content.position as Point;
        if (helpPos && robot.strategyProfile.cooperationBias > 0.5) {
          const dx = helpPos.x - robot.position.x;
          const dy = helpPos.y - robot.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 10 && robot.status === "idle") {
            robot.nearbyRobots.push(msg.senderId);
          }
        }
        break;
      }

      case "status_update": {
        const senderBattery = msg.content.battery as number;

        if (senderBattery !== undefined && senderBattery < 20) {
          const senderPos = msg.content.position as Point;
          if (senderPos) {
            const key = `low_battery_zone_${Math.round(senderPos.x / 5)}_${Math.round(senderPos.y / 5)}`;
            robot.learnedWeights.set(key, 0.8);
          }
        }
        break;
      }
    }
  }

  /**
   * Integrate external knowledge into robot's learned weights
   */
  private integrateKnowledge(robot: RobotState, knowledge: KnowledgeEntry): void {
    const key = `${knowledge.type}_${knowledge.key}`;
    const current = robot.learnedWeights.get(key) ?? 0.5;

    const newValue = current * (1 - knowledge.confidence * 0.3) +
                     knowledge.value * knowledge.confidence * 0.3;

    robot.learnedWeights.set(key, Math.max(0, Math.min(1, newValue)));
  }

  /**
   * Share knowledge with nearby robots
   */
  shareKnowledge(
    robot: RobotState,
    robotPositions: Map<string, Point>,
    currentTick: number
  ): RobotMessage[] {
    const insights = this.extractTopInsights(robot, 5);
    if (insights.length === 0) return [];

    return this.broadcast(
      robot.id,
      robot.position,
      robotPositions,
      "knowledge_share",
      { knowledge: insights },
      currentTick
    );
  }

  /**
   * Warn about potential collision
   */
  warnCollision(
    robot: RobotState,
    otherRobotId: string,
    collisionPoint: Point,
    currentTick: number
  ): RobotMessage {
    return this.send(
      robot.id,
      otherRobotId,
      "collision_warning",
      { position: collisionPoint, predictedTick: currentTick + 5 },
      currentTick
    );
  }

  /**
   * Share path information
   */
  sharePath(
    robot: RobotState,
    robotPositions: Map<string, Point>,
    path: Point[],
    currentTick: number
  ): RobotMessage[] {
    return this.broadcast(
      robot.id,
      robot.position,
      robotPositions,
      "path_share",
      {
        path: path.slice(0, Math.min(path.length, 10)),
        congestion: 0.5,
      },
      currentTick
    );
  }

  /**
   * Coordinate with nearby robots to avoid deadlocks
   */
  coordinate(
    robot: RobotState,
    nearbyRobots: string[],
    robotPositions: Map<string, Point>,
    currentTick: number
  ): RobotMessage[] {
    const messages: RobotMessage[] = [];

    for (const otherId of nearbyRobots) {
      const otherPos = robotPositions.get(otherId);
      if (!otherPos) continue;

      const dx = otherPos.x - robot.position.x;
      const dy = otherPos.y - robot.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 3 && robot.status === "moving") {
        if (robot.id > otherId) {
          messages.push(
            this.send(robot.id, otherId, "coordination", { suggestedWait: 3 }, currentTick)
          );
        }
      }
    }

    return messages;
  }

  /**
   * Extract top insights from robot's learned weights
   */
  private extractTopInsights(robot: RobotState, count: number): KnowledgeEntry[] {
    const entries: KnowledgeEntry[] = [];

    for (const [key, value] of robot.learnedWeights) {
      if (Math.abs(value - 0.5) > 0.1) {
        entries.push({
          robotId: robot.id,
          type: "path_preference",
          key,
          value,
          confidence: Math.abs(value - 0.5) * 2,
          tick: 0,
          useCount: 0,
        });
      }
    }

    entries.sort((a, b) => b.confidence - a.confidence);
    return entries.slice(0, count);
  }

  /**
   * Get messages for a specific tick range
   */
  getMessages(tickStart: number, tickEnd: number): RobotMessage[] {
    return this.messages.filter(m => m.tick >= tickStart && m.tick <= tickEnd);
  }

  /**
   * Get recent messages
   */
  getRecentMessages(limit: number = 50): RobotMessage[] {
    return this.messages.slice(-limit);
  }

  /**
   * Clear old messages to manage memory
   */
  cleanup(): void {
    const recent = this.globalMessageQueue.slice(-500);
    this.globalMessageQueue = recent;
    if (this.messages.length > 1000) {
      this.messages = this.messages.slice(-500);
    }
  }

  /**
   * Get communication statistics
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {
      totalMessages: this.totalMessagesSent,
    };

    for (const [type, count] of this.messagesByType) {
      stats[`msg_${type}`] = count;
    }

    return stats;
  }

  reset(): void {
    this.messages = [];
    this.globalMessageQueue = [];
    this.totalMessagesSent = 0;
    this.messagesByType.clear();
    messageCounter = 0;
  }
}
