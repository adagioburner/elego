import { GameController } from '../src/components/GameController';
import { IGameEngine } from '../src/interfaces/IGameEngine';
import { IDisplay } from '../src/interfaces/IDisplay';
import { IAiPlayer } from '../src/interfaces/IAiPlayer';
import { UIManager } from '../src/ui/UIManager';
import { GameState } from '../src/interfaces/GameState';
import { Player } from '../src/interfaces/Player';

describe('GameController Component', () => {
  let engineMock: jest.Mocked<IGameEngine>;
  let displayMock: jest.Mocked<IDisplay>;
  let uiManagerMock: jest.Mocked<UIManager>;
  let aiPlayerMock: jest.Mocked<IAiPlayer>;
  let controller: GameController;

  const mockState: GameState = {
    board: [],
    currentPlayer: Player.Black,
    turnNumber: 1
  };

  beforeEach(() => {
    engineMock = {
      initializeGame: jest.fn(),
      getGameState: jest.fn().mockReturnValue(mockState),
      getValidPositions: jest.fn(),
      applyPositionToCurrent: jest.fn(),
      simulatePosition: jest.fn(),
      checkWinner: jest.fn().mockReturnValue('Ongoing')
    };

    displayMock = {
      renderBoard: jest.fn(),
      showInvalidPositionError: jest.fn(),
      bindSquareClick: jest.fn()
    };

    // Need to cast as UIManager mock is complex due to DOM elements
    uiManagerMock = {
      clearMessages: jest.fn(),
      addMessage: jest.fn(),
      updateStats: jest.fn(),
      isSoundEnabled: jest.fn().mockReturnValue(true),
      getAiThinkTimeMs: jest.fn().mockReturnValue(1000),
      getAiSimulationMode: jest.fn().mockReturnValue('RandomRollout'),
      getAiExpansionStrategy: jest.fn().mockReturnValue('Random')
    } as unknown as jest.Mocked<UIManager>;

    aiPlayerMock = {
      setThinkTime: jest.fn(),
      setSimulationMode: jest.fn(),
      setExpansionStrategy: jest.fn(),
      calculateBestPosition: jest.fn().mockResolvedValue({ x: 0, y: 0 }),
      getStats: jest.fn().mockReturnValue({ totalNodes: 10, calculationTimeMs: 100, bestPositionWinRate: 0.5 })
    };

    window.confirm = jest.fn().mockReturnValue(true);

    controller = new GameController(engineMock, displayMock, uiManagerMock, aiPlayerMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startGame', () => {
    it('initializes dependencies and starts game as human', () => {
      controller.startGame(true, 500);

      expect(engineMock.initializeGame).toHaveBeenCalled();
      expect(uiManagerMock.clearMessages).toHaveBeenCalled();
      expect(uiManagerMock.addMessage).toHaveBeenCalledWith('Game Started');
      expect(aiPlayerMock.setThinkTime).toHaveBeenCalledWith(500);
      expect(displayMock.renderBoard).toHaveBeenCalledWith(mockState);

      // AI shouldn't be prompted if human plays first
      expect(aiPlayerMock.calculateBestPosition).not.toHaveBeenCalled();
    });

    it('prompts AI move immediately if human plays second', () => {
      controller.startGame(false, 500);
      expect(aiPlayerMock.calculateBestPosition).toHaveBeenCalled();
    });

    it('prompts for confirmation if restarting an active game, respects cancellation', () => {
      controller.startGame(true, 500); // starts first game

      (window.confirm as jest.Mock).mockReturnValueOnce(false); // cancel
      jest.clearAllMocks();

      controller.startGame(true, 500); // try start second game
      expect(engineMock.initializeGame).not.toHaveBeenCalled();
    });

    it('restarts game if confirmation accepted', () => {
      controller.startGame(true, 500); // starts first game

      (window.confirm as jest.Mock).mockReturnValueOnce(true); // accept
      jest.clearAllMocks();

      controller.startGame(true, 500); // start second game
      expect(engineMock.initializeGame).toHaveBeenCalled();
    });
  });

  describe('handleHumanPositionInput', () => {
    it('ignores input if game is not started', () => {
      controller.handleHumanPositionInput({ x: 0, y: 0 });
      expect(engineMock.applyPositionToCurrent).not.toHaveBeenCalled();
    });

    it('blocks input and shows message if AI is thinking', () => {
      controller.startGame(true, 500);

      // Force AI thinking state
      (controller as any).isAiThinking = true;

      controller.handleHumanPositionInput({ x: 0, y: 0 });

      expect(uiManagerMock.addMessage).toHaveBeenCalledWith('The computer is thinking. Please wait.');
      expect(engineMock.applyPositionToCurrent).not.toHaveBeenCalled();
    });

    it('handles invalid move properly', () => {
      controller.startGame(true, 500);
      engineMock.applyPositionToCurrent.mockReturnValue(false);

      controller.handleHumanPositionInput({ x: 0, y: 0 });

      expect(displayMock.showInvalidPositionError).toHaveBeenCalledWith(expect.stringContaining('is invalid!'));
    });

    it('handles valid move, updates state, and prompts AI', async () => {
      controller.startGame(true, 500);
      engineMock.applyPositionToCurrent.mockReturnValue(true);

      const nextState = { ...mockState, currentPlayer: Player.White };

      // First call (in startgame) returns mockState, second call (in handleHumanPositionInput) returns nextState
      engineMock.getGameState.mockReturnValueOnce(mockState).mockReturnValueOnce(nextState).mockReturnValueOnce(nextState);

      // We spy on promptAiPosition to ensure it's called
      const promptSpy = jest.spyOn(controller, 'promptAiPosition');

      controller.handleHumanPositionInput({ x: 0, y: 0 });

      expect(displayMock.renderBoard).toHaveBeenCalledWith(nextState);
      expect(uiManagerMock.addMessage).toHaveBeenCalledWith('Human played at (0, 0)');
      expect(promptSpy).toHaveBeenCalled();
    });

    it('announces winner if game ends after human move', () => {
      controller.startGame(true, 500);
      engineMock.applyPositionToCurrent.mockReturnValue(true);
      engineMock.checkWinner.mockReturnValue(Player.Black); // Human wins

      controller.handleHumanPositionInput({ x: 0, y: 0 });

      expect(uiManagerMock.addMessage).toHaveBeenCalledWith('Game Over! Black wins!');
      expect(aiPlayerMock.calculateBestPosition).not.toHaveBeenCalled(); // AI shouldn't move
    });
  });

  describe('promptAiPosition', () => {
    it('triggers AI calculation, applies move, updates UI, and ends turn', async () => {
      controller.startGame(true, 500);
      jest.clearAllMocks();

      await controller.promptAiPosition();

      expect(uiManagerMock.addMessage).toHaveBeenCalledWith('AI is thinking...');

      expect(aiPlayerMock.calculateBestPosition).toHaveBeenCalledWith(mockState);
      expect(engineMock.applyPositionToCurrent).toHaveBeenCalledWith({ x: 0, y: 0 });

      expect(displayMock.renderBoard).toHaveBeenCalled();
      expect(uiManagerMock.addMessage).toHaveBeenCalledWith('AI played at (0, 0)');

      expect(uiManagerMock.updateStats).toHaveBeenCalledWith(10, 100, 0.5);
    });

    it('announces winner if AI move ends game', async () => {
      controller.startGame(true, 500);

      // StartGame calls checkWinner implicitly? Actually startGame just renders board.
      // promptAiPosition calls checkWinner once at the end.
      engineMock.checkWinner.mockReturnValueOnce(Player.White);

      await controller.promptAiPosition();

      expect(uiManagerMock.addMessage).toHaveBeenCalledWith('Game Over! White wins!');
    });
  });
});