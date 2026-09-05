import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = new URL('../tests/', import.meta.url);
const files = readdirSync(directory).filter(name => name.endsWith('.test.mjs'))
  .sort().map(name => fileURLToPath(new URL(name, directory)));
if (!files.length) throw new Error('Reliability tests were not found');
const result = spawnSync(process.execPath, ['--experimental-vm-modules', '--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
