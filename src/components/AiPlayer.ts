import { IAiPlayer } from '../interfaces/IAiPlayer';
import { GameState } from '../interfaces/GameState';
import { Move } from '../interfaces/Move';
import { AiStats } from '../interfaces/AiStats';
import { Player } from '../interfaces/Player';
import { Move } from '../interfaces/Move';
import { MCTSNode } from '../interfaces/MCTSNode';
import { BOARD_SIZE, GameEngine } from './GameEngine';

export class AiPlayer implements IAiPlayer {
  private thinkTimeMs: number = 1000;
  private simulationMode: 'RandomRollout' | 'ProximityHeuristic' = 'RandomRollout';
  private expansionStrategy: 'Random' | 'BestProximity' | 'RandomImprovingProximity' = 'Random';
  private gameEngine: GameEngine = new GameEngine();
  private stats: AiStats = { totalNodes: 0, calculationTimeMs: 0, bestMoveWinRate: 0 };
  private aiPlayerColor: Player = Player.None;

  private calculateProximityScore(state: GameState, aiPlayerColor: Player): number {
    const humanPlayerColor = aiPlayerColor === Player.Black ? Player.White : Player.Black;

    // Distances from every square to the nearest AI/Human piece
    // Initialize with infinity
    const aiDistances: number[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Infinity));
    const humanDistances: number[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Infinity));

    // Queues for BFS
    const aiQueue: Position[] = [];
    const humanQueue: Position[] = [];

    // Find initial pieces
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const piece = state.board[y][x];
        if (piece === aiPlayerColor) {
          aiQueue.push({ x, y });
          aiDistances[y][x] = 0;
        } else if (piece === humanPlayerColor) {
          humanQueue.push({ x, y });
          humanDistances[y][x] = 0;
        }
      }
    }

    // Helper for BFS
    const runBfs = (queue: Position[], distances: number[][], opponentColor: Player) => {
      let head = 0;
      while (head < queue.length) {
        const { x, y } = queue[head++];
        const currentDist = distances[y][x];

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
              // Treat opponent's pieces as walls
              if (state.board[ny][nx] !== opponentColor) {
                // If it's empty (or our own piece, though that would already have dist 0), check distance
                if (distances[ny][nx] > currentDist + 1) {
                  distances[ny][nx] = currentDist + 1;
                  queue.push({ x: nx, y: ny });
                }
              }
            }
          }
        }
      }
    };

    runBfs(aiQueue, aiDistances, humanPlayerColor);
    runBfs(humanQueue, humanDistances, aiPlayerColor);

    let score = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (state.board[y][x] === Player.None) {
          const aiDist = aiDistances[y][x];
          const humanDist = humanDistances[y][x];

          if (aiDist < humanDist) {
            score++;
          } else if (humanDist < aiDist) {
            score--;
          }
        }
      }
    }

    return score;
  }

  setThinkTime(ms: number): void {
    this.thinkTimeMs = ms;
  }

  setSimulationMode(mode: 'RandomRollout' | 'ProximityHeuristic'): void {
    this.simulationMode = mode;
  }

  setExpansionStrategy(strategy: 'Random' | 'BestProximity' | 'RandomImprovingProximity'): void {
    this.expansionStrategy = strategy;
  }

  private expand(node: MCTSNode): MCTSNode {
    if (node.untriedMoves.length === 0) {
      return node; // Cannot expand further
    }

    let chosenMoveIndex = -1;

    if (this.expansionStrategy === 'Random') {
      chosenMoveIndex = Math.floor(Math.random() * node.untriedMoves.length);
    } else if (this.expansionStrategy === 'BestProximity') {
      let bestScore = -Infinity;
      let bestIndices: number[] = [];

      for (let i = 0; i < node.untriedMoves.length; i++) {
        const move = node.untriedMoves[i];
        // The game engine simulates the move assuming it's current player's turn
        // Set the state in a fresh engine or use simulateMove
        const nextState = this.gameEngine.simulateMove(node.gameState, move);
        const score = this.calculateProximityScore(nextState, this.aiPlayerColor);

        if (score > bestScore) {
          bestScore = score;
          bestIndices = [i];
        } else if (score === bestScore) {
          bestIndices.push(i);
        }
      }

      // Break ties randomly
      chosenMoveIndex = bestIndices[Math.floor(Math.random() * bestIndices.length)];
    } else if (this.expansionStrategy === 'RandomImprovingProximity') {
      const currentScore = this.calculateProximityScore(node.gameState, this.aiPlayerColor);
      let improvingIndices: number[] = [];

      for (let i = 0; i < node.untriedMoves.length; i++) {
        const move = node.untriedMoves[i];
        const nextState = this.gameEngine.simulateMove(node.gameState, move);
        const score = this.calculateProximityScore(nextState, this.aiPlayerColor);

        if (score > currentScore) {
          improvingIndices.push(i);
        }
      }

      if (improvingIndices.length > 0) {
        chosenMoveIndex = improvingIndices[Math.floor(Math.random() * improvingIndices.length)];
      } else {
        // Fallback: choose a completely random move
        chosenMoveIndex = Math.floor(Math.random() * node.untriedMoves.length);
      }
    }

    const move = node.untriedMoves[chosenMoveIndex];
    node.untriedMoves.splice(chosenMoveIndex, 1);

    const nextState = this.gameEngine.simulateMove(node.gameState, move);

    const childNode: MCTSNode = {
      gameState: nextState,
      parent: node,
      children: [],
      moveFromParent: move,
      visits: 0,
      wins: 0,
      untriedMoves: this.gameEngine.getValidMoves(nextState)
    };

    node.children.push(childNode);
    return childNode;
  }

  private simulate(node: MCTSNode): number {
    if (this.simulationMode === 'ProximityHeuristic') {
      // Evaluate the non-terminal state directly
      const rawScore = this.calculateProximityScore(node.gameState, this.aiPlayerColor);
      // Max possible score is roughly the number of empty squares.
      // Normalizing to [0, 1] for win probability compatibility in MCTS.
      // E.g., worst case is around -64, best case is +64.
      const maxScore = BOARD_SIZE * BOARD_SIZE;
      const normalizedScore = (rawScore + maxScore) / (2 * maxScore);
      // Clamp between 0 and 1 just in case
      return Math.max(0, Math.min(1, normalizedScore));
    } else {
      // Random Rollout
      let currentState = node.gameState;
      while (true) {
        const winner = this.gameEngine.checkWinner(currentState);
        if (winner !== 'Ongoing') {
          // In EleGo, checkWinner returns the opponent of the player who has 0 valid moves
          // Meaning if the current state has winner === aiPlayerColor, AI wins (score 1)
          if (winner === this.aiPlayerColor) return 1;
          if (winner === Player.None) return 0.5; // Shouldn't happen based on rules, but safe
          return 0; // AI lost
        }

        const validMoves = this.gameEngine.getValidMoves(currentState);
        if (validMoves.length === 0) {
           // Defensive check
           return currentState.currentPlayer === this.aiPlayerColor ? 0 : 1;
        }

        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        currentState = this.gameEngine.simulateMove(currentState, randomMove);
      }
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
        untriedMoves: this.gameEngine.getValidMoves(currentState)
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
            bestMoveWinRate: mostVisitedChild.wins / mostVisitedChild.visits
          };

          if (mostVisitedChild && mostVisitedChild.moveFromParent) {
            resolve(mostVisitedChild.moveFromParent);
          } else {
            // Fallback (e.g. timeout before expanding any children)
            const fallbackMove = rootNode.untriedMoves[0] || currentState.lastMove;
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
