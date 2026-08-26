import { GameState } from './GameState';
import { Move } from './Move';

export interface ScoredMove {
  move: Move;
  score?: number;
}

export interface MCTSNode {
  gameState: GameState;
  parent: MCTSNode | null;
  children: MCTSNode[];
  moveFromParent: Move | null;
  visits: number;
  wins: number; // Win score from the perspective of the player who made the move to reach this node
  untriedMoves: ScoredMove[];
  untriedMovesEvaluated?: boolean;
}
