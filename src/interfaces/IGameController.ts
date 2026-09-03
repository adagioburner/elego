import { Move } from './Move';
import { Player } from './Player';

export interface IGameController {
  startGame(humanPlaysFirst: boolean, aiThinkTimeMs: number): void;
  handleHumanMoveInput(move: Move): void; // Triggered by Display Module
  promptAiMove(): void;
  announceResult(winner: Player): void;
}
