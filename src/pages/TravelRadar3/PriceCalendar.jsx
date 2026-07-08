import { ArrowRight } from 'lucide-react';
import { fmtPrice, fmtDay } from './helpers';

// Price-per-date heatmap for a featured route (cheap / mid / expensive).
export default function PriceCalendar({ calendar, lang, s }) {
    if (!calendar || !calendar.days || calendar.days.length === 0) return null;
    const { days, cheapest } = calendar;

    return (
        <div>
            <div className="radar3-cal__route">
                {calendar.originName?.[lang] || calendar.origin}
                <ArrowRight size={15} aria-hidden="true" />
                {calendar.destName?.[lang] || calendar.destination}
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
                        <span className="radar3-cal__price">{Math.round(d.price / 1000)}k</span>
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
