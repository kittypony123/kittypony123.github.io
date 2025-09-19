const { chromium } = require('playwright');

async function runQualitativeAnalysis() {
    console.log('🎮 Qualitative Player Experience Analysis');
    console.log('Focus: Enjoyment, Flexibility, and Player Satisfaction\n');

    const players = [
        {
            name: '🎨 Creative Curator',
            traits: ['Creative', 'Perfectionist', 'Patient'],
            spawnRate: 0.9,
            prefersHubs: false,
            weeks: 22,
            color: '#667eea'
        },
        {
            name: '⚡ Chaos Commander',
            traits: ['Risk-Taker', 'Impulsive', 'Adaptable'],
            spawnRate: 1.4,
            prefersHubs: false,
            weeks: 18,
            color: '#ff6b6b'
        },
        {
            name: '🤝 Social Shepherd',
            traits: ['Social', 'Empathetic', 'Patient'],
            spawnRate: 1.0,
            prefersHubs: true,
            weeks: 20,
            color: '#4ecdc4'
        },
        {
            name: '🧠 Strategic Sage',
            traits: ['Analytical', 'Patient', 'Methodical'],
            spawnRate: 0.8,
            prefersHubs: true,
            weeks: 28,
            color: '#2196F3'
        },
        {
            name: '🔍 Flexible Explorer',
            traits: ['Curious', 'Adaptable', 'Creative'],
            spawnRate: 1.1,
            prefersHubs: false,
            weeks: 19,
            color: '#9C27B0'
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
        console.log(`\n${'='.repeat(50)}`);
        console.log(`${player.name} - ${player.traits.join(', ')}`);
        console.log(`${'='.repeat(50)}`);

        const playerResults = [];

        for (let game = 1; game <= 5; game++) {
            console.log(`\n🎮 Game ${game}/5...`);

            try {
                await page.goto('http://localhost:8000');
                await page.waitForFunction(() => window.MM && window.MM.simulateWeeks);
                await page.waitForTimeout(2000);

                // Show player info (single parameter)
                await page.evaluate((playerInfo) => {
                    const existing = document.getElementById('player-indicator');
                    if (existing) existing.remove();

                    const indicator = document.createElement('div');
                    indicator.id = 'player-indicator';
                    indicator.style.cssText = `
                        position: fixed; top: 20px; left: 20px;
                        background: ${playerInfo.color}; color: white;
                        padding: 15px 25px; border-radius: 12px;
                        font-family: Arial; font-size: 18px; font-weight: bold;
                        z-index: 10000; border: 3px solid white;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                    `;
                    indicator.innerHTML = `
                        <div>${playerInfo.name}</div>
                        <div style="font-size: 14px; margin-top: 5px;">${playerInfo.traits.join(' • ')}</div>
                    `;
                    document.body.appendChild(indicator);
                }, player);

                // Configure game
                await page.evaluate((config) => {
                    if (window.MM) {
                        window.MM.setSpawnMultiplier(config.spawnRate);
                        window.MM.setHubAndSpoke(config.prefersHubs);
                    }
                }, player);

                // Run simulation
                const result = await page.evaluate((playerData) => {
                    let weeksToPlay = playerData.weeks;

                    // Add personality variability
                    if (playerData.traits.includes('Impulsive')) {
                        weeksToPlay = Math.floor(weeksToPlay * (0.8 + Math.random() * 0.4));
                    }

                    return window.MM.simulateWeeks(weeksToPlay, { log: false }).then(sim => {
                        const efficiency = sim.trains > 0 ? Math.round(sim.score / sim.trains) : 0;

                        // Calculate enjoyment factors
                        let enjoymentFactors = [];
                        if (playerData.traits.includes('Risk-Taker') && sim.maxWaiting > 15) {
                            enjoymentFactors.push('Thrilling challenge');
                        }
                        if (playerData.traits.includes('Perfectionist') && efficiency > 100) {
                            enjoymentFactors.push('Satisfying optimization');
                        }
                        if (playerData.traits.includes('Creative') && sim.linesBuilt > 10) {
                            enjoymentFactors.push('Complex network design');
                        }
                        if (playerData.traits.includes('Social') && sim.score > 2000) {
                            enjoymentFactors.push('Helping many passengers');
                        }
                        if (playerData.traits.includes('Analytical') && sim.feasible) {
                            enjoymentFactors.push('Strategic success');
                        }
                        if (playerData.traits.includes('Adaptable') && !sim.gameOver) {
                            enjoymentFactors.push('Flexible problem solving');
                        }

                        const stressLevel = sim.maxWaiting > 25 ? 'High' : sim.maxWaiting > 15 ? 'Medium' : 'Low';
                        const gameFlow = sim.feasible && !sim.gameOver ? 'Smooth' : sim.gameOver ? 'Overwhelming' : 'Challenging';
                        const replayability = enjoymentFactors.length > 2 ? 'High' : enjoymentFactors.length > 0 ? 'Medium' : 'Low';

                        return {
                            day: sim.day || 0,
                            finalScore: sim.score || 0,
                            routesCreated: sim.linesBuilt || 0,
                            trainsDeployed: sim.trains || 0,
                            maxWaiting: sim.maxWaiting || 0,
                            efficiency,
                            enjoymentFactors,
                            stressLevel,
                            gameFlow,
                            replayability,
                            emergentGameplay: sim.linesBuilt > weeksToPlay ? 'Yes' : 'No'
                        };
                    });
                }, player);

                result.player = player.name;
                result.personality = player.traits;
                result.game = game;

                playerResults.push(result);
                allResults.push(result);

                // Show results
                await page.evaluate((resultData) => {
                    const resultsDiv = document.createElement('div');
                    resultsDiv.style.cssText = `
                        position: fixed; top: 50%; left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(0,0,0,0.95); color: white;
                        padding: 25px; border-radius: 15px;
                        font-family: Arial; font-size: 14px;
                        z-index: 10001; border: 3px solid #4ecdc4;
                        max-width: 500px; line-height: 1.4;
                    `;

                    const enjoymentColor = resultData.enjoymentFactors.length > 2 ? '#4ecdc4' :
                                         resultData.enjoymentFactors.length > 0 ? '#ffa726' : '#ff5252';

                    resultsDiv.innerHTML = `
                        <h3 style="margin-top: 0; color: #4ecdc4; text-align: center;">Game Complete!</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <strong>Performance:</strong><br>
                                Day: ${resultData.day}<br>
                                Score: ${resultData.finalScore}<br>
                                Routes: ${resultData.routesCreated}<br>
                                Trains: ${resultData.trainsDeployed}
                            </div>
                            <div>
                                <strong>Experience:</strong><br>
                                Flow: ${resultData.gameFlow}<br>
                                Stress: ${resultData.stressLevel}<br>
                                Replayability: ${resultData.replayability}<br>
                                Emergent: ${resultData.emergentGameplay}
                            </div>
                        </div>
                        <div style="margin: 15px 0;">
                            <strong style="color: ${enjoymentColor};">Enjoyment:</strong><br>
                            ${resultData.enjoymentFactors.length > 0 ?
                                resultData.enjoymentFactors.map(f => `• ${f}`).join('<br>') :
                                '• Needs more engaging challenges'}
                        </div>
                        <div style="text-align: center; margin-top: 15px; font-size: 12px; color: #ccc;">
                            Next game in 3 seconds...
                        </div>
                    `;
                    document.body.appendChild(resultsDiv);

                    setTimeout(() => resultsDiv.remove(), 3000);
                }, result);

                console.log(`✨ Game ${game}: Day ${result.day}, Score ${result.finalScore}, Flow: ${result.gameFlow}`);
                console.log(`   Enjoyment: ${result.enjoymentFactors.join(', ') || 'Basic'}`);
                console.log(`   Stress: ${result.stressLevel}, Replayability: ${result.replayability}`);

                await page.waitForTimeout(3000);

            } catch (error) {
                console.error(`❌ Error: ${error.message}`);
            }
        }

        // Player summary
        if (playerResults.length > 0) {
            const avgScore = Math.round(playerResults.reduce((sum, r) => sum + r.finalScore, 0) / playerResults.length);
            const allEnjoyment = playerResults.flatMap(r => r.enjoymentFactors);
            const uniqueEnjoyment = [...new Set(allEnjoyment)];
            const highReplay = playerResults.filter(r => r.replayability === 'High').length;
            const lowStress = playerResults.filter(r => r.stressLevel === 'Low').length;

            console.log(`\n📊 ${player.name} Summary:`);
            console.log(`   Average Score: ${avgScore}`);
            console.log(`   Enjoyment Diversity: ${uniqueEnjoyment.length} factors`);
            console.log(`   High Replayability: ${highReplay}/5 games`);
            console.log(`   Low Stress: ${lowStress}/5 games`);
            console.log(`   Player Satisfaction: ${lowStress >= 3 ? 'Excellent' : lowStress >= 2 ? 'Good' : 'Fair'}`);
        }
    }

    // Final analysis
    console.log('\n\n' + '='.repeat(70));
    console.log('🏆 QUALITATIVE EXPERIENCE ANALYSIS RESULTS');
    console.log('='.repeat(70));

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
        const highReplay = results.filter(r => r.replayability === 'High').length;
        const emergentGames = results.filter(r => r.emergentGameplay === 'Yes').length;
        const lowStressGames = results.filter(r => r.stressLevel === 'Low').length;

        const satisfaction = lowStressGames >= 3 ? 'Excellent' : lowStressGames >= 2 ? 'Good' : 'Fair';
        const flexibility = uniqueEnjoyment.length >= 4 ? 'Very High' : uniqueEnjoyment.length >= 2 ? 'High' : 'Medium';

        console.log(`\n🎭 ${playerName}:`);
        console.log(`   💯 Player Satisfaction: ${satisfaction}`);
        console.log(`   🔄 Flexibility Rating: ${flexibility}`);
        console.log(`   📊 Average Score: ${avgScore}`);
        console.log(`   🎮 Enjoyment Factors: ${uniqueEnjoyment.slice(0, 3).join(', ')}`);
        console.log(`   🔁 High Replayability: ${highReplay}/5 games`);
        console.log(`   🌟 Emergent Gameplay: ${emergentGames}/5 games`);
        console.log(`   😌 Low Stress Experience: ${lowStressGames}/5 games`);
    });

    // Find winners
    const summaries = Object.keys(playerSummaries).map(name => {
        const results = playerSummaries[name];
        const lowStress = results.filter(r => r.stressLevel === 'Low').length;
        const highReplay = results.filter(r => r.replayability === 'High').length;
        const uniqueEnjoyment = [...new Set(results.flatMap(r => r.enjoymentFactors))].length;
        return { name, lowStress, highReplay, uniqueEnjoyment };
    });

    const mostSatisfied = summaries.reduce((best, current) => current.lowStress > best.lowStress ? current : best);
    const mostReplayable = summaries.reduce((best, current) => current.highReplay > best.highReplay ? current : best);
    const mostFlexible = summaries.reduce((best, current) => current.uniqueEnjoyment > best.uniqueEnjoyment ? current : best);

    console.log('\n🏅 EXPERIENCE CHAMPIONS:');
    console.log(`   Most Satisfied Player: ${mostSatisfied.name} (${mostSatisfied.lowStress}/5 low-stress games)`);
    console.log(`   Highest Replayability: ${mostReplayable.name} (${mostReplayable.highReplay}/5 highly replayable games)`);
    console.log(`   Most Flexible Gameplay: ${mostFlexible.name} (${mostFlexible.uniqueEnjoyment} unique enjoyment factors)`);

    await page.waitForTimeout(20000);
    await browser.close();
}

runQualitativeAnalysis().catch(console.error);