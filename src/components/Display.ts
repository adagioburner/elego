import { IDisplay } from '../interfaces/IDisplay';
import { GameState } from '../interfaces/GameState';
import { Move } from '../interfaces/Move';
import { Player } from '../interfaces/Player';
import { UIManager } from '../ui/UIManager';

export class Display implements IDisplay {
  private boardContainer: HTMLElement;
  private uiManager: UIManager;
  private clickCallback?: (move: Move) => void;
  private audioContext?: AudioContext;

  constructor(boardContainer: HTMLElement, uiManager: UIManager) {
    this.boardContainer = boardContainer;
    this.uiManager = uiManager;
    this.initBoardDOM();
  }

  private initBoardDOM(): void {
    this.boardContainer.innerHTML = '';
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.x = x.toString();
        cell.dataset.y = y.toString();
        this.boardContainer.appendChild(cell);
      }
    }

    this.boardContainer.addEventListener('click', this.handleCellClick.bind(this));
  }

  private handleCellClick(event: MouseEvent): void {
    if (!this.clickCallback) return;

    const target = event.target as HTMLElement;
    const cell = target.closest('.board-cell') as HTMLElement;

    if (cell) {
      const x = parseInt(cell.dataset.x!, 10);
      const y = parseInt(cell.dataset.y!, 10);
      if (!isNaN(x) && !isNaN(y)) {
        this.clickCallback({ x, y });
      }
    }
  }

  renderBoard(state: GameState): void {
    const cells = this.boardContainer.querySelectorAll('.board-cell');
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i] as HTMLElement;
      const x = parseInt(cell.dataset.x!, 10);
      const y = parseInt(cell.dataset.y!, 10);

      cell.innerHTML = ''; // Clear previous piece

      const player = state.board[y][x];
      if (player !== Player.None) {
        const piece = document.createElement('div');
        piece.classList.add('piece');
        piece.classList.add(player === Player.Black ? 'black' : 'white');

        if (state.lastMove && state.lastMove.x === x && state.lastMove.y === y) {
          piece.classList.add('last-move');
        }

        cell.appendChild(piece);
      }
    }
  }

  showInvalidMoveError(message: string): void {
    if (this.uiManager.isSoundEnabled()) {
      this.playErrorSound();
    }
    this.uiManager.addMessage(message);
  }

  private playErrorSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (e) {
      console.warn("Could not play audio", e);
    }
  }

  bindSquareClick(callback: (move: Move) => void): void {
    this.clickCallback = callback;
  }
}
