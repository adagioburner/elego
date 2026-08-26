import { IGameController } from '../interfaces/IGameController';
import { IGameEngine } from '../interfaces/IGameEngine';
import { IDisplay } from '../interfaces/IDisplay';
import { IAiPlayer } from '../interfaces/IAiPlayer';
import { UIManager } from '../ui/UIManager';
import { Move } from '../interfaces/Move';
import { GameStats } from '../interfaces/GameStats';
import { Player } from '../interfaces/Player';

export class GameController implements IGameController {
  private engine: IGameEngine;
  private display: IDisplay;
  private uiManager: UIManager;
  private aiPlayer: IAiPlayer;
  private isAiThinking: boolean = false;
  private isGameOver: boolean = true;
  private humanPlayer: Player = Player.Black;

  constructor(engine: IGameEngine, display: IDisplay, uiManager: UIManager, aiPlayer: IAiPlayer) {
    this.engine = engine;
    this.display = display;
    this.uiManager = uiManager;
    this.aiPlayer = aiPlayer;

    this.display.bindSquareClick(this.handleHumanMoveInput.bind(this));
  }

  startGame(humanPlaysFirst: boolean, aiThinkTimeMs: number): void {
    if (!this.isGameOver) {
      const confirm = window.confirm('A game is currently ongoing. Are you sure you want to start a new game?');
      if (!confirm) {
        return;
      }
    }

    this.engine.initializeGame();
    this.uiManager.clearMessages();
    this.uiManager.addMessage('Game Started');
    this.isGameOver = false;
    this.isAiThinking = false;

    this.aiPlayer.setThinkTime(aiThinkTimeMs);
    this.aiPlayer.setSimulationMode(this.uiManager.getAiSimulationMode());
    this.aiPlayer.setExpansionStrategy(this.uiManager.getAiExpansionStrategy());
    this.aiPlayer.setProximityScoreMax(this.uiManager.getAiProximityScoreMax());
    this.humanPlayer = humanPlaysFirst ? Player.Black : Player.White;

    this.uiManager.updateStats(0, 0, 0);

    const initialState = this.engine.getGameState();
    this.display.renderBoard(initialState);

    if (!humanPlaysFirst) {
      this.promptAiMove();
    }
  }

  handleHumanMoveInput(move: Move): void {
    if (this.isGameOver) return;

    if (this.isAiThinking) {
      this.uiManager.addMessage('The computer is thinking. Please wait.');
      return;
    }

    const state = this.engine.getGameState();
    if (state.currentPlayer !== this.humanPlayer) {
       // Should theoretically not happen if flow is correct, but safe to check
       return;
    }

    const isValid = this.engine.applyMoveToCurrent(move);

    if (!isValid) {
      const msg = `Move (${move.x}, ${move.y}) is invalid!`;
      this.display.showInvalidMoveError(msg);
      return;
    }

    const newState = this.engine.getGameState();
    this.display.renderBoard(newState);
    this.uiManager.addMessage(`Human played at (${move.x}, ${move.y})`);

    const winner = this.engine.checkWinner(newState);
    if (winner !== 'Ongoing') {
      this.announceResult(winner);
    } else {
      this.promptAiMove();
    }
  }

  async promptAiMove(): Promise<void> {
    if (this.isGameOver) return;

    this.isAiThinking = true;
    this.uiManager.addMessage("AI is thinking...");

    const currentState = this.engine.getGameState();
    const aiMove = await this.aiPlayer.calculateBestMove(currentState);

    this.engine.applyMoveToCurrent(aiMove);

    const newState = this.engine.getGameState();
    this.display.renderBoard(newState);
    this.uiManager.addMessage(`AI played at (${aiMove.x}, ${aiMove.y})`);

    // Update AI stats
    const stats = this.aiPlayer.getStats();
    if (stats) {
       this.uiManager.updateStats(stats.totalNodes, stats.calculationTimeMs, stats.bestMoveWinRate);
    }

    this.isAiThinking = false;

    const winner = this.engine.checkWinner(newState);
    if (winner !== 'Ongoing') {
      this.announceResult(winner);
    }
  }

  updateStats(stats: GameStats): void {
    this.uiManager.updateStats(stats.nodesSearched, stats.timeElapsedMs, stats.aiWinProbability);
  }

  announceResult(winner: Player): void {
    this.isGameOver = true;
    const winnerName = winner === Player.Black ? 'Black' : 'White';
    const message = `Game Over! ${winnerName} wins!`;
    this.uiManager.addMessage(message);
  }

  toggleStatsPanel(show: boolean): void {
    // The requirement says GameController has this interface,
    // but the actual HTML/UI toggles it directly via native dialog events in UIManager.
    // If needed to be called programmatically:
    if (this.uiManager.gameStatsPanel) {
      if (show) {
        this.uiManager.gameStatsPanel.classList.remove('hidden');
      } else {
        this.uiManager.gameStatsPanel.classList.add('hidden');
      }
    }
  }
}
