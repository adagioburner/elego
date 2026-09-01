import { Move } from './Move';
import { GameStats } from './GameStats';
import { Player } from './Player';

export interface IGameController {
  startGame(humanPlaysFirst: boolean, aiThinkTimeMs: number): void;
  handleHumanMoveInput(move: Move): void; // Triggered by Display Module
  promptAiMove(): void;
  updateStats(stats: GameStats): void;
  announceResult(winner: Player): void;
}
