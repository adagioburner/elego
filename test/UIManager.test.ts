import { UIManager } from '../src/ui/UIManager';

describe('UIManager', () => {
  let manager: UIManager;

  beforeEach(() => {
    // Set up our document body to mimic index.html
    document.body.innerHTML = `
      <div id="board-container"></div>
      <div id="start-controls"></div>
      <div id="game-messages"></div>
      <ul id="message-list"></ul>
      <div id="game-stats" class="hidden"></div>

      <button id="btn-play-first"></button>
      <button id="btn-play-second"></button>
      <button id="options-btn"></button>

      <dialog id="options-dialog">
        <form method="dialog"></form>
      </dialog>
      <input type="number" id="ai-think-time" />
      <select id="ai-simulation-mode">
        <option value="RandomRollout">Random Rollout</option>
      </select>
      <input type="checkbox" id="toggle-stats-checkbox" />
      <button id="btn-save-options"></button>

      <span id="stat-nodes-searched"></span>
      <span id="stat-time-elapsed"></span>
      <span id="stat-win-probability"></span>
    `;

    // Mock the HTMLDialogElement showModal method since jsdom does not support it natively yet
    HTMLDialogElement.prototype.showModal = jest.fn();

    manager = new UIManager();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should correctly reference key DOM elements', () => {
      expect(manager.boardContainer).not.toBeNull();
      expect(manager.messageList).not.toBeNull();
      expect(manager.btnPlayFirst).not.toBeNull();
      expect(manager.optionsDialog).not.toBeNull();
    });
  });

  describe('Events and Toggles', () => {
    it('should show the options dialog when options button is clicked', () => {
      const showModalSpy = jest.spyOn(manager.optionsDialog as HTMLDialogElement, 'showModal');

      manager.btnOptions?.click();

      expect(showModalSpy).toHaveBeenCalled();
    });

    it('should toggle game stats panel visibility based on checkbox upon dialog close', () => {
      const statsPanel = manager.gameStatsPanel as HTMLElement;
      const checkbox = manager.checkboxToggleStats as HTMLInputElement;
      const dialog = manager.optionsDialog as HTMLDialogElement;

      // Ensure hidden initially
      expect(statsPanel.classList.contains('hidden')).toBe(true);

      // Check the box and simulate dialog close
      checkbox.checked = true;
      dialog.dispatchEvent(new Event('close'));
      expect(statsPanel.classList.contains('hidden')).toBe(false);

      // Uncheck the box and simulate dialog close
      checkbox.checked = false;
      dialog.dispatchEvent(new Event('close'));
      expect(statsPanel.classList.contains('hidden')).toBe(true);
    });
  });

  describe('addMessage', () => {
    it('should append a new message to the message list', () => {
      expect(manager.messageList?.children.length).toBe(0);

      manager.addMessage('Hello World');
      manager.addMessage('Test Message');

      expect(manager.messageList?.children.length).toBe(2);
      expect(manager.messageList?.children[0].textContent).toBe('Hello World');
      expect(manager.messageList?.children[1].textContent).toBe('Test Message');
    });
  });

  describe('updateStats', () => {
    it('should update the stat elements with formatted values', () => {
      manager.updateStats(1000, 550, 0.756);

      expect(manager.statNodesSearched?.textContent).toBe('1000');
      expect(manager.statTimeElapsed?.textContent).toBe('550');
      expect(manager.statWinProbability?.textContent).toBe('75.6%');
    });
  });
});
