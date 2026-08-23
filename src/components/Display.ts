import { IDisplay } from '../interfaces/IDisplay';
import { GameState } from '../interfaces/GameState';
import { Move } from '../interfaces/Move';

export class Display implements IDisplay {
  renderBoard(state: GameState): void {
    // TODO: Implement renderBoard
  }

  showInvalidMoveError(message: string): void {
    // TODO: Implement showInvalidMoveError
  }

  bindSquareClick(callback: (move: Move) => void): void {
    // TODO: Implement bindSquareClick
  }

  showOverlay(message: string): void {
    // TODO: Implement showOverlay
  }
}
