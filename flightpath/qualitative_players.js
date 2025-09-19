const { chromium } = require('playwright');

class QualitativePlayer {
    constructor(name, personality) {
        this.name = name;
        this.personality = personality;
        this.results = [];
        this.experiences = [];
    }

    async playGame(page) {
        console.log(`\n🎮 ${this.name} starting game...`);
        console.log(`   Personality: ${this.personality.description}`);

        // Wait for game to fully load
        await page.waitForTimeout(3000);
        await page.waitForFunction(() => window.MM && window.MM.simulateWeeks);

        // Apply personality-based configurations
        await this.applyPersonality(page);

        // Play with personality-driven behavior
        const gameResult = await this.executePersonalityBasedPlay(page);

        this.results.push(gameResult);
        return gameResult;
    }

    async applyPersonality(page) {
        await page.evaluate((personality) => {
            if (window.MM) {
                // Configure based on personality traits
                window.MM.setSpawnMultiplier(personality.spawnRate);
                window.MM.setHubAndSpoke(personality.prefersHubs);

                // Store personality for in-game decisions
                window.currentPlayerPersonality = personality;
            }
        }, this.personality);
    }

    async executePersonalityBasedPlay(page) {
        const startTime = Date.now();

        // Show personality indicator
        await page.evaluate((name, personality) => {
            const indicator = document.createElement('div');
            indicator.id = 'personality-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                background: ${personality.color};
                color: white;
                padding: 15px 25px;
                border-radius: 12px;
                font-family: Arial, sans-serif;
                font-size: 18px;
                font-weight: bold;
                z-index: 10000;
                border: 3px solid white;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                max-width: 300px;
            `;
            indicator.innerHTML = `
                <div style="font-size: 20px; margin-bottom: 8px;">${name}</div>
                <div style="font-size: 14px; line-height: 1.3;">
                    ${personality.traits.join(' • ')}
                </div>
                <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">
                    ${personality.playStyle}
                </div>
            `;
            document.body.appendChild(indicator);
        }, this.name, this.personality);

        // Add gameplay countdown with personality flair
        for (let i = 3; i > 0; i--) {
            await page.evaluate((count, personality) => {
                const countdown = document.getElementById('countdown') || document.createElement('div');
                countdown.id = 'countdown';
                countdown.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(45deg, ${personality.color}, ${personality.secondaryColor});
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
                countdown.innerHTML = `
                    <div>${personality.startPhrase}</div>
                    <div style="font-size: 24px; margin-top: 10px;">Starting in ${count}...</div>
                `;
                if (!document.getElementById('countdown')) {
                    document.body.appendChild(countdown);
                }
            }, i, this.personality);
            await page.waitForTimeout(1000);
        }

        // Remove countdown
        await page.evaluate(() => {
            const countdown = document.getElementById('countdown');
            if (countdown) countdown.remove();
        });

        // Run personality-driven simulation
        const result = await page.evaluate(async (personality) => {
            // Adaptive play duration based on personality
            let weeksToPlay = personality.baseWeeks;

            // Add some personality-based variability
            if (personality.traits.includes('Impulsive')) {
                weeksToPlay = Math.floor(weeksToPlay * (0.7 + Math.random() * 0.6)); // 70-130%
            } else if (personality.traits.includes('Patient')) {
                weeksToPlay = Math.floor(weeksToPlay * (1.1 + Math.random() * 0.4)); // 110-150%
            }

            const simulationResult = await window.MM.simulateWeeks(weeksToPlay, { log: false });

            // Calculate qualitative metrics
            const efficiency = simulationResult.trains > 0 ? simulationResult.score / simulationResult.trains : 0;
            const networkDensity = simulationResult.linesBuilt / (simulationResult.day || 1);
            const passengerSatisfaction = simulationResult.maxWaiting < 10 ? 'High' :
                                        simulationResult.maxWaiting < 20 ? 'Medium' : 'Low';

            // Personality-based experience evaluation
            let enjoymentFactors = [];
            let stressLevel = 'Low';
            let playStyleMatch = 'Perfect';

            // Evaluate based on personality preferences
            if (personality.traits.includes('Risk-Taker') && simulationResult.maxWaiting > 15) {
                enjoymentFactors.push('Thrilling challenge');
            }
            if (personality.traits.includes('Perfectionist') && efficiency > 100) {
                enjoymentFactors.push('Satisfying optimization');
            }
            if (personality.traits.includes('Creative') && simulationResult.linesBuilt > 10) {
                enjoymentFactors.push('Complex network design');
            }
            if (personality.traits.includes('Social') && simulationResult.score > 2000) {
                enjoymentFactors.push('Helping many passengers');
            }

            // Determine stress level
            if (simulationResult.maxWaiting > 25) stressLevel = 'High';
            else if (simulationResult.maxWaiting > 15) stressLevel = 'Medium';

            // Game flow assessment
            const gameFlow = simulationResult.feasible && !simulationResult.gameOver ? 'Smooth' :
                           simulationResult.gameOver ? 'Overwhelming' : 'Challenging';

            return {
                // Quantitative data
                weeks: weeksToPlay,
                day: simulationResult.day || 0,
                finalScore: simulationResult.score || 0,
                routesCreated: simulationResult.linesBuilt || 0,
                trainsDeployed: simulationResult.trains || 0,
                maxWaiting: simulationResult.maxWaiting || 0,
                gameOver: simulationResult.gameOver || false,

                // Qualitative measurements
                efficiency: Math.round(efficiency),
                networkDensity: Math.round(networkDensity * 100) / 100,
                passengerSatisfaction,
                enjoymentFactors,
                stressLevel,
                gameFlow,
                playStyleMatch,

                // Experience metrics
                replayability: enjoymentFactors.length > 2 ? 'High' : enjoymentFactors.length > 0 ? 'Medium' : 'Low',
                emergentGameplay: simulationResult.linesBuilt > personality.baseWeeks ? 'Yes' : 'No',
                personalityAlignment: stressLevel === 'Low' ? 'Excellent' : stressLevel === 'Medium' ? 'Good' : 'Poor'
            };
        }, this.personality);

        const duration = Date.now() - startTime;
        result.duration = duration;
        result.personality = this.personality.type;

        // Show detailed results
        await this.showQualitativeResults(page, result);

        console.log(`✨ ${this.name} finished:`);
        console.log(`   Day ${result.day} | Score: ${result.finalScore} | Flow: ${result.gameFlow}`);
        console.log(`   Enjoyment: ${result.enjoymentFactors.join(', ') || 'Needs improvement'}`);
        console.log(`   Stress: ${result.stressLevel} | Satisfaction: ${result.passengerSatisfaction}`);

        return result;
    }

    async showQualitativeResults(page, result) {
        await page.evaluate((result, name) => {
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

            const enjoymentColor = result.enjoymentFactors.length > 2 ? '#4ecdc4' :
                                 result.enjoymentFactors.length > 0 ? '#ffa726' : '#ff5252';

            resultsDiv.innerHTML = `
                <h3 style="margin-top: 0; color: #4ecdc4; text-align: center;">${name} - Game Complete!</h3>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                    <div>
                        <strong>📊 Performance</strong><br>
                        Day: ${result.day}<br>
                        Score: ${result.finalScore}<br>
                        Routes: ${result.routesCreated}<br>
                        Trains: ${result.trainsDeployed}
                    </div>
                    <div>
                        <strong>🎯 Experience</strong><br>
                        Flow: ${result.gameFlow}<br>
                        Stress: ${result.stressLevel}<br>
                        Efficiency: ${result.efficiency}<br>
                        Satisfaction: ${result.passengerSatisfaction}
                    </div>
                </div>

                <div style="margin: 15px 0;">
                    <strong style="color: ${enjoymentColor};">🎮 Enjoyment Factors:</strong><br>
                    ${result.enjoymentFactors.length > 0 ?
                        result.enjoymentFactors.map(f => `• ${f}`).join('<br>') :
                        '• Needs more engaging challenges'}
                </div>

                <div style="margin: 15px 0;">
                    <strong>🔄 Replayability:</strong> ${result.replayability} |
                    <strong>🌟 Emergent Play:</strong> ${result.emergentGameplay}
                </div>

                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #ccc;">
                    Next player starting in 4 seconds...
                </div>
            `;
            document.body.appendChild(resultsDiv);

            setTimeout(() => {
                resultsDiv.remove();
            }, 4000);
        }, result, this.name);

        await page.waitForTimeout(4000);
    }

    getQualitativeAnalysis() {
        if (this.results.length === 0) return null;

        const totals = this.results.reduce((acc, result) => {
            acc.score += result.finalScore || 0;
            acc.enjoymentFactors = acc.enjoymentFactors.concat(result.enjoymentFactors || []);
            acc.stressLevels.push(result.stressLevel || 'Unknown');
            acc.gameFlows.push(result.gameFlow || 'Unknown');
            acc.replayability.push(result.replayability || 'Low');
            acc.emergentGameplay += result.emergentGameplay === 'Yes' ? 1 : 0;
            return acc;
        }, {
            score: 0,
            enjoymentFactors: [],
            stressLevels: [],
            gameFlows: [],
            replayability: [],
            emergentGameplay: 0
        });

        const count = this.results.length;
        const uniqueEnjoymentFactors = [...new Set(totals.enjoymentFactors)];
        const avgStress = this.getMostCommon(totals.stressLevels);
        const avgFlow = this.getMostCommon(totals.gameFlows);
        const avgReplayability = this.getMostCommon(totals.replayability);

        return {
            player: this.name,
            personality: this.personality.type,
            traits: this.personality.traits,

            // Performance
            averageScore: Math.round(totals.score / count),

            // Qualitative metrics
            enjoymentDiversity: uniqueEnjoymentFactors.length,
            topEnjoymentFactors: uniqueEnjoymentFactors.slice(0, 3),
            typicalStressLevel: avgStress,
            typicalGameFlow: avgFlow,
            overallReplayability: avgReplayability,
            emergentGameplayRate: Math.round((totals.emergentGameplay / count) * 100),

            // Experience summary
            playerSatisfaction: this.calculateSatisfaction(avgStress, avgFlow, uniqueEnjoymentFactors.length),
            flexibilityRating: this.calculateFlexibility(),
            gamesPlayed: count
        };
    }

    getMostCommon(arr) {
        return arr.sort((a,b) =>
            arr.filter(v => v === a).length - arr.filter(v => v === b).length
        ).pop();
    }

    calculateSatisfaction(stress, flow, enjoymentCount) {
        let score = 0;
        if (stress === 'Low') score += 3;
        else if (stress === 'Medium') score += 2;
        else score += 1;

        if (flow === 'Smooth') score += 3;
        else if (flow === 'Challenging') score += 2;
        else score += 1;

        score += Math.min(enjoymentCount, 3);

        if (score >= 8) return 'Excellent';
        if (score >= 6) return 'Good';
        if (score >= 4) return 'Fair';
        return 'Needs Improvement';
    }

    calculateFlexibility() {
        const hasVariedStrategies = this.personality.traits.includes('Adaptable');
        const enjoysComplexity = this.personality.traits.includes('Creative');
        const likesVariety = this.personality.traits.includes('Curious');

        let score = 0;
        if (hasVariedStrategies) score += 2;
        if (enjoysComplexity) score += 2;
        if (likesVariety) score += 1;

        if (score >= 4) return 'Very High';
        if (score >= 3) return 'High';
        if (score >= 2) return 'Medium';
        return 'Low';
    }
}

async function runQualitativeSimulations() {
    // Define players with rich personalities focused on enjoyment and flexibility
    const players = [
        new QualitativePlayer('Creative Curator', {
            type: 'creative',
            description: 'Loves artistic network designs and elegant solutions',
            traits: ['Creative', 'Perfectionist', 'Patient', 'Aesthetic'],
            spawnRate: 0.9,
            prefersHubs: false,
            baseWeeks: 22,
            playStyle: 'Builds beautiful, efficient networks',
            startPhrase: '🎨 Designing Beauty',
            color: 'linear-gradient(45deg, #667eea, #764ba2)',
            secondaryColor: '#764ba2'
        }),

        new QualitativePlayer('Chaos Commander', {
            type: 'chaotic',
            description: 'Thrives on unpredictability and high-pressure situations',
            traits: ['Risk-Taker', 'Impulsive', 'Adaptable', 'Thrill-Seeker'],
            spawnRate: 1.4,
            prefersHubs: false,
            baseWeeks: 18,
            playStyle: 'Embraces chaos and emergency management',
            startPhrase: '⚡ Embracing Chaos',
            color: 'linear-gradient(45deg, #ff6b6b, #ffa726)',
            secondaryColor: '#ffa726'
        }),

        new QualitativePlayer('Social Shepherd', {
            type: 'social',
            description: 'Motivated by helping passengers and community building',
            traits: ['Social', 'Empathetic', 'Patient', 'Optimistic'],
            spawnRate: 1.0,
            prefersHubs: true,
            baseWeeks: 20,
            playStyle: 'Focuses on passenger happiness and accessibility',
            startPhrase: '🤝 Connecting People',
            color: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
            secondaryColor: '#44a08d'
        }),

        new QualitativePlayer('Strategic Sage', {
            type: 'strategic',
            description: 'Enjoys deep planning and optimal long-term solutions',
            traits: ['Analytical', 'Patient', 'Methodical', 'Curious'],
            spawnRate: 0.8,
            prefersHubs: true,
            baseWeeks: 28,
            playStyle: 'Masters complex optimization and planning',
            startPhrase: '🧠 Calculating Perfection',
            color: 'linear-gradient(45deg, #2196F3, #21CBF3)',
            secondaryColor: '#21CBF3'
        }),

        new QualitativePlayer('Flexible Explorer', {
            type: 'explorer',
            description: 'Loves trying different approaches and discovering new strategies',
            traits: ['Curious', 'Adaptable', 'Creative', 'Experimental'],
            spawnRate: 1.1,
            prefersHubs: false,
            baseWeeks: 19,
            playStyle: 'Constantly experiments with new techniques',
            startPhrase: '🔍 Discovering Possibilities',
            color: 'linear-gradient(45deg, #9C27B0, #E91E63)',
            secondaryColor: '#E91E63'
        })
    ];

    const browser = await chromium.launch({
        headless: false,
        slowMo: 0,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    const allResults = [];

    console.log('🎮 Starting Qualitative Player Experience Analysis');
    console.log('Focus: Enjoyment, Flexibility, and Player Satisfaction\n');

    for (const player of players) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎭 ${player.name}`);
        console.log(`   ${player.personality.description}`);
        console.log(`   Traits: ${player.personality.traits.join(', ')}`);
        console.log(`${'='.repeat(60)}`);

        for (let game = 1; game <= 5; game++) {
            try {
                await page.goto('http://localhost:8000');
                await page.waitForFunction(() => window.MM && window.MM.simulateWeeks);
                await page.waitForTimeout(1000);

                const result = await player.playGame(page);
                result.player = player.name;
                result.game = game;
                allResults.push(result);

            } catch (error) {
                console.error(`❌ Error in ${player.name} game ${game}:`, error.message);
            }
        }
    }

    // Comprehensive qualitative analysis
    await showFinalQualitativeAnalysis(page, players);

    console.log('\n\n' + '='.repeat(80));
    console.log('🏆 QUALITATIVE EXPERIENCE ANALYSIS RESULTS');
    console.log('='.repeat(80));

    players.forEach(player => {
        const analysis = player.getQualitativeAnalysis();
        if (analysis) {
            console.log(`\n🎭 ${analysis.player} (${analysis.personality}):`);
            console.log(`   Personality: ${analysis.traits.join(', ')}`);
            console.log(`   Player Satisfaction: ${analysis.playerSatisfaction}`);
            console.log(`   Flexibility Rating: ${analysis.flexibilityRating}`);
            console.log(`   Typical Experience: ${analysis.typicalGameFlow} flow, ${analysis.typicalStressLevel} stress`);
            console.log(`   Replayability: ${analysis.overallReplayability}`);
            console.log(`   Emergent Gameplay: ${analysis.emergentGameplayRate}% of games`);
            console.log(`   Top Enjoyment: ${analysis.topEnjoymentFactors.join(', ')}`);
            console.log(`   Games Completed: ${analysis.gamesPlayed}/5`);
        }
    });

    // Find best experiences
    const analyses = players.map(p => p.getQualitativeAnalysis()).filter(Boolean);
    if (analyses.length > 0) {
        const mostSatisfied = analyses.reduce((best, current) =>
            current.playerSatisfaction === 'Excellent' ? current : best
        );

        const mostFlexible = analyses.reduce((best, current) =>
            current.flexibilityRating === 'Very High' || current.flexibilityRating === 'High' ? current : best
        );

        const mostReplayable = analyses.reduce((best, current) =>
            current.overallReplayability === 'High' ? current : best
        );

        console.log('\n🏅 EXPERIENCE HIGHLIGHTS:');
        console.log(`   Most Satisfied Player: ${mostSatisfied.player} (${mostSatisfied.playerSatisfaction})`);
        console.log(`   Most Flexible Gameplay: ${mostFlexible.player} (${mostFlexible.flexibilityRating})`);
        console.log(`   Highest Replayability: ${mostReplayable.player} (${mostReplayable.overallReplayability})`);
    }

    await page.waitForTimeout(30000);
    await browser.close();
    return players;
}

async function showFinalQualitativeAnalysis(page, players) {
    await page.evaluate((playerData) => {
        const analyses = playerData.map(p => p.getQualitativeAnalysis()).filter(Boolean);

        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.97);
            color: white;
            padding: 30px;
            border-radius: 20px;
            font-family: Arial, sans-serif;
            font-size: 13px;
            z-index: 10001;
            border: 4px solid #4ecdc4;
            max-height: 85vh;
            overflow-y: auto;
            width: 800px;
            line-height: 1.4;
        `;

        let summaryHTML = `
            <h2 style="text-align: center; color: #4ecdc4; margin-top: 0; font-size: 24px;">
                🎮 Qualitative Experience Analysis
            </h2>
            <div style="text-align: center; margin-bottom: 25px; color: #ccc; font-style: italic;">
                Focus on Enjoyment, Flexibility & Player Satisfaction
            </div>
        `;

        analyses.forEach(analysis => {
            const satisfactionColor = analysis.playerSatisfaction === 'Excellent' ? '#4ecdc4' :
                                    analysis.playerSatisfaction === 'Good' ? '#ffa726' : '#ff5252';

            const flexibilityColor = analysis.flexibilityRating === 'Very High' || analysis.flexibilityRating === 'High' ? '#4ecdc4' : '#ffa726';

            summaryHTML += `
                <div style="margin: 20px 0; padding: 20px; border: 2px solid #444; border-radius: 12px; background: rgba(255,255,255,0.02);">
                    <h3 style="margin: 0 0 15px 0; color: #4ecdc4; font-size: 18px;">
                        🎭 ${analysis.player}
                    </h3>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                        <div>
                            <strong style="color: ${satisfactionColor};">😊 Satisfaction:</strong> ${analysis.playerSatisfaction}<br>
                            <strong style="color: ${flexibilityColor};">🔄 Flexibility:</strong> ${analysis.flexibilityRating}<br>
                            <strong>🎯 Typical Flow:</strong> ${analysis.typicalGameFlow}<br>
                            <strong>📈 Replayability:</strong> ${analysis.overallReplayability}
                        </div>
                        <div>
                            <strong>🧠 Traits:</strong> ${analysis.traits.slice(0, 2).join(', ')}<br>
                            <strong>⚡ Stress Level:</strong> ${analysis.typicalStressLevel}<br>
                            <strong>🎲 Emergent Play:</strong> ${analysis.emergentGameplayRate}%<br>
                            <strong>🎮 Games:</strong> ${analysis.gamesPlayed}/5
                        </div>
                    </div>

                    <div>
                        <strong style="color: #ffa726;">🌟 Key Enjoyment Factors:</strong><br>
                        <div style="margin-left: 15px; color: #ddd;">
                            ${analysis.topEnjoymentFactors.length > 0 ?
                                analysis.topEnjoymentFactors.map(f => `• ${f}`).join('<br>') :
                                '• Needs more engaging challenges'}
                        </div>
                    </div>
                </div>
            `;
        });

        summaryHTML += `
            <div style="text-align: center; margin-top: 25px; padding: 15px; background: rgba(76, 205, 196, 0.1); border-radius: 10px;">
                <strong style="color: #4ecdc4;">🎯 Analysis Complete</strong><br>
                <span style="font-size: 12px; color: #ccc;">
                    Comprehensive evaluation of player experience, flexibility, and enjoyment factors
                </span>
            </div>
        `;

        summaryDiv.innerHTML = summaryHTML;
        document.body.appendChild(summaryDiv);
    }, players);
}

runQualitativeSimulations().catch(console.error);