import { IGameController } from '../interfaces/IGameController';
import { Move } from '../interfaces/Move';
import { GameStats } from '../interfaces/GameStats';
import { Player } from '../interfaces/Player';

export class GameController implements IGameController {
  startGame(humanPlaysFirst: boolean, aiThinkTimeMs: number): void {
    // TODO: Implement startGame
  }

  handleHumanMoveInput(move: Move): void {
    // TODO: Implement handleHumanMoveInput
  }

  promptAiMove(): void {
    // TODO: Implement promptAiMove
  }

  updateStats(stats: GameStats): void {
    // TODO: Implement updateStats
  }

  announceResult(winner: Player): void {
    // TODO: Implement announceResult
  }

  toggleStatsPanel(show: boolean): void {
    // TODO: Implement toggleStatsPanel
  }
}
