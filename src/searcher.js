const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} - ${level}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'search.log' })
    ]
});

// Add stealth plugin
puppeteerExtra.use(StealthPlugin());

class GoogleSearcher {
    constructor() {
        this.browser = null;
        this.baseUrl = 'https://www.google.com/search';
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];
    }

    async initialize() {
        this.browser = await puppeteerExtra.launch({
            headless: false, // Run in visible mode to avoid detection
            executablePath: process.env.CHROME_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certifcate-errors',
                '--ignore-certifcate-errors-spki-list',
                '--disable-blink-features=AutomationControlled'
            ],
            defaultViewport: null
        });
    }

    async setupPage() {
        const page = await this.browser.newPage();
        
        // Randomize user agent
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        await page.setUserAgent(userAgent);

        // Add additional browser fingerprinting evasion
        await page.evaluateOnNewDocument(() => {
            // Overwrite the languages property to prevent fingerprinting
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });

            // Overwrite the plugins property
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            // Overwrite the webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            // Add a fake web GL vendor
            Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
                get: () => () => 'data:image/png;base64,abc123'
            });
        });

        return page;
    }

    async search(keyword, numPages = 5) {
        let results = [];
        let page = null;
        
        try {
            if (!this.browser) {
                await this.initialize();
            }

            page = await this.setupPage();

            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

            for (let pageNum = 0; pageNum < numPages; pageNum++) {
                const start = pageNum * 10;
                const url = `${this.baseUrl}?q=${encodeURIComponent(keyword)}&start=${start}&hl=en`;

                logger.info(`Searching page ${pageNum + 1} for: ${keyword}`);
                
                // Add random delay before navigation
                await sleep(Math.random() * 3000 + 2000);
                
                await page.goto(url, { 
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

                // Check for captcha
                if (await page.$('form#captcha-form') !== null) {
                    logger.info('CAPTCHA detected - waiting for manual solve...');
                    await page.waitForNavigation({ 
                        timeout: 60000,
                        waitUntil: 'networkidle0'
                    }).catch(() => {
                        logger.error('Timeout waiting for CAPTCHA solution');
                        return [];
                    });
                }

                // Extract results with more reliable selectors
                const pageResults = await page.evaluate(() => {
                    const items = [];
                    // Try multiple selector patterns
                    const searchResults = Array.from(document.querySelectorAll([
                        'div.g', 
                        'div.MjjYud', 
                        'div[data-sokoban-container]'
                    ].join(', ')));

                    searchResults.forEach(result => {
                        const titleEl = result.querySelector('h3');
                        const linkEl = result.querySelector('a');
                        const snippetEl = result.querySelector('div.VwiC3b');

                        if (titleEl && linkEl) {
                            items.push({
                                title: titleEl.innerText.trim(),
                                url: linkEl.href,
                                snippet: snippetEl ? snippetEl.innerText.trim() : ''
                            });
                        }
                    });

                    return items;
                });

                results = results.concat(pageResults);
                logger.info(`Found ${pageResults.length} results on page ${pageNum + 1}`);

                // Random delay between pages
                if (pageNum < numPages - 1) {
                    const delay = Math.floor(Math.random() * 4000) + 3000;
                    logger.info(`Waiting ${delay}ms before next page...`);
                    await sleep(delay);
                }
            }

        } catch (error) {
            logger.error(`Search failed: ${error.message}`);
        } finally {
            if (page) {
                await page.close();
            }
        }

        return results;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = GoogleSearcher;