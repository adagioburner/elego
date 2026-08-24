import { Position } from './Position';
import { GameStats } from './GameStats';
import { Player } from './Player';

export interface IGameController {
  startGame(humanPlaysFirst: boolean, aiThinkTimeMs: number): void;
  handleHumanPositionInput(move: Position): void; // Triggered by Display Module
  promptAiPosition(): void;
  updateStats(stats: GameStats): void;
  announceResult(winner: Player): void;
  toggleStatsPanel(show: boolean): void;
}
