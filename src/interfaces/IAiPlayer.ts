import { GameState } from './GameState';
import { Move } from './Move';
import { AiStats } from './AiStats';

export interface IAiPlayer {
  setThinkTime(ms: number): void;
  setSimulationMode(mode: 'RandomRollout' | 'ProximityHeuristic' | 'Hybrid'): void;
  setExpansionStrategy(strategy: 'Random' | 'BestProximity' | 'Pruned'): void;
  setProximityScoreMax(max: number): void;
  setProximityScoreMin(min: number): void;
  setPruningLimit(limit: number): void;
  calculateBestMove(currentState: GameState): Promise<Move>;
  getStats(): AiStats; // Returns nodes searched, time taken, etc.
}
