import { Hotel, Ticket, ExternalLink } from 'lucide-react';

// Booking partners — affiliate short links (tpx.gr) carrying marker 748397,
// verified live (302 → vendor with our attribution). These verticals have NO
// price API (only flights + the now-closed Hotellook did), so they are vendor
// links, not a live price feed. To add/replace: generate the link in TP
// (program → «Ссылки») and paste it here. (Kept inline in the component to
// avoid a partners.js / Partners.jsx case collision on case-insensitive FS.)
const PARTNERS = [
    {
        key: 'stay',
        icon: 'hotel',
        title: { ru: 'Отели и жильё', en: 'Hotels & stays' },
        items: [
            { name: 'Островок', url: 'https://ostrovok.tpx.gr/hNufxzWm' },
            { name: 'Суточно.ру', url: 'https://sutochno.tpx.gr/GpFGHGCz' },
            { name: 'Яндекс Путешествия', url: 'https://yandex.tpx.gr/JT6O6DFZ' },
            { name: 'Avito Путешествия', url: 'https://avito.tpx.gr/bNAvjcvf' },
        ],
    },
    {
        key: 'tours',
        icon: 'ticket',
        title: { ru: 'Экскурсии и активности', en: 'Tours & activities' },
        items: [
            { name: 'Трипстер', url: 'https://tripster.tpx.gr/DWvu8aIU' },
            { name: 'Sputnik8', url: 'https://sputnik8.tpx.gr/v1gXh4nK' },
        ],
    },
];

const ICONS = { hotel: Hotel, ticket: Ticket };

export default function Partners({ lang }) {
    return (
        <div className="radar3-partners">
            {PARTNERS.map((group) => {
                const Icon = ICONS[group.icon] || Hotel;
                return (
                    <div key={group.key} className="radar3-pgroup">
                        <div className="radar3-pgroup__head">
                            <Icon size={16} aria-hidden="true" />
                            <span>{group.title[lang] || group.title.en}</span>
                        </div>
                        <div className="radar3-pgroup__items">
                            {group.items.map((it) => (
                                <a
                                    key={it.name}
                                    href={it.url}
                                    target="_blank"
                                    rel="noopener noreferrer sponsored"
                                    className="radar3-vendor"
                                >
                                    <span className="radar3-vendor__name">{it.name}</span>
                                    <ExternalLink size={14} aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
