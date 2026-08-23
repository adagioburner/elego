import { Player } from './Player';
import { Move } from './Move';

export interface GameState {
  board: Player[][]; // 8x8 grid
  currentPlayer: Player;
  turnNumber: number; // Starts at 1. Total turn count (moves 1-6 are unrestricted)
  lastMove?: Move;
}
