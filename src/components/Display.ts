import { IDisplay } from '../interfaces/IDisplay';
import { GameState } from '../interfaces/GameState';
import { Move } from '../interfaces/Move';
import { Player } from '../interfaces/Player';

export class Display implements IDisplay {
  private boardContainer: HTMLElement;
  private isSoundEnabled: () => boolean;
  private clickCallback?: (move: Move) => void;
  private audioContext?: AudioContext;

  constructor(boardContainer: HTMLElement, isSoundEnabled: () => boolean) {
    this.boardContainer = boardContainer;
    this.isSoundEnabled = isSoundEnabled;
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
    if (this.isSoundEnabled()) {
      this.playErrorSound();
    }
    // Message logic itself is handled by UIManager in GameController
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

  showOverlay(message: string): void {
    // For now we just implement it as an alert, but it could be an absolute DOM overlay.
    // The design doc mentions 'showOverlay' for things like "AI is thinking..."
    // but the prompt didn't strictly specify this beyond logging to UI manager.
    // We'll leave it as a simple method for future expandability or implement a basic DOM overlay.
    let overlay = this.boardContainer.querySelector('.board-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'board-overlay';
      Object.assign((overlay as HTMLElement).style, {
        position: 'absolute',
        top: '0', left: '0', right: '0', bottom: '0',
        backgroundColor: 'rgba(255,255,255,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        zIndex: '10'
      });
      this.boardContainer.appendChild(overlay);
    }
    overlay.textContent = message;
    (overlay as HTMLElement).style.display = 'flex';
  }

  hideOverlay(): void {
    const overlay = this.boardContainer.querySelector('.board-overlay') as HTMLElement;
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}
