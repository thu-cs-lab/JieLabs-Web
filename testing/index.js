import puppeteer from 'puppeteer';
import { FRONTEND, USERNAME, PASSWORD } from './config.js';

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(FRONTEND);
    await page.type('#username', USERNAME);
    await page.type('#password', PASSWORD);
    await page.click('#login');
    await page.waitForNavigation();
    await browser.close();
})();