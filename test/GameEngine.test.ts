import { GameEngine, BOARD_SIZE } from '../src/components/GameEngine';
import { Player } from '../src/interfaces/Player';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('Initialization', () => {
    it('should initialize an 8x8 board populated with Player.None, Turn 1, and Player.Black to start', () => {
      engine.initializeGame();
      const state = engine.getGameState();

      expect(state.board.length).toBe(BOARD_SIZE);
      expect(state.board[0].length).toBe(BOARD_SIZE);
      state.board.forEach(row => {
        row.forEach(cell => {
          expect(cell).toBe(Player.None);
        });
      });

      expect(state.turnNumber).toBe(1);
      expect(state.currentPlayer).toBe(Player.Black);
    });
  });

  describe('Initial phase (Turns 1-6)', () => {
    it('should allow placement on any empty square on turn 1', () => {
      engine.initializeGame();
      const state = engine.getGameState();

      const validMoves = engine.getValidMoves(state);
      expect(validMoves.length).toBe(BOARD_SIZE * BOARD_SIZE); // 8x8 empty squares
    });

    it('should allow placement on any empty square after a few moves', () => {
      engine.initializeGame();

      engine.applyMoveToCurrent({ x: 3, y: 3 }); // Turn 1
      engine.applyMoveToCurrent({ x: 0, y: 0 }); // Turn 2 (avoid restricted moves (4,3), (3,4), (4,4))
      engine.applyMoveToCurrent({ x: 3, y: 4 }); // Turn 3

      const state = engine.getGameState();
      const validMoves = engine.getValidMoves(state);

      // On turn 4, there are 3 pieces on the board, so 64 - 3 = 61 empty squares.
      // 64 - (4 - 1) = 61
      expect(validMoves.length).toBe((BOARD_SIZE * BOARD_SIZE) - (state.turnNumber - 1));
    });

    it('should prohibit symmetric moves on turn 2', () => {
      engine.initializeGame();

      engine.applyMoveToCurrent({ x: 3, y: 3 }); // Turn 1 (Black)

      const state = engine.getGameState();
      const validMoves = engine.getValidMoves(state);

      // Total empty is 63. 3 are prohibited. 63 - 3 = 60 valid moves.
      expect(validMoves.length).toBe(60);

      // The prohibited moves for (3,3) on 8x8 are: (4,3), (3,4), (4,4)
      expect(validMoves.some(m => m.x === 4 && m.y === 3)).toBe(false);
      expect(validMoves.some(m => m.x === 3 && m.y === 4)).toBe(false);
      expect(validMoves.some(m => m.x === 4 && m.y === 4)).toBe(false);

      // Other moves should be valid
      expect(validMoves.some(m => m.x === 0 && m.y === 0)).toBe(true);
    });
  });

  describe('Main phase (Turn 7+)', () => {
    it('should strictly allow placement only adjacent to own pieces', () => {
      engine.initializeGame();

      // Setup a mock board state for Turn 7
      // We manually apply moves to reach turn 7
      // Moves 1-6 are unresticted.
      // Move 1 (B): 3,3
      // Move 2 (W): 0,0 (avoid restricted symmetric move on turn 2)
      // Move 3 (B): 3,4
      // Move 4 (W): 4,5
      // Move 5 (B): 2,3
      // Move 6 (W): 5,5

      engine.applyMoveToCurrent({ x: 3, y: 3 });
      engine.applyMoveToCurrent({ x: 0, y: 0 });
      engine.applyMoveToCurrent({ x: 3, y: 4 });
      engine.applyMoveToCurrent({ x: 4, y: 5 });
      engine.applyMoveToCurrent({ x: 2, y: 3 });
      engine.applyMoveToCurrent({ x: 5, y: 5 });

      const state = engine.getGameState();
      expect(state.turnNumber).toBe(7);
      expect(state.currentPlayer).toBe(Player.Black);

      const validMoves = engine.getValidMoves(state);
      // Valid adjacent spaces to B's pieces at (3,3), (3,4), (2,3)
      // They are scattered. Let's make sure it doesn't just return all empty spaces
      expect(validMoves.length).toBeLessThan((BOARD_SIZE * BOARD_SIZE) - 6);

      // E.g., (2,2) is adjacent to (3,3) and (2,3)
      expect(validMoves.some(m => m.x === 2 && m.y === 2)).toBe(true);

      // E.g., (0,0) is far away
      expect(validMoves.some(m => m.x === 0 && m.y === 0)).toBe(false);
    });
  });

  describe('Move Application', () => {
    it('should update the board, toggle currentPlayer, and increment turnNumber', () => {
      engine.initializeGame();
      const initialState = engine.getGameState();

      const success = engine.applyMoveToCurrent({ x: 0, y: 0 });
      expect(success).toBe(true);

      const newState = engine.getGameState();

      expect(newState.board[0][0]).toBe(Player.Black); // Board updated
      expect(newState.currentPlayer).toBe(Player.White); // Player toggled
      expect(newState.turnNumber).toBe(2); // Turn incremented
      expect(newState.lastMove).toEqual({ x: 0, y: 0 });
    });

    it('should reject invalid moves (occupied square)', () => {
      engine.initializeGame();

      engine.applyMoveToCurrent({ x: 0, y: 0 });
      const stateBefore = engine.getGameState();

      // Try to place on the same spot
      const success = engine.applyMoveToCurrent({ x: 0, y: 0 });
      expect(success).toBe(false);

      const stateAfter = engine.getGameState();
      expect(stateAfter).toEqual(stateBefore);
    });

    it('should reject invalid moves (non-adjacent square in main phase)', () => {
      engine.initializeGame();

      // 6 moves
      engine.applyMoveToCurrent({ x: 3, y: 3 }); // B
      engine.applyMoveToCurrent({ x: 0, y: 0 }); // W (avoid symmetric restriction on turn 2)
      engine.applyMoveToCurrent({ x: 3, y: 4 }); // B
      engine.applyMoveToCurrent({ x: 4, y: 5 }); // W
      engine.applyMoveToCurrent({ x: 2, y: 3 }); // B
      engine.applyMoveToCurrent({ x: 5, y: 5 }); // W

      // Turn 7 (Black)
      const success = engine.applyMoveToCurrent({ x: 0, y: 0 }); // Far away
      expect(success).toBe(false);
    });
  });

  describe('Game Over Condition', () => {
    it('should identify when a player has 0 valid moves and assign the loss', () => {
      engine.initializeGame();

      // Force a situation where one player has no valid moves.
      // Instead of playing a full game, we can simulate a state.
      let state = engine.getGameState();

      // Let's create a board where Black has no adjacent empty spaces, but it's turn 7
      // Surround Black with White
      state = engine.simulateMove(state, { x: 3, y: 3 }); // Turn 1, B
      state = engine.simulateMove(state, { x: 2, y: 2 }); // Turn 2, W
      state = engine.simulateMove(state, { x: 4, y: 4 }); // Turn 3, B
      state = engine.simulateMove(state, { x: 2, y: 3 }); // Turn 4, W
      state = engine.simulateMove(state, { x: 5, y: 5 }); // Turn 5, B
      state = engine.simulateMove(state, { x: 2, y: 4 }); // Turn 6, W

      // Actually this is tricky, we can just artificially build a state.
      // We will fill the whole board with White, except one Black piece which is surrounded by White.
      // So Black will have no empty spots adjacent.

      const mockBoard: Player[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.White));
      mockBoard[3][3] = Player.Black;
      mockBoard[0][0] = Player.None; // Make one empty spot far away for White

      // Assign the state to the engine to test checkWinner easily
      // We can use a trick to inject the state, but we don't have a setter.
      // Let's test checkWinner as a pure function instead!

      const mockState = {
        board: mockBoard,
        currentPlayer: Player.Black,
        turnNumber: 7
      };

      const result = engine.checkWinner(mockState);

      // Black has no valid moves, so White wins
      expect(result).toBe(Player.White);
    });

    it('should assign loss correctly if current player is White and has no moves', () => {
      const mockBoard: Player[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.Black));
      mockBoard[3][3] = Player.White;
      mockBoard[0][0] = Player.None; // Make one empty spot far away for Black

      const mockState = {
        board: mockBoard,
        currentPlayer: Player.White,
        turnNumber: 7
      };

      const result = engine.checkWinner(mockState);

      // White has no valid moves, so Black wins
      expect(result).toBe(Player.Black);
    });

    it('should return Ongoing if valid moves exist', () => {
      engine.initializeGame();
      const state = engine.getGameState();
      const result = engine.checkWinner(state);

      expect(result).toBe('Ongoing');
    });
  });
});
