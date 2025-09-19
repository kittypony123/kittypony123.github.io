const { chromium } = require('playwright');

async function testGame() {
    const browser = await chromium.launch({ headless: false }); // Show browser for debugging
    const page = await browser.newPage();

    try {
        console.log('Navigating to game...');
        await page.goto('http://localhost:8000');

        console.log('Waiting for game to load...');
        await page.waitForTimeout(5000);

        // Check if game loaded
        const gameLoaded = await page.evaluate(() => {
            return {
                hasWindow: typeof window !== 'undefined',
                hasMM: typeof window.MM !== 'undefined',
                hasSimulate: typeof window.MM?.simulateWeeks === 'function',
                gameElements: document.querySelector('canvas') !== null
            };
        });

        console.log('Game load status:', gameLoaded);

        if (gameLoaded.hasMM && gameLoaded.hasSimulate) {
            console.log('Testing simulation...');
            const result = await page.evaluate(async () => {
                try {
                    console.log('Running simulation...');
                    const simResult = await window.MM.simulateWeeks(5, { log: true });
                    return simResult;
                } catch (error) {
                    return { error: error.message };
                }
            });

            console.log('Simulation result:', result);
        } else {
            console.log('Game not fully loaded or MM not available');
        }

        // Keep browser open for manual inspection
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

testGame();