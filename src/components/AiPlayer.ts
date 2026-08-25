import { IAiPlayer } from '../interfaces/IAiPlayer';
import { GameState } from '../interfaces/GameState';
import { Move } from '../interfaces/Move';
import { AiStats } from '../interfaces/AiStats';
import { Player } from '../interfaces/Player';
import { MCTSNode } from '../interfaces/MCTSNode';
import { Position } from '../interfaces/Position';
import { BOARD_SIZE, GameEngine } from './GameEngine';

const PRUNED_EXPANSION_LIMIT = 10;

export class AiPlayer implements IAiPlayer {
  private thinkTimeMs: number = 1000;
  private simulationMode: 'RandomRollout' | 'ProximityHeuristic' | 'Hybrid' = 'RandomRollout';
  private expansionStrategy: 'Random' | 'BestProximity' | 'Pruned' = 'Random';
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
            if (humanDist - aiDist >= 2) {
              score++;
            }
          } else if (humanDist < aiDist) {
            score--;
            if (aiDist - humanDist >= 2) {
              score--;
            }
          }
        }
      }
    }

    return score;
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

  private expand(node: MCTSNode): MCTSNode {
    if (node.untriedMoves.length === 0) {
      return node; // Cannot expand further
    }

    if (this.expansionStrategy !== 'Random' && !node.untriedMovesEvaluated) {

      for (let i = 0; i < node.untriedMoves.length; i++) {
        const scoredMove = node.untriedMoves[i];
        if (scoredMove && scoredMove.score === undefined) {
          const nextState = this.gameEngine.simulateMove(node.gameState, scoredMove.move);
          scoredMove.score = this.calculateProximityScore(nextState, this.aiPlayerColor);
        }
      }

      // Sort untried moves descending by score
      node.untriedMoves.sort((a, b) => {
        const scoreA = a.score !== undefined ? a.score : -Infinity;
        const scoreB = b.score !== undefined ? b.score : -Infinity;
        return scoreB - scoreA;
      });

      if (this.expansionStrategy === 'Pruned' && node.untriedMoves.length > PRUNED_EXPANSION_LIMIT) {
        const thresholdScore = node.untriedMoves[PRUNED_EXPANSION_LIMIT - 1]?.score;
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

          const movesNeededFromThreshold = PRUNED_EXPANSION_LIMIT - firstIndexOfThreshold;
          const thresholdMovesAvailable = lastIndexOfThreshold - firstIndexOfThreshold + 1;

          if (movesNeededFromThreshold < thresholdMovesAvailable) {
            // We need to randomly pick `movesNeededFromThreshold` from the ties
            const ties = node.untriedMoves.slice(firstIndexOfThreshold, lastIndexOfThreshold + 1);
            // Shuffle ties
            for (let i = ties.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [ties[i], ties[j]] = [ties[j], ties[i]];
            }

            // Re-insert the chosen ties back into the array up to PRUNED_EXPANSION_LIMIT
            node.untriedMoves.splice(
              firstIndexOfThreshold,
              ties.length,
              ...ties.slice(0, movesNeededFromThreshold)
            );
          }
        }

        // Truncate to the limit
        node.untriedMoves.length = Math.min(node.untriedMoves.length, PRUNED_EXPANSION_LIMIT);
      }

      node.untriedMovesEvaluated = true;
    }

    let chosenMoveIndex = -1;

    if (this.expansionStrategy === 'Random' || this.expansionStrategy === 'Pruned') {
      chosenMoveIndex = Math.floor(Math.random() * node.untriedMoves.length);
    } else if (this.expansionStrategy === 'BestProximity') {
      let bestIndices: number[] = [0];
      const bestScore = node.untriedMoves[0]?.score !== undefined ? node.untriedMoves[0].score : -Infinity;

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

    if (scoredMove && scoredMove.score !== undefined) {
      childNode.proximityScore = scoredMove.score;
    }

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
      const rawScore = node.proximityScore !== undefined
        ? node.proximityScore
        : this.calculateProximityScore(node.gameState, this.aiPlayerColor);

      // Count empty squares for accurate normalization
      const emptySquares = BOARD_SIZE * BOARD_SIZE - node.gameState.turnNumber + 1;

      const normalizedScore = emptySquares === 0 ? 0.5 : Math.max(0, Math.min(1, (rawScore + 2 * emptySquares) / (4 * emptySquares)));

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
