import { useState, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { fmtPrice, fmtDay } from './helpers';

// Price-per-date heatmap with an origin → destination selector across every
// route we have a calendar for.
export default function PriceCalendar({ calendars, lang, s }) {
    const list = useMemo(() => calendars || [], [calendars]);

    // Distinct origins in first-seen order.
    const origins = useMemo(() => {
        const seen = new Map();
        for (const c of list) if (!seen.has(c.origin)) seen.set(c.origin, c.originName);
        return [...seen.entries()].map(([code, name]) => ({ code, name }));
    }, [list]);

    const [originCode, setOriginCode] = useState(null);
    const [destCode, setDestCode] = useState(null);

    const activeOrigin = origins.some((o) => o.code === originCode) ? originCode : origins[0]?.code;
    const dests = useMemo(() => list.filter((c) => c.origin === activeOrigin), [list, activeOrigin]);
    const cal = dests.find((c) => c.destination === destCode) || dests[0];

    if (!list.length || !cal) return null;
    const { days, cheapest } = cal;

    return (
        <div>
            {origins.length > 1 && (
                <div className="radar3-selectrow">
                    <label className="radar3-chips__label" htmlFor="cal-origin">{s.from}:</label>
                    <select
                        id="cal-origin"
                        className="radar3-select"
                        value={activeOrigin || ''}
                        onChange={(e) => { setOriginCode(e.target.value); setDestCode(null); }}
                    >
                        {origins.map((o) => (
                            <option key={o.code} value={o.code}>{o.name?.[lang] || o.code}</option>
                        ))}
                    </select>
                </div>
            )}

            {dests.length > 1 && (
                <div className="radar3-selectrow">
                    <label className="radar3-chips__label" htmlFor="cal-dest">{s.direction}:</label>
                    <select
                        id="cal-dest"
                        className="radar3-select"
                        value={cal.destination}
                        onChange={(e) => setDestCode(e.target.value)}
                    >
                        {dests.map((c) => (
                            <option key={c.destination} value={c.destination}>{c.destName?.[lang] || c.destination}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="radar3-cal__route">
                {cal.originName?.[lang] || cal.origin}
                <ArrowRight size={15} aria-hidden="true" />
                {cal.destName?.[lang] || cal.destination}
            </div>

            <div className="radar3-cal__grid">
                {days.map((d, i) => (
                    <a
                        key={`${d.date}-${i}`}
                        href={d.link}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className={`radar3-cal__cell radar3-cal__cell--${d.level} ${cheapest && d.date === cheapest.date ? 'is-cheapest' : ''}`}
                        title={`${fmtDay(d.date)} · ${fmtPrice(d.price, lang)}`}
                    >
                        <span className="radar3-cal__day">{fmtDay(d.date)}</span>
                        <span className="radar3-cal__price">{fmtPrice(d.price, lang)}</span>
                    </a>
                ))}
            </div>

            <div className="radar3-cal__legend">
                <span><i className="dot dot--cheap" aria-hidden="true" /> {s.legendCheap}</span>
                <span><i className="dot dot--mid" aria-hidden="true" /> {s.legendMid}</span>
                <span><i className="dot dot--exp" aria-hidden="true" /> {s.legendExp}</span>
                {cheapest && (
                    <span className="radar3-cal__cheapest">
                        {s.cheapest}: {fmtDay(cheapest.date)} — {fmtPrice(cheapest.price, lang)}
                    </span>
                )}
            </div>
        </div>
    );
}
