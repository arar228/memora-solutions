import { useTranslation } from 'react-i18next';
import { Radar, Plane, Compass } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { STR } from './strings';
import FlightSearch from '../TravelRadar3/FlightSearch';
import Services from './Services';
import './TravelRadar4.css';

// Travel Radar 4.0 — a full travel-service hub (search + all verticals).
// Isolated experimental module: delete this folder + its route + header entry
// to roll back. Does NOT touch the live /travel-radar-3.
export default function TravelRadar4Page() {
    const { i18n } = useTranslation();
    const lang = i18n.language === 'ru' ? 'ru' : 'en';
    const s = STR[lang];

    return (
        <div className="rd4">
            <div className="container">
                <AnimatedSection>
                    <div className="rd4-header">
                        <h1>
                            <Radar size={26} aria-hidden="true" /> {s.pageTitle}
                            <span className="rd4-badge">{s.badge}</span>
                        </h1>
                        <p className="rd4-sub">{s.subtitle}</p>
                    </div>
                </AnimatedSection>

                {/* === Flight search === */}
                <AnimatedSection delay={0.05}>
                    <section className="rd4-panel rd4-searchpanel">
                        <div className="rd4-sechead">
                            <Plane size={18} aria-hidden="true" />
                            <h2>{s.searchTitle}</h2>
                        </div>
                        <FlightSearch lang={lang} s={s} />
                    </section>
                </AnimatedSection>

                {/* === All services === */}
                <AnimatedSection delay={0.05}>
                    <section className="rd4-panel">
                        <div className="rd4-sechead">
                            <Compass size={18} aria-hidden="true" />
                            <h2>{s.servicesTitle}</h2>
                        </div>
                        <p className="rd4-secdesc">{s.servicesDesc}</p>
                        <Services lang={lang} s={s} />
                    </section>
                </AnimatedSection>

                <p className="rd4-disclaimer">{s.disclaimer}</p>
            </div>
        </div>
    );
}
