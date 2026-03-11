import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const CHANNELS = [
    'vandroukiru',
    'checkinticket',
    'samokatus',
    'travelradar',
    'nachemodanahspb',
    'luckywings',
    'turscanner_msk_spb',
    'onlinetours_russia',
    'travelataru',
    'leveltravel'
];

const pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL || 'postgresql://postgres:xsqIIfpYALoFkKzQjJmRkKzNnUXpDEXJ@roundhouse.proxy.rlwy.net:49042/railway',
    ssl: { rejectUnauthorized: false }
});

const MAX_POSTS_PER_CHANNEL = 5;

// Примитивная функция для попытки достать цену
function extractPrice(text) {
    // Ищем числа, за которыми следует "руб", "₽", "р." и т.д.
    const regex = /(\d{1,3}(?:[ \u200b\u202f\u00a0]\d{3})*|\d{4,6})\s*(?:руб\.|руб|₽|р\.)/i;
    const match = text.match(regex);
    if (match && match[1]) {
        return parseInt(match[1].replace(/\s/g, ''), 10);
    }
    return 0; // fallback
}

// Примитивная функция для угадывания страны (очень базовая)
function guessDestCountry(text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('турци')) return 'Турция';
    if (textLower.includes('егип')) return 'Египет';
    if (textLower.includes('оаэ') || textLower.includes('эмират')) return 'ОАЭ';
    if (textLower.includes('тайланд') || textLower.includes('пхукет')) return 'Таиланд';
    if (textLower.includes('вьетнам')) return 'Вьетнам';
    if (textLower.includes('китай')) return 'Китай';
    if (textLower.includes('бали') || textLower.includes('индонези')) return 'Индонезия';
    if (textLower.includes('мальдив')) return 'Мальдивы';
    if (textLower.includes('росси') || textLower.includes('сочи')) return 'Россия';
    if (textLower.includes('абхаз')) return 'Абхазия';
    if (textLower.includes('шри-ланк')) return 'Шри-Ланка';
    if (textLower.includes('куб')) return 'Куба';

    // Fallback: берем первые пару слов как "название направления" или просто канал
    return 'Распродажа / Горящий тур';
}

export async function runTgParser() {
    console.log(`[${new Date().toISOString()}] 🚀 Запуск Telegram парсера...`);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const parsedTours = [];

    try {
        const page = await browser.newPage();

        for (const channel of CHANNELS) {
            console.log(`\n📺 Парсим канал t.me/s/${channel} ...`);
            try {
                await page.goto(`https://t.me/s/${channel}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

                const posts = await page.evaluate(() => {
                    const messageWraps = Array.from(document.querySelectorAll('.tgme_widget_message_wrap')).slice(-10); // берем последние 10
                    return messageWraps.map(el => {
                        const textEl = el.querySelector('.tgme_widget_message_text');
                        const imgEl = el.querySelector('.tgme_widget_message_photo_wrap');
                        const linkEl = el.querySelector('.tgme_widget_message_date');

                        let imageUrl = null;
                        if (imgEl) {
                            // стиль обычно background-image: url('...');
                            const bg = imgEl.style.backgroundImage;
                            if (bg) {
                                imageUrl = bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
                            }
                        }

                        return {
                            text: textEl ? textEl.innerText.trim() : '',
                            imageUrl: imageUrl,
                            link: linkEl ? linkEl.href : '',
                            date: linkEl && linkEl.querySelector('time') ? linkEl.querySelector('time').getAttribute('datetime') : null
                        };
                    }).filter(p => p.text.length > 50); // игнорируем пустые или слишком короткие
                });

                console.log(`   Найдено осмысленных постов: ${posts.length}`);

                let validPostsCount = 0;
                for (const post of posts.reverse()) { // идем от самых свежих к старым
                    if (validPostsCount >= MAX_POSTS_PER_CHANNEL) break;

                    const price = extractPrice(post.text);
                    const country = guessDestCountry(post.text);
                    const tLower = post.text.toLowerCase();

                    // Фильтрация рекламы, билетов и мусора
                    if (price < 3000) continue; // слишком дешево для тура
                    if (tLower.match(/розыгрыш|сертификат|конкурс|промокод|айфон|iphone|бесплатно/)) continue;

                    // Укорачиваем текст для "названия отеля/курорта" до 50 символов
                    const shortDesc = post.text.split('\n')[0].substring(0, 60) + '...';

                    // Фомируем тур
                    parsedTours.push({
                        hotelName: shortDesc,
                        price: price,
                        oldPrice: Math.floor(price * 1.3),
                        stars: Math.floor(Math.random() * 3) + 3, // 3-5 stars
                        resortName: country === 'Распродажа / Горящий тур' ? channel : country,
                        countryName: country,
                        nights: Math.floor(Math.random() * 7) + 3, // 3-10 nights
                        meals: ['RO', 'BB', 'HB', 'AI', 'UAI'][Math.floor(Math.random() * 5)],
                        imageUrl: post.imageUrl || 'https://placehold.co/600x400/2a2a2a/ffffff?text=Travel+Deal',
                        operator: channel,
                        urgent: tLower.includes('горящ') || tLower.includes('огонь') || tLower.includes('срочно'),
                        fullText: post.text,
                        link: post.link
                    });

                    validPostsCount++;
                }

            } catch (chanErr) {
                console.error(`   ❌ Ошибка загрузки t.me/s/${channel}: ${chanErr.message}`);
            }
        }

    } finally {
        await browser.close();
    }

    if (parsedTours.length > 0) {
        console.log(`\nУспешно обработано ${parsedTours.length} предложений из Telegram. Сохраняем в PostgreSQL...`);
        let savedCount = 0;
        try {
            await pool.query('TRUNCATE table tours RESTART IDENTITY;');
            for (const t of parsedTours) {
                // Псевдо-заполнение недостающих полей
                const destination = ['Турция', 'ОАЭ', 'Египет'].includes(t.countryName) ? 'middle-east' : 'asian';
                const flag = t.countryName === 'Турция' ? '🇹🇷' : (t.countryName === 'ОАЭ' ? '🇦🇪' : (t.countryName === 'Таиланд' ? '🇹🇭' : '🌍'));
                const discount = t.oldPrice > 0 ? Math.floor(((t.oldPrice - t.price) / t.oldPrice) * 100) : 0;
                const depDate = new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString();
                const daysLeft = Math.floor(Math.random() * 10) + 1;

                await pool.query(
                    `INSERT INTO tours (
                        destination, country, flag, resort, stars, nights, meals,
                        operator, price, oldprice, discount, departuredate, daysleft, image, urgent, "ultraHot", description, postlink
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
                    [
                        destination, t.countryName, flag, t.hotelName, t.stars, t.nights, t.meals,
                        t.operator, t.price, t.oldPrice, discount, depDate, daysLeft, t.imageUrl, t.urgent, false, t.fullText, t.link
                    ]
                );
                savedCount++;
            }
            console.log(`✅ База данных обновлена! (${savedCount} записей)`);
        } catch (dbErr) {
            console.error('Ошибка сохранения в БД:', dbErr);
        }
    } else {
        console.log('⚠️ Не найдено подходящих постов с ценами.');
    }
}

import cron from 'node-cron';

// Позволяет запускать файл напрямую: node tg_parser.js
const isMain = process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
    runTgParser().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

export function startCronParser() {
    console.log('[CRON] Планировщик Telegram-парсера запущен. Расписание: 0 */3 * * *');

    // При старте сервера желательно спарсить хотя бы раз:
    runTgParser().catch(e => console.error('Ошибка первичного запуска:', e));

    cron.schedule('0 */3 * * *', async () => {
        try {
            await runTgParser();
        } catch (error) {
            console.error('❌ Ошибка в кроне TG-парсера:', error);
        }
    });
}
