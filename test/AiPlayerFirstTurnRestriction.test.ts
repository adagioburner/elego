import { AiPlayer } from '../src/components/AiPlayer';
import { GameState } from '../src/interfaces/GameState';
import { Player } from '../src/interfaces/Player';
import { GameBoard } from '../src/components/GameBoard';

describe('AiPlayer First Turn Restriction', () => {
  let aiPlayer: AiPlayer;
  let emptyBoard: GameBoard;

  beforeEach(() => {
    aiPlayer = new AiPlayer();
    emptyBoard = new GameBoard();
  });

  it('restricts available moves for the root node on Turn 1', async () => {
    const initialState: GameState = {
      board: emptyBoard,
      currentPlayer: Player.Black, // AI plays first
      turnNumber: 1
    };

    // Inject a very short think time so the AI quickly returns a move
    aiPlayer.setThinkTime(10);
    const move = await aiPlayer.calculateBestMove(initialState);

    const validFirstMoves = [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 }
    ];

    const isValid = validFirstMoves.some(m => m.x === move.x && m.y === move.y);
    expect(isValid).toBe(true);
  });
});
