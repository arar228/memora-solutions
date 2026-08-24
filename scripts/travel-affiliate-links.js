/**
 * Convert supported travel-brand URLs into this project's Travelpayouts links.
 *
 * Telegram posts frequently contain another publisher's short affiliate URL.
 * We never edit that URL in place: first recover/resolve the long brand URL,
 * then ask the official Travelpayouts Links API to create a fresh link for our
 * marker and traffic source. Unsupported or failed URLs keep their source link.
 */

const API_URL = 'https://api.travelpayouts.com/links/v1/create';
const TOKEN = process.env.TRAVELPAYOUTS_TOKEN || '';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '748397';
const TRS = process.env.TRAVELPAYOUTS_TRS || '547927';
const API_BATCH_SIZE = 10;
const REQUEST_TIMEOUT_MS = 12_000;

const BRAND_HOSTS = [
  { id: 'leveltravel', name: 'Level.Travel', hosts: ['level.travel'] },
  { id: 'travelata', name: 'Travelata', hosts: ['travelata.ru', 'travelata.com'] },
  { id: 'onlinetours', name: 'OnlineTours', hosts: ['onlinetours.ru'] },
  { id: 'aviasales', name: 'Aviasales', hosts: ['aviasales.ru', 'aviasales.com'] },
];

// Redirectors observed in the verified public sources. The final URL must still
// belong to one of BRAND_HOSTS, which prevents arbitrary network destinations.
const SAFE_REDIRECT_HOSTS = new Set([
  'xn--o1acdd.xn--p1ai', // пртс.рф → OnlineTours
  'clc.wtf',
  'tpx.li',
  'tpx.lu',
  'tpx.gr',
  'tp.media',
]);

const resolvedCache = new Map();
const partnerCache = new Map();

function safeUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizedHost(url) {
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

function hostMatches(host, allowed) {
  return host === allowed || host.endsWith(`.${allowed}`);
}

function brandForUrl(value) {
  const url = value instanceof URL ? value : safeUrl(value);
  if (!url) return null;
  const host = normalizedHost(url);
  return BRAND_HOSTS.find((brand) => brand.hosts.some((allowed) => hostMatches(host, allowed))) || null;
}

function unwrapTravelpayoutsUrl(value) {
  const url = value instanceof URL ? value : safeUrl(value);
  if (!url) return null;
  const host = normalizedHost(url);
  if (host !== 'tp.media') return url;
  const destination = url.searchParams.get('u');
  return destination ? safeUrl(destination) : url;
}

function isSafeRedirectHost(host) {
  return [...SAFE_REDIRECT_HOSTS].some((allowed) => hostMatches(host, allowed));
}

async function resolveBrandTarget(value) {
  if (resolvedCache.has(value)) return resolvedCache.get(value);

  const pending = (async () => {
    const original = safeUrl(value);
    if (!original) return null;
    const unwrapped = unwrapTravelpayoutsUrl(original);
    if (brandForUrl(unwrapped)) return unwrapped;

    const originalHost = normalizedHost(original);
    if (!isSafeRedirectHost(originalHost)) return null;

    try {
      const response = await fetch(original, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': 'Memora-Travel-Radar/1.0' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const finalUrl = unwrapTravelpayoutsUrl(response.url);
      return brandForUrl(finalUrl) ? finalUrl : null;
    } catch {
      return null;
    }
  })();

  resolvedCache.set(value, pending);
  return pending;
}

function linkMarker(value) {
  const url = safeUrl(value);
  return url?.searchParams.get('marker') || '';
}

function isOurLink(value) {
  const marker = linkMarker(value);
  return marker === MARKER || marker.startsWith(`${MARKER}.`);
}

function affiliateFields({ brand, partnerUrl, originalLink }) {
  const url = safeUrl(partnerUrl);
  return {
    link: partnerUrl,
    ...(partnerUrl !== originalLink ? { originalLink } : {}),
    isAffiliate: true,
    affiliateBrand: brand.name,
    affiliateProgram: brand.id,
    affiliateErid: url?.searchParams.get('erid') || null,
  };
}

async function createPartnerBatch(entries) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Token': TOKEN,
    },
    body: JSON.stringify({
      trs: Number(TRS),
      marker: Number(MARKER),
      shorten: true,
      links: entries.map(({ target, source }) => ({
        url: target.toString(),
        sub_id: `radar_${String(source || 'feed').replace(/[^a-z0-9_-]/gi, '').slice(0, 32)}`,
      })),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Travelpayouts Links API HTTP ${response.status}`);
  const resultLinks = payload?.result?.links || [];
  const output = new Map();
  for (const item of resultLinks) {
    if (item.code === 'success' && safeUrl(item.partner_url)) output.set(item.url, item.partner_url);
  }
  return output;
}

/**
 * Return deals with monetized links where the connected Travelpayouts program
 * accepts the destination. API/token/program failures preserve the source URL.
 */
export async function monetizeDeals(deals, { logger = console } = {}) {
  const input = Array.isArray(deals) ? deals : [];
  const prepared = await Promise.all(input.map(async (deal) => {
    const originalLink = deal?.link;
    const unwrapped = unwrapTravelpayoutsUrl(originalLink);
    const existingBrand = brandForUrl(unwrapped);

    if (existingBrand && isOurLink(originalLink)) {
      return { deal, existing: affiliateFields({ brand: existingBrand, partnerUrl: originalLink, originalLink }) };
    }
    const target = await resolveBrandTarget(originalLink);
    const brand = brandForUrl(target);
    return target && brand ? { deal, target, brand, originalLink } : { deal };
  }));

  const candidates = prepared.filter((item) => item.target && item.brand);
  if (!TOKEN || !MARKER || !TRS || candidates.length === 0) {
    return prepared.map((item) => item.existing ? { ...item.deal, ...item.existing } : item.deal);
  }

  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    const key = item.target.toString();
    if (!seen.has(key) && !partnerCache.has(key)) {
      seen.add(key);
      unique.push({ target: item.target, source: item.deal.source });
    }
  }

  let converted = 0;
  for (let index = 0; index < unique.length; index += API_BATCH_SIZE) {
    const batch = unique.slice(index, index + API_BATCH_SIZE);
    try {
      const result = await createPartnerBatch(batch);
      for (const entry of batch) {
        const key = entry.target.toString();
        const partnerUrl = result.get(key) || null;
        partnerCache.set(key, partnerUrl);
        if (partnerUrl) converted += 1;
      }
    } catch (error) {
      logger.warn?.(`Travelpayouts link conversion skipped for ${batch.length} links: ${error.message}`);
      for (const entry of batch) partnerCache.set(entry.target.toString(), null);
    }
  }

  if (unique.length > 0) logger.log?.(`Travelpayouts links: ${converted}/${unique.length} converted`);

  return prepared.map((item) => {
    if (item.existing) return { ...item.deal, ...item.existing };
    if (!item.target || !item.brand) return item.deal;
    const partnerUrl = partnerCache.get(item.target.toString());
    return partnerUrl
      ? { ...item.deal, ...affiliateFields({ brand: item.brand, partnerUrl, originalLink: item.originalLink }) }
      : item.deal;
  });
}

export const affiliateConfig = {
  enabled: Boolean(TOKEN && MARKER && TRS),
  marker: MARKER,
  trs: TRS,
};

export {
  brandForUrl, resolveBrandTarget, unwrapTravelpayoutsUrl,
};
