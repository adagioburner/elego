import { IAiPlayer } from '../interfaces/IAiPlayer';
import { GameState } from '../interfaces/GameState';
import { Move } from '../interfaces/Move';
import { AiStats } from '../interfaces/AiStats';

export class AiPlayer implements IAiPlayer {
  setThinkTime(ms: number): void {
    // TODO: Implement setThinkTime
  }

  setSimulationMode(mode: 'RandomRollout' | 'ProximityHeuristic'): void {
    // TODO: Implement setSimulationMode
  }

  calculateBestMove(currentState: GameState): Promise<Move> {
    // TODO: Implement calculateBestMove
    return Promise.resolve(null as any);
  }

  getStats(): AiStats {
    // TODO: Implement getStats
    return null as any;
  }
}
