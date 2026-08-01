/**
 * Prevent a transient upstream outage from replacing healthy public feeds with
 * empty or severely degraded data. Invalid generated files are restored from
 * the current Git commit, while valid feeds remain available for committing.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync, readFileSync, unlinkSync, writeFileSync,
} from 'node:fs';

const FATAL_MARKER = '.feed-validation-fatal';
if (existsSync(FATAL_MARKER)) unlinkSync(FATAL_MARKER);

const ALL_FEEDS = [
  {
    path: 'public/radar.json',
    arrays: { hotFlights: 5, cheapFrom: 20, calendars: 20 },
  },
  {
    path: 'public/tours.json',
    arrays: { items: 10 },
  },
  {
    path: 'public/hot-deals.json',
    arrays: { deals: 5 },
    dependsOn: ['public/tours.json'],
  },
  {
    // Zero qualifying flight deals is a legitimate result. Validate only the
    // shape and timestamp, not a minimum item count.
    path: 'public/flights.json',
    arrays: { items: 0 },
  },
];

const requestedFeeds = new Set(process.argv.slice(2));
const FEEDS = requestedFeeds.size === 0
  ? ALL_FEEDS
  : ALL_FEEDS.filter((feed) => requestedFeeds.has(feed.path.split('/').at(-1).replace('.json', '')));

if (requestedFeeds.size > 0 && FEEDS.length !== requestedFeeds.size) {
  const known = ALL_FEEDS.map((feed) => feed.path.split('/').at(-1).replace('.json', ''));
  console.error(`Unknown feed name. Available: ${known.join(', ')}`);
  process.exit(2);
}

function parseFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readCommitted(path) {
  return execFileSync('git', ['show', `HEAD:${path}`], {
    encoding: 'utf8',
    // radar.json is several megabytes and exceeds child_process' 1 MiB default.
    maxBuffer: 32 * 1024 * 1024,
  });
}

function parseCommitted(path) {
  return JSON.parse(readCommitted(path));
}

function validateTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && Math.abs(Date.now() - timestamp) < 24 * 60 * 60 * 1000;
}

function validateFeed(feed, current, previous) {
  const errors = [];

  if (!validateTimestamp(current.updatedAt)) {
    errors.push('updatedAt is missing, invalid, or older than 24 hours');
  }

  for (const [field, minimum] of Object.entries(feed.arrays)) {
    const value = current[field];
    if (!Array.isArray(value)) {
      errors.push(`${field} is not an array`);
      continue;
    }

    if (value.length < minimum) {
      errors.push(`${field} has ${value.length} items; minimum is ${minimum}`);
    }

    const previousValue = previous[field];
    if (Array.isArray(previousValue)
      && previousValue.length >= minimum * 2
      && value.length < Math.floor(previousValue.length * 0.4)) {
      errors.push(
        `${field} collapsed from ${previousValue.length} to ${value.length} items`,
      );
    }
  }

  return errors;
}

let restored = 0;
const restoredPaths = new Set();

for (const feed of FEEDS) {
  try {
    const current = parseFile(feed.path);
    const previous = parseCommitted(feed.path);
    const errors = validateFeed(feed, current, previous);
    const failedDependency = feed.dependsOn?.find((path) => restoredPaths.has(path));
    if (failedDependency) {
      errors.push(`dependency ${failedDependency} was restored`);
    }

    if (errors.length === 0) {
      console.log(`[ok] ${feed.path}`);
      continue;
    }

    writeFileSync(feed.path, JSON.stringify(previous, null, 2) + '\n', 'utf8');
    restored += 1;
    restoredPaths.add(feed.path);
    console.error(`[restored] ${feed.path}: ${errors.join('; ')}`);
  } catch (error) {
    try {
      const previousText = readCommitted(feed.path);
      writeFileSync(feed.path, previousText, 'utf8');
      restored += 1;
      restoredPaths.add(feed.path);
      console.error(`[restored] ${feed.path}: ${error.message}`);
    } catch (restoreError) {
      console.error(
        `[fatal] ${feed.path}: ${error.message}; restore failed: ${restoreError.message}`,
      );
      writeFileSync(FATAL_MARKER, `${feed.path}\n`, { flag: 'a' });
      process.exitCode = 2;
    }
  }
}

if (restored > 0 && !process.exitCode) {
  console.error(`${restored} invalid feed(s) restored from the last commit.`);
  process.exitCode = 1;
}
