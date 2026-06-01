/**
 * fetch-tours.js — scrapes recent posts from public Telegram travel channels
 * via their t.me/s/<channel> web preview and writes public/tours.json.
 *
 * Runs in CI (see .github/workflows/update-tours.yml). No external deps —
 * uses Node's built-in fetch (Node 18+) and regex parsing of the public HTML.
 *
 * The site reads the resulting tours.json as a simple read-only feed; we never
 * scrape on the client (CORS + reliability), only at build/cron time.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'public', 'tours.json');

// Verified public hot-tour / travel-deal channels (from the project brief).
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

const PER_CHANNEL = 8;       // newest posts to keep per channel
const TOTAL_CAP = 80;        // hard cap on the combined feed
const MIN_TEXT_LEN = 30;     // skip near-empty / service posts

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function decodeEntities(s) {
    return s
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/\n{3,}/g, '\n\n')
        // Strip trailing reaction clusters that leak from the bubble (emoji+count).
        .replace(/(?:\p{Extended_Pictographic}+\s*\d+\s*)+$/u, '')
        .trim();
}

function parseChannel(html, channel) {
    const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/);
    const channelTitle = titleMatch ? decodeEntities(titleMatch[1]) : channel;

    // Each message bubble starts with data-post="channel/123"; slice from one
    // bubble to the next so per-message regexes don't bleed across posts.
    const blocks = html.split('tgme_widget_message_wrap');
    const items = [];

    for (const block of blocks) {
        const postMatch = block.match(/data-post="([^"]+)"/);
        if (!postMatch) continue;
        const postId = postMatch[1]; // e.g. "vandroukiru/12345"

        const textMatch = block.match(
            /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div class="tgme_widget_message_(?:footer|info)|<\/div>)/
        );
        const rawText = textMatch ? textMatch[1] : '';
        const text = decodeEntities(rawText);
        if (text.length < MIN_TEXT_LEN) continue;

        const dateMatch = block.match(/<time[^>]*datetime="([^"]+)"/);
        const date = dateMatch ? dateMatch[1] : null;

        const photoMatch = block.match(
            /tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:url\('([^']+)'\)/
        );
        const photo = photoMatch ? photoMatch[1] : null;

        // External (non-Telegram) links from the post HTML, before tags are
        // stripped — captures anchor-only links whose URL isn't in plain text.
        const links = [];
        const seenLinks = new Set();
        const hrefRe = /href="([^"]+)"/gi;
        let lm;
        while ((lm = hrefRe.exec(rawText)) !== null) {
            const url = lm[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
            if (!/^https?:\/\//i.test(url)) continue;
            if (/(?:t\.me|telegram\.me|telegram\.org)\//i.test(url)) continue;
            const key = url.replace(/\/+$/, '').toLowerCase();
            if (seenLinks.has(key)) continue;
            seenLinks.add(key);
            links.push(url);
        }

        items.push({
            id: postId.replace('/', '-'),
            channel,
            channelTitle,
            // Keep (almost) the full post — the UI shows it in the expanded panel
            // so the site works fully without opening Telegram.
            text: text.length > 2000 ? text.slice(0, 2000).trim() + '…' : text,
            photo,
            link: `https://t.me/${postId}`,
            links,
            date,
        });
    }

    // Newest last in the HTML → reverse, then keep the freshest PER_CHANNEL.
    return items.reverse().slice(0, PER_CHANNEL);
}

async function fetchChannel(channel) {
    const url = `https://t.me/s/${channel}`;
    try {
        const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru,en' } });
        if (!res.ok) {
            console.warn(`[skip] ${channel}: HTTP ${res.status}`);
            return [];
        }
        const html = await res.text();
        const items = parseChannel(html, channel);
        console.log(`[ok]   ${channel}: ${items.length} posts`);
        return items;
    } catch (err) {
        console.warn(`[skip] ${channel}: ${err.message}`);
        return [];
    }
}

async function main() {
    const results = await Promise.all(CHANNELS.map(fetchChannel));
    const all = results.flat();

    all.sort((a, b) => {
        const ta = a.date ? Date.parse(a.date) : 0;
        const tb = b.date ? Date.parse(b.date) : 0;
        return tb - ta;
    });

    const payload = {
        updatedAt: new Date().toISOString(),
        sources: CHANNELS,
        items: all.slice(0, TOTAL_CAP),
    };

    await mkdir(dirname(OUT_PATH), { recursive: true });
    await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log(`\nWrote ${payload.items.length} tours to public/tours.json`);

    if (payload.items.length === 0) {
        console.warn('WARNING: feed is empty — Telegram markup may have changed or network is blocked.');
    }
}

main();
