import { GameState } from './GameState';
import { Position } from './Position';

export interface IDisplay {
  renderBoard(state: GameState): void; // Should visually highlight state.lastPosition to indicate the AI's recent move
  showInvalidPositionError(message: string): void; // Provides feedback when a user clicks an invalid square
  bindSquareClick(callback: (move: Position) => void): void;
}
