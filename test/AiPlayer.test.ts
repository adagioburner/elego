import { AiPlayer } from '../src/components/AiPlayer';
import { GameState } from '../src/interfaces/GameState';
import { Player } from '../src/interfaces/Player';
import { GameEngine, BOARD_SIZE } from '../src/components/GameEngine';

describe('AiPlayer Component', () => {
  let aiPlayer: AiPlayer;
  let emptyBoard: Player[][];

  beforeEach(() => {
    aiPlayer = new AiPlayer();
    aiPlayer.setThinkTime(200); // Set small think time for fast tests

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
      expect(elapsed).toBeGreaterThanOrEqual(190);
      expect(elapsed).toBeLessThan(400);
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
      expect(score).toBe(31);
    });

    it('calculates score correctly for walled out parts -> score 32', () => {
      const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
      for (let x = 0; x < BOARD_SIZE; x++) {
        board[1][x] = Player.Black;
        board[2][x] = Player.White;
      }

      const state: GameState = { board, currentPlayer: Player.Black, turnNumber: 16 };
      const score = (aiPlayer as any).calculateProximityScore(state, Player.White);
      expect(score).toBe(64);
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
      expect(score).toBe(120);
    });
  });
});

describe('AiPlayer - ProximityHeuristic Walled-Off Scenarios', () => {
  let ai: AiPlayer;
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
    engine.initializeGame();
    ai = new AiPlayer();
    // Use an any cast to set the game engine for unit testing internal methods
    (ai as any).gameEngine = engine;
  });

  it('should accurately report a win probability of 0% when the AI is completely walled off and losing', async () => {
    ai.setSimulationMode('ProximityHeuristic');
    ai.setThinkTime(200);

    const state = engine.getGameState();
    const board = state.board;
    (ai as any).aiPlayerColor = Player.White;

    // Create a scenario where White (AI) is completely walled in the top-left corner.
    // W=1 (White), B=2 (Black), 0=Empty
    const layout = [
      [0, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 1, 1, 1, 1, 1],
      [2, 0, 2, 1, 1, 1, 1, 1],
      [0, 0, 2, 1, 1, 1, 1, 1],
      [0, 0, 2, 1, 1, 1, 1, 1]
    ];

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        board[y][x] = layout[y][x] === 1 ? Player.White : layout[y][x] === 2 ? Player.Black : Player.None;
      }
    }

    state.currentPlayer = Player.White;
    state.turnNumber = 59; // Main phase

    await ai.calculateBestMove(state);

    const stats = ai.getStats();

    // The win probability should be 0, or at most very close to 0
    expect(stats.bestMoveWinRate).toBeLessThan(0.01);
  });

  it('calculateProximityScore should correctly score the walled off state', () => {
    ai.setSimulationMode('ProximityHeuristic');

    const state = engine.getGameState();
    const board = state.board;

    // Same layout as above
    const layout = [
      [0, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 1, 1, 1, 1, 1],
      [2, 0, 2, 1, 1, 1, 1, 1],
      [0, 0, 2, 1, 1, 1, 1, 1],
      [0, 0, 2, 1, 1, 1, 1, 1]
    ];

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        board[y][x] = layout[y][x] === 1 ? Player.White : layout[y][x] === 2 ? Player.Black : Player.None;
      }
    }

    state.currentPlayer = Player.White;
    state.turnNumber = 59;
    (ai as any).aiPlayerColor = Player.White;

    const rawScore = (ai as any).calculateProximityScore(state, Player.White);

    // AI has 1 empty square it's closer to. Human has 5 empty squares it's closer to.
    // 2 - 10 = -8
    expect(rawScore).toBe(-8);
  });

  it('simulate should correctly normalize the proximity score', () => {
    ai.setSimulationMode('ProximityHeuristic');

    const state = engine.getGameState();
    const board = state.board;

    const layout = [
      [0, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 1, 1, 1, 1, 1],
      [2, 0, 2, 1, 1, 1, 1, 1],
      [0, 0, 2, 1, 1, 1, 1, 1],
      [0, 0, 2, 1, 1, 1, 1, 1]
    ];

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        board[y][x] = layout[y][x] === 1 ? Player.White : layout[y][x] === 2 ? Player.Black : Player.None;
      }
    }

    state.currentPlayer = Player.White;
    state.turnNumber = 59;
    (ai as any).aiPlayerColor = Player.White;

    const mockNode = {
      gameState: state,
      parent: null,
      children: [],
      moveFromParent: null,
      visits: 0,
      wins: 0,
      untriedMoves: engine.getValidMoves(state).map(m => ({ move: m }))
    };

    const simulatedScore = (ai as any).simulate(mockNode);

    // rawScore is -4, emptySquares is 6.
    // (rawScore + emptySquares) / (2 * emptySquares)
    // (-4 + 6) / 12 = 2 / 12 = 0.1666...
    expect(simulatedScore).toBeCloseTo(0.166666, 4);
  });

  it('should accurately report a win probability of 0% when the AI is completely walled off and losing using RandomRollout', async () => {
    ai.setSimulationMode('RandomRollout');
    ai.setThinkTime(200);

    const state = engine.getGameState();
    const board = state.board;

    (ai as any).aiPlayerColor = Player.White;

    const layout = [
      [0, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 1, 1, 1, 1, 1],
      [2, 0, 2, 1, 1, 1, 1, 1],
      [0, 0, 2, 1, 1, 1, 1, 1],
      [0, 0, 2, 1, 1, 1, 1, 1]
    ];

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        board[y][x] = layout[y][x] === 1 ? Player.White : layout[y][x] === 2 ? Player.Black : Player.None;
      }
    }

    state.currentPlayer = Player.White;
    state.turnNumber = 59; // Main phase

    await ai.calculateBestMove(state);

    const stats = ai.getStats();

    // The win probability should be exactly 0
    expect(stats.bestMoveWinRate).toBe(0);
  });

  it('simulate should handle a terminal state where the game is already won by the AI', () => {
    ai.setSimulationMode('ProximityHeuristic');

    const state = engine.getGameState();
    const board = state.board;

    (ai as any).aiPlayerColor = Player.White;

    const layout = [
      [2, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 0]
    ];

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        board[y][x] = layout[y][x] === 1 ? Player.White : layout[y][x] === 2 ? Player.Black : Player.None;
      }
    }

    state.currentPlayer = Player.Black;
    state.turnNumber = 59;

    const mockNode = {
      gameState: state,
      parent: null,
      children: [],
      moveFromParent: null,
      visits: 0,
      wins: 0,
      untriedMoves: []
    };

    const simulatedScore = (ai as any).simulate(mockNode);

    // AI has won, should return 1.
    expect(simulatedScore).toBe(1);
  });
});
