const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
    let executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (!fs.existsSync(executablePath)) {
        executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    }
    
    if (!fs.existsSync(executablePath)) {
        console.error("Could not find Chrome or Edge executable.");
        process.exit(1);
    }
    
    const browser = await puppeteer.launch({ executablePath, headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 700 });
    
    const filePath = 'file:///' + process.cwd().replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath);
    
    // Click Start Game to spawn blocks
    await page.click('#start-btn');
    
    // Wait for a few blocks to fall
    await new Promise(r => setTimeout(r, 2000));
    
    // Take a screenshot of just the app window
    const element = await page.$('#app-window');
    await element.screenshot({ path: 'gameplay.png' });
    
    await browser.close();
    console.log("Screenshot saved as gameplay.png");
})();
