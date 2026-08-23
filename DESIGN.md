# EleGo Game Design Document

## 1. Overview & Game Rules
EleGo is a two-player strategy game played on an 8x8 grid.

### Rules
- **Board:** 8x8 grid.
- **Players:** Two players (Black and White).
- **Gameplay:**
  - Players take turns placing a single piece of their color on an unoccupied square.
  - Pieces are never moved, removed, or captured once placed.
  - **Initial Phase:** The first 3 turns for *each* player (the first 6 moves of the game) have no placement restrictions. A piece can be placed anywhere on the unoccupied board.
  - **Main Phase:** From turn 4 onwards (for each player), pieces can *only* be placed on unoccupied squares that are adjacent (horizontally, vertically, or diagonally) to at least one square already occupied by a piece of that player's color.
- **Winning Condition:** A player loses the game if they are unable to make a valid move on their turn (i.e., no valid adjacent squares are available).

## 2. Technology Stack
- **Language:** TypeScript. TypeScript is chosen to leverage static typing, strong interfaces, and better flow control, which is essential for managing game state and complex algorithms like Monte Carlo Tree Search.
- **Frontend Structure:** HTML for document structure.
- **Styling:** CSS for layout, board rendering, and UI styling.
- **Build Tooling:** Webpack or Vite (to bundle TypeScript/HTML/CSS).
- **Testing:** Jest or Vitest for robust unit and integration testing.

## 3. System Architecture & Components
The system is divided into four main modular components to separate concerns and ensure maintainability.

### 3.1. UI Controller (Game Coordinator)
Responsible for the overarching game flow, human interactions, and routing events between the Display, Backing Store, and Computer Player.
- **Features:** Start screen (choose play first/second, set AI think time), prompting for next move, announcing the game result.
- **Statistics:** An options panel to toggle game statistics (e.g., number of MCTS nodes searched, AI win probability, time taken per turn, win/loss records).

### 3.2. Display Module (Renderer)
Responsible for rendering the visual representation of the current game state and translating raw user inputs (mouse clicks) into logical board coordinates.

### 3.3. Backing Store (Game State Engine)
Responsible for maintaining the absolute truth of the game state, validating moves, generating lists of legal moves, and determining game over conditions.

### 3.4. Computer Player (AI)
Responsible for calculating the best move for the computer using a modular evaluation system (Monte Carlo Tree Search with random rollouts or a heuristic proximity cost).

## 4. Component Interfaces & Main Methods

### 4.1. UI Controller Interface
```typescript
interface IGameController {
  startGame(humanPlaysFirst: boolean, aiThinkTimeMs: number): void;
  handleHumanMoveInput(move: Move): void; // Triggered by Display Module
  promptAiMove(): void;
  updateStats(stats: GameStats): void;
  announceResult(winner: Player): void;
  toggleStatsPanel(show: boolean): void;
}
```

### 4.2. Display Module Interface
```typescript
interface IDisplay {
  renderBoard(state: GameState): void; // Should visually highlight state.lastMove to indicate the AI's recent move
  showInvalidMoveError(message: string): void; // Provides feedback when a user clicks an invalid square
  bindSquareClick(callback: (move: Move) => void): void;
  showOverlay(message: string): void;
}
```

### 4.3. Backing Store Interface
```typescript
interface IGameEngine {
  initializeGame(): void;
  getGameState(): GameState;
  getValidMoves(state: GameState): Move[];
  applyMoveToCurrent(move: Move): boolean; // Mutates the true game state. Returns true if valid.
  simulateMove(state: GameState, move: Move): GameState; // Pure function: returns a new state resulting from the move
  checkWinner(state: GameState): Player | 'Ongoing';
}
```

### 4.4. Computer Player Interface
```typescript
interface IAiPlayer {
  setThinkTime(ms: number): void;
  setSimulationMode(mode: 'RandomRollout' | 'ProximityHeuristic'): void;
  calculateBestMove(currentState: GameState): Promise<Move>;
  getStats(): AiStats; // Returns nodes searched, time taken, etc.
}
```

## 5. Data Structures

### 5.1. Game Stats (UI / General)
```typescript
interface GameStats {
  nodesSearched: number;
  timeElapsedMs: number;
  aiWinProbability: number;
}
```

### 5.2. AI Stats (Computer Player)
```typescript
interface AiStats {
  totalNodes: number;
  calculationTimeMs: number;
  bestMoveWinRate: number;
}
```

### 5.3. Game State (Backing Store)
```typescript
enum Player { Black = 1, White = 2, None = 0 }

interface Move {
  x: number;
  y: number;
}

interface GameState {
  board: Player[][]; // 8x8 grid
  currentPlayer: Player;
  turnNumber: number; // Starts at 1. Total turn count (moves 1-6 are unrestricted)
  lastMove?: Move;
}
```

### 5.4. MCTS Node (Computer Player)
```typescript
interface MCTSNode {
  gameState: GameState;
  parent: MCTSNode | null;
  children: MCTSNode[];
  moveFromParent: Move | null;
  visits: number;
  wins: number; // Win score from the perspective of the player who made the move to reach this node
  untriedMoves: Move[];
}
```

## 6. Main Algorithms

### 6.1. Monte Carlo Tree Search (MCTS)
The primary search algorithm used by the Computer Player to determine the optimal move.

#### Call Pattern
1. Create a `rootNode` using the `currentState`.
2. `while (time_elapsed < aiThinkTimeMs)`:
   - `let selectedNode = select(rootNode);`
   - `let expandedNode = expand(selectedNode);`
   - `let result = simulate(expandedNode);`
   - `backpropagate(expandedNode, result);`
3. Identify the child of `rootNode` with the highest `visits` count.
4. Return that child's `moveFromParent`.

#### Stage Methods
- **Selection (`select(node: MCTSNode): MCTSNode`)**:
  Traverses down the tree from the root by selecting children using the UCB1 (Upper Confidence Bound) formula to balance exploration of unvisited paths and exploitation of known winning paths. Stops when it reaches a node with untried moves or a terminal state.
- **Expansion (`expand(node: MCTSNode): MCTSNode`)**:
  If the selected node has untried moves, pops one move, applies it to the state using `simulateMove(state, move)`, creates a new child node for this resulting state, and returns the new node.
- **Simulation (`simulate(node: MCTSNode): number`)**:
  *Mode 1 (Standard):* Plays random moves from the node's state until the game ends, returning a score (e.g., 1 for win, 0 for loss).
  *Mode 2 (Heuristic):* Uses the Proximity Heuristic to evaluate the non-terminal state directly without playing to the end.
- **Backpropagation (`backpropagate(node: MCTSNode, score: number): void`)**:
  Walks back up the tree to the root, incrementing the `visits` count for each node, and adding the `score` to `wins` if the node's player aligns with the winning perspective.

### 6.2. Modular Evaluation (Proximity Heuristic Substitute)
To allow modularity and compare AI strengths, the Simulation stage can be substituted with a constant-based heuristic evaluation of the current position.

- **Algorithm (Proximity Cost):**
  1. Iterate over every unoccupied square on the board.
  2. For each unoccupied square, calculate the distance (e.g., Chebyshev distance) to the nearest Computer piece and the nearest Human piece.
  3. Tally how many squares are strictly closer to Computer pieces, and how many are strictly closer to Human pieces.
  4. `Cost = (Squares closer to Computer) - (Squares closer to Human)`.
  5. Normalize this cost to a range (e.g., 0 to 1) to substitute as the backpropagated score in MCTS.

## 7. Test Plan

To ensure robustness, the project will implement a suite of unit and integration tests.

### 7.1. Unit Tests

**Backing Store (Game Engine)**
- Test initialization (8x8 board populated with `Player.None`, Turn 1).
- Test valid moves during initial phase (turns 1-6) - should allow placement on any empty square.
- Test valid moves during main phase (turn 7+) - should strictly allow placement only adjacent to own pieces.
- Test move application successfully updates the board, toggles `currentPlayer`, and increments `turnNumber`.
- Test invalid move rejection (trying to place on an occupied square, or a non-adjacent square in the main phase).
- Test game over condition (correctly identifies when a player has 0 valid moves and assigns the loss).

**Computer Player (AI)**
- Test MCTS Node creation and correct UCB1 calculation for child selection.
- Test Simulation stage returns a valid deterministic winner when using random rollouts to completion.
- Test Proximity Heuristic calculation matches expected manual calculations on a mocked board state.
- Test the AI returns a valid `Move` object within the configured `aiThinkTimeMs` tolerance.

**Display Module**
- Test correct DOM generation for an 8x8 grid.
- Test pieces of different colors render correctly based on a mocked `GameState`.
- Test click events accurately map back to `x,y` board coordinates.

**UI Controller**
- Test state transitions (Start Screen -> Human Turn -> AI Turn -> Game Over).
- Test statistics formatting (e.g., node count, elapsed time) when the stats toggle is active.

### 7.2. Integration Tests
- **Engine + AI:** Initialize a mock game state mid-game, invoke the AI to calculate a move, apply the move to the engine, and assert that the state remains valid.
- **Engine + Display:** Apply a move programmatically via the engine and ensure the Display module receives the correct state slice to update the DOM.
- **Full Simulation (Headless):** Run a full loop of two AI instances (or one AI and one random mover) playing against each other from start to finish. Ensure no infinite loops, state desyncs, or unhandled errors occur.
- **Heuristic Toggle Configuration:** Verify that switching the AI configuration from 'RandomRollout' to 'ProximityHeuristic' successfully alters the execution path inside the `calculateBestMove` method.
