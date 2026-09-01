import { Player } from './Player';
import { Move } from './Move';
import { GameBoard } from '../components/GameBoard';

export interface GameState {
  board: GameBoard; // 8x8 grid represented by GameBoard wrapper
  currentPlayer: Player;
  turnNumber: number; // Starts at 1. Total turn count (moves 1-6 are unrestricted)
  lastMove?: Move;
}
