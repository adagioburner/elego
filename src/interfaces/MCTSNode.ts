import { GameState } from './GameState';
import { Position } from './Position';

export interface MCTSNode {
  gameState: GameState;
  parent: MCTSNode | null;
  children: MCTSNode[];
  positionFromParent: Position | null;
  visits: number;
  wins: number; // Win score from the perspective of the player who made the move to reach this node
  untriedPositions: Position[];
}
