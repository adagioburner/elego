import { IGameEngine } from '../interfaces/IGameEngine';
import { GameState } from '../interfaces/GameState';
import { Position } from '../interfaces/Position';
import { Player } from '../interfaces/Player';

const RESTRICTED_PLACEMENT_TURN_THRESHOLD = 7;
export const BOARD_SIZE = 8;

export class GameEngine implements IGameEngine {
  private currentState: GameState;

  constructor() {
    this.currentState = this.createInitialState();
  }

  private createInitialState(): GameState {
    const board: Player[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
    return {
      board,
      currentPlayer: Player.Black,
      turnNumber: 1
    };
  }

  initializeGame(): void {
    this.currentState = this.createInitialState();
  }

  getGameState(): GameState {
    return this.currentState;
  }

  getValidPositions(state: GameState): Position[] {
    const validPositions: Position[] = [];
    const isMainPhase = state.turnNumber >= RESTRICTED_PLACEMENT_TURN_THRESHOLD;

    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        if (state.board[y][x] === Player.None) {
          if (!isMainPhase) {
            validPositions.push({ x, y });
          } else {
            // Check for adjacency to at least one piece of the current player's color
            if (this.isAdjacentToOwnPiece(state, x, y, state.currentPlayer)) {
              validPositions.push({ x, y });
            }
          }
        }
      }
    }

    return validPositions;
  }

  private isAdjacentToOwnPiece(state: GameState, x: number, y: number, player: Player): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const ny = y + dy;
        const nx = x + dx;

        if (ny >= 0 && ny < BOARD_SIZE && nx >= 0 && nx < BOARD_SIZE) {
          if (state.board[ny][nx] === player) {
            return true;
          }
        }
      }
    }
    return false;
  }

  applyPositionToCurrent(move: Position): boolean {
    const validPositions = this.getValidPositions(this.currentState);
    const isValid = validPositions.some(m => m.x === move.x && m.y === move.y);

    if (isValid) {
      this.currentState = this.simulatePosition(this.currentState, move);
      return true;
    }

    return false;
  }

  simulatePosition(state: GameState, move: Position): GameState {
    const newBoard = state.board.map(row => [...row]);
    newBoard[move.y][move.x] = state.currentPlayer;

    const nextPlayer = state.currentPlayer === Player.Black ? Player.White : Player.Black;

    return {
      board: newBoard,
      currentPlayer: nextPlayer,
      turnNumber: state.turnNumber + 1,
      lastPosition: { ...move }
    };
  }

  checkWinner(state: GameState): Player | 'Ongoing' {
    const validPositions = this.getValidPositions(state);
    if (validPositions.length === 0) {
      // The current player has no valid moves, so the other player wins
      return state.currentPlayer === Player.Black ? Player.White : Player.Black;
    }
    return 'Ongoing';
  }
}
