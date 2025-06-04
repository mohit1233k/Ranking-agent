const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');
const GoogleSearcher = require('./src/searcher');
const RankingAnalyzer = require('./src/analyzer');

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
        new winston.transports.File({ filename: 'server.log' })
    ]
});

const app = express();
const port = 3000;

// Configure Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize searcher and analyzer
const searcher = new GoogleSearcher();
const analyzer = new RankingAnalyzer();

// Initialize analyzer
analyzer.initialize().catch(err => logger.error('Analyzer initialization failed:', err));

// Add this near the top of the file with other constants
const SEARCH_CONFIG = {
    maxPages: 5,
    resultsPerPage: 10,
    delayBetween: 3000
};

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/search', async (req, res) => {
    const keyword = req.body.keyword;
    
    try {
        if (!keyword) {
            throw new Error('Keyword is required');
        }

        const results = await searcher.search(keyword);
        await analyzer.saveResults(keyword, results);
        
        // Get the latest ranking data
        const rankingsData = await fs.readFile(analyzer.resultsFile, 'utf8');
        const rankings = JSON.parse(rankingsData);
        const latestRanking = rankings
            .filter(r => r.keyword === keyword)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        if (!latestRanking) {
            throw new Error('No ranking data found');
        }
        
        res.render('results', { ranking: latestRanking });
        
    } catch (error) {
        console.error('Search error:', error);
        res.render('error', { 
            error: error.message || 'An unexpected error occurred'
        });
    }
});

// Update the bulk-analysis route
app.get('/bulk-analysis', async (req, res) => {
    try {
        const rankingsData = await fs.readFile(analyzer.resultsFile, 'utf8');
        const rankings = JSON.parse(rankingsData);
        
        const keywordData = {};
        rankings.forEach(entry => {
            if (!keywordData[entry.keyword]) {
                keywordData[entry.keyword] = [];
            }
            if (entry.rank) {
                keywordData[entry.keyword].push({
                    rank: entry.rank,
                    date: new Date(entry.timestamp).toLocaleDateString(),
                    url: entry.url,
                    title: entry.title
                });
            }
        });

        logger.info(`Processed ${Object.keys(keywordData).length} keywords for analysis`);
        
        // Pass SEARCH_CONFIG to the template
        res.render('bulk-analysis', { 
            keywordData,
            SEARCH_CONFIG 
        });
    } catch (error) {
        logger.error(`Bulk analysis error: ${error.message}`);
        res.render('error', { error: error.message });
    }
});

// Update the bulk-search route
app.post('/bulk-search', async (req, res) => {
    try {
        const keywords = req.body.keywords.split('\n')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        logger.info(`Starting bulk search for ${keywords.length} keywords`);

        for (const keyword of keywords) {
            logger.info(`Searching for keyword: ${keyword} (up to ${SEARCH_CONFIG.maxPages} pages)`);
            
            // Search multiple pages
            const searchResults = await searcher.search(
                keyword, 
                SEARCH_CONFIG.maxPages
            );
            
            await analyzer.saveResults(keyword, searchResults);
            
            // Add delay between searches to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, SEARCH_CONFIG.delayBetween));
        }

        res.redirect('/bulk-analysis');
    } catch (error) {
        logger.error(`Bulk search error: ${error.message}`);
        res.render('error', { error: error.message });
    }
});

// Add this route before the error handler
app.get('/api/rankings', async (req, res) => {
    try {
        const rankingsData = await fs.readFile(analyzer.resultsFile, 'utf8');
        const rankings = JSON.parse(rankingsData);
        
        // Group by keyword
        const keywordData = {};
        rankings.forEach(entry => {
            if (!keywordData[entry.keyword]) {
                keywordData[entry.keyword] = [];
            }
            keywordData[entry.keyword].push(entry);
        });

        // Sort each keyword's data by date
        Object.values(keywordData).forEach(data => {
            data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });

        res.json(keywordData);
    } catch (error) {
        logger.error(`API error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Error handler middleware
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.render('error', { error: 'Internal Server Error' });
});

// Start server
app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});