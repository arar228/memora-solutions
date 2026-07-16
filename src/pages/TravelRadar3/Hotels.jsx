import { useState, useRef, useEffect } from 'react';
import { Hotel, ExternalLink, Search, X } from 'lucide-react';
import { visaInfo } from './visaDestinations';

// Popular visa-free hotel destinations (IATA). Each card links to a hotel
// search for that city carrying our affiliate marker.
const HOTEL_DESTS = ['AYT', 'DXB', 'HKT', 'HRG', 'SSH', 'IST', 'DPS', 'MLE', 'BUS', 'ZNZ', 'BKK', 'CXR'];
const MARKER = '748397';

// City autocomplete (public Travelpayouts endpoint, no key).
async function cityAutocomplete(term, locale) {
    try {
        const u = new URL('https://autocomplete.travelpayouts.com/places2');
        u.searchParams.set('term', term);
        u.searchParams.set('locale', locale);
        u.searchParams.append('types[]', 'city');
        const r = await fetch(u);
        if (!r.ok) return [];
        const data = await r.json();
        return (Array.isArray(data) ? data : []).slice(0, 6);
    } catch { return []; }
}

// search.hotellook.com search link (keeps our marker), for any destination.
function hotelSearchLink(destination) {
    const p = (n) => String(n).padStart(2, '0');
    const local = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const checkIn = new Date(Date.now() + 30 * 864e5);
    const checkOut = new Date(Date.now() + 37 * 864e5);
    const u = new URL('https://search.hotellook.com/');
    u.searchParams.set('destination', destination);
    u.searchParams.set('checkIn', local(checkIn));
    u.searchParams.set('checkOut', local(checkOut));
    u.searchParams.set('adults', '2');
    u.searchParams.set('currency', 'rub');
    u.searchParams.set('language', 'ru');
    u.searchParams.set('marker', MARKER);
    return u.toString();
}

// Type-your-own-city hotel search with autocomplete.
function HotelSearchBar({ lang, s }) {
    const [q, setQ] = useState('');
    const [opts, setOpts] = useState([]);
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);

    useEffect(() => {
        if (!open || q.trim().length < 2) { setOpts([]); return; }
        const t = setTimeout(async () => setOpts(await cityAutocomplete(q.trim(), lang)), 220);
        return () => clearTimeout(t);
    }, [q, open, lang]);

    useEffect(() => {
        const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const go = (dest) => {
        const d = (dest ?? q).trim();
        if (!d) return;
        window.open(hotelSearchLink(d), '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="rd4-hsearch" ref={boxRef}>
            <div className="rd4-hsearch__field">
                <Search size={16} aria-hidden="true" />
                <input
                    type="text"
                    value={q}
                    placeholder={s.hotelSearchPh}
                    onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setOpen(false); go(); } }}
                />
                {q && (
                    <button type="button" className="rd4-hsearch__clear" onClick={() => { setQ(''); setOpts([]); }} aria-label="×">
                        <X size={14} aria-hidden="true" />
                    </button>
                )}
                {open && opts.length > 0 && (
                    <ul className="rd4-ac">
                        {opts.map((o) => (
                            <li key={`${o.code}-${o.name}`} onMouseDown={() => { setQ(o.name); setOpen(false); go(o.name); }}>
                                <span className="rd4-ac__code">{o.code}</span>
                                <span className="rd4-ac__name">
                                    {o.name}
                                    {o.country_name ? <em>{o.country_name}</em> : null}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <button type="button" className="rd4-searchbtn rd4-hsearch__btn" onClick={() => go()}>
                <Hotel size={16} aria-hidden="true" /> {s.findHotels}
            </button>
        </div>
    );
}

// Dark-themed hotel search (own city) + cards for popular destinations.
export default function Hotels({ lang, s }) {
    const cards = HOTEL_DESTS.map((code) => visaInfo(code)).filter(Boolean);
    return (
        <div>
            <HotelSearchBar lang={lang} s={s} />
            <div className="radar3-hotels">
                {cards.map((d) => (
                    <a
                        key={d.code}
                        href={hotelSearchLink(d.city.en)}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="radar3-hotelcard"
                    >
                        <div className="radar3-hotelcard__body">
                            <span className="radar3-hotelcard__flag" aria-hidden="true">{d.flag}</span>
                            <span className="radar3-hotelcard__city">{d.city[lang] || d.city.en}</span>
                            <span className="radar3-hotelcard__country">{d.country[lang] || d.country.en}</span>
                        </div>
                        <span className="radar3-hotelcard__cta">
                            <Hotel size={14} aria-hidden="true" /> {s.findHotels}
                            <ExternalLink size={12} aria-hidden="true" />
                        </span>
                    </a>
                ))}
            </div>
        </div>
    );
}
