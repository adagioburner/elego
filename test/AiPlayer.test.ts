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

    it('returns a valid move with RandomImprovingProximity expansion strategy', async () => {
      aiPlayer.setExpansionStrategy('RandomImprovingProximity');
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

    it('calculates a positive score when AI has more accessible squares', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      // AI in center
      board[3][3] = Player.Black;
      // Human trapped in a corner
      board[0][0] = Player.White;
      board[0][1] = Player.Black;
      board[1][0] = Player.Black;
      board[1][1] = Player.Black;

      const state: GameState = {
        board: board,
        currentPlayer: Player.Black,
        turnNumber: 5
      };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.Black);
      expect(score).toBeGreaterThan(0);
    });
  });
});
