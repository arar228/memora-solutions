const { createCipheriv, randomBytes } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const source = resolve(root, 'private-assets', 'ninja-tomato-sprites-10f.png');
const destination = resolve(root, 'assets', 'ninja-tomato.scene');
const envPath = resolve(root, '.env.local');

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const key = Buffer.from(env.MEMORA_SCENE_KEY || '', 'base64');
if (key.length !== 32) {
  throw new Error('MEMORA_SCENE_KEY must be a base64-encoded 32-byte key in .env.local');
}

const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(readFileSync(source)), cipher.final()]);
const payload = Buffer.concat([encrypted, cipher.getAuthTag()]);

writeFileSync(destination, JSON.stringify({
  v: 1,
  mime: 'image/png',
  iv: iv.toString('base64'),
  data: payload.toString('base64'),
}));

console.log(`Protected scene written (${payload.length} encrypted bytes).`);
