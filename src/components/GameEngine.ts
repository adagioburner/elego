import { IGameEngine } from '../interfaces/IGameEngine';
import { GameState } from '../interfaces/GameState';
import { Move } from '../interfaces/Move';
import { Player } from '../interfaces/Player';
import { GameBoard, BOARD_SIZE } from './GameBoard';

const RESTRICTED_PLACEMENT_TURN_THRESHOLD = 7;
export { BOARD_SIZE };

export class GameEngine implements IGameEngine {
  private currentState: GameState;

  constructor() {
    this.currentState = this.createInitialState();
  }

  private createInitialState(): GameState {
    const board = new GameBoard();
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

  getValidMoves(state: GameState): Move[] {
    const validMoves: Move[] = [];
    const isMainPhase = state.turnNumber >= RESTRICTED_PLACEMENT_TURN_THRESHOLD;

    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        if (state.board.get(x, y) === Player.None) {
          if (!isMainPhase) {
            // Check for symmetric restriction on turn 2
            if (state.turnNumber === 2 && state.lastMove) {
              const lx = state.lastMove.x;
              const ly = state.lastMove.y;
              if ((x === BOARD_SIZE - 1 - lx && y === ly) ||
                  (x === lx && y === BOARD_SIZE - 1 - ly) ||
                  (x === BOARD_SIZE - 1 - lx && y === BOARD_SIZE - 1 - ly)) {
                continue;
              }
            }
            validMoves.push({ x, y });
          } else {
            // Check for adjacency to at least one piece of the current player's color
            if (this.isAdjacentToOwnPiece(state, x, y, state.currentPlayer)) {
              validMoves.push({ x, y });
            }
          }
        }
      }
    }

    return validMoves;
  }

  private isAdjacentToOwnPiece(state: GameState, x: number, y: number, player: Player): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const ny = y + dy;
        const nx = x + dx;

        if (ny >= 0 && ny < BOARD_SIZE && nx >= 0 && nx < BOARD_SIZE) {
          if (state.board.get(nx, ny) === player) {
            return true;
          }
        }
      }
    }
    return false;
  }

  applyMoveToCurrent(move: Move): boolean {
    const validMoves = this.getValidMoves(this.currentState);
    const isValid = validMoves.some(m => m.x === move.x && m.y === move.y);

    if (isValid) {
      this.currentState = this.simulateMove(this.currentState, move);
      return true;
    }

    return false;
  }

  simulateMove(state: GameState, move: Move): GameState {
    const newBoard = state.board.clone();
    newBoard.set(move.x, move.y, state.currentPlayer);

    const nextPlayer = state.currentPlayer === Player.Black ? Player.White : Player.Black;

    return {
      board: newBoard,
      currentPlayer: nextPlayer,
      turnNumber: state.turnNumber + 1,
      lastMove: { ...move }
    };
  }

  checkWinner(state: GameState): Player | 'Ongoing' {
    const validMoves = this.getValidMoves(state);
    if (validMoves.length === 0) {
      // The current player has no valid moves, so the other player wins
      return state.currentPlayer === Player.Black ? Player.White : Player.Black;
    }
    return 'Ongoing';
  }
}
