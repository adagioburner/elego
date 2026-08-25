import { AiPlayer } from '../src/components/AiPlayer';
import { GameState } from '../src/interfaces/GameState';
import { Player } from '../src/interfaces/Player';
import { BOARD_SIZE } from '../src/components/GameEngine';

describe('AiPlayer Component', () => {
  let aiPlayer: AiPlayer;
  let emptyBoard: Player[][];

  beforeEach(() => {
    aiPlayer = new AiPlayer();
    aiPlayer.setThinkTime(50); // Set small think time for fast tests

    emptyBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
  });

  describe('calculateBestMove (MCTS)', () => {
    it('returns a valid move within the think time', async () => {
      const initialState: GameState = {
        board: emptyBoard,
        currentPlayer: Player.Black,
        turnNumber: 1
      };

      const startTime = Date.now();
      const move = await aiPlayer.calculateBestMove(initialState);
      const elapsed = Date.now() - startTime;

      expect(move).toBeDefined();
      expect(move.x).toBeGreaterThanOrEqual(0);
      expect(move.x).toBeLessThan(BOARD_SIZE);
      expect(move.y).toBeGreaterThanOrEqual(0);
      expect(move.y).toBeLessThan(BOARD_SIZE);

      // Allow slight overhead
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(150);
    });

    it('returns a valid move with ProximityHeuristic simulation mode', async () => {
      aiPlayer.setSimulationMode('ProximityHeuristic');
      const initialState: GameState = {
        board: emptyBoard,
        currentPlayer: Player.White, // Test white player
        turnNumber: 2
      };

      const move = await aiPlayer.calculateBestMove(initialState);
      expect(move).toBeDefined();
    });
  });

  describe('available moves (MCTS state generation)', () => {
    it('returns 8 available moves if there is only one black piece (turn > 6)', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[4][4] = Player.Black;
      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 7 };
      const engine = (aiPlayer as any).gameEngine;
      const validMoves = engine.getValidMoves(state);
      expect(validMoves.length).toBe(8);
    });

    it('returns 10 available moves if there are two pieces adjacent by side', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[4][4] = Player.Black;
      board[4][5] = Player.Black;
      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 7 };
      const engine = (aiPlayer as any).gameEngine;
      const validMoves = engine.getValidMoves(state);
      expect(validMoves.length).toBe(10);
    });

    it('returns 12 available moves if there are two pieces adjacent diagonally', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[4][4] = Player.Black;
      board[5][5] = Player.Black;
      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 7 };
      const engine = (aiPlayer as any).gameEngine;
      const validMoves = engine.getValidMoves(state);
      expect(validMoves.length).toBe(12);
    });

    it('returns 7 available moves if there are two pieces of different color next to each other by side', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[4][4] = Player.Black;
      board[4][5] = Player.White;
      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 7 };
      const engine = (aiPlayer as any).gameEngine;
      const validMoves = engine.getValidMoves(state);
      expect(validMoves.length).toBe(7);
    });
  });

  describe('Expansion Strategies', () => {
    it('returns a valid move with BestProximity expansion strategy', async () => {
      aiPlayer.setExpansionStrategy('BestProximity');
      const initialState: GameState = {
        board: emptyBoard,
        currentPlayer: Player.Black,
        turnNumber: 1
      };

      const move = await aiPlayer.calculateBestMove(initialState);
      expect(move).toBeDefined();
    });
  });

  describe('calculateProximityScore (via reflection for testing)', () => {
    it('calculates 0 when board is empty', () => {
      const state: GameState = {
        board: emptyBoard,
        currentPlayer: Player.Black,
        turnNumber: 1
      };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.Black);
      expect(score).toBe(0);
    });

    it('calculates a score of 0 for a symmetrical move', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[3][3] = Player.Black;
      board[3][4] = Player.White;

      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 2 };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.Black);
      expect(score).toBe(0);
    });

    it('calculates score correctly for Black at (2,5) and White at (3,5) with Chebyshev distance', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[4][1] = Player.Black; // x=1, y=4
      board[4][2] = Player.White; // x=2, y=4

      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 2 };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.White);
      expect(score).toBe(28);
    });

    it('calculates score correctly for Black at (2,5) and White at (5,5) with Chebyshev distance', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[4][1] = Player.Black;
      board[4][4] = Player.White;

      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 2 };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.White);
      expect(score).toBe(16);
    });

    it('calculates score correctly for walled out parts -> score 32', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      for (let x = 0; x < BOARD_SIZE; x++) {
        board[1][x] = Player.Black;
        board[2][x] = Player.White;
      }

      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 16 };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.White);
      expect(score).toBe(32);
    });

    it('calculates score correctly when AI has walled in the opponent in a corner', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      // Black in center
      board[1][1] = Player.Black;
      // Human trapped in top left corner (0,0)
      board[0][0] = Player.White;

      // Black walls White in completely at (0,1) and (1,0) and (1,1)
      board[0][1] = Player.Black;
      board[1][0] = Player.Black;

      const state: GameState = {
        board: board,
        currentPlayer: Player.Black,
        turnNumber: 5
      };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.Black);
      // Total squares = 64.
      // Black pieces = 3. White pieces = 1.
      // Empty squares = 60.
      // All 60 empty squares are reachable by Black.
      // 0 empty squares are reachable by White (it's walled in).
      // So score should be exactly 60.
      expect(score).toBe(60);
    });
  });
});
