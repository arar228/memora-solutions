import { useState, useEffect, useMemo } from 'react';
import { Luggage, Flame, ArrowRight, ExternalLink, Moon, CalendarDays, Route } from 'lucide-react';
import { fmtPrice } from './helpers';
import { visaInfo } from './visaDestinations';
import { visaShort } from './strings';

// Горящие туры — the manager's core module. Flow: user picks the DEPARTURE
// CITY first and immediately sees hot tours (savings-first, date optional).
// The «готов к стыковкам» toggle adds tours departing from OTHER cities,
// chained with a domestic flight leg (Питер → Москва → Анталия) whenever the
// leg does not eat the tour's savings. Legs are priced from radar.json's
// stitchLegs (when the feed has them) and always link to Aviasales with our
// marker.
const MARKER = '748397';

function legAviaLink(from, to, departDate) {
    let ddmm;
    if (departDate && departDate.length >= 10) {
        ddmm = departDate.slice(8, 10) + departDate.slice(5, 7);
    } else {
        const dt = new Date(Date.now() + 30 * 864e5);
        const p = (n) => String(n).padStart(2, '0');
        ddmm = p(dt.getDate()) + p(dt.getMonth() + 1);
    }
    const u = new URL(`https://www.aviasales.ru/search/${from}${ddmm}${to}1`);
    u.searchParams.set('marker', MARKER);
    u.searchParams.set('currency', 'rub');
    return u.toString();
}

const MONTH_RU = ['', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTH_EN = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function monthLabel(ym, lang) {
    const [y, m] = ym.split('-').map(Number);
    return `${(lang === 'ru' ? MONTH_RU : MONTH_EN)[m] || ym} ${y}`;
}

export default function HotTours({ cities, stitchLegs, lang, s }) {
    const [tours, setTours] = useState(null);
    const [city, setCity] = useState('MOW');
    const [stitch, setStitch] = useState(false);
    const [month, setMonth] = useState('all');
    const [dest, setDest] = useState('all');

    useEffect(() => {
        let cancelled = false;
        fetch('/hot-deals.json', { cache: 'no-cache' })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no feed'))))
            .then((d) => { if (!cancelled) setTours((d.deals || []).filter((x) => x.type === 'tour')); })
            .catch(() => { if (!cancelled) setTours([]); });
        return () => { cancelled = true; };
    }, []);

    // Departure-city options: every radar city + any tour departure city.
    const cityOptions = useMemo(() => {
        const m = new Map();
        (cities || []).forEach((c) => m.set(c.code, c.name?.[lang] || c.code));
        (tours || []).forEach((t) => { if (!m.has(t.from.code)) m.set(t.from.code, t.from.name); });
        return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], lang));
    }, [cities, tours, lang]);
    const cityName = useMemo(
        () => cityOptions.find(([code]) => code === city)?.[1] || city,
        [cityOptions, city],
    );

    // Cheapest domestic leg city→hub from the radar feed.
    const legIndex = useMemo(() => {
        const m = new Map();
        (stitchLegs || []).forEach((l) => {
            const k = `${l.origin}-${l.dest}`;
            if (!m.has(k) || l.price < m.get(k).price) m.set(k, l);
        });
        return m;
    }, [stitchLegs]);

    // Direct tours + (optionally) stitched ones from other cities.
    const shown = useMemo(() => {
        if (!tours) return [];
        const direct = tours
            .filter((t) => t.from.code === city)
            .map((t) => ({ ...t, leg: null }));
        let stitched = [];
        if (stitch) {
            stitched = tours
                .filter((t) => t.from.code !== city)
                .map((t) => {
                    const leg = legIndex.get(`${city}-${t.from.code}`) || null;
                    const legPrice = leg ? leg.price : null;
                    // A leg that eats the whole savings kills the deal.
                    if (legPrice != null && t.savings != null && legPrice >= t.savings) return null;
                    return {
                        ...t,
                        leg: {
                            price: legPrice,
                            link: leg?.link || legAviaLink(city, t.from.code, t.departDate),
                        },
                    };
                })
                .filter(Boolean);
        }
        return [...direct, ...stitched]
            .filter((t) => month === 'all' || !t.departDate || t.departDate.startsWith(month))
            .filter((t) => dest === 'all' || t.to.code === dest)
            .sort((a, b) => {
                const sav = (t) => (t.savings ?? 0) - (t.leg?.price ?? 0);
                return sav(b) - sav(a)
                    || (b.discount || 0) - (a.discount || 0)
                    || (a.price + (a.leg?.price || 0)) - (b.price + (b.leg?.price || 0));
            });
    }, [tours, city, stitch, legIndex, month, dest]);

    const months = useMemo(() => {
        const set = new Set();
        (tours || []).forEach((t) => { if (t.departDate) set.add(t.departDate.slice(0, 7)); });
        return [...set].sort();
    }, [tours]);
    const dests = useMemo(() => {
        const m = new Map();
        (tours || []).forEach((t) => m.set(t.to.code, t.to.name));
        return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], lang));
    }, [tours, lang]);

    if (!tours) return null;

    return (
        <section className="radar3-panel">
            <div className="radar3-sec-head">
                <Luggage size={18} aria-hidden="true" />
                <h2>{s.toursTitle}</h2>
            </div>
            <p className="radar3-sec-desc">{s.toursDesc}</p>

            <div className="rt-controls">
                <div className="radar3-selectrow">
                    <label className="radar3-chips__label" htmlFor="rt-city">{s.from}:</label>
                    <select id="rt-city" className="radar3-select" value={city} onChange={(e) => setCity(e.target.value)}>
                        {cityOptions.map(([code, name]) => (
                            <option key={code} value={code}>{name}</option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    className={`rt-stitch${stitch ? ' on' : ''}`}
                    aria-pressed={stitch}
                    onClick={() => setStitch(!stitch)}
                >
                    <Route size={15} aria-hidden="true" /> {s.stitchBtn}
                </button>
                <div className="radar3-selectrow">
                    <label className="radar3-chips__label" htmlFor="rt-month">{s.fMonth}:</label>
                    <select id="rt-month" className="radar3-select" value={month} onChange={(e) => setMonth(e.target.value)}>
                        <option value="all">{s.fAny}</option>
                        {months.map((m) => <option key={m} value={m}>{monthLabel(m, lang)}</option>)}
                    </select>
                </div>
                <div className="radar3-selectrow">
                    <label className="radar3-chips__label" htmlFor="rt-dest">{s.direction}:</label>
                    <select id="rt-dest" className="radar3-select" value={dest} onChange={(e) => setDest(e.target.value)}>
                        <option value="all">{s.fAll}</option>
                        {dests.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                </div>
            </div>

            {shown.length === 0 ? (
                <p className="radar3-empty">{stitch ? s.toursEmptyStitched : s.toursEmpty}</p>
            ) : (
                <div className="radar3-grid radar3-grid--hot">
                    {shown.map((t, i) => {
                        const vi = visaInfo(t.to.code);
                        const total = t.price + (t.leg?.price || 0);
                        const netSavings = t.savings != null ? t.savings - (t.leg?.price || 0) : null;
                        return (
                            <a
                                key={`${t.from.code}-${t.to.code}-${t.price}-${i}`}
                                href={t.link}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                className="radar3-card radar3-card--hot rt-card"
                            >
                                <div className="radar3-card__top">
                                    <span className="radar3-route">
                                        <span className="radar3-route__from">
                                            {t.leg ? cityName : t.from.name}
                                            <ArrowRight size={13} aria-hidden="true" />
                                            {t.leg && (
                                                <>
                                                    {t.from.name}
                                                    <ArrowRight size={13} aria-hidden="true" />
                                                </>
                                            )}
                                        </span>
                                        <span className="radar3-route__to">{vi?.flag ? `${vi.flag} ` : ''}{t.to.name}</span>
                                    </span>
                                    {netSavings > 0 ? (
                                        <span className="radar3-badge radar3-badge--hot">
                                            <Flame size={12} aria-hidden="true" /> −{fmtPrice(netSavings, lang)}
                                        </span>
                                    ) : t.discount ? (
                                        <span className="radar3-badge radar3-badge--hot">
                                            <Flame size={12} aria-hidden="true" /> −{Math.round(t.discount * 100)}%
                                        </span>
                                    ) : null}
                                </div>

                                <div className="radar3-price-row">
                                    <span className="radar3-price-from">{s.fromPrice}</span>
                                    <span className="radar3-price">{fmtPrice(total, lang)}</span>
                                    {t.oldPrice && !t.leg && (
                                        <span className="radar3-price-old">{fmtPrice(t.oldPrice, lang)}</span>
                                    )}
                                </div>

                                {t.leg && (
                                    <div className="rt-leg">
                                        <Route size={13} aria-hidden="true" />
                                        {t.leg.price != null
                                            ? `${s.legLabel} ${cityName} → ${t.from.name}: ~${fmtPrice(t.leg.price, lang)}`
                                            : `${s.legLabel} ${cityName} → ${t.from.name}: ${s.legUnknown}`}
                                        {' · '}
                                        <span
                                            role="link"
                                            tabIndex={0}
                                            className="rt-leg__link"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(t.leg.link, '_blank', 'noopener,noreferrer'); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); window.open(t.leg.link, '_blank', 'noopener,noreferrer'); } }}
                                        >
                                            {s.legTicket}
                                        </span>
                                    </div>
                                )}

                                <div className="radar3-meta rt-meta">
                                    {t.nights && <span><Moon size={12} aria-hidden="true" /> {t.nights} {s.nights}</span>}
                                    {t.departDate && (
                                        <span><CalendarDays size={12} aria-hidden="true" /> {t.departDate.length === 7 ? monthLabel(t.departDate, lang) : t.departDate.split('-').reverse().join('.')}</span>
                                    )}
                                    {vi && (
                                        <span className={`rt-visa rt-visa--${vi.visa}`}>{visaShort(vi.visa, s)}</span>
                                    )}
                                </div>
                                {vi?.note?.[lang] && <div className="rt-note">{vi.note[lang]}</div>}

                                <span className="radar3-buy">
                                    <ExternalLink size={14} aria-hidden="true" /> {s.tourBook} · @{t.source}
                                </span>
                            </a>
                        );
                    })}
                </div>
            )}
            <p className="rt-foot">{s.toursFoot}</p>
        </section>
    );
}
