import bundledTokens from './tokens.json';

type Tokens = Record<string, string>;

const PUBLIC_TOKENS_URL = 'https://memorasolutions.ru/api/pomodoro/tokens';

function setTokens(tokens: Tokens): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === 'string' && value.trim()) {
      root.style.setProperty(`--${key}`, value);
    }
  }
}

/**
 * Сначала синхронно применяем токены из сборки, чтобы интерфейс не мигал.
 * Затем тихо подтягиваем опубликованные значения из общей админки. Поэтому
 * web и desktop получают одну раскладку, но остаются рабочими без интернета.
 */
export function applyTokens(): void {
  setTokens(bundledTokens as Tokens);

  const url = window.location.protocol === 'http:' || window.location.protocol === 'https:'
    ? `${window.location.origin}/api/pomodoro/tokens`
    : PUBLIC_TOKENS_URL;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4_000);

  fetch(url, { cache: 'no-store', signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`tokens: ${response.status}`);
      return response.json() as Promise<Tokens>;
    })
    .then(setTokens)
    .catch(() => { /* offline: bundled tokens remain active */ })
    .finally(() => window.clearTimeout(timeout));
}
