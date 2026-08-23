import { IGameEngine } from '../interfaces/IGameEngine';
import { GameState } from '../interfaces/GameState';
import { Move } from '../interfaces/Move';
import { Player } from '../interfaces/Player';

export class GameEngine implements IGameEngine {
  initializeGame(): void {
    // TODO: Implement initializeGame
  }

  getGameState(): GameState {
    // TODO: Implement getGameState
    return null as any;
  }

  getValidMoves(state: GameState): Move[] {
    // TODO: Implement getValidMoves
    return [];
  }

  applyMoveToCurrent(move: Move): boolean {
    // TODO: Implement applyMoveToCurrent
    return false;
  }

  simulateMove(state: GameState, move: Move): GameState {
    // TODO: Implement simulateMove
    return null as any;
  }

  checkWinner(state: GameState): Player | 'Ongoing' {
    // TODO: Implement checkWinner
    return 'Ongoing';
  }
}
