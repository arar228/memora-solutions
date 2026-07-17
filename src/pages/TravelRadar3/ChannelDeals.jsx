import { useState, useEffect, useMemo } from 'react';
import { Flame, ArrowRight, ExternalLink } from 'lucide-react';
import { fmtPrice } from './helpers';

// Hot flight deals scraped & structured from travel Telegram channels
// (public/hot-deals.json), rebuilt with our Aviasales affiliate link.
export default function ChannelDeals({ lang, s }) {
    const [deals, setDeals] = useState(null);
    const [city, setCity] = useState('all');

    useEffect(() => {
        let cancelled = false;
        fetch('/hot-deals.json', { cache: 'no-cache' })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no feed'))))
            .then((d) => { if (!cancelled) setDeals((d.deals || []).filter((x) => x.type === 'flight')); })
            .catch(() => { if (!cancelled) setDeals([]); });
        return () => { cancelled = true; };
    }, []);

    const cities = useMemo(() => {
        const m = new Map();
        (deals || []).forEach((d) => m.set(d.from.code, d.from.name));
        return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [deals]);

    const shown = useMemo(
        () => (deals || []).filter((d) => city === 'all' || d.from.code === city),
        [deals, city],
    );

    if (!deals || deals.length === 0) return null;

    return (
        <section className="radar3-panel">
            <div className="radar3-sec-head">
                <Flame size={18} aria-hidden="true" />
                <h2>{s.channelTitle}</h2>
            </div>
            <p className="radar3-sec-desc">{s.channelDesc}</p>
            <div className="radar3-selectrow">
                <label className="radar3-chips__label" htmlFor="cd-city">{s.from}:</label>
                <select id="cd-city" className="radar3-select" value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="all">{s.allCities}</option>
                    {cities.map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                    ))}
                </select>
            </div>

            <div className="radar3-grid radar3-grid--hot">
                {shown.map((d, i) => (
                    <a
                        key={`${d.from.code}-${d.to.code}-${i}`}
                        href={d.link}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="radar3-card radar3-card--hot"
                    >
                        <div className="radar3-card__top">
                            <span className="radar3-route">
                                <span className="radar3-route__from">
                                    {d.from.name}
                                    <ArrowRight size={13} aria-hidden="true" />
                                </span>
                                <span className="radar3-route__to">{d.to.name}</span>
                            </span>
                            {d.discount ? (
                                <span className="radar3-badge radar3-badge--hot">
                                    <Flame size={12} aria-hidden="true" /> −{Math.round(d.discount * 100)}%
                                </span>
                            ) : null}
                        </div>
                        <div className="radar3-price-row">
                            <span className="radar3-price-from">{s.fromPrice}</span>
                            <span className="radar3-price">{fmtPrice(d.price, lang)}</span>
                            {d.oneway && <span className="radar3-price-old">{s.oneway}</span>}
                        </div>
                        <div className="radar3-meta">@{d.source}</div>
                        <span className="radar3-buy"><ExternalLink size={14} aria-hidden="true" /> {s.buy}</span>
                    </a>
                ))}
            </div>
        </section>
    );
}
