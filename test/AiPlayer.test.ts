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

    it('prunes untried moves and keeps the ones with highest proximity scores for Pruned strategy', () => {
      aiPlayer.setExpansionStrategy('Pruned');

      const engine = (aiPlayer as any).gameEngine;
      const calculateProximityScoreSpy = jest.spyOn(aiPlayer as any, 'calculateProximityScore');
      const simulateMoveSpy = jest.spyOn(engine, 'simulateMove');

      // Create a mock state
      const state: GameState = {
        board: emptyBoard,
        currentPlayer: Player.Black,
        turnNumber: 1
      };

      // Mock untried moves with 15 moves.
      const mockUntriedMoves = Array(15).fill(null).map((_, i) => ({
        move: { x: i, y: 0 }
      }));

      // Set up our scores to be deterministic: move x=0 gets score 0, x=1 gets 1, ... x=14 gets 14
      // We do this by mocking calculateProximityScore
      calculateProximityScoreSpy.mockImplementation((s: GameState, p: Player) => {
        // Find the move that lead to this state based on our mocked simulateMove
        // But an easier way is to just return a sequence or base it on the state
        // Let's make simulateMove return a dummy state with a special property
        return (s as any)._dummyScore;
      });

      simulateMoveSpy.mockImplementation((s: GameState, move: any) => {
        return {
          ...s,
          _dummyScore: move.x
        };
      });

      const node = {
        gameState: state,
        parent: null,
        children: [],
        moveFromParent: null,
        visits: 0,
        wins: 0,
        untriedMoves: mockUntriedMoves
      };

      const expandMethod = (aiPlayer as any).expand.bind(aiPlayer);
      const childNode = expandMethod(node);

      // The limit is PRUNED_EXPANSION_LIMIT = 10
      // 1 move was expanded into childNode
      // So untriedMoves should have 9 moves left
      expect(node.untriedMoves.length).toBe(9);

      // The total moves considered were the 10 best.
      // So the 1 chosen move + 9 remaining untried moves should be the ones that had scores 14 down to 5.
      const retainedMoves = [...node.untriedMoves, { move: childNode.moveFromParent }];

      const retainedScores = retainedMoves.map(m => m.move.x).sort((a, b) => b - a);
      expect(retainedScores).toEqual([14, 13, 12, 11, 10, 9, 8, 7, 6, 5]);

      calculateProximityScoreSpy.mockRestore();
      simulateMoveSpy.mockRestore();
    });

    it('handles repeated scores correctly when pruning untried moves for Pruned strategy', () => {
      aiPlayer.setExpansionStrategy('Pruned');

      const engine = (aiPlayer as any).gameEngine;
      const calculateProximityScoreSpy = jest.spyOn(aiPlayer as any, 'calculateProximityScore');
      const simulateMoveSpy = jest.spyOn(engine, 'simulateMove');

      const state: GameState = {
        board: emptyBoard,
        currentPlayer: Player.Black,
        turnNumber: 1
      };

      // Mock untried moves with 15 moves.
      const mockUntriedMoves = Array(15).fill(null).map((_, i) => ({
        move: { x: i, y: 0 }
      }));

      // Set up scores with duplicates.
      // Moves 0-4 get score 10
      // Moves 5-14 get score 5
      // This means we need 10 moves. 5 will come from score 10, and 5 will be randomly chosen from the 10 moves that scored 5.
      calculateProximityScoreSpy.mockImplementation((s: GameState, p: Player) => {
        return (s as any)._dummyScore;
      });

      simulateMoveSpy.mockImplementation((s: GameState, move: any) => {
        return {
          ...s,
          _dummyScore: move.x < 5 ? 10 : 5
        };
      });

      const node = {
        gameState: state,
        parent: null,
        children: [],
        moveFromParent: null,
        visits: 0,
        wins: 0,
        untriedMoves: mockUntriedMoves
      };

      const expandMethod = (aiPlayer as any).expand.bind(aiPlayer);
      const childNode = expandMethod(node);

      // The limit is PRUNED_EXPANSION_LIMIT = 10
      // 1 move was expanded into childNode
      // So untriedMoves should have 9 moves left
      expect(node.untriedMoves.length).toBe(9);

      const retainedMoves = [...node.untriedMoves, { move: childNode.moveFromParent }];

      const retainedScores = retainedMoves.map(m => m.move.x < 5 ? 10 : 5);

      // We expect exactly 5 moves with score 10, and 5 moves with score 5
      const score10Count = retainedScores.filter(s => s === 10).length;
      const score5Count = retainedScores.filter(s => s === 5).length;

      expect(score10Count).toBe(5);
      expect(score5Count).toBe(5);

      calculateProximityScoreSpy.mockRestore();
      simulateMoveSpy.mockRestore();
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
    it('calculates 0.5 when board is empty', () => {
      const state: GameState = {
        board: emptyBoard,
        currentPlayer: Player.Black,
        turnNumber: 1
      };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.Black);
      expect(score).toBe(0.5);
    });

    it('calculates a score of 0.5 for a symmetrical move', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[3][3] = Player.Black;
      board[3][4] = Player.White;

      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 2 };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.Black);
      expect(score).toBe(0.5);
    });

    it('calculates score correctly for Black at (2,5) and White at (3,5) with Chebyshev distance', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[4][1] = Player.Black; // x=1, y=4
      board[4][2] = Player.White; // x=2, y=4

      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 2 };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.White);
      expect(score).toBeCloseTo(0.9117647058823529);
    });

    it('calculates score correctly for Black at (2,5) and White at (5,5) with Chebyshev distance', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      board[4][1] = Player.Black;
      board[4][4] = Player.White;

      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 2 };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.White);
      expect(score).toBeCloseTo(0.7123287671232876);
    });

    it('calculates score correctly for walled out parts', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      for (let x = 0; x < BOARD_SIZE; x++) {
        board[1][x] = Player.Black;
        board[2][x] = Player.White;
      }

      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 16 };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.White);
      expect(score).toBeCloseTo(0.8333333333333333);
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
      expect(score).toBe(1);
    });
  });
});
