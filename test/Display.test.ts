import { Display } from '../src/components/Display';
import { GameState } from '../src/interfaces/GameState';
import { Player } from '../src/interfaces/Player';

import { UIManager } from '../src/ui/UIManager';

describe('Display Component', () => {
  let container: HTMLElement;
  let uiManagerMock: jest.Mocked<UIManager>;
  let display: Display;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    uiManagerMock = {
      isSoundEnabled: jest.fn().mockReturnValue(true),
      addMessage: jest.fn()
    } as unknown as jest.Mocked<UIManager>;

    // Mock AudioContext to prevent errors in jsdom
    (window as any).AudioContext = jest.fn().mockImplementation(() => ({
      createOscillator: () => ({
        type: '',
        frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      }),
      createGain: () => ({
        gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
        connect: jest.fn(),
      }),
      destination: {},
      currentTime: 0,
    }));

    display = new Display(container, uiManagerMock);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('initializes the board with 64 cells', () => {
    const cells = container.querySelectorAll('.board-cell');
    expect(cells.length).toBe(64);

    const firstCell = cells[0] as HTMLElement;
    expect(firstCell.dataset.x).toBe('0');
    expect(firstCell.dataset.y).toBe('0');

    const lastCell = cells[63] as HTMLElement;
    expect(lastCell.dataset.x).toBe('7');
    expect(lastCell.dataset.y).toBe('7');
  });

  it('binds click events correctly and extracts coordinates', () => {
    const callback = jest.fn();
    display.bindSquareClick(callback);

    const cell = container.querySelector('.board-cell[data-x="3"][data-y="4"]') as HTMLElement;
    cell.click();

    expect(callback).toHaveBeenCalledWith({ x: 3, y: 4 });
  });

  it('renders pieces according to state', () => {
    const board = Array(8).fill(null).map(() => Array(8).fill(Player.None));
    board[2][1] = Player.Black;
    board[3][4] = Player.White;

    const state: GameState = {
      board,
      currentPlayer: Player.Black,
      turnNumber: 3,
      lastMove: { x: 4, y: 3 }
    };

    display.renderBoard(state);

    const blackCell = container.querySelector('.board-cell[data-x="1"][data-y="2"]') as HTMLElement;
    expect(blackCell.innerHTML).toContain('piece');
    expect(blackCell.innerHTML).toContain('black');

    const whiteCell = container.querySelector('.board-cell[data-x="4"][data-y="3"]') as HTMLElement;
    expect(whiteCell.innerHTML).toContain('piece');
    expect(whiteCell.innerHTML).toContain('white');
    expect(whiteCell.innerHTML).toContain('last-move'); // Because this is the lastMove

    const emptyCell = container.querySelector('.board-cell[data-x="0"][data-y="0"]') as HTMLElement;
    expect(emptyCell.innerHTML).toBe('');
  });

  it('plays sound and calls addMessage when invalid move is made if sound is enabled', () => {
    display.showInvalidMoveError('Invalid move');
    expect(uiManagerMock.isSoundEnabled).toHaveBeenCalled();
    expect((window as any).AudioContext).toHaveBeenCalled();
    expect(uiManagerMock.addMessage).toHaveBeenCalledWith('Invalid move');
  });

  it('does not play sound if sound is disabled but still calls addMessage', () => {
    uiManagerMock.isSoundEnabled.mockReturnValue(false);
    display.showInvalidMoveError('Invalid move');
    expect((window as any).AudioContext).not.toHaveBeenCalled();
    expect(uiManagerMock.addMessage).toHaveBeenCalledWith('Invalid move');
  });
});