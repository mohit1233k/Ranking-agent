const fs = require('fs').promises;
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
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
        new winston.transports.File({ filename: 'analyzer.log' })
    ]
});

class RankingAnalyzer {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.resultsFile = path.join(this.dataDir, 'rankings.json');
        this.targetDomain = 'webreinvent.com';
        this.logger = logger; // Add logger to instance
    }

    async initialize() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            try {
                await fs.access(this.resultsFile);
            } catch {
                await fs.writeFile(this.resultsFile, JSON.stringify([]));
            }
        } catch (error) {
            this.logger.error(`Failed to initialize analyzer: ${error.message}`);
            throw error;
        }
    }

    async saveResults(keyword, searchResults) {
        try {
            const timestamp = new Date().toISOString();
            let ranking = null;
            let matchedResult = null;

            // Find WebReinvent's position
            for (let i = 0; i < searchResults.length; i++) {
                if (searchResults[i].url.includes(this.targetDomain)) {
                    ranking = i + 1;
                    matchedResult = searchResults[i];
                    break;
                }
            }

            // Read existing rankings
            const rankings = JSON.parse(await fs.readFile(this.resultsFile, 'utf8'));

            // Add new ranking
            if (ranking) {
                rankings.push({
                    keyword,
                    rank: ranking,
                    title: matchedResult.title,
                    url: matchedResult.url,
                    timestamp,
                    snippet: matchedResult.snippet || ''
                });

                this.logger.info(`Found ${this.targetDomain} at position ${ranking} for "${keyword}"`);
            } else {
                this.logger.warn(`${this.targetDomain} not found in results for "${keyword}"`);
                rankings.push({
                    keyword,
                    rank: null,
                    title: null,
                    url: null,
                    timestamp,
                    snippet: null
                });
            }

            // Save updated rankings
            await fs.writeFile(this.resultsFile, JSON.stringify(rankings, null, 2));

        } catch (error) {
            this.logger.error(`Failed to save results: ${error.message}`);
            throw error;
        }
    }

    async generateReport(format = 'console') {
        try {
            const rankings = JSON.parse(await fs.readFile(this.resultsFile, 'utf8'));
            
            if (rankings.length === 0) {
                this.logger.warn('No ranking data available');
                return;
            }

            // Group by keyword
            const byKeyword = rankings.reduce((acc, curr) => {
                if (!acc[curr.keyword]) {
                    acc[curr.keyword] = [];
                }
                acc[curr.keyword].push(curr);
                return acc;
            }, {});

            if (format === 'csv') {
                const csvWriter = createCsvWriter({
                    path: path.join(this.dataDir, `rankings_${Date.now()}.csv`),
                    header: [
                        {id: 'keyword', title: 'Keyword'},
                        {id: 'rank', title: 'Rank'},
                        {id: 'title', title: 'Title'},
                        {id: 'url', title: 'URL'},
                        {id: 'timestamp', title: 'Date'},
                        {id: 'snippet', title: 'Snippet'}
                    ]
                });

                await csvWriter.writeRecords(rankings);
                this.logger.info(`CSV report generated at ${csvWriter.csvPath}`);
            } else {
                // Console report
                console.log('\nRanking Report:');
                console.log('==============\n');

                Object.entries(byKeyword).forEach(([keyword, results]) => {
                    console.log(`Keyword: ${keyword}`);
                    console.log('-------------------');
                    
                    // Sort by date
                    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    // Show latest ranking
                    const latest = results[0];
                    console.log(`Latest Rank: ${latest.rank || 'Not Found'}`);
                    if (latest.rank) {
                        console.log(`Title: ${latest.title}`);
                        console.log(`URL: ${latest.url}`);
                    }

                    // Show trend
                    if (results.length > 1) {
                        const previous = results[1];
                        const trend = latest.rank && previous.rank
                            ? latest.rank < previous.rank 
                                ? '🔼 Improved'
                                : latest.rank > previous.rank
                                    ? '🔽 Dropped'
                                    : '➡️ No change'
                            : 'N/A';
                        console.log(`Trend: ${trend}`);
                    }
                    console.log('\n');
                });
            }

        } catch (error) {
            this.logger.error(`Failed to generate report: ${error.message}`);
            throw error;
        }
    }

    // Add this method to the RankingAnalyzer class
    async getKeywordSummary() {
        try {
            const rankings = JSON.parse(await fs.readFile(this.resultsFile, 'utf8'));
            const summary = {};

            rankings.forEach(entry => {
                if (!summary[entry.keyword]) {
                    summary[entry.keyword] = {
                        current: null,
                        best: null,
                        worst: null,
                        history: []
                    };
                }

                if (entry.rank) {
                    summary[entry.keyword].history.push({
                        rank: entry.rank,
                        date: entry.timestamp
                    });
                }
            });

            // Calculate statistics for each keyword
            Object.keys(summary).forEach(keyword => {
                const data = summary[keyword];
                if (data.history.length > 0) {
                    data.history.sort((a, b) => new Date(b.date) - new Date(a.date));
                    data.current = data.history[0].rank;
                    data.best = Math.min(...data.history.map(h => h.rank));
                    data.worst = Math.max(...data.history.map(h => h.rank));
                }
            });

            return summary;
        } catch (error) {
            this.logger.error(`Failed to get keyword summary: ${error.message}`);
            throw error;
        }
    }
}

module.exports = RankingAnalyzer;