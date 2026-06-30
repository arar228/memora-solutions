import './db.js';
import { createUser, findUserByEmail } from './auth.js';

// Idempotent seed of staff + a demo client. Passwords are for LOCAL DEV ONLY.
const seeds = [
  { email: 'admin@memora.local', password: 'admin123', role: 'admin', name: 'Admin' },
  { email: 'operator@memora.local', password: 'operator123', role: 'operator', name: 'Оператор' },
  { email: 'client@memora.local', password: 'client123', role: 'client', name: 'Демо-клиент' },
];

let created = 0;
for (const s of seeds) {
  if (findUserByEmail(s.email)) continue;
  createUser({ ...s, consent: true });
  created++;
  // eslint-disable-next-line no-console
  console.log(`seeded ${s.role}: ${s.email} / ${s.password}`);
}
// eslint-disable-next-line no-console
console.log(created ? `Done (${created} new).` : 'All seed users already exist.');
process.exit(0);
