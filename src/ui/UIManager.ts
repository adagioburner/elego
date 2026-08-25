export class UIManager {
  // Main container references
  public boardContainer: HTMLElement | null;
  public startControls: HTMLElement | null;
  public gameMessagesPanel: HTMLElement | null;
  public messageList: HTMLElement | null;
  public gameStatsPanel: HTMLElement | null;

  // Buttons
  public btnPlayFirst: HTMLButtonElement | null;
  public btnPlaySecond: HTMLButtonElement | null;
  public btnOptions: HTMLButtonElement | null;

  // Dialog & Form
  public optionsDialog: HTMLDialogElement | null;
  public inputAiThinkTime: HTMLInputElement | null;
  public selectAiSimulationMode: HTMLSelectElement | null;
  public selectAiExpansionStrategy: HTMLSelectElement | null;
  public checkboxToggleStats: HTMLInputElement | null;
  public checkboxToggleSound: HTMLInputElement | null;
  public btnSaveOptions: HTMLButtonElement | null;

  // Stat Elements
  public statNodesSearched: HTMLElement | null;
  public statTimeElapsed: HTMLElement | null;
  public statWinProbability: HTMLElement | null;

  constructor() {
    this.boardContainer = document.getElementById('board-container');
    this.startControls = document.getElementById('start-controls');
    this.gameMessagesPanel = document.getElementById('game-messages');
    this.messageList = document.getElementById('message-list');
    this.gameStatsPanel = document.getElementById('game-stats');

    this.btnPlayFirst = document.getElementById('btn-play-first') as HTMLButtonElement;
    this.btnPlaySecond = document.getElementById('btn-play-second') as HTMLButtonElement;
    this.btnOptions = document.getElementById('options-btn') as HTMLButtonElement;

    this.optionsDialog = document.getElementById('options-dialog') as HTMLDialogElement;
    this.inputAiThinkTime = document.getElementById('ai-think-time') as HTMLInputElement;
    this.selectAiSimulationMode = document.getElementById('ai-simulation-mode') as HTMLSelectElement;
    this.selectAiExpansionStrategy = document.getElementById('ai-expansion-strategy') as HTMLSelectElement;
    this.checkboxToggleStats = document.getElementById('toggle-stats-checkbox') as HTMLInputElement;
    this.checkboxToggleSound = document.getElementById('toggle-sound-checkbox') as HTMLInputElement;
    this.btnSaveOptions = document.getElementById('btn-save-options') as HTMLButtonElement;

    this.statNodesSearched = document.getElementById('stat-nodes-searched');
    this.statTimeElapsed = document.getElementById('stat-time-elapsed');
    this.statWinProbability = document.getElementById('stat-win-probability');

    this.bindEvents();
  }

  public bindPlayFirst(callback: () => void): void {
    this.btnPlayFirst?.addEventListener('click', callback);
  }

  public bindPlaySecond(callback: () => void): void {
    this.btnPlaySecond?.addEventListener('click', callback);
  }

  private bindEvents(): void {
    if (this.btnOptions && this.optionsDialog) {
      this.btnOptions.addEventListener('click', () => {
        this.optionsDialog?.showModal();
      });
    }

    if (this.optionsDialog) {
      // The dialog form method="dialog" automatically closes the dialog on submit
      this.optionsDialog.addEventListener('close', () => {
        this.handleOptionsSaved();
      });
    }
  }

  private handleOptionsSaved(): void {
    // Check the stats toggle to hide/show the stats panel
    if (this.checkboxToggleStats && this.gameStatsPanel) {
      if (this.checkboxToggleStats.checked) {
        this.gameStatsPanel.classList.remove('hidden');
      } else {
        this.gameStatsPanel.classList.add('hidden');
      }
    }
  }

  /**
   * Clears all messages from the panel.
   */
  public clearMessages(): void {
    if (this.messageList) {
      this.messageList.innerHTML = '';
    }
  }

  public isSoundEnabled(): boolean {
    return this.checkboxToggleSound?.checked ?? true;
  }

  public getAiThinkTimeMs(): number {
    return parseInt(this.inputAiThinkTime?.value || '1000', 10);
  }

  public getAiExpansionStrategy(): 'Random' | 'BestProximity' | 'Pruned' {
    return (this.selectAiExpansionStrategy?.value as 'Random' | 'BestProximity' | 'Pruned') || 'Random';
  }

  public getAiSimulationMode(): 'RandomRollout' | 'ProximityHeuristic' | 'Hybrid' {
    return (this.selectAiSimulationMode?.value as 'RandomRollout' | 'ProximityHeuristic' | 'Hybrid') || 'RandomRollout';
  }

  /**
   * Appends a message to the messages panel.
   */
  public addMessage(message: string): void {
    if (this.messageList) {
      const li = document.createElement('li');
      li.textContent = message;
      this.messageList.appendChild(li);
      // Auto-scroll to bottom
      if (this.gameMessagesPanel) {
        this.gameMessagesPanel.scrollTop = this.gameMessagesPanel.scrollHeight;
      }
    }
  }

  /**
   * Updates the displayed statistics.
   */
  public updateStats(nodesSearched: number, timeElapsedMs: number, winProbability: number): void {
    if (this.statNodesSearched) this.statNodesSearched.textContent = nodesSearched.toString();
    if (this.statTimeElapsed) this.statTimeElapsed.textContent = timeElapsedMs.toString();
    if (this.statWinProbability) this.statWinProbability.textContent = `${(winProbability * 100).toFixed(1)}%`;
  }
}
