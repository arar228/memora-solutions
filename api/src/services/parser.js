import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import cron from 'node-cron';
import { pool } from '../db/pool.js';

puppeteer.use(StealthPlugin());

// Configuration
const TRAVELATA_URL = 'https://spb.travelata.ru/tury#?fromCity=2&toCountry=11&dateFrom=2024-05-15&dateTo=2024-05-15&nightFrom=7&nightTo=7&adults=2';
const SCRAPE_INTERVAL = '0 */3 * * *';
const MAX_TOURS_TO_SCRAPE = 20;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function runParser() {
    console.log(`[Parser] ${new Date().toISOString()} Starting web parser...`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080',
            ],
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        });

        let capturedTours = [];
        let capturedHotels = null;
        let capturedResorts = null;

        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/frontend/tours') && response.status() === 200) {
                if (response.request().method() !== 'OPTIONS') {
                    try {
                        const text = await response.text();
                        const json = JSON.parse(text);
                        if (json?.data?.tours) {
                            capturedTours = json.data.tours;
                            capturedHotels = json.data.hotels;
                            capturedResorts = json.data.resorts;
                        }
                    } catch (e) {
                        console.log('[Parser] Failed to parse API response:', e.message);
                    }
                }
            }
        });

        await page.goto(TRAVELATA_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        try {
            await page.waitForSelector('.btn_show-tours', { visible: true, timeout: 15000 });
            await page.click('.btn_show-tours');
        } catch (e) {
            console.log('[Parser] Search button not found, waiting for API...');
        }

        for (let i = 0; i < 30; i++) {
            if (capturedTours?.length > 0) break;
            await delay(1000);
        }

        const newTours = [];

        if (capturedTours?.length > 0) {
            console.log(`[Parser] Captured ${capturedTours.length} tours from API.`);
            const toursArray = capturedTours.slice(0, MAX_TOURS_TO_SCRAPE);

            toursArray.forEach((tour) => {
                try {
                    let hotelName = 'Hotel';
                    let resortName = 'Resort';
                    let starsCount = 4;
                    let image = '/images/travel-thailand.png';

                    if (capturedHotels?.[tour.hotelId]) {
                        const hotelData = capturedHotels[tour.hotelId];
                        hotelName = hotelData.name;
                        starsCount = hotelData.rating || 4;
                        if (hotelData.previewImage) image = hotelData.previewImage;
                        if (capturedResorts?.[hotelData.resortId]) {
                            resortName = capturedResorts[hotelData.resortId].name;
                        }
                    }

                    const price = tour.price || 0;
                    const generatedOldPrice = Math.floor(price * (1 + (Math.random() * 0.4 + 0.2)));
                    const generatedDiscount = Math.floor(((generatedOldPrice - price) / generatedOldPrice) * 100);

                    if (price > 0) {
                        newTours.push({
                            destination: 'turkey',
                            country: 'Турция',
                            flag: '🇹🇷',
                            resort: `${resortName}, ${hotelName}`,
                            stars: Math.min(starsCount, 5),
                            nights: tour.nightCount || 7,
                            meals: tour.mealId === 4 ? 'ai' : (tour.mealId === 3 ? 'fb' : 'bb'),
                            operator: 'Travelata / Partner',
                            price,
                            oldPrice: generatedOldPrice,
                            discount: generatedDiscount,
                            departureDate: new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 10) + 2)).toISOString().split('T')[0],
                            daysLeft: Math.floor(Math.random() * 15) + 3,
                            image,
                            urgent: generatedDiscount > 40,
                            ultraHot: generatedDiscount > 50,
                        });
                    }
                } catch (err) {
                    console.warn('[Parser] Error formatting tour:', err.message);
                }
            });
        }

        console.log(`[Parser] Processed ${newTours.length} tours. Saving to DB...`);

        if (newTours.length > 0) {
            await saveToursToDB(newTours);
        } else {
            console.log('[Parser] No tours found.');
        }
    } catch (error) {
        console.error(`[Parser] Critical error:`, error);
    } finally {
        if (browser) await browser.close();
    }
}

async function saveToursToDB(tours) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("DELETE FROM tours WHERE operator = 'Travelata / Partner'");

        for (const deal of tours) {
            await client.query(
                `INSERT INTO tours (
                    destination, country, flag, resort, stars, nights, meals,
                    operator, price, oldPrice, discount, departureDate, daysLeft, image, urgent, "ultraHot"
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
                [
                    deal.destination, deal.country, deal.flag, deal.resort, deal.stars, deal.nights, deal.meals,
                    deal.operator, deal.price, deal.oldPrice, deal.discount, deal.departureDate, deal.daysLeft, deal.image, deal.urgent, deal.ultraHot,
                ]
            );
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[Parser] DB write error:', e);
    } finally {
        client.release();
    }
}

export function startCronParser() {
    console.log(`[CRON] Parser scheduler started. Schedule: ${SCRAPE_INTERVAL}`);
    runParser();
    cron.schedule(SCRAPE_INTERVAL, runParser);
}
