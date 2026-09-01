import { IAiPlayer } from '../interfaces/IAiPlayer';
import { GameState } from '../interfaces/GameState';
import { Move } from '../interfaces/Move';
import { AiStats } from '../interfaces/AiStats';
import { Player } from '../interfaces/Player';
import { MCTSNode } from '../interfaces/MCTSNode';
import { Position } from '../interfaces/Position';
import { BOARD_SIZE, GameEngine } from './GameEngine';

const INFINITY = 999999;

class DistanceMap {
  private data: Int32Array;
  constructor() {
    this.data = new Int32Array(BOARD_SIZE * BOARD_SIZE);
  }
  get(x: number, y: number): number {
    return this.data[y * BOARD_SIZE + x];
  }
  set(x: number, y: number, value: number): void {
    this.data[y * BOARD_SIZE + x] = value;
  }
  fill(value: number): void {
    this.data.fill(value);
  }
}

class Queue {
  private xData: Int32Array;
  private yData: Int32Array;
  private head: number = 0;
  private tail: number = 0;
  constructor(capacity: number) {
    this.xData = new Int32Array(capacity);
    this.yData = new Int32Array(capacity);
  }
  push(x: number, y: number): void {
    this.xData[this.tail] = x;
    this.yData[this.tail] = y;
    this.tail++;
  }
  pop(out: { x: number; y: number }): void {
    out.x = this.xData[this.head];
    out.y = this.yData[this.head++];
  }
  get length(): number {
    return this.tail - this.head;
  }
  clear(): void {
    this.head = 0;
    this.tail = 0;
  }
}

export class AiPlayer implements IAiPlayer {
  private thinkTimeMs: number = 5000;
  private simulationMode: 'RandomRollout' | 'ProximityHeuristic' | 'Hybrid' = 'ProximityHeuristic';
  private expansionStrategy: 'Random' | 'BestProximity' | 'Pruned' = 'Pruned';
  private proximityScoreMax: number = 2; // Original logic had an effective max score of 2 per square
  private proximityScoreMin: number = 2;
  private prunedExpansionLimit: number = 10;
  private gameEngine: GameEngine = new GameEngine();
  private stats: AiStats = { totalNodes: 0, calculationTimeMs: 0, bestMoveWinRate: 0 };
  private aiPlayerColor: Player = Player.None;
  private aiDistances: DistanceMap = new DistanceMap();
  private humanDistances: DistanceMap = new DistanceMap();
  private aiQueue: Queue = new Queue(BOARD_SIZE * BOARD_SIZE);
  private humanQueue: Queue = new Queue(BOARD_SIZE * BOARD_SIZE);

  private calculateProximityScore(state: GameState, aiPlayerColor: Player): number {
    const humanPlayerColor = aiPlayerColor === Player.Black ? Player.White : Player.Black;

    // Prepare structures
    this.aiDistances.fill(INFINITY);
    this.humanDistances.fill(INFINITY);
    this.aiQueue.clear();
    this.humanQueue.clear();

    // Find initial pieces
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const piece = state.board[y][x];
        if (piece === aiPlayerColor) {
          this.aiQueue.push(x, y);
          this.aiDistances.set(x, y, 0);
        } else if (piece === humanPlayerColor) {
          this.humanQueue.push(x, y);
          this.humanDistances.set(x, y, 0);
        }
      }
    }

    // Temporary object to hold popped coordinates without allocation
    const currentPos = { x: 0, y: 0 };

    // Helper for BFS
    const runBfs = (queue: Queue, distances: DistanceMap, opponentColor: Player) => {
      while (queue.length > 0) {
        queue.pop(currentPos);
        const { x, y } = currentPos;
        const currentDist = distances.get(x, y);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
              // Treat opponent's pieces as walls
              if (state.board[ny][nx] !== opponentColor) {
                // If it's empty (or our own piece, though that would already have dist 0), check distance
                if (distances.get(nx, ny) > currentDist + 1) {
                  distances.set(nx, ny, currentDist + 1);
                  queue.push(nx, ny);
                }
              }
            }
          }
        }
      }
    };

    runBfs(this.aiQueue, this.aiDistances, humanPlayerColor);
    runBfs(this.humanQueue, this.humanDistances, aiPlayerColor);

    let score = 0;
    let normalizationFactor = 0;

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (state.board[y][x] === Player.None) {
          const aiDist = this.aiDistances.get(x, y);
          const humanDist = this.humanDistances.get(x, y);

          // Handle unreachable distances, which are INFINITY
          let diff = 0;
          if (aiDist === INFINITY && humanDist === INFINITY) {
             diff = 0;
          } else if (aiDist === INFINITY) {
             diff = -this.proximityScoreMax;
          } else if (humanDist === INFINITY) {
             diff = this.proximityScoreMax;
          } else {
             diff = humanDist - aiDist;
          }

          const clampedDiff = Math.max(-this.proximityScoreMax, Math.min(this.proximityScoreMax, diff));

          if (Math.abs(clampedDiff) >= this.proximityScoreMin) {
            score += clampedDiff;
            normalizationFactor += Math.abs(clampedDiff);
          }
        }
      }
    }

    if (normalizationFactor === 0) {
      return 0.5;
    }

    return (score / normalizationFactor + 1) / 2;
  }

  setThinkTime(ms: number): void {
    this.thinkTimeMs = ms;
  }

  setSimulationMode(mode: 'RandomRollout' | 'ProximityHeuristic' | 'Hybrid'): void {
    this.simulationMode = mode;
  }

  setExpansionStrategy(strategy: 'Random' | 'BestProximity' | 'Pruned'): void {
    this.expansionStrategy = strategy;
  }

  setProximityScoreMax(max: number): void {
    this.proximityScoreMax = max;
  }

  setProximityScoreMin(min: number): void {
    this.proximityScoreMin = min;
  }

  setPruningLimit(limit: number): void {
    this.prunedExpansionLimit = limit;
  }

  private expand(node: MCTSNode): MCTSNode {
    if (node.untriedMoves.length === 0) {
      return node; // Cannot expand further
    }

    if (this.expansionStrategy !== 'Random' && !node.untriedMovesEvaluated) {

      for (let i = 0; i < node.untriedMoves.length; i++) {
        const scoredMove = node.untriedMoves[i];
        if (scoredMove && scoredMove.score === undefined) {
          const nextState = this.gameEngine.simulateMove(node.gameState, scoredMove.move);
          scoredMove.score = this.calculateProximityScore(nextState, node.gameState.currentPlayer);
        }
      }

      // Sort untried moves descending by score
      node.untriedMoves.sort((a, b) => {
        const scoreA = a.score !== undefined ? a.score : 0;
        const scoreB = b.score !== undefined ? b.score : 0;
        return scoreB - scoreA;
      });

      if (this.expansionStrategy === 'Pruned' && node.untriedMoves.length > this.prunedExpansionLimit) {
        const thresholdScore = node.untriedMoves[this.prunedExpansionLimit - 1]?.score;
        if (thresholdScore !== undefined) {
          let firstIndexOfThreshold = -1;
          let lastIndexOfThreshold = -1;
          for (let i = 0; i < node.untriedMoves.length; i++) {
            const currentScore = node.untriedMoves[i].score;
            if (currentScore === thresholdScore) {
              if (firstIndexOfThreshold === -1) {
                firstIndexOfThreshold = i;
              }
              lastIndexOfThreshold = i;
            } else if (currentScore !== undefined && currentScore < thresholdScore) {
              break;
            }
          }

          const movesNeededFromThreshold = this.prunedExpansionLimit - firstIndexOfThreshold;
          const thresholdMovesAvailable = lastIndexOfThreshold - firstIndexOfThreshold + 1;

          if (movesNeededFromThreshold < thresholdMovesAvailable) {
            // We need to randomly pick `movesNeededFromThreshold` from the ties
            const ties = node.untriedMoves.slice(firstIndexOfThreshold, lastIndexOfThreshold + 1);
            // Shuffle ties
            for (let i = ties.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [ties[i], ties[j]] = [ties[j], ties[i]];
            }

            // Re-insert the chosen ties back into the array up to this.prunedExpansionLimit
            node.untriedMoves.splice(
              firstIndexOfThreshold,
              ties.length,
              ...ties.slice(0, movesNeededFromThreshold)
            );
          }
        }

        // Truncate to the limit
        node.untriedMoves.length = Math.min(node.untriedMoves.length, this.prunedExpansionLimit);
      }

      node.untriedMovesEvaluated = true;
    }

    let chosenMoveIndex = -1;

    if (this.expansionStrategy === 'Random' || this.expansionStrategy === 'Pruned') {
      chosenMoveIndex = Math.floor(Math.random() * node.untriedMoves.length);
    } else if (this.expansionStrategy === 'BestProximity') {
      let bestIndices: number[] = [0];
      const bestScore = node.untriedMoves[0]?.score !== undefined ? node.untriedMoves[0].score : 0;

      for (let i = 1; i < node.untriedMoves.length; i++) {
        if (node.untriedMoves[i]?.score === bestScore) {
          bestIndices.push(i);
        } else {
          // Since it's sorted, once we hit a lower score we can stop
          break;
        }
      }

      // Break ties randomly
      chosenMoveIndex = bestIndices[Math.floor(Math.random() * bestIndices.length)];
    }

    const scoredMove = node.untriedMoves[chosenMoveIndex];
    if (scoredMove) {
      node.untriedMoves.splice(chosenMoveIndex, 1);
    }

    const move = scoredMove ? scoredMove.move : null;
    if (!move) {
      return node; // Shouldn't happen but defensive
    }

    const nextState = this.gameEngine.simulateMove(node.gameState, move);

    const childNode: MCTSNode = {
      gameState: nextState,
      parent: node,
      children: [],
      moveFromParent: move,
      visits: 0,
      wins: 0,
        untriedMoves: this.gameEngine.getValidMoves(nextState).map(m => ({ move: m }))
    };

    node.children.push(childNode);
    return childNode;
  }

  private runRandomRollout(initialState: GameState): number {
    let currentState = initialState;
    while (true) {
      const validMoves = this.gameEngine.getValidMoves(currentState);

      if (validMoves.length === 0) {
         // The current player has no valid moves, so the other player wins
         const winner = currentState.currentPlayer === Player.Black ? Player.White : Player.Black;
         if (winner === this.aiPlayerColor) return 1;
         return 0; // AI lost
      }

      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      currentState = this.gameEngine.simulateMove(currentState, randomMove);
    }
  }

  private simulate(node: MCTSNode): number {
    if (this.simulationMode === 'ProximityHeuristic' || this.simulationMode === 'Hybrid') {
      // First check if it's already a terminal state
      const winner = this.gameEngine.checkWinner(node.gameState);
      if (winner !== 'Ongoing') {
        if (winner === this.aiPlayerColor) return 1;
        if (winner === Player.None) return 0.5;
        return 0;
      }

      // Evaluate the non-terminal state directly
      const normalizedScore = this.calculateProximityScore(node.gameState, this.aiPlayerColor);

      if (this.simulationMode === 'ProximityHeuristic') {
        return normalizedScore;
      } else {
        // Hybrid: average of normalized proximity score and random rollout score
        const rolloutScore = this.runRandomRollout(node.gameState);
        return (normalizedScore + rolloutScore) / 2;
      }
    } else {
      // Random Rollout
      return this.runRandomRollout(node.gameState);
    }
  }

  private backpropagate(node: MCTSNode, score: number): void {
    let current: MCTSNode | null = node;
    while (current !== null) {
      current.visits++;
      // Score represents win probability for the AI.
      // If the node's game state has currentPlayer === AI, it means the opponent just moved.
      // If the node's game state has currentPlayer === Opponent, it means the AI just moved.
      // We attribute the win score to the player who made the move resulting in this node.
      const playerWhoJustMoved = current.gameState.currentPlayer === Player.Black ? Player.White : Player.Black;

      if (playerWhoJustMoved === this.aiPlayerColor) {
        current.wins += score;
      } else {
        // If the opponent just moved, their win probability is 1 - score
        current.wins += (1 - score);
      }

      current = current.parent;
    }
  }

  private select(node: MCTSNode): MCTSNode {
    let current = node;

    // Descend the tree while nodes are fully expanded and have children
    while (current.untriedMoves.length === 0 && current.children.length > 0) {
      current = this.getBestUctChild(current);
    }

    return current;
  }

  private getBestUctChild(node: MCTSNode): MCTSNode {
    const C = Math.SQRT2; // Exploration parameter
    let bestScore = -Infinity;
    let bestChild: MCTSNode = node.children[0];

    for (const child of node.children) {
      if (child.visits === 0) {
        return child; // Unvisited node has infinite UCT value
      }
      // child.wins represents wins from the perspective of the player who made the move leading to child
      const exploitation = child.wins / child.visits;
      const exploration = C * Math.sqrt(Math.log(node.visits) / child.visits);
      const uctValue = exploitation + exploration;

      if (uctValue > bestScore) {
        bestScore = uctValue;
        bestChild = child;
      }
    }

    return bestChild;
  }

  calculateBestMove(currentState: GameState): Promise<Move> {
    return new Promise((resolve, reject) => {
      this.aiPlayerColor = currentState.currentPlayer;
      const startTime = Date.now();

      const rootNode: MCTSNode = {
        gameState: currentState,
        parent: null,
        children: [],
        moveFromParent: null,
        visits: 0,
        wins: 0,
          untriedMoves: this.gameEngine.getValidMoves(currentState).map(m => ({ move: m }))
      };

      if (rootNode.untriedMoves.length === 0) {
        reject(new Error("No valid moves available."));
        return;
      }

      // Small chunks to avoid blocking the main thread completely
      const runMctsChunk = () => {
        let iterationsThisChunk = 0;

        while (Date.now() - startTime < this.thinkTimeMs && iterationsThisChunk < 100) {
          // 1. Select
          const leafNode = this.select(rootNode);

          // 2. Expand
          const expandedNode = this.expand(leafNode);

          // 3. Simulate
          const score = this.simulate(expandedNode);

          // 4. Backpropagate
          this.backpropagate(expandedNode, score);

          iterationsThisChunk++;
        }

        if (Date.now() - startTime >= this.thinkTimeMs) {
          // Time is up, pick the best move
          let mostVisitedChild = rootNode.children[0];
          for (const child of rootNode.children) {
            if (child.visits > mostVisitedChild.visits) {
              mostVisitedChild = child;
            }
          }

          this.stats = {
            totalNodes: rootNode.visits,
            calculationTimeMs: Date.now() - startTime,
            bestMoveWinRate: mostVisitedChild ? mostVisitedChild.wins / mostVisitedChild.visits : 0
          };

          if (mostVisitedChild && mostVisitedChild.moveFromParent) {
            resolve(mostVisitedChild.moveFromParent);
          } else {
            // Fallback (e.g. timeout before expanding any children)
              const fallbackMove = rootNode.untriedMoves.length > 0 ? rootNode.untriedMoves[0].move : currentState.lastMove;
            resolve(fallbackMove as Move);
          }
        } else {
          // Continue calculating next chunk on next event loop tick
          setTimeout(runMctsChunk, 0);
        }
      };

      runMctsChunk();
    });
  }

  getStats(): AiStats {
    return this.stats;
  }
}
