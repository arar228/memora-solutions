import { Hotel, ExternalLink } from 'lucide-react';

// Hotels: affiliate search links only (Hotellook price API is discontinued, so
// there are no live hotel prices to show — just city hotel-search links).
export default function Hotels({ cities, lang, s }) {
    if (!cities || cities.length === 0) return null;
    return (
        <div className="radar3-grid radar3-grid--hotels">
            {cities.map((c) => (
                <a
                    key={c.code}
                    href={c.link}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="radar3-card radar3-card--hotel"
                >
                    <div className="radar3-hotel__top">
                        <Hotel size={16} aria-hidden="true" />
                        <span className="radar3-hotel__city">{c.name?.[lang] || c.code}</span>
                    </div>
                    <span className="radar3-buy radar3-buy--ghost">
                        <ExternalLink size={13} aria-hidden="true" /> {s.hotelFind}
                    </span>
                </a>
            ))}
        </div>
    );
}
