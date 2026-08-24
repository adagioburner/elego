import { GameEngine } from './components/GameEngine';
import { Display } from './components/Display';
import { GameController } from './components/GameController';
import { AiPlayer } from './components/AiPlayer';
import { UIManager } from './ui/UIManager';

document.addEventListener('DOMContentLoaded', () => {
  const uiManager = new UIManager();
  const boardContainer = document.getElementById('board-container');

  if (!boardContainer) {
    console.error('Failed to find board-container');
    return;
  }

  const engine = new GameEngine();
  const display = new Display(boardContainer, uiManager);
  const aiPlayer = new AiPlayer();

  const controller = new GameController(engine, display, uiManager, aiPlayer);

  uiManager.bindPlayFirst(() => {
    controller.startGame(true, uiManager.getAiThinkTimeMs());
  });

  uiManager.bindPlaySecond(() => {
    controller.startGame(false, uiManager.getAiThinkTimeMs());
  });
});
