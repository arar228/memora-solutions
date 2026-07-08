import { Flame, ArrowRight, ExternalLink } from 'lucide-react';
import { fmtPrice, fmtDates, pct } from './helpers';
import { transfersLabel } from './strings';

// Cheapest recent tickets, scored by discount vs the route median.
export default function HotFlights({ items, lang, s }) {
    if (!items || items.length === 0) {
        return <p className="radar3-empty">{s.hotEmpty}</p>;
    }
    return (
        <div className="radar3-grid radar3-grid--hot">
            {items.map((f, i) => (
                <a
                    key={`${f.origin}-${f.destination}-${i}`}
                    href={f.link}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="radar3-card radar3-card--hot"
                >
                    <div className="radar3-card__top">
                        <span className="radar3-route">
                            {f.originName?.[lang] || f.origin}
                            <ArrowRight size={14} aria-hidden="true" />
                            {f.destName?.[lang] || f.destination}
                        </span>
                        <span className="radar3-badge radar3-badge--hot">
                            <Flame size={12} aria-hidden="true" /> −{pct(f.discount)}%
                        </span>
                    </div>
                    <div className="radar3-price-row">
                        <span className="radar3-price">{fmtPrice(f.price, lang)}</span>
                        <span className="radar3-price-old">{s.usually} {fmtPrice(f.median, lang)}</span>
                    </div>
                    <div className="radar3-meta">
                        {fmtDates(f.depart_date, f.return_date)} · {transfersLabel(f.transfers, lang, s)}
                    </div>
                    <span className="radar3-buy"><ExternalLink size={14} aria-hidden="true" /> {s.buy}</span>
                </a>
            ))}
        </div>
    );
}
