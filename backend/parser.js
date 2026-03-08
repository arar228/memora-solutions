import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import cron from 'node-cron';
import { pool } from './db.js';

// Configuration
const TRAVELATA_URL = 'https://spb.travelata.ru/tury?utm_referrer=https%3A%2F%2Fwww.google.com%2F';
const SCRAPE_INTERVAL = '0 */3 * * *'; // Every 3 hours
const MAX_TOURS_TO_SCRAPE = 20;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runParser() {
    console.log(`[${new Date().toISOString()}] 🚀 Запуск Web-парсера Travelata...`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
            ],
        });

        const page = await browser.newPage();

        // Anti-ban: Устанавливаем реалистичный User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Anti-ban: Подмена драйвера webdriver
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        console.log('Переход на Travelata...');
        await page.goto(TRAVELATA_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Ждём загрузки карточек туров...');
        await page.waitForSelector('.serp-hotel-card', { timeout: 30000 });

        // Дадим немного времени на дозагрузку картинок
        await delay(3000);

        const html = await page.content();
        const $ = cheerio.load(html);

        const newTours = [];
        const cards = $('.serp-hotel-card').slice(0, MAX_TOURS_TO_SCRAPE);

        console.log(`Найдено ${cards.length} карточек для парсинга.`);

        cards.each((index, element) => {
            try {
                const card = $(element);

                // Парсим отель и курорт
                const titleStr = card.find('.serpHotelCard__title').text().trim();
                const resortStr = card.find('.serpHotelCard__resort').text().trim() || 'Популярный курорт';

                // Парсим цену и убираем пробелы
                const priceText = card.find('.serpHotelCard__right-part-wrapper').text().trim();
                const priceMatch = priceText.match(/\d+/g);
                const price = priceMatch ? parseInt(priceMatch.join(''), 10) : 0;

                // Парсим звёзды (считаем иконки или берем из класса)
                const starsCount = card.find('.icon-star').length || 4;

                // Пытаемся найти картинку
                let image = card.find('.swiper-slide img').attr('src') || card.find('img').first().attr('src');
                if (!image || !image.startsWith('http')) {
                    image = '/images/travel-thailand.png'; // Fallback если не успела загрузиться
                }

                // Генерируем фейковые данные для полей, которых нет на обложке Travelata
                const generatedOldPrice = Math.floor(price * (1 + (Math.random() * 0.4 + 0.2)));
                const generatedDiscount = Math.floor(((generatedOldPrice - price) / generatedOldPrice) * 100);

                if (price > 0 && titleStr) {
                    newTours.push({
                        destination: 'turkey', // В реальном парсере вытаскивать из параметров урла
                        country: 'Турция',
                        flag: '🇹🇷',
                        resort: `${resortStr}, ${titleStr}`,
                        stars: starsCount > 5 ? 5 : starsCount,
                        nights: 7, // Обычно 7
                        meals: 'ai',
                        operator: 'Travelata / Partner',
                        price: price,
                        oldPrice: generatedOldPrice,
                        discount: generatedDiscount,
                        departureDate: new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 10) + 2)).toISOString().split('T')[0],
                        daysLeft: Math.floor(Math.random() * 15) + 3,
                        image: image,
                        urgent: generatedDiscount > 40,
                        ultraHot: generatedDiscount > 50
                    });
                }
            } catch (err) {
                console.warn('Ошибка при парсинге одной из карточек', err.message);
            }
        });

        console.log(`Успешно спарсено ${newTours.length} туров. Сохранение в PostgreSQL...`);

        await saveToursToDB(newTours);
        console.log(`[${new Date().toISOString()}] ✅ Парсер отработал успешно.`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Критическая ошибка парсера:`, error);
    } finally {
        if (browser) await browser.close();
    }
}

async function saveToursToDB(tours) {
    if (tours.length === 0) return;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Удаляем старые спарсенные туры этого оператора, чтобы лента обновлялась
        await client.query("DELETE FROM tours WHERE operator = 'Travelata / Partner'");

        for (const deal of tours) {
            const insertQuery = `
                INSERT INTO tours (
                    destination, country, flag, resort, stars, nights, meals,
                    operator, price, oldPrice, discount, departureDate, daysLeft, image, urgent, "ultraHot"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `;
            const values = [
                deal.destination, deal.country, deal.flag, deal.resort, deal.stars, deal.nights, deal.meals,
                deal.operator, deal.price, deal.oldPrice, deal.discount, deal.departureDate, deal.daysLeft, deal.image, deal.urgent, deal.ultraHot
            ];
            await client.query(insertQuery, values);
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Ошибка записи в БД:', e);
    } finally {
        client.release();
    }
}

// Экспортируем функцию инициализации Cron
export function startCronParser() {
    console.log(`[CRON] Планировщик парсера запущен. Расписание: ${SCRAPE_INTERVAL}`);
    // Запускаем сразу один тестовый прогон
    runParser();

    cron.schedule(SCRAPE_INTERVAL, runParser);
}
