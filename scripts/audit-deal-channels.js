import { fetchChannel, MAX_POST_AGE_HOURS, SOURCE_ALIASES } from './fetch-tours.js';
import { structure } from './parse-deals.js';

const requestedChannels = [
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

const cutoff = Date.now() - MAX_POST_AGE_HOURS * 60 * 60 * 1000;
const cache = new Map();

async function load(channel) {
  if (!cache.has(channel)) cache.set(channel, fetchChannel(channel));
  return cache.get(channel);
}

const rows = [];
for (const requested of requestedChannels) {
  const replacement = SOURCE_ALIASES[requested];
  const effective = replacement || requested;
  const posts = await load(effective);
  const fresh = posts.filter((post) => Date.parse(post.date || '') >= cutoff);
  const deals = fresh.flatMap(structure);
  const latest = posts[0]?.date || null;

  let status = 'активен';
  if (requested === 'checkinticket') status = 'нет свежих постов';
  else if (replacement) status = `перенесён → @${replacement}`;
  else if (posts.length === 0) status = 'нет публичной ленты';
  else if (fresh.length === 0) status = 'нет свежих постов';

  rows.push({
    requested: `@${requested}`,
    effective: `@${effective}`,
    status,
    latest: latest?.slice(0, 16) || '—',
    freshPosts: fresh.length,
    deals: deals.length,
  });
}

console.table(rows);

const freshActive = rows.filter((row) => row.status === 'активен' || row.status.startsWith('перенесён'));
if (freshActive.some((row) => row.freshPosts > 0 && row.deals === 0 && row.effective !== '@onlinetours')) {
  process.exitCode = 1;
}
