import { GameState } from './GameState';
import { Position } from './Position';
import { Player } from './Player';

export interface IGameEngine {
  initializeGame(): void;
  getGameState(): GameState;
  getValidPositions(state: GameState): Position[];
  applyPositionToCurrent(move: Position): boolean; // Mutates the true game state. Returns true if valid.
  simulatePosition(state: GameState, move: Position): GameState; // Pure function: returns a new state resulting from the move
  checkWinner(state: GameState): Player | 'Ongoing';
}
