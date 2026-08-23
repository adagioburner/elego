import { GameState } from './GameState';
import { Move } from './Move';
import { Player } from './Player';

export interface IGameEngine {
  initializeGame(): void;
  getGameState(): GameState;
  getValidMoves(state: GameState): Move[];
  applyMoveToCurrent(move: Move): boolean; // Mutates the true game state. Returns true if valid.
  simulateMove(state: GameState, move: Move): GameState; // Pure function: returns a new state resulting from the move
  checkWinner(state: GameState): Player | 'Ongoing';
}
