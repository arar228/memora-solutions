// Small pure formatting helpers for Travel Radar 3.0.

export const fmtPrice = (n, lang) =>
    Math.round(Number(n) || 0).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US') + ' ₽';

// 'YYYY-MM-DD' (or ISO) → 'DD.MM'
export const fmtDay = (s) => {
    const d = String(s || '').slice(0, 10);
    return d.length >= 10 ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : (s || '');
};

// dates range label: '17.07 → 24.08' or just '17.07'
export const fmtDates = (dep, ret) => (ret ? `${fmtDay(dep)} → ${fmtDay(ret)}` : fmtDay(dep));

export const pct = (d) => Math.round((Number(d) || 0) * 100);
