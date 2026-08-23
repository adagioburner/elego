import { GameState } from './GameState';
import { Move } from './Move';

export interface IDisplay {
  renderBoard(state: GameState): void; // Should visually highlight state.lastMove to indicate the AI's recent move
  showInvalidMoveError(message: string): void; // Provides feedback when a user clicks an invalid square
  bindSquareClick(callback: (move: Move) => void): void;
  showOverlay(message: string): void;
}
