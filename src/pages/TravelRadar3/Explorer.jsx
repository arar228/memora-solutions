import { useState } from 'react';
import { Search, ExternalLink, X, ArrowDownUp } from 'lucide-react';
import { fmtPrice, fmtDates } from './helpers';
import { transfersLabel, visaShort } from './strings';
import { visaInfo, REGIONS, TRIP_TYPES } from './visaDestinations';

// Budget presets (₽). 0 = any.
const BUDGETS = [15000, 30000, 50000];

// Destination explorer — the "where can I fly?" tool. Pick an origin city, then
// narrow the visa-free destinations by region, trip type, budget or a search.
export default function Explorer({ cities, lang, s }) {
    const withItems = (cities || []).filter((c) => c.items && c.items.length > 0);
    const [active, setActive] = useState(0);
    const [region, setRegion] = useState('all');
    const [tripType, setTripType] = useState('all');
    const [budget, setBudget] = useState(0); // 0 = any
    const [query, setQuery] = useState('');
    const [sortDesc, setSortDesc] = useState(false); // false = cheapest first

    const idx = Math.min(active, Math.max(0, withItems.length - 1));
    const city = withItems[idx];

    const results = (() => {
        if (!city) return [];
        const q = query.trim().toLowerCase();
        const rows = (city.items || [])
            .map((it) => ({ ...it, info: visaInfo(it.destination) }))
            .filter((r) => r.info); // keep only cataloged (visa-free) destinations
        const filtered = rows.filter((r) => {
            if (region !== 'all' && r.info.region !== region) return false;
            if (tripType !== 'all' && r.info.type !== tripType) return false;
            if (budget && r.price > budget) return false;
            if (q) {
                const hay = `${r.destName?.[lang] || ''} ${r.info.city?.[lang] || ''} ${r.info.country?.ru || ''} ${r.info.country?.en || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
        filtered.sort((a, b) => (sortDesc ? b.price - a.price : a.price - b.price));
        return filtered;
    })();

    if (withItems.length === 0) return null;

    const anyFilter = region !== 'all' || tripType !== 'all' || Boolean(budget) || query.trim() !== '';
    const reset = () => { setRegion('all'); setTripType('all'); setBudget(0); setQuery(''); };

    return (
        <div className="rx">
            {/* Origin + search */}
            <div className="rx-controls">
                <div className="radar3-selectrow rx-origin">
                    <label className="radar3-chips__label" htmlFor="rx-origin">{s.from}:</label>
                    <select
                        id="rx-origin"
                        className="radar3-select"
                        value={idx}
                        onChange={(e) => setActive(Number(e.target.value))}
                    >
                        {withItems.map((c, i) => (
                            <option key={c.code} value={i}>{c.name?.[lang] || c.code}</option>
                        ))}
                    </select>
                </div>
                <div className="rx-search">
                    <Search size={15} aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={s.searchPlaceholder}
                        aria-label={s.searchPlaceholder}
                    />
                    {query && (
                        <button className="rx-search__clear" onClick={() => setQuery('')} aria-label={s.reset}>
                            <X size={14} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="rx-filters">
                <div className="rx-fgroup">
                    <span className="rx-flabel">{s.fRegion}</span>
                    <div className="rx-chips">
                        <button className={`rx-chip ${region === 'all' ? 'on' : ''}`} onClick={() => setRegion('all')}>{s.fAll}</button>
                        {REGIONS.map((r) => (
                            <button key={r.key} className={`rx-chip ${region === r.key ? 'on' : ''}`} onClick={() => setRegion(r.key)}>{r[lang]}</button>
                        ))}
                    </div>
                </div>
                <div className="rx-fgroup">
                    <span className="rx-flabel">{s.fType}</span>
                    <div className="rx-chips">
                        <button className={`rx-chip ${tripType === 'all' ? 'on' : ''}`} onClick={() => setTripType('all')}>{s.fAll}</button>
                        {TRIP_TYPES.map((t) => (
                            <button key={t.key} className={`rx-chip ${tripType === t.key ? 'on' : ''}`} onClick={() => setTripType(t.key)}>{t.emoji} {t[lang]}</button>
                        ))}
                    </div>
                </div>
                <div className="rx-fgroup">
                    <span className="rx-flabel">{s.fBudget}</span>
                    <div className="rx-chips">
                        <button className={`rx-chip ${!budget ? 'on' : ''}`} onClick={() => setBudget(0)}>{s.fAny}</button>
                        {BUDGETS.map((b) => (
                            <button key={b} className={`rx-chip ${budget === b ? 'on' : ''}`} onClick={() => setBudget(b)}>{s.upTo} {fmtPrice(b, lang)}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Result bar */}
            <div className="rx-resultbar">
                <span className="rx-count">{s.found}: <b>{results.length}</b></span>
                <div className="rx-actions">
                    <button className="rx-sortbtn" onClick={() => setSortDesc((v) => !v)}>
                        <ArrowDownUp size={13} aria-hidden="true" /> {sortDesc ? s.sortDesc : s.sortAsc}
                    </button>
                    {anyFilter && (
                        <button className="rx-reset" onClick={reset}>
                            <X size={13} aria-hidden="true" /> {s.reset}
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            {results.length === 0 ? (
                <p className="radar3-empty">{s.rxEmpty}</p>
            ) : (
                <div className="radar3-grid radar3-grid--cheap">
                    {results.map((it, i) => (
                        <a
                            key={`${it.destination}-${i}`}
                            href={it.link}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="radar3-card radar3-card--cheap"
                        >
                            <div className="radar3-card__top">
                                <span className="rx-cardmeta">
                                    <span className="rx-flag" aria-hidden="true">{it.info.flag}</span>
                                    {it.info.country?.[lang]}
                                </span>
                                <span className={`radar3-visa radar3-visa--${it.info.visa}`} title={it.info.note?.[lang] || ''}>
                                    {visaShort(it.info.visa, s)}
                                </span>
                            </div>
                            <div className="rx-dest">{it.destName?.[lang] || it.destination}</div>
                            <div className="radar3-price-row">
                                <span className="radar3-price-from">{s.fromPrice}</span>
                                <span className="radar3-price">{fmtPrice(it.price, lang)}</span>
                            </div>
                            <div className="radar3-meta">
                                {fmtDates(it.depart_date, it.return_date)} · {transfersLabel(it.transfers, lang, s)}
                            </div>
                            <span className="radar3-buy radar3-buy--ghost">
                                <ExternalLink size={13} aria-hidden="true" /> {s.buy}
                            </span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
