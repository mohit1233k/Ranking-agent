# WebReinvent Rank Tracker

A web application to track and analyze Google search rankings for specified keywords. Built with Node.js, Express, and EJS templating.

## Features

- Single keyword rank tracking
- Bulk keyword analysis
- Real-time ranking visualization
- Historical trend tracking
- CSV report generation
- Interactive dashboard
- Stealth browser automation
- Rate limiting protection

## Prerequisites

- Node.js (v14 or higher)
- Chrome/Chromium browser

## Installation

1. Clone the repository:
```sh
git clone <repository-url>
cd ranking-agent-node
```

2. Install dependencies:
```sh
npm install
```

3. Create required directories:
```sh
mkdir data
```

## Configuration

The application uses several configuration parameters that can be customized:

- `SEARCH_CONFIG` in [server.js](ranking-agent-node/server.js):
  - `maxPages`: Number of search result pages to check (default: 5)
  - `resultsPerPage`: Results per page (default: 10)
  - `delayBetween`: Delay between searches in ms (default: 3000)

## Usage

1. Start the server:
```sh
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

### Single Search

1. Enter a keyword in the search box
2. Click "Search" or press Enter
3. View the ranking results and details

### Bulk Analysis

1. Navigate to the "Bulk Analysis" tab
2. Enter multiple keywords (one per line)
3. Click "Analyze Keywords"
4. Monitor progress and view results in real-time

## Project Structure

```
ranking-agent-node/
├── src/
│   ├── analyzer.js    # Ranking analysis logic
│   ├── main.js        # CLI entry point
│   └── searcher.js    # Google search automation
├── views/
│   ├── bulk-analysis.ejs
│   ├── error.ejs
│   ├── index.ejs
│   └── results.ejs
├── public/
│   └── styles.css
├── data/
│   └── rankings.json
└── server.js          # Web server entry point
```

## Logging

Logs are stored in separate files:
- `server.log`: Server operations
- `search.log`: Search operations
- `analyzer.log`: Analysis operations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [package.json](ranking-agent-node/package.json) file for details.