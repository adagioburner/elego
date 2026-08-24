import { GameState } from './GameState';
import { Position } from './Position';
import { AiStats } from './AiStats';

export interface IAiPlayer {
  setThinkTime(ms: number): void;
  setSimulationMode(mode: 'RandomRollout' | 'ProximityHeuristic'): void;
  setExpansionStrategy(strategy: 'Random' | 'BestProximity' | 'RandomImprovingProximity'): void;
  calculateBestPosition(currentState: GameState): Promise<Position>;
  getStats(): AiStats; // Returns nodes searched, time taken, etc.
}
