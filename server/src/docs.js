import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Encrypted-at-rest storage for client/trip documents (TZ §4.7, §8.1 / 152-ФЗ).
// Files are AES-256-GCM encrypted on disk; the plaintext never touches storage.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = process.env.DOCS_DIR || path.join(__dirname, '..', 'data', 'docs');
fs.mkdirSync(DOCS_DIR, { recursive: true });

function key() {
  const hex = process.env.DOC_ENCRYPTION_KEY;
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, 'hex');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DOC_ENCRYPTION_KEY (32-byte hex) must be set in production');
  }
  // Dev fallback only.
  return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'dev-doc-key').digest();
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Layout on disk: [iv(12)][authTag(16)][ciphertext]. Returns the stored filename.
export function storeEncrypted(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('empty file');
  if (buffer.length > MAX_BYTES) throw new Error('file too large');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const name = crypto.randomUUID() + '.enc';
  fs.writeFileSync(path.join(DOCS_DIR, name), Buffer.concat([iv, cipher.getAuthTag(), enc]));
  return name;
}

export function readDecrypted(name) {
  const safe = path.basename(String(name)); // prevent path traversal
  const raw = fs.readFileSync(path.join(DOCS_DIR, safe));
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export { MAX_BYTES };
