const { chromium } = require('playwright');

async function watchPlayers() {
    console.log('Starting watchable player simulations...\n');

    // Define three different player types
    const players = [
        {
            name: 'Aggressive Annie',
            strategy: { type: 'aggressive', weeks: 25 },
            description: 'High spawn rate, direct routing, plays longer games'
        },
        {
            name: 'Conservative Carl',
            strategy: { type: 'conservative', weeks: 15 },
            description: 'Lower spawn rate, hub-and-spoke routing, shorter games'
        },
        {
            name: 'Balanced Betty',
            strategy: { type: 'balanced', weeks: 20 },
            description: 'Default settings, mixed routing approach, medium games'
        }
    ];

    const browser = await chromium.launch({
        headless: false,
        slowMo: 0,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    const allResults = [];

    for (const player of players) {
        console.log(`\n=== ${player.name} (${player.description}) ===`);

        for (let game = 1; game <= 5; game++) {
            console.log(`Starting Game ${game}/5 for ${player.name}...`);

            try {
                // Navigate to game
                await page.goto('http://localhost:8000');

                // Wait for game to load
                await page.waitForFunction(() => window.MM && window.MM.simulateWeeks);
                await page.waitForTimeout(2000);

                // Add player indicator
                await page.evaluate((params) => {
                    const { playerName, gameNum, strategy } = params;
                    // Remove existing indicator
                    const existing = document.getElementById('player-indicator');
                    if (existing) existing.remove();

                    // Add new indicator
                    const indicator = document.createElement('div');
                    indicator.id = 'player-indicator';
                    indicator.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 20px;
                        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                        color: white;
                        padding: 15px 25px;
                        border-radius: 10px;
                        font-family: Arial, sans-serif;
                        font-size: 20px;
                        font-weight: bold;
                        z-index: 10000;
                        border: 3px solid white;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                    `;
                    indicator.innerHTML = `
                        <div>${playerName}</div>
                        <div style="font-size: 14px; margin-top: 5px;">Game ${gameNum}/5 - ${strategy} Strategy</div>
                    `;
                    document.body.appendChild(indicator);
                }, { playerName: player.name, gameNum: game, strategy: player.strategy.type });

                // Configure game for this player
                await page.evaluate((strategy) => {
                    if (window.MM) {
                        switch(strategy.type) {
                            case 'aggressive':
                                window.MM.setSpawnMultiplier(1.2);
                                window.MM.setHubAndSpoke(false);
                                break;
                            case 'conservative':
                                window.MM.setSpawnMultiplier(0.7);
                                window.MM.setHubAndSpoke(true);
                                break;
                            case 'balanced':
                                window.MM.setSpawnMultiplier(1.0);
                                window.MM.setHubAndSpoke(false);
                                break;
                        }
                    }
                }, player.strategy);

                // Add countdown before simulation starts
                for (let i = 3; i > 0; i--) {
                    await page.evaluate((count) => {
                        const countdown = document.getElementById('countdown') || document.createElement('div');
                        countdown.id = 'countdown';
                        countdown.style.cssText = `
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background: rgba(0,0,0,0.9);
                            color: #00ff00;
                            padding: 30px;
                            border-radius: 15px;
                            font-family: Arial, sans-serif;
                            font-size: 48px;
                            font-weight: bold;
                            z-index: 10001;
                            border: 3px solid #00ff00;
                        `;
                        countdown.textContent = `Starting in ${count}...`;
                        if (!document.getElementById('countdown')) {
                            document.body.appendChild(countdown);
                        }
                    }, i);
                    await page.waitForTimeout(1000);
                }

                // Remove countdown
                await page.evaluate(() => {
                    const countdown = document.getElementById('countdown');
                    if (countdown) countdown.remove();
                });

                // Run simulation
                const startTime = Date.now();
                const result = await page.evaluate(async (strategy) => {
                    const simulationResult = await window.MM.simulateWeeks(strategy.weeks, { log: false });
                    return {
                        weeks: strategy.weeks,
                        day: simulationResult.day || 0,
                        finalScore: simulationResult.score || 0,
                        passengersWaiting: simulationResult.waiting || 0,
                        routesCreated: simulationResult.linesBuilt || 0,
                        trainsDeployed: simulationResult.trains || 0,
                        maxWaiting: simulationResult.maxWaiting || 0,
                        gameOver: simulationResult.gameOver || false,
                        feasible: simulationResult.feasible || false,
                        strategy: strategy.type
                    };
                }, player.strategy);

                const duration = Date.now() - startTime;
                result.duration = duration;
                result.player = player.name;
                result.game = game;

                allResults.push(result);

                console.log(`${player.name} Game ${game} finished: Day ${result.day}, Score ${result.finalScore}, Routes ${result.routesCreated}, Trains ${result.trainsDeployed}`);

                // Show results on screen
                await page.evaluate((result) => {
                    const resultsDiv = document.createElement('div');
                    resultsDiv.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(0,0,0,0.9);
                        color: white;
                        padding: 20px;
                        border-radius: 10px;
                        font-family: Arial, sans-serif;
                        font-size: 16px;
                        z-index: 10001;
                        border: 3px solid #4ecdc4;
                        text-align: center;
                    `;
                    resultsDiv.innerHTML = `
                        <h3 style="margin-top: 0; color: #4ecdc4;">Game Complete!</h3>
                        <div>Day: ${result.day}</div>
                        <div>Score: ${result.finalScore}</div>
                        <div>Routes: ${result.routesCreated}</div>
                        <div>Trains: ${result.trainsDeployed}</div>
                        <div style="margin-top: 10px; font-size: 14px; color: #ccc;">
                            Next game starting in 3 seconds...
                        </div>
                    `;
                    document.body.appendChild(resultsDiv);

                    setTimeout(() => {
                        resultsDiv.remove();
                    }, 3000);
                }, result);

                // Wait before next game
                await page.waitForTimeout(3000);

            } catch (error) {
                console.error(`Error in ${player.name} game ${game}:`, error.message);
            }
        }
    }

    // Show final summary
    await page.evaluate((results) => {
        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.95);
            color: white;
            padding: 30px;
            border-radius: 15px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10001;
            border: 3px solid #ff6b6b;
            max-height: 80vh;
            overflow-y: auto;
            width: 600px;
        `;

        // Calculate averages for each player
        const playerStats = {};
        results.forEach(result => {
            if (!playerStats[result.player]) {
                playerStats[result.player] = { scores: [], routes: [], trains: [], days: [] };
            }
            playerStats[result.player].scores.push(result.finalScore);
            playerStats[result.player].routes.push(result.routesCreated);
            playerStats[result.player].trains.push(result.trainsDeployed);
            playerStats[result.player].days.push(result.day);
        });

        let summaryHTML = '<h2 style="text-align: center; color: #ff6b6b; margin-top: 0;">Final Results</h2>';

        Object.keys(playerStats).forEach(playerName => {
            const stats = playerStats[playerName];
            const avgScore = Math.round(stats.scores.reduce((a,b) => a+b, 0) / stats.scores.length);
            const avgRoutes = Math.round(stats.routes.reduce((a,b) => a+b, 0) / stats.routes.length);
            const avgTrains = Math.round(stats.trains.reduce((a,b) => a+b, 0) / stats.trains.length);
            const avgDays = Math.round(stats.days.reduce((a,b) => a+b, 0) / stats.days.length);

            summaryHTML += `
                <div style="margin: 15px 0; padding: 15px; border: 1px solid #666; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; color: #4ecdc4;">${playerName}</h3>
                    <div>Average Score: ${avgScore}</div>
                    <div>Average Routes: ${avgRoutes}</div>
                    <div>Average Trains: ${avgTrains}</div>
                    <div>Average Days: ${avgDays}</div>
                </div>
            `;
        });

        summaryHTML += '<div style="text-align: center; margin-top: 20px; color: #ccc;">Simulation Complete - Press any key to close</div>';
        summaryDiv.innerHTML = summaryHTML;
        document.body.appendChild(summaryDiv);
    }, allResults);

    console.log('\n=== FINAL RESULTS ===');

    // Calculate and display averages
    const playerStats = {};
    allResults.forEach(result => {
        if (!playerStats[result.player]) {
            playerStats[result.player] = { scores: [], routes: [], trains: [], days: [] };
        }
        playerStats[result.player].scores.push(result.finalScore);
        playerStats[result.player].routes.push(result.routesCreated);
        playerStats[result.player].trains.push(result.trainsDeployed);
        playerStats[result.player].days.push(result.day);
    });

    Object.keys(playerStats).forEach(playerName => {
        const stats = playerStats[playerName];
        const avgScore = Math.round(stats.scores.reduce((a,b) => a+b, 0) / stats.scores.length);
        const avgRoutes = Math.round(stats.routes.reduce((a,b) => a+b, 0) / stats.routes.length);
        const avgTrains = Math.round(stats.trains.reduce((a,b) => a+b, 0) / stats.trains.length);
        const avgDays = Math.round(stats.days.reduce((a,b) => a+b, 0) / stats.days.length);

        console.log(`\n${playerName}:`);
        console.log(`  Average Score: ${avgScore}`);
        console.log(`  Average Routes: ${avgRoutes}`);
        console.log(`  Average Trains: ${avgTrains}`);
        console.log(`  Average Days: ${avgDays}`);
    });

    // Wait for user to close
    await page.waitForTimeout(30000);
    await browser.close();
}

watchPlayers().catch(console.error);