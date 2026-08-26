import { GameEngine } from './components/GameEngine';
import { AiPlayer } from './components/AiPlayer';
import { Player } from './interfaces/Player';
import { isMainThread, parentPort, workerData, Worker } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type ExpansionStrategy = 'Random' | 'BestProximity' | 'Pruned';
type SimulationMode = 'RandomRollout' | 'ProximityHeuristic' | 'Hybrid';
type ProximityScoreMode = 'Original' | 'DistanceDifference';

interface AiConfig {
    expansionStrategy: ExpansionStrategy;
    simulationMode: SimulationMode;
    proximityScoreMode: ProximityScoreMode;
}

const EXPANSION_STRATEGIES: ExpansionStrategy[] = ['Random', 'BestProximity', 'Pruned'];
const SIMULATION_MODES: SimulationMode[] = ['RandomRollout', 'ProximityHeuristic', 'Hybrid'];

let parsedProximityScore: ProximityScoreMode = 'Original';
let parsedGamesPerPair: number = 50;

// Parse command line arguments
for (const arg of process.argv) {
    if (arg.startsWith('ProximityScore=')) {
        const val = arg.split('=')[1];
        if (val === 'DistanceDifference' || val === 'Original') {
            parsedProximityScore = val;
        }
    }
    if (arg.startsWith('GamesPerPair=')) {
        const val = parseInt(arg.split('=')[1], 10);
        if (!isNaN(val)) {
            parsedGamesPerPair = val;
        }
    }
}

const configs: AiConfig[] = [];
for (const exp of EXPANSION_STRATEGIES) {
    for (const sim of SIMULATION_MODES) {
        configs.push({ expansionStrategy: exp, simulationMode: sim, proximityScoreMode: parsedProximityScore });
    }
}

interface MatchTask {
    configA: AiConfig;
    configB: AiConfig;
    gamesPerPair: number; // For one side, e.g., 50
    blackConfig: 'A' | 'B';
}

function configToString(config: AiConfig): string {
    return `${config.expansionStrategy}-${config.simulationMode}-${config.proximityScoreMode}`;
}

async function playSingleGame(configBlack: AiConfig, configWhite: AiConfig): Promise<Player> {
    const engine = new GameEngine();
    const playerBlack = new AiPlayer();
    const playerWhite = new AiPlayer();

    playerBlack.setThinkTime(1000);
    playerBlack.setExpansionStrategy(configBlack.expansionStrategy);
    playerBlack.setSimulationMode(configBlack.simulationMode);
    playerBlack.setProximityScoreMode(configBlack.proximityScoreMode);

    playerWhite.setThinkTime(1000);
    playerWhite.setExpansionStrategy(configWhite.expansionStrategy);
    playerWhite.setSimulationMode(configWhite.simulationMode);
    playerWhite.setProximityScoreMode(configWhite.proximityScoreMode);

    let currentState = engine.getGameState();

    while (true) {
        const winner = engine.checkWinner(currentState);
        if (winner !== 'Ongoing') {
            return winner;
        }

        const currentAi = currentState.currentPlayer === Player.Black ? playerBlack : playerWhite;

        let move;
        try {
            move = await currentAi.calculateBestMove(currentState);
        } catch (e) {
            // No valid moves left fallback
            return currentState.currentPlayer === Player.Black ? Player.White : Player.Black;
        }

        const validMoves = engine.getValidMoves(currentState);
        const isValid = validMoves.some(m => m.x === move.x && m.y === move.y);
        if (!isValid) {
            // Forfeiture on invalid move (shouldn't happen with valid AI)
            return currentState.currentPlayer === Player.Black ? Player.White : Player.Black;
        }

        engine.applyMoveToCurrent(move);
        currentState = engine.getGameState();

        // Check for early victory based on win rate
        const blackStats = playerBlack.getStats();
        const whiteStats = playerWhite.getStats();

        // Only check stats after both players have moved at least once if needed, but we can just check if stats are populated.
        if (blackStats && whiteStats && currentState.turnNumber > 2) {
            const blackWinRate = blackStats.bestMoveWinRate;
            const whiteWinRate = whiteStats.bestMoveWinRate;

            // The AI player's perspective on its own win rate
            // In our AiPlayer, stats.bestMoveWinRate is from the perspective of the player who made the best move.
            // Wait, actually, let's just check the current active player's stats if we want.
            // But let's check both AI instances' reported win rate for their latest move.
            // If black thinks its win rate > 0.9 and white thinks its win rate < 0.1
            // But since white's win rate is its own probability of winning,
            // black > 0.9 means black thinks it will win. white < 0.1 means white thinks it will win with < 0.1 probability.
            if (blackWinRate > 0.9 && whiteWinRate < 0.1) {
                return Player.Black;
            } else if (whiteWinRate > 0.9 && blackWinRate < 0.1) {
                return Player.White;
            }
        }
    }
}

if (!isMainThread) {
    const task: MatchTask = workerData;
    const configA = task.configA;
    const configB = task.configB;

    const configBlack = task.blackConfig === 'A' ? configA : configB;
    const configWhite = task.blackConfig === 'A' ? configB : configA;

    const run = async () => {
        let winsA = 0;
        let winsB = 0;
        for (let i = 0; i < task.gamesPerPair; i++) {
            const winner = await playSingleGame(configBlack, configWhite);
            if (winner === Player.Black) {
                if (task.blackConfig === 'A') winsA++;
                else winsB++;
            } else if (winner === Player.White) {
                if (task.blackConfig === 'A') winsB++;
                else winsA++;
            }
            parentPort?.postMessage({ type: 'progress' });
        }
        parentPort?.postMessage({ type: 'result', winsA, winsB });
    };

    run().catch(err => {
        console.error(err);
        process.exit(1);
    });
} else {
    // Main thread
        const GAMES_PER_SIDE = parsedGamesPerPair;
    const OUT_FILE = path.join(__dirname, '..', 'benchmark_results.csv');

    async function main() {
        console.log('Starting AI Benchmarks...');
        const stream = fs.createWriteStream(OUT_FILE);
        stream.write('Config A,Config B,Wins A (as Black),Wins B (as White),Wins A (as White),Wins B (as Black),Total Wins A,Total Wins B\n');

        const MAX_WORKERS = Math.max(1, os.cpus().length - 1);
        let activeWorkers = 0;
        const taskQueue: (() => void)[] = [];

        const runTask = (task: MatchTask): Promise<{ winsA: number, winsB: number }> => {
            return new Promise((resolve, reject) => {
                const startWorker = () => {
                    activeWorkers++;
                    const worker = new Worker(__filename, {
                        workerData: task,
                        // Use ts-node in worker threads
                        execArgv: ['--require', 'ts-node/register/transpile-only']
                    });

                    worker.on('message', (msg) => {
                        if (msg.type === 'progress') {
                            process.stdout.write('.');
                        } else if (msg.type === 'result') {
                            resolve({ winsA: msg.winsA, winsB: msg.winsB });
                        }
                    });

                    worker.on('error', reject);
                    worker.on('exit', (code) => {
                        activeWorkers--;
                        if (taskQueue.length > 0) {
                            const next = taskQueue.shift();
                            if (next) next();
                        }
                        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
                    });
                };

                if (activeWorkers < MAX_WORKERS) {
                    startWorker();
                } else {
                    taskQueue.push(startWorker);
                }
            });
        };

        // Spawn all workers immediately instead of sequentially waiting for each pair
        interface PendingMatch {
            configA: AiConfig;
            configB: AiConfig;
            resultPromise: Promise<[{winsA: number, winsB: number}, {winsA: number, winsB: number}]>;
        }

        const pendingMatches: PendingMatch[] = [];

        for (let i = 0; i < configs.length; i++) {
            for (let j = i; j < configs.length; j++) {
                const configA = configs[i]!;
                const configB = configs[j]!;

                console.log(`Queuing match: [${configToString(configA)}] vs [${configToString(configB)}]`);

                const taskABlack: MatchTask = { configA, configB, gamesPerPair: GAMES_PER_SIDE, blackConfig: 'A' };
                const taskBBlack: MatchTask = { configA, configB, gamesPerPair: GAMES_PER_SIDE, blackConfig: 'B' };

                const resultPromise = Promise.all([
                    runTask(taskABlack),
                    runTask(taskBBlack)
                ]);

                pendingMatches.push({
                    configA,
                    configB,
                    resultPromise
                });
            }
        }

        console.log(`\nStarting execution with concurrency limit of ${MAX_WORKERS} workers...`);

        // Wait for all matches to complete and write them out
        for (const match of pendingMatches) {
            const [resultABlack, resultBBlack] = await match.resultPromise;

            const totalWinsA = resultABlack.winsA + resultBBlack.winsA;
            const totalWinsB = resultABlack.winsB + resultBBlack.winsB;

            const csvRow = `${configToString(match.configA)},${configToString(match.configB)},${resultABlack.winsA},${resultABlack.winsB},${resultBBlack.winsA},${resultBBlack.winsB},${totalWinsA},${totalWinsB}\n`;
            stream.write(csvRow);

            // Print a newline so the match completion log isn't appended to the progress dots
            console.log(`\nCompleted match: [${configToString(match.configA)}] (${totalWinsA}) vs [${configToString(match.configB)}] (${totalWinsB})`);
        }

        stream.end();
        console.log(`\nBenchmarks complete! Results saved to ${OUT_FILE}`);
    }

    main().catch(console.error);
}
