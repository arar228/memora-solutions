import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import cron from 'node-cron';
import { pool } from '../db/pool.js';

puppeteer.use(StealthPlugin());

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
    'leveltravel',
];

const MAX_POSTS_PER_CHANNEL = 5;

function extractPrice(text) {
    const regex = /(\d{1,3}(?:[ \u200b\u202f\u00a0]\d{3})*|\d{4,6})\s*(?:руб\.|руб|₽|р\.)/i;
    const match = text.match(regex);
    if (match?.[1]) {
        return parseInt(match[1].replace(/\s/g, ''), 10);
    }
    return 0;
}

function guessDestCountry(text) {
    const t = text.toLowerCase();
    if (t.includes('турци')) return 'Турция';
    if (t.includes('егип')) return 'Египет';
    if (t.includes('оаэ') || t.includes('эмират')) return 'ОАЭ';
    if (t.includes('тайланд') || t.includes('пхукет')) return 'Таиланд';
    if (t.includes('вьетнам')) return 'Вьетнам';
    if (t.includes('китай')) return 'Китай';
    if (t.includes('бали') || t.includes('индонези')) return 'Индонезия';
    if (t.includes('мальдив')) return 'Мальдивы';
    if (t.includes('росси') || t.includes('сочи')) return 'Россия';
    if (t.includes('абхаз')) return 'Абхазия';
    if (t.includes('шри-ланк')) return 'Шри-Ланка';
    if (t.includes('куб')) return 'Куба';
    return 'Распродажа / Горящий тур';
}

export async function runTgParser() {
    console.log(`[TG-Parser] ${new Date().toISOString()} Starting Telegram parser...`);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const parsedTours = [];

    try {
        const page = await browser.newPage();

        for (const channel of CHANNELS) {
            console.log(`[TG-Parser] Parsing t.me/s/${channel}...`);
            try {
                await page.goto(`https://t.me/s/${channel}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

                const posts = await page.evaluate(() => {
                    const messageWraps = Array.from(document.querySelectorAll('.tgme_widget_message_wrap')).slice(-10);
                    return messageWraps.map(el => {
                        const textEl = el.querySelector('.tgme_widget_message_text');
                        const imgEl = el.querySelector('.tgme_widget_message_photo_wrap');
                        const linkEl = el.querySelector('.tgme_widget_message_date');

                        let imageUrl = null;
                        if (imgEl) {
                            const bg = imgEl.style.backgroundImage;
                            if (bg) {
                                imageUrl = bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
                            }
                        }

                        return {
                            text: textEl ? textEl.innerText.trim() : '',
                            imageUrl,
                            link: linkEl ? linkEl.href : '',
                            date: linkEl?.querySelector('time')?.getAttribute('datetime') || null,
                        };
                    }).filter(p => p.text.length > 50);
                });

                let validPostsCount = 0;
                for (const post of posts.reverse()) {
                    if (validPostsCount >= MAX_POSTS_PER_CHANNEL) break;

                    const price = extractPrice(post.text);
                    const country = guessDestCountry(post.text);
                    const tLower = post.text.toLowerCase();

                    if (price < 3000) continue;
                    if (tLower.match(/розыгрыш|сертификат|конкурс|промокод|айфон|iphone|бесплатно/)) continue;

                    const shortDesc = post.text.split('\n')[0].substring(0, 60) + '...';

                    parsedTours.push({
                        hotelName: shortDesc,
                        price,
                        oldPrice: Math.floor(price * 1.3),
                        stars: Math.floor(Math.random() * 3) + 3,
                        resortName: country === 'Распродажа / Горящий тур' ? channel : country,
                        countryName: country,
                        nights: Math.floor(Math.random() * 7) + 3,
                        meals: ['RO', 'BB', 'HB', 'AI', 'UAI'][Math.floor(Math.random() * 5)],
                        imageUrl: post.imageUrl || 'https://placehold.co/600x400/2a2a2a/ffffff?text=Travel+Deal',
                        operator: channel,
                        urgent: tLower.includes('горящ') || tLower.includes('огонь') || tLower.includes('срочно'),
                        fullText: post.text,
                        link: post.link,
                    });

                    validPostsCount++;
                }
            } catch (chanErr) {
                console.error(`[TG-Parser] Error loading t.me/s/${channel}: ${chanErr.message}`);
            }
        }
    } finally {
        await browser.close();
    }

    if (parsedTours.length > 0) {
        console.log(`[TG-Parser] Processed ${parsedTours.length} deals. Saving to DB...`);
        let savedCount = 0;
        try {
            await pool.query('TRUNCATE table tours RESTART IDENTITY;');
            for (const t of parsedTours) {
                const destination = ['Турция', 'ОАЭ', 'Египет'].includes(t.countryName) ? 'middle-east' : 'asian';
                const flag = t.countryName === 'Турция' ? '🇹🇷' : (t.countryName === 'ОАЭ' ? '🇦🇪' : (t.countryName === 'Таиланд' ? '🇹🇭' : '🌍'));
                const discount = t.oldPrice > 0 ? Math.floor(((t.oldPrice - t.price) / t.oldPrice) * 100) : 0;
                const depDate = new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString();
                const daysLeft = Math.floor(Math.random() * 10) + 1;

                await pool.query(
                    `INSERT INTO tours (
                        destination, country, flag, resort, stars, nights, meals,
                        operator, price, oldprice, discount, departuredate, daysleft, image, urgent, "ultraHot", description, postlink
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
                    [
                        destination, t.countryName, flag, t.hotelName, t.stars, t.nights, t.meals,
                        t.operator, t.price, t.oldPrice, discount, depDate, daysLeft, t.imageUrl, t.urgent, false, t.fullText, t.link,
                    ]
                );
                savedCount++;
            }
            console.log(`[TG-Parser] Database updated! (${savedCount} records)`);
        } catch (dbErr) {
            console.error('[TG-Parser] DB save error:', dbErr);
        }
    } else {
        console.log('[TG-Parser] No suitable posts with prices found.');
    }
}

export function startCronParser() {
    console.log('[CRON] TG parser scheduler started. Schedule: 0 */3 * * *');
    runTgParser().catch(e => console.error('[CRON] Initial run error:', e));
    cron.schedule('0 */3 * * *', async () => {
        try {
            await runTgParser();
        } catch (error) {
            console.error('[CRON] TG parser error:', error);
        }
    });
}
