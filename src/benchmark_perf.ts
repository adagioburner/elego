import { AiPlayer } from './components/AiPlayer';
import { GameEngine } from './components/GameEngine';

async function runBenchmark() {
  const engine = new GameEngine();
  engine.initializeGame();
  let state = engine.getGameState();

  // Make a few moves to get a non-empty board
  const movesToPlay = [
    { x: 3, y: 3 }, // Black
    { x: 4, y: 3 }, // White
    { x: 4, y: 4 }, // Black
    { x: 3, y: 4 }, // White
  ];

  for (const move of movesToPlay) {
    state = engine.simulateMove(state, move);
  }

  const ai = new AiPlayer();
  ai.setThinkTime(3000); // 3 seconds
  // Simulation mode is ProximityHeuristic by default
  // Expansion strategy is Pruned by default

  console.log('Running AI calculation for 3 seconds...');
  const start = Date.now();
  await ai.calculateBestMove(state);
  const end = Date.now();

  const stats = ai.getStats();

  console.log('--- Benchmark Results ---');
  console.log(`Time taken: ${end - start} ms`);
  console.log(`Total nodes searched: ${stats.totalNodes}`);

  const nodesPerSecond = Math.round(stats.totalNodes / ((end - start) / 1000));
  console.log(`Nodes per second: ${nodesPerSecond}`);

  // Assert minimum expected performance. The baseline was ~5500. We assert slightly lower to prevent flaky test failures on busy CI runners.
  const THRESHOLD = 4500;
  if (nodesPerSecond < THRESHOLD) {
      console.error(`Performance degraded! Nodes per second (${nodesPerSecond}) is below the threshold of ${THRESHOLD}`);
      process.exit(1);
  }

  console.log(`Performance OK! (Nodes/sec > ${THRESHOLD})`);
}

runBenchmark().catch((err) => {
    console.error(err);
    process.exit(1);
});
