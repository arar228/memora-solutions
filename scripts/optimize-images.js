// One-shot image optimizer for the public/ folder.
// Run with: npm run optimize-images
//
// Reads each entry in TARGETS, resizes to max width, recompresses, and
// overwrites the original file. Skips anything not listed so we don't
// accidentally trash unrelated assets (favicons, fonts, svgs).

import sharp from 'sharp';
import { readFile, writeFile, stat } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');

// width = max width in pixels (no upscaling)
// kind  = 'jpeg' | 'png-palette' | 'png-quality'
const TARGETS = [
    // Hero photo on /creator
    { file: 'creator.jpg', width: 900, kind: 'jpeg', quality: 82 },

    // Brand logos — flat artwork, palette PNG compresses brutally well
    { file: 'logo.png', width: 512, kind: 'png-palette' },
    { file: 'wallet-logo.png', width: 512, kind: 'png-palette' },
    { file: 'bdaybot-logo.png', width: 512, kind: 'png-palette' },

    // Travel cards
    { file: 'images/travel-bali.png', width: 800, kind: 'png-palette' },
    { file: 'images/travel-china.png', width: 800, kind: 'png-palette' },
    { file: 'images/travel-thailand.png', width: 800, kind: 'png-palette' },
    { file: 'images/travel-turkey.png', width: 800, kind: 'png-palette' },
    { file: 'images/travel-vietnam.png', width: 800, kind: 'png-palette' },

    // Hero background — keep PNG (might have transparency on top), but
    // shrink width to a sane max for full-bleed use.
    { file: 'images/hero-bg.png', width: 1920, kind: 'png-quality', quality: 80 },
];

const fmt = (bytes) => (bytes / 1024).toFixed(1) + ' KB';

async function processOne({ file, width, kind, quality }) {
    const path = resolve(PUBLIC, file);
    let before;
    try {
        before = (await stat(path)).size;
    } catch {
        console.warn(`[skip] ${file} not found`);
        return null;
    }

    const buf = await readFile(path);
    let pipeline = sharp(buf).resize({ width, withoutEnlargement: true });

    if (kind === 'jpeg') {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else if (kind === 'png-palette') {
        // 256-color palette + max zlib compression — ideal for flat logos
        // and stylised illustrations.
        pipeline = pipeline.png({
            palette: true,
            quality: 90,
            compressionLevel: 9,
            effort: 10,
        });
    } else if (kind === 'png-quality') {
        pipeline = pipeline.png({
            quality: quality ?? 85,
            compressionLevel: 9,
            effort: 9,
        });
    }

    const out = await pipeline.toBuffer();
    await writeFile(path, out);
    const after = out.length;
    return { file, before, after, ratio: 1 - after / before };
}

async function main() {
    console.log(`Optimizing ${TARGETS.length} images in ${PUBLIC}\n`);
    let totalBefore = 0, totalAfter = 0;
    for (const target of TARGETS) {
        const result = await processOne(target);
        if (!result) continue;
        totalBefore += result.before;
        totalAfter += result.after;
        const pct = (result.ratio * 100).toFixed(0);
        console.log(`  ${result.file.padEnd(24)}  ${fmt(result.before).padStart(10)} → ${fmt(result.after).padStart(10)}  (-${pct}%)`);
    }
    const totalPct = (1 - totalAfter / totalBefore) * 100;
    console.log(`\nTotal: ${fmt(totalBefore)} → ${fmt(totalAfter)}  (-${totalPct.toFixed(0)}%)`);
}

main().catch((err) => {
    console.error('[optimize-images] failed:', err);
    process.exit(1);
});
