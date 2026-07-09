import { useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { fmtPrice, fmtDates } from './helpers';
import { transfersLabel } from './strings';

// Origin selector + cheapest destinations from the selected city.
export default function CheapFrom({ cities, lang, s }) {
    const [active, setActive] = useState(0);
    const withItems = (cities || []).filter((c) => c.items && c.items.length > 0);
    if (withItems.length === 0) return null;
    const idx = Math.min(active, withItems.length - 1);
    const city = withItems[idx];

    return (
        <div>
            <div className="radar3-chips">
                <span className="radar3-chips__label">{s.from}:</span>
                {withItems.map((c, i) => (
                    <button
                        key={c.code}
                        className={`radar3-chip ${i === idx ? 'radar3-chip--active' : ''}`}
                        onClick={() => setActive(i)}
                    >
                        {c.name?.[lang] || c.code}
                    </button>
                ))}
            </div>
            <div className="radar3-grid radar3-grid--cheap">
                {(city.items || []).map((it, i) => (
                    <a
                        key={`${it.destination}-${i}`}
                        href={it.link}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="radar3-card radar3-card--cheap"
                    >
                        <div className="radar3-card__top">
                            <span className="radar3-dest">
                                <MapPin size={14} aria-hidden="true" /> {it.destName?.[lang] || it.destination}
                            </span>
                        </div>
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
        </div>
    );
}
