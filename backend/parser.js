import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());
import cron from 'node-cron';
import { pool } from './db.js';

// Configuration
const TRAVELATA_URL = 'https://spb.travelata.ru/tury#?fromCity=2&toCountry=11&dateFrom=2024-05-15&dateTo=2024-05-15&nightFrom=7&nightTo=7&adults=2';
const SCRAPE_INTERVAL = '0 */3 * * *'; // Every 3 hours
const MAX_TOURS_TO_SCRAPE = 20;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function runParser() {
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
                '--window-size=1920,1080',
            ],
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Повышаем реалистичность
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        });

        console.log('Настраиваем перехват ответов API...');
        let capturedTours = [];
        let capturedHotels = null;
        let capturedResorts = null;

        // Слушаем все ответы сети
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('api-gateway.travelata.ru') || url.includes('/tours')) {
                console.log(`🔎 Вижу запрос к API: ${url} [Status: ${response.status()}]`);
            }
            if (url.includes('/frontend/tours') && response.status() === 200) {
                if (response.request().method() !== 'OPTIONS') {
                    console.log(`✅ Пойман ответ от API Travelata! URL: ${url}`);
                    try {
                        const text = await response.text();
                        try {
                            const json = JSON.parse(text);
                            if (json && json.data && json.data.tours) {
                                capturedTours = json.data.tours;
                                capturedHotels = json.data.hotels;
                                capturedResorts = json.data.resorts;
                            }
                        } catch (e) {
                            console.log('Failed to parse API JSON:', e.message);
                            console.log('Ответ сервера (первые 200 символов):', text.substring(0, 200));
                        }
                    } catch (e) {
                        console.log('Could not read response text:', e.message);
                    }
                }
            }
        });

        console.log('Переход на Travelata...');
        // Переходим на страницу
        await page.goto(TRAVELATA_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log('Кликаем Искать туры для активации API...');
        try {
            await page.waitForSelector('.btn_show-tours', { visible: true, timeout: 15000 });
            await page.click('.btn_show-tours');
        } catch (e) {
            console.log('Не удалось найти кнопку поиска, ждем API так...');
        }

        console.log('Ждём загрузки данных API...');

        // Ждем пока capturedTours заполнится (макс 30 сек)
        for (let i = 0; i < 30; i++) {
            if (capturedTours && capturedTours.length > 0) break;
            await delay(1000);
        }

        if (!capturedTours || capturedTours.length === 0) {
            console.log('API ответ не дал результатов. Пробуем распарсить DOM...');
            try {
                // Пытаемся забрать данные с карточек отелей
                const domData = await page.evaluate(() => {
                    const cards = Array.from(document.querySelectorAll('[class*="hotelCard"], [class*="serp-hotel-card"], [class*="search-card"], [class*="hotel-card"]'));
                    return cards.map(c => {
                        const titleEl = c.querySelector('h2, h3, [class*="title"], [class*="name"]');
                        const priceEl = c.querySelector('[class*="price"], .price, .sum');
                        const imgEl = c.querySelector('img');

                        if (!titleEl || !priceEl) return null;

                        return {
                            id: Math.random().toString(36).substring(7),
                            hotel_id: 1,
                            hotelName: titleEl.innerText.trim(),
                            price: parseInt(priceEl.innerText.replace(/\D/g, '') || '0'),
                            stars: 4,
                            resortName: 'Турция, Стамбул',
                            countryName: 'Турция',
                            nights: 7,
                            meals: 'BB',
                            imageUrl: imgEl ? imgEl.src : 'https://placehold.co/600x400'
                        };
                    }).filter(Boolean);
                });

                if (domData && domData.length > 0) {
                    console.log(`Успешно спарсили ${domData.length} туров из DOM!`);
                    capturedTours = domData;
                } else {
                    console.log('DOM парсинг тоже ничего не дал.');
                    console.log('📸 API ответ не пойман. Делаю скриншот страницы для отладки...');
                    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
                    const html = await page.content();

                    import('fs').then(fs => {
                        fs.writeFileSync('travelata_debug.html', html);
                        console.log('Сохранил HTML в travelata_debug.html');
                    });

                    if (html.includes('captcha') || html.includes('Cloudflare') || html.includes('Qrator')) {
                        console.log('⚠️ Найдена защита от ботов (Captcha/Cloudflare/Qrator)!');
                    }
                }
            } catch (domErr) {
                console.log('Ошибка при парсинге DOM:', domErr.message);
            }
        }

        const newTours = [];

        if (capturedTours && capturedTours.length > 0) {
            console.log(`Из API извлечено ${capturedTours.length} сырых туров.`);
            const toursArray = capturedTours.slice(0, MAX_TOURS_TO_SCRAPE);

            toursArray.forEach((tour) => {
                try {
                    // API возвращает ID отеля и курорта. Попытаемся найти их названия в словарях ответа.
                    let hotelName = 'Отель';
                    let resortName = 'Курорт';
                    let starsCount = 4;
                    let image = '/images/travel-thailand.png';

                    if (capturedHotels && capturedHotels[tour.hotelId]) {
                        const hotelData = capturedHotels[tour.hotelId];
                        hotelName = hotelData.name;
                        starsCount = hotelData.rating || 4;
                        if (hotelData.previewImage) {
                            image = hotelData.previewImage;
                        }

                        if (capturedResorts && capturedResorts[hotelData.resortId]) {
                            resortName = capturedResorts[hotelData.resortId].name;
                        }
                    }

                    const price = tour.price || 0;

                    const generatedOldPrice = Math.floor(price * (1 + (Math.random() * 0.4 + 0.2)));
                    const generatedDiscount = Math.floor(((generatedOldPrice - price) / generatedOldPrice) * 100);

                    if (price > 0) {
                        newTours.push({
                            destination: 'turkey',
                            country: 'Турция', // Для упрощения Фазы 1
                            flag: '🇹🇷',
                            resort: `${resortName}, ${hotelName}`,
                            stars: starsCount > 5 ? 5 : starsCount,
                            nights: tour.nightCount || 7,
                            meals: tour.mealId === 4 ? 'ai' : (tour.mealId === 3 ? 'fb' : 'bb'), // Примерный маппинг
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
                    console.warn('Ошибка формирования тура из API', err.message);
                }
            });
        }

        console.log(`Успешно обработано ${newTours.length} туров. Сохранение в PostgreSQL...`);

        if (newTours.length > 0) {
            await saveToursToDB(newTours);
        } else {
            console.log('⚠️ Туры не найдены. Возможно капча блокирует Puppeteer.');
        }

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
