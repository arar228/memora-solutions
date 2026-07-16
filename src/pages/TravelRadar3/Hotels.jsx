import { Hotel, ExternalLink } from 'lucide-react';
import { visaInfo } from './visaDestinations';

// Popular visa-free hotel destinations (IATA). Each card links to a hotel
// search for that city carrying our affiliate marker.
const HOTEL_DESTS = ['AYT', 'DXB', 'HKT', 'HRG', 'SSH', 'IST', 'DPS', 'MLE', 'BUS', 'ZNZ', 'BKK', 'CXR'];

const MARKER = '748397';

// search.hotellook.com search link (302 → hotel meta-search, keeps our marker).
function hotelSearchLink(cityEn) {
    const p = (n) => String(n).padStart(2, '0');
    const local = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const checkIn = new Date(Date.now() + 30 * 864e5);
    const checkOut = new Date(Date.now() + 37 * 864e5);
    const u = new URL('https://search.hotellook.com/');
    u.searchParams.set('destination', cityEn);
    u.searchParams.set('checkIn', local(checkIn));
    u.searchParams.set('checkOut', local(checkOut));
    u.searchParams.set('adults', '2');
    u.searchParams.set('currency', 'rub');
    u.searchParams.set('language', 'ru');
    u.searchParams.set('marker', MARKER);
    return u.toString();
}

// Dark-themed hotel cards by destination — replaces the bright embedded widget.
export default function Hotels({ lang, s }) {
    const cards = HOTEL_DESTS.map((code) => visaInfo(code)).filter(Boolean);
    return (
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
    );
}
