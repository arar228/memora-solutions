import {
    BedDouble, CarFront, Car, TrainFront, Palmtree, Ticket, ShieldCheck, Smartphone, ExternalLink,
} from 'lucide-react';
import { VERTICALS } from './verticals';

const ICONS = {
    bed: BedDouble,
    'car-front': CarFront,
    car: Car,
    train: TrainFront,
    palmtree: Palmtree,
    ticket: Ticket,
    shield: ShieldCheck,
    smartphone: Smartphone,
};

// Directory of every travel vertical + its Travelpayouts partner brands.
export default function Services({ lang, s }) {
    return (
        <div className="rd4-services">
            {VERTICALS.map((v) => {
                const Icon = ICONS[v.icon] || Ticket;
                const active = v.partners.filter((p) => p.url);
                const soon = v.partners.filter((p) => !p.url);
                return (
                    <div key={v.key} className="rd4-scard">
                        <div className="rd4-scard__head">
                            <span className="rd4-scard__icon"><Icon size={20} aria-hidden="true" /></span>
                            <div>
                                <h3 className="rd4-scard__title">{v.title[lang] || v.title.en}</h3>
                                <p className="rd4-scard__desc">{v.desc[lang] || v.desc.en}</p>
                            </div>
                        </div>
                        <div className="rd4-scard__partners">
                            {active.map((p) => (
                                <a
                                    key={p.name}
                                    href={p.url}
                                    target="_blank"
                                    rel="noopener noreferrer sponsored"
                                    className="rd4-partner"
                                >
                                    {p.name} <ExternalLink size={13} aria-hidden="true" />
                                </a>
                            ))}
                            {soon.map((p) => (
                                <span key={p.name} className="rd4-partner rd4-partner--soon" title={s.soonHint}>
                                    {p.name} <span className="rd4-soon">{s.soon}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
