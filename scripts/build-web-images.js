import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = resolve(scriptDirectory, '..', 'public');

const targets = [
  { input: 'logo.png', output: 'logo.webp', width: 512, quality: 96, alphaQuality: 100, smartSubsample: true },
  { input: 'logo.png', output: 'logo-loader.webp', width: 128, quality: 96, alphaQuality: 100, smartSubsample: true },
  { input: 'travel-logo.png', output: 'travel-logo.webp', width: 512, quality: 96, alphaQuality: 100, smartSubsample: true },
  { input: 'wallet-logo.png', output: 'wallet-logo.webp', width: 512, quality: 96, alphaQuality: 100, smartSubsample: true },
  { input: 'bdaybot-logo.png', output: 'bdaybot-logo.webp', width: 512, quality: 96, alphaQuality: 100, smartSubsample: true },
  { input: 'pomodoro-logo.png', output: 'pomodoro-logo.webp', width: 512, quality: 96, alphaQuality: 100, smartSubsample: true },
  { input: 'sergey.jpg', output: 'sergey.webp', width: 800, quality: 82 },
  { input: 'portfolio/armk-b2b.png', output: 'portfolio/armk-b2b.webp', width: 1200, quality: 82 },
  { input: 'portfolio/domatrix-landing.png', output: 'portfolio/domatrix-landing.webp', width: 1200, quality: 82 },
  { input: 'portfolio/domatrix-app.png', output: 'portfolio/domatrix-app.webp', width: 720, quality: 82 },
  { input: 'portfolio/poker-club.png', output: 'portfolio/poker-club.webp', width: 1200, quality: 82 },
  { input: 'portfolio/poker-control.png', output: 'portfolio/poker-control.webp', width: 1200, quality: 82 },
  { input: 'portfolio/armk-site.png', output: 'portfolio/armk-site.webp', width: 1200, quality: 82 },
];

const formatSize = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function buildImage(target) {
  const inputPath = resolve(publicDirectory, target.input);
  const outputPath = resolve(publicDirectory, target.output);
  await mkdir(dirname(outputPath), { recursive: true });

  await sharp(inputPath)
    .resize({ width: target.width, withoutEnlargement: true })
    .webp({
      quality: target.quality,
      alphaQuality: target.alphaQuality ?? 90,
      smartSubsample: target.smartSubsample ?? false,
      effort: 6,
    })
    .toFile(outputPath);

  const [before, after] = await Promise.all([stat(inputPath), stat(outputPath)]);
  const saved = Math.round((1 - after.size / before.size) * 100);
  console.log(`${target.output}: ${formatSize(before.size)} -> ${formatSize(after.size)} (${saved}% smaller)`);
}

for (const target of targets) await buildImage(target);
