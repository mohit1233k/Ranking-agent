const GoogleSearcher = require('../searcher');
const RankingAnalyzer = require('./analyzer');

const KEYWORDS = [
    'Laravel development company',
    'Laravel Development Services Company',
    'Laravel development services',
    'Laravel development company in India',
    'Laravel development company in Delhi'
];

async function main() {
    const searcher = new GoogleSearcher();
    const analyzer = new RankingAnalyzer();

    try {
        await analyzer.initialize();

        for (const keyword of KEYWORDS) {
            console.log(`Searching for: ${keyword}`);
            const results = await searcher.search(keyword);
            await analyzer.saveResults(keyword, results);
            
            // Wait between searches
            await new Promise(resolve => setTimeout(resolve, 60000));
        }

        // Generate reports
        console.log('\nGenerating console report...');
        await analyzer.generateReport('console');
        
        console.log('\nGenerating CSV report...');
        await analyzer.generateReport('csv');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await searcher.close();
    }
}

main();