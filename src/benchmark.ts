import { GameEngine } from './components/GameEngine';
import { AiPlayer } from './components/AiPlayer';
import { Player } from './interfaces/Player';
import { isMainThread, parentPort, workerData, Worker } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type ExpansionStrategy = 'Random' | 'BestProximity' | 'RandomImprovingProximity';
type SimulationMode = 'RandomRollout' | 'ProximityHeuristic';

interface AiConfig {
    expansionStrategy: ExpansionStrategy;
    simulationMode: SimulationMode;
}

const EXPANSION_STRATEGIES: ExpansionStrategy[] = ['Random', 'BestProximity', 'RandomImprovingProximity'];
const SIMULATION_MODES: SimulationMode[] = ['RandomRollout', 'ProximityHeuristic'];

const configs: AiConfig[] = [];
for (const exp of EXPANSION_STRATEGIES) {
    for (const sim of SIMULATION_MODES) {
        configs.push({ expansionStrategy: exp, simulationMode: sim });
    }
}

interface MatchTask {
    configAIndex: number;
    configBIndex: number;
    gamesPerPair: number; // For one side, e.g., 50
    blackConfig: 'A' | 'B';
}

function configToString(config: AiConfig): string {
    return `${config.expansionStrategy}-${config.simulationMode}`;
}

async function playSingleGame(configBlack: AiConfig, configWhite: AiConfig): Promise<Player> {
    const engine = new GameEngine();
    const playerBlack = new AiPlayer();
    const playerWhite = new AiPlayer();

    playerBlack.setThinkTime(1000);
    playerBlack.setExpansionStrategy(configBlack.expansionStrategy);
    playerBlack.setSimulationMode(configBlack.simulationMode);

    playerWhite.setThinkTime(1000);
    playerWhite.setExpansionStrategy(configWhite.expansionStrategy);
    playerWhite.setSimulationMode(configWhite.simulationMode);

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
    const configA = configs[task.configAIndex]!;
    const configB = configs[task.configBIndex]!;

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
            // Send progress update
            parentPort?.postMessage({ type: 'progress' });
        }
        parentPort?.postMessage({ type: 'done', winsA, winsB });
    };

    run().catch(err => {
        console.error(err);
        process.exit(1);
    });
} else {
    // Main thread
    const GAMES_PER_SIDE = 50;
    const OUT_FILE = path.join(__dirname, '..', 'benchmark_results.csv');

    // Limit concurrency to the number of CPU cores, but fallback to a reasonable default like 4
    const MAX_CONCURRENCY = Math.max(1, os.cpus().length - 1);

    async function main() {
        console.log(`Starting AI Benchmarks with max concurrency of ${MAX_CONCURRENCY}...`);
        const stream = fs.createWriteStream(OUT_FILE);
        stream.write('Config A,Config B,Wins A (as Black),Wins B (as White),Wins A (as White),Wins B (as Black),Total Wins A,Total Wins B\n');

        let activeWorkers = 0;
        const taskQueue: { task: MatchTask, resolve: (val: { winsA: number, winsB: number }) => void, reject: (err: any) => void }[] = [];

        const checkQueue = () => {
            while (activeWorkers < MAX_CONCURRENCY && taskQueue.length > 0) {
                const { task, resolve, reject } = taskQueue.shift()!;
                activeWorkers++;

                const worker = new Worker(__filename, {
                    workerData: task,
                    // Use ts-node in worker threads
                    execArgv: ['--require', 'ts-node/register/transpile-only']
                });

                worker.on('message', (msg) => {
                    if (msg.type === 'progress') {
                        process.stdout.write('.'); // Just print a dot for progress
                    } else if (msg.type === 'done') {
                        activeWorkers--;
                        resolve({ winsA: msg.winsA, winsB: msg.winsB });
                        checkQueue(); // Start next task in queue
                    }
                });

                worker.on('error', (err) => {
                    activeWorkers--;
                    reject(err);
                    checkQueue();
                });

                worker.on('exit', (code) => {
                    if (code !== 0) {
                        activeWorkers--;
                        reject(new Error(`Worker stopped with exit code ${code}`));
                        checkQueue();
                    }
                });
            }
        };

        const runTask = (task: MatchTask): Promise<{ winsA: number, winsB: number }> => {
            return new Promise((resolve, reject) => {
                taskQueue.push({ task, resolve, reject });
                checkQueue();
            });
        };

        interface PendingMatch {
            configA: AiConfig;
            configB: AiConfig;
            resultPromise: Promise<[{winsA: number, winsB: number}, {winsA: number, winsB: number}]>;
        }

        const pendingMatches: PendingMatch[] = [];
        let totalGamesToRun = 0;

        for (let i = 0; i < configs.length; i++) {
            for (let j = i; j < configs.length; j++) {
                const configA = configs[i]!;
                const configB = configs[j]!;

                const taskABlack: MatchTask = { configAIndex: i, configBIndex: j, gamesPerPair: GAMES_PER_SIDE, blackConfig: 'A' };
                const taskBBlack: MatchTask = { configAIndex: i, configBIndex: j, gamesPerPair: GAMES_PER_SIDE, blackConfig: 'B' };

                totalGamesToRun += GAMES_PER_SIDE * 2;

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

        console.log(`Queued ${pendingMatches.length} matches (${totalGamesToRun} games total). Starting execution...`);

        // Wait for all matches to complete and write them out
        for (const match of pendingMatches) {
            const [resultABlack, resultBBlack] = await match.resultPromise;

            // Print a newline so the progress dots don't overwrite the result
            process.stdout.write('\n');

            const totalWinsA = resultABlack.winsA + resultBBlack.winsA;
            const totalWinsB = resultABlack.winsB + resultBBlack.winsB;

            const csvRow = `${configToString(match.configA)},${configToString(match.configB)},${resultABlack.winsA},${resultABlack.winsB},${resultBBlack.winsA},${resultBBlack.winsB},${totalWinsA},${totalWinsB}\n`;
            stream.write(csvRow);
            console.log(`Completed match: [${configToString(match.configA)}] (${totalWinsA}) vs [${configToString(match.configB)}] (${totalWinsB})`);
        }

        stream.end();
        console.log(`Benchmarks complete! Results saved to ${OUT_FILE}`);
    }

    main().catch(console.error);
}
