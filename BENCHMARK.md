# EleGo AI Benchmarks

This repository includes a benchmarking tool designed to evaluate the performance of different Artificial Intelligence (AI) configurations for the game EleGo.

## What it does

The `src/benchmark.ts` script sets up isolated games where two AI instances play against each other. It combines the 3 available expansion strategies with the 2 simulation modes to create 6 distinct AI configurations:

**Expansion Strategies:**
- `Random`
- `BestProximity`
- `Pruned`

**Simulation Modes:**
- `RandomRollout`
- `ProximityHeuristic`
- `Hybrid`

**Proximity Score Modes:**
- `Original`
- `DistanceDifference`

The script uses Node.js `worker_threads` to run match evaluations in parallel. Every configuration pairs up against every other configuration (including itself) to play a number of total games (default is 100 total games, 50 as Black and 50 as White).

Each AI has a fixed 1000ms (1 second) think time limit per turn. A game will terminate early if an AI determines it has at least a 90% probability of victory while its opponent calculates its own probability of victory at less than 10%.

## Running the benchmarks

You can run the benchmarks using the following npm command:

```bash
npm run benchmark
```

You can optionally configure the proximity score mode and the number of games per side using command line arguments:

```bash
npm run benchmark ProximityScore=DistanceDifference GamesPerPair=10
```

- `ProximityScore`: Can be set to `Original` or `DistanceDifference` (defaults to `Original`).
- `GamesPerPair`: The number of games each configuration plays as Black (and as White). Defaults to `50` (meaning 100 total matches per pair).

*Note: With 6 baseline configurations, there are 21 pairs (including self-play). With default settings (50 games per pair), in total, 2100 games will be simulated, taking a considerable amount of time depending on your CPU capabilities.*

## Output

The benchmark script prints its progress directly to the console. Once matches complete, the final tally is appended incrementally to a `benchmark_results.csv` file created in the root directory.

The CSV contains the following columns:
- **Config A**: The AI configuration assigned to Player A.
- **Config B**: The AI configuration assigned to Player B.
- **Wins A (as Black)**: Number of wins for Player A when playing first.
- **Wins B (as White)**: Number of wins for Player B when playing second.
- **Wins A (as White)**: Number of wins for Player A when playing second.
- **Wins B (as Black)**: Number of wins for Player B when playing first.
- **Total Wins A**: Aggregate of wins across both sides for Player A.
- **Total Wins B**: Aggregate of wins across both sides for Player B.
