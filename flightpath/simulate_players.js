const { chromium } = require('playwright');

class AirTrafficPlayer {
    constructor(name, strategy) {
        this.name = name;
        this.strategy = strategy;
        this.results = [];
    }

    async playGame(page) {
        console.log(`${this.name} starting game...`);

        // Wait for game to fully load
        await page.waitForTimeout(3000);

        // Ensure game is ready
        await page.waitForFunction(() => window.MM && window.MM.simulateWeeks);

        // Configure game settings based on player strategy
        await this.configureGame(page);

        // Play for a set duration (simulate full game)
        const gameResult = await this.executeStrategy(page);

        this.results.push(gameResult);
        return gameResult;
    }

    async configureGame(page) {
        // Set different configurations for each player type
        await page.evaluate((strategy) => {
            if (window.MM) {
                switch(strategy.type) {
                    case 'aggressive':
                        window.MM.setSpawnMultiplier(1.2); // More passengers
                        window.MM.setHubAndSpoke(false); // Direct routing
                        break;
                    case 'conservative':
                        window.MM.setSpawnMultiplier(0.7); // Fewer passengers
                        window.MM.setHubAndSpoke(true); // Hub-centric
                        break;
                    case 'balanced':
                        window.MM.setSpawnMultiplier(1.0); // Default
                        window.MM.setHubAndSpoke(false); // Mixed approach
                        break;
                }
            }
        }, this.strategy);
    }

    async executeStrategy(page) {
        const startTime = Date.now();

        // Run simulation based on strategy
        const result = await page.evaluate(async (strategy) => {
            if (!window.MM) {
                return { error: 'Game not loaded properly' };
            }

            // Run automated simulation for different durations based on player type
            const weeks = strategy.weeks;
            const simulationResult = await window.MM.simulateWeeks(weeks, { log: false });

            return {
                weeks: weeks,
                day: simulationResult.day || 0,
                finalScore: simulationResult.score || 0,
                passengersTransported: simulationResult.waiting || 0,
                routesCreated: simulationResult.linesBuilt || 0,
                trainsDeployed: simulationResult.trains || 0,
                maxWaiting: simulationResult.maxWaiting || 0,
                gameOver: simulationResult.gameOver || false,
                feasible: simulationResult.feasible || false,
                strategy: strategy.type
            };
        }, this.strategy);

        const duration = Date.now() - startTime;
        result.duration = duration;

        console.log(`${this.name} finished: Day ${result.day}, Score ${result.finalScore}, Routes ${result.routesCreated}, Trains ${result.trainsDeployed}`);
        return result;
    }

    getAverageResults() {
        if (this.results.length === 0) return null;

        const totals = this.results.reduce((acc, result) => {
            acc.score += result.finalScore || 0;
            acc.passengers += result.passengersTransported || 0;
            acc.routes += result.routesCreated || 0;
            acc.trains += result.trainsDeployed || 0;
            acc.maxWaiting += result.maxWaiting || 0;
            acc.duration += result.duration || 0;
            return acc;
        }, { score: 0, passengers: 0, routes: 0, trains: 0, maxWaiting: 0, duration: 0 });

        const count = this.results.length;
        return {
            player: this.name,
            strategy: this.strategy.type,
            averageScore: Math.round(totals.score / count),
            averagePassengers: Math.round(totals.passengers / count),
            averageRoutes: Math.round(totals.routes / count),
            averageTrains: Math.round(totals.trains / count),
            averageMaxWaiting: Math.round(totals.maxWaiting / count),
            averageDuration: Math.round(totals.duration / count),
            gamesPlayed: count
        };
    }
}

async function runAllSimulations() {
    // Define three different player types with different strategies
    const players = [
        new AirTrafficPlayer('Aggressive Annie', {
            type: 'aggressive',
            weeks: 25,
            description: 'High spawn rate, direct routing, plays longer games'
        }),
        new AirTrafficPlayer('Conservative Carl', {
            type: 'conservative',
            weeks: 15,
            description: 'Lower spawn rate, hub-and-spoke routing, shorter games'
        }),
        new AirTrafficPlayer('Balanced Betty', {
            type: 'balanced',
            weeks: 20,
            description: 'Default settings, mixed routing approach, medium games'
        })
    ];

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000,  // Slow down actions to make them visible
        args: [
            '--start-maximized',
            '--disable-web-security',
            '--no-first-run',
            '--force-device-scale-factor=1'
        ]
    });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    console.log('Starting simulations for 3 players, 5 games each...\n');

    for (const player of players) {
        console.log(`\n=== ${player.name} (${player.strategy.description}) ===`);

        for (let game = 1; game <= 5; game++) {
            console.log(`Game ${game}/5:`);

            const page = await context.newPage();

            try {
                // Navigate to game
                await page.goto('http://localhost:8000');

                // Wait for game to fully load
                await page.waitForFunction(() => window.MM && window.MM.simulateWeeks);

                // Add visual indicator of current player
                await page.evaluate((playerName, gameNum) => {
                    const indicator = document.createElement('div');
                    indicator.id = 'player-indicator';
                    indicator.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 20px;
                        background: rgba(0,0,0,0.8);
                        color: white;
                        padding: 10px 20px;
                        border-radius: 5px;
                        font-family: Arial, sans-serif;
                        font-size: 18px;
                        z-index: 10000;
                        border: 3px solid #00ff00;
                    `;
                    indicator.textContent = `${playerName} - Game ${gameNum}/5`;
                    document.body.appendChild(indicator);
                }, player.name, game);

                // Play the game
                await player.playGame(page);

            } catch (error) {
                console.error(`Error in ${player.name} game ${game}:`, error.message);
            } finally {
                await page.close();
            }

            // Brief pause between games so you can see the transition
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    await browser.close();

    // Print results summary
    console.log('\n\n=== SIMULATION RESULTS SUMMARY ===\n');

    players.forEach(player => {
        const avg = player.getAverageResults();
        if (avg) {
            console.log(`${avg.player}:`);
            console.log(`  Strategy: ${avg.strategy}`);
            console.log(`  Average Score: ${avg.averageScore}`);
            console.log(`  Average Passengers Waiting: ${avg.averagePassengers}`);
            console.log(`  Average Routes: ${avg.averageRoutes}`);
            console.log(`  Average Trains: ${avg.averageTrains}`);
            console.log(`  Average Max Waiting: ${avg.averageMaxWaiting}`);
            console.log(`  Average Duration: ${avg.averageDuration}ms`);
            console.log(`  Games Completed: ${avg.gamesPlayed}/5\n`);
        }
    });

    // Find the best performing player
    const averages = players.map(p => p.getAverageResults()).filter(Boolean);
    if (averages.length > 0) {
        const bestByScore = averages.reduce((best, current) =>
            current.averageScore > best.averageScore ? current : best
        );

        const bestByTrains = averages.reduce((best, current) =>
            current.averageTrains > best.averageTrains ? current : best
        );

        console.log('=== WINNERS ===');
        console.log(`Highest Score: ${bestByScore.player} (${bestByScore.averageScore})`);
        console.log(`Most Trains Deployed: ${bestByTrains.player} (${bestByTrains.averageTrains})`);
    }

    return players;
}

// Run the simulations
runAllSimulations().catch(console.error);