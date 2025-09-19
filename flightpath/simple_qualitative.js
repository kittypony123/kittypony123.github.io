const { chromium } = require('playwright');

async function runQualitativeAnalysis() {
    console.log('🎮 Qualitative Player Experience Analysis');
    console.log('Focus: Enjoyment, Flexibility, and Player Satisfaction\n');

    // Define 5 different player personalities
    const players = [
        {
            name: '🎨 Creative Curator',
            description: 'Loves artistic network designs and elegant solutions',
            traits: ['Creative', 'Perfectionist', 'Patient', 'Aesthetic'],
            spawnRate: 0.9,
            prefersHubs: false,
            weeks: 22,
            color: '#667eea',
            playStyle: 'Builds beautiful, efficient networks with focus on visual harmony'
        },
        {
            name: '⚡ Chaos Commander',
            description: 'Thrives on unpredictability and high-pressure situations',
            traits: ['Risk-Taker', 'Impulsive', 'Adaptable', 'Thrill-Seeker'],
            spawnRate: 1.4,
            prefersHubs: false,
            weeks: 18,
            color: '#ff6b6b',
            playStyle: 'Embraces chaos, emergency management, and rapid decisions'
        },
        {
            name: '🤝 Social Shepherd',
            description: 'Motivated by helping passengers and community building',
            traits: ['Social', 'Empathetic', 'Patient', 'Optimistic'],
            spawnRate: 1.0,
            prefersHubs: true,
            weeks: 20,
            color: '#4ecdc4',
            playStyle: 'Focuses on passenger happiness and network accessibility'
        },
        {
            name: '🧠 Strategic Sage',
            description: 'Enjoys deep planning and optimal long-term solutions',
            traits: ['Analytical', 'Patient', 'Methodical', 'Curious'],
            spawnRate: 0.8,
            prefersHubs: true,
            weeks: 28,
            color: '#2196F3',
            playStyle: 'Masters complex optimization and long-term planning'
        },
        {
            name: '🔍 Flexible Explorer',
            description: 'Loves trying different approaches and discovering new strategies',
            traits: ['Curious', 'Adaptable', 'Creative', 'Experimental'],
            spawnRate: 1.1,
            prefersHubs: false,
            weeks: 19,
            color: '#9C27B0',
            playStyle: 'Constantly experiments with new techniques and approaches'
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
        console.log(`\n${'='.repeat(60)}`);
        console.log(`${player.name}`);
        console.log(`   ${player.description}`);
        console.log(`   Traits: ${player.traits.join(', ')}`);
        console.log(`   Play Style: ${player.playStyle}`);
        console.log(`${'='.repeat(60)}`);

        const playerResults = [];

        for (let game = 1; game <= 5; game++) {
            console.log(`\n🎮 Starting Game ${game}/5...`);

            try {
                await page.goto('http://localhost:8000');
                await page.waitForFunction(() => window.MM && window.MM.simulateWeeks);
                await page.waitForTimeout(2000);

                // Show player indicator
                await page.evaluate(() => {
                    const existing = document.getElementById('player-indicator');
                    if (existing) existing.remove();
                });

                await page.evaluate((playerData, gameNum) => {
                    const indicator = document.createElement('div');
                    indicator.id = 'player-indicator';
                    indicator.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 20px;
                        background: ${playerData.color};
                        color: white;
                        padding: 15px 25px;
                        border-radius: 12px;
                        font-family: Arial, sans-serif;
                        font-size: 18px;
                        font-weight: bold;
                        z-index: 10000;
                        border: 3px solid white;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                        max-width: 350px;
                    `;
                    indicator.innerHTML = `
                        <div style="font-size: 20px; margin-bottom: 8px;">${playerData.name}</div>
                        <div style="font-size: 14px; line-height: 1.3;">
                            ${playerData.traits.join(' • ')}
                        </div>
                        <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">
                            Game ${gameNum}/5 - ${playerData.playStyle}
                        </div>
                    `;
                    document.body.appendChild(indicator);
                }, player, game);

                // Configure game for personality
                await page.evaluate((playerData) => {
                    if (window.MM) {
                        window.MM.setSpawnMultiplier(playerData.spawnRate);
                        window.MM.setHubAndSpoke(playerData.prefersHubs);
                    }
                }, player);

                // Countdown with personality
                for (let i = 3; i > 0; i--) {
                    await page.evaluate((count, playerColor) => {
                        const countdown = document.getElementById('countdown') || document.createElement('div');
                        countdown.id = 'countdown';
                        countdown.style.cssText = `
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background: ${playerColor};
                            color: white;
                            padding: 40px;
                            border-radius: 20px;
                            font-family: Arial, sans-serif;
                            font-size: 48px;
                            font-weight: bold;
                            z-index: 10001;
                            border: 4px solid white;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                            text-align: center;
                        `;
                        countdown.textContent = `Starting in ${count}...`;
                        if (!document.getElementById('countdown')) {
                            document.body.appendChild(countdown);
                        }
                    }, i, player.color);
                    await page.waitForTimeout(1000);
                }

                await page.evaluate(() => {
                    const countdown = document.getElementById('countdown');
                    if (countdown) countdown.remove();
                });

                // Run simulation with personality-driven weeks
                const startTime = Date.now();
                const result = await page.evaluate((playerData) => {
                    // Add personality variability to game length
                    let weeksToPlay = playerData.weeks;
                    if (playerData.traits.includes('Impulsive')) {
                        weeksToPlay = Math.floor(weeksToPlay * (0.7 + Math.random() * 0.6));
                    } else if (playerData.traits.includes('Patient')) {
                        weeksToPlay = Math.floor(weeksToPlay * (1.1 + Math.random() * 0.4));
                    }

                    return window.MM.simulateWeeks(weeksToPlay, { log: false }).then(simulationResult => {
                        // Calculate qualitative metrics
                        const efficiency = simulationResult.trains > 0 ? Math.round(simulationResult.score / simulationResult.trains) : 0;
                        const networkDensity = Math.round((simulationResult.linesBuilt / (simulationResult.day || 1)) * 100) / 100;

                        // Passenger satisfaction
                        const passengerSatisfaction = simulationResult.maxWaiting < 10 ? 'High' :
                                                    simulationResult.maxWaiting < 20 ? 'Medium' : 'Low';

                        // Enjoyment factors based on personality and performance
                        let enjoymentFactors = [];
                        if (playerData.traits.includes('Risk-Taker') && simulationResult.maxWaiting > 15) {
                            enjoymentFactors.push('Thrilling challenge');
                        }
                        if (playerData.traits.includes('Perfectionist') && efficiency > 100) {
                            enjoymentFactors.push('Satisfying optimization');
                        }
                        if (playerData.traits.includes('Creative') && simulationResult.linesBuilt > 10) {
                            enjoymentFactors.push('Complex network design');
                        }
                        if (playerData.traits.includes('Social') && simulationResult.score > 2000) {
                            enjoymentFactors.push('Helping many passengers');
                        }
                        if (playerData.traits.includes('Analytical') && simulationResult.feasible) {
                            enjoymentFactors.push('Strategic planning success');
                        }
                        if (playerData.traits.includes('Adaptable') && !simulationResult.gameOver) {
                            enjoymentFactors.push('Flexible problem solving');
                        }
                        if (playerData.traits.includes('Curious') && simulationResult.linesBuilt > weeksToPlay * 0.4) {
                            enjoymentFactors.push('Experimental network building');
                        }

                        // Stress level assessment
                        let stressLevel = simulationResult.maxWaiting > 25 ? 'High' :
                                        simulationResult.maxWaiting > 15 ? 'Medium' : 'Low';

                        // Game flow assessment
                        const gameFlow = simulationResult.feasible && !simulationResult.gameOver ? 'Smooth' :
                                       simulationResult.gameOver ? 'Overwhelming' : 'Challenging';

                        // Replayability assessment
                        const replayability = enjoymentFactors.length > 2 ? 'High' :
                                            enjoymentFactors.length > 0 ? 'Medium' : 'Low';

                        return {
                            weeks: weeksToPlay,
                            day: simulationResult.day || 0,
                            finalScore: simulationResult.score || 0,
                            routesCreated: simulationResult.linesBuilt || 0,
                            trainsDeployed: simulationResult.trains || 0,
                            maxWaiting: simulationResult.maxWaiting || 0,
                            gameOver: simulationResult.gameOver || false,
                            feasible: simulationResult.feasible || false,

                            // Qualitative metrics
                            efficiency,
                            networkDensity,
                            passengerSatisfaction,
                            enjoymentFactors,
                            stressLevel,
                            gameFlow,
                            replayability,
                            emergentGameplay: simulationResult.linesBuilt > weeksToPlay ? 'Yes' : 'No'
                        };
                    });
                }, player);

                const duration = Date.now() - startTime;
                result.duration = duration;
                result.player = player.name;
                result.personality = player.traits;
                result.game = game;

                playerResults.push(result);
                allResults.push(result);

                // Show detailed results
                await page.evaluate((resultData, playerName) => {
                    const resultsDiv = document.createElement('div');
                    resultsDiv.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(0,0,0,0.95);
                        color: white;
                        padding: 25px;
                        border-radius: 15px;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        z-index: 10001;
                        border: 3px solid #4ecdc4;
                        text-align: left;
                        max-width: 500px;
                        line-height: 1.4;
                    `;

                    const enjoymentColor = resultData.enjoymentFactors.length > 2 ? '#4ecdc4' :
                                         resultData.enjoymentFactors.length > 0 ? '#ffa726' : '#ff5252';

                    resultsDiv.innerHTML = `
                        <h3 style="margin-top: 0; color: #4ecdc4; text-align: center;">${playerName} - Game Complete!</h3>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                            <div>
                                <strong>📊 Performance</strong><br>
                                Day: ${resultData.day}<br>
                                Score: ${resultData.finalScore}<br>
                                Routes: ${resultData.routesCreated}<br>
                                Trains: ${resultData.trainsDeployed}<br>
                                Efficiency: ${resultData.efficiency}
                            </div>
                            <div>
                                <strong>🎯 Experience</strong><br>
                                Flow: ${resultData.gameFlow}<br>
                                Stress: ${resultData.stressLevel}<br>
                                Satisfaction: ${resultData.passengerSatisfaction}<br>
                                Replayability: ${resultData.replayability}<br>
                                Emergent: ${resultData.emergentGameplay}
                            </div>
                        </div>

                        <div style="margin: 15px 0;">
                            <strong style="color: ${enjoymentColor};">🎮 Enjoyment Factors:</strong><br>
                            ${resultData.enjoymentFactors.length > 0 ?
                                resultData.enjoymentFactors.map(f => `• ${f}`).join('<br>') :
                                '• Could use more engaging challenges'}
                        </div>

                        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #ccc;">
                            Next game in 3 seconds...
                        </div>
                    `;
                    document.body.appendChild(resultsDiv);

                    setTimeout(() => {
                        resultsDiv.remove();
                    }, 3000);
                }, result, player.name);

                console.log(`✨ ${player.name} Game ${game} finished:`);
                console.log(`   Day ${result.day} | Score: ${result.finalScore} | Flow: ${result.gameFlow}`);
                console.log(`   Enjoyment: ${result.enjoymentFactors.join(', ') || 'Needs improvement'}`);
                console.log(`   Stress: ${result.stressLevel} | Satisfaction: ${result.passengerSatisfaction} | Replayability: ${result.replayability}`);

                await page.waitForTimeout(3000);

            } catch (error) {
                console.error(`❌ Error in ${player.name} game ${game}:`, error.message);
            }
        }

        // Calculate player summary
        if (playerResults.length > 0) {
            const avgScore = Math.round(playerResults.reduce((sum, r) => sum + r.finalScore, 0) / playerResults.length);
            const allEnjoyment = playerResults.flatMap(r => r.enjoymentFactors);
            const uniqueEnjoyment = [...new Set(allEnjoyment)];
            const mostCommonStress = playerResults.map(r => r.stressLevel).sort((a,b) =>
                playerResults.filter(v => v.stressLevel === a).length - playerResults.filter(v => v.stressLevel === b).length
            ).pop();
            const mostCommonFlow = playerResults.map(r => r.gameFlow).sort((a,b) =>
                playerResults.filter(v => v.gameFlow === a).length - playerResults.filter(v => v.gameFlow === b).length
            ).pop();

            console.log(`\n📊 ${player.name} Summary:`);
            console.log(`   Average Score: ${avgScore}`);
            console.log(`   Enjoyment Diversity: ${uniqueEnjoyment.length} unique factors`);
            console.log(`   Top Enjoyment: ${uniqueEnjoyment.slice(0, 3).join(', ')}`);
            console.log(`   Typical Experience: ${mostCommonFlow} flow, ${mostCommonStress} stress`);
            console.log(`   Games Completed: ${playerResults.length}/5`);
        }
    }

    // Final comprehensive analysis
    console.log('\n\n' + '='.repeat(80));
    console.log('🏆 QUALITATIVE EXPERIENCE ANALYSIS RESULTS');
    console.log('='.repeat(80));

    // Group results by player
    const playerSummaries = {};
    allResults.forEach(result => {
        if (!playerSummaries[result.player]) {
            playerSummaries[result.player] = [];
        }
        playerSummaries[result.player].push(result);
    });

    Object.keys(playerSummaries).forEach(playerName => {
        const results = playerSummaries[playerName];
        const avgScore = Math.round(results.reduce((sum, r) => sum + r.finalScore, 0) / results.length);
        const allEnjoyment = results.flatMap(r => r.enjoymentFactors);
        const uniqueEnjoyment = [...new Set(allEnjoyment)];
        const highReplayabilityGames = results.filter(r => r.replayability === 'High').length;
        const emergentGames = results.filter(r => r.emergentGameplay === 'Yes').length;
        const lowStressGames = results.filter(r => r.stressLevel === 'Low').length;

        const playerSatisfaction = lowStressGames >= 3 ? 'Excellent' : lowStressGames >= 2 ? 'Good' : 'Fair';
        const flexibility = uniqueEnjoyment.length >= 4 ? 'Very High' : uniqueEnjoyment.length >= 2 ? 'High' : 'Medium';

        console.log(`\n🎭 ${playerName}:`);
        console.log(`   Player Satisfaction: ${playerSatisfaction}`);
        console.log(`   Flexibility Rating: ${flexibility}`);
        console.log(`   Average Score: ${avgScore}`);
        console.log(`   Enjoyment Diversity: ${uniqueEnjoyment.length} factors (${uniqueEnjoyment.slice(0, 3).join(', ')})`);
        console.log(`   High Replayability Games: ${highReplayabilityGames}/5`);
        console.log(`   Emergent Gameplay: ${emergentGames}/5 games`);
        console.log(`   Low Stress Games: ${lowStressGames}/5`);
    });

    await page.waitForTimeout(30000);
    await browser.close();
}

runQualitativeAnalysis().catch(console.error);