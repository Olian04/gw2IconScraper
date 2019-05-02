# gw2IconScraper

A tool for scraping the gw2 wiki for icons using nodejs, request & puppeteer.

## Usage

Either a) pull down one of the branches named `haul-yyyy-mm-dd` which contains an archived haul from the specified date (warning: these branches are big. They contain about 16000 images.), or b) pull down the `master` branch and run the scraper your self.

### Running the scraper

1. Install nodejs (v10.15.3)
2. Install dependencies (`npm install`)
3. Run scraper (`npm start`)
4. Wait. It may take a while.
5. Once finished you can find the scraped files in the `out` directory. Along with a `latest.log` file, which contains the logs from the latest haul.