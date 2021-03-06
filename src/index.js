//@ts-check
const fs =  require('fs');
const { join } = require('path');
const stripAnsi = require('strip-ansi').default;

//#region Setup logging
const inOutDir = path => join(__dirname, '..', 'out', path);
if (! fs.existsSync(inOutDir(''))) {
  fs.mkdirSync(inOutDir(''));
}
fs.writeFileSync(inOutDir('latest.log'), '');
require('better-logging').default(console, {
  format: ctx => `${ctx.date} ${ctx.time24} ${ctx.type} ${ctx.msg}`,
  events: [{
    onLogEmitted: log => {
      fs.appendFile(inOutDir('latest.log'), stripAnsi(log) + '\n', err => {
        if (err) throw err;
      });
    }
  }]
});
//#endregion

const puppeteer = require('puppeteer');
const request = require('request');

const downloadFile = (uri, filename) => {
  return new Promise((resolve, reject) => {
    request.head(uri, err => {
      if (err) reject(err);
      request(uri).pipe(fs.createWriteStream(inOutDir(filename))).on('close', resolve);
    });
  });
};

const URLS = {
  gw2ArenaNetIcons: 'https://wiki.guildwars2.com/wiki/Category:ArenaNet_icons',
};

(async () => {
  try {
    console.info('Starting puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const imagesDownloading = [];
    const pagesToScrape = [ URLS.gw2ArenaNetIcons ];
    let failedNavigations = 0;
    const maximumAllowedFailedNavigations = 10;

    while (pagesToScrape.length > 0) {
      const currentPage = pagesToScrape.shift();
      const currentPageName = currentPage.substring(currentPage.lastIndexOf('/Category:') + '/Category:'.length);

      console.info(`Navigating to: ${currentPage}`);
      const resp = await page.goto(currentPage);
      if (! resp.ok()) {
        console.warn(`Failed navigating to: ${currentPage}`);
        failedNavigations += 1;
        if (failedNavigations > maximumAllowedFailedNavigations) {
          console.error(`Failed to many navigation attempts in a row. Terminating process`);
          process.exit(1);
        }
        console.info(`Requeueing: ${currentPage}`);
        pagesToScrape.push(currentPage);
        continue;
      } else {
        failedNavigations = 0;
      }

      console.info('Scraping images');
      const images = await page.evaluate(() => {
        return [...document.querySelectorAll('li.gallerybox div div div a img')].map(el => {
          //@ts-ignore
          return el.src;
        });
      });
      
      console.info(`Found & Queueing ${images.length} images`);
      if (! fs.existsSync(inOutDir(currentPageName))) {
        fs.mkdirSync(inOutDir(currentPageName));
      }
      imagesDownloading.push(...images.map(uri => {
        const indexOfLastSlash =  uri.lastIndexOf('/');
        const fileName = uri.substring(indexOfLastSlash);
        return downloadFile(uri, join(currentPageName, fileName))
          .catch(console.warn); // Errors when downloading a single file shouldn't abort the entire program
      }));

      console.info('Scraping category links');
      const links = await page.evaluate(() => {
        return [...document.querySelectorAll('a.CategoryTreeLabel')].map(el => {
          //@ts-ignore
          return el.href;
        });
      });
      
      console.info(`Found & Queueing ${links.length} categories`);
      pagesToScrape.push(...links);
    }
    
    console.info(`Waiting for ${imagesDownloading.length} images to finish downloading...`);
    await Promise.all(imagesDownloading);

    console.info('Closing puppeteer');
    await browser.close();
  } catch (err) {
    console.error(err);
    throw err;
  }
})();