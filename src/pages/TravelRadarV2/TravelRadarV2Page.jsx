import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plane, Luggage, BedDouble, Percent, Sparkles, CreditCard, Headphones, ArrowRight } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { deriveMeta } from '../TravelRadar/parseTourMeta';
import { getStrings } from './strings';
import { loadRequests } from './conciergeStore';
import { api, backendAvailable, getToken, setToken } from './api';
import ConciergeForm from './ConciergeForm';
import RequestCabinet from './RequestCabinet';
import LiveCabinet from './LiveCabinet';
import AuthPanel from './AuthPanel';
import './TravelRadarV2.css';

const TYPE_ICON = { air: Plane, tour: Luggage, hotel: BedDouble, promo: Percent };

export default function TravelRadarV2Page() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'ru';
  const S = getStrings(lang);

  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState({ items: [], sources: [] });
  const [requests, setRequests] = useState(() => loadRequests());
  const [modal, setModal] = useState(null); // null | { prefill }
  const [toast, setToast] = useState('');
  const cabinetRef = useRef(null);

  // Live mode when a backend is reachable AND the visitor is signed in; otherwise
  // the localStorage demo (so the deployed static site still works with no backend).
  const [online, setOnline] = useState(false);
  const [user, setUser] = useState(null);
  const [cabRefresh, setCabRefresh] = useState(0);
  const live = online && !!user;
  const requireAuth = online && !user;

  useEffect(() => {
    let cancelled = false;
    backendAvailable().then((ok) => {
      if (cancelled) return;
      setOnline(ok);
      if (ok && getToken()) api.me().then((r) => { if (!cancelled) setUser(r.user); }).catch(() => setToken(null));
    });
    return () => { cancelled = true; };
  }, []);

  // Capture a video/source tag from the URL for funnel analytics on new requests.
  const utm = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('utm_source') || p.get('src') || null;
    } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/tours.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no feed'))))
      .then((d) => { if (!cancelled) setFeed(d); })
      .catch(() => { if (!cancelled) setFeed({ items: [], sources: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const deals = useMemo(
    () => feed.items.slice(0, 12).map((it) => ({ tour: it, meta: deriveMeta(it) })),
    [feed]
  );

  const scrollCabinet = () => cabinetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // When a backend is up but the visitor isn't signed in, send them to sign in
  // (the auth panel lives in the cabinet section) instead of opening the form.
  const guard = () => { if (requireAuth) { scrollCabinet(); return false; } return true; };

  const openDeal = (tour, meta) => { if (!guard()) return; setModal({
    prefill: {
      type: meta.type === 'promo' ? 'tour' : (meta.type || 'air'),
      route: meta.primary || '', dealId: tour.id, dealText: tour.text, source: 'radar_deal', utm,
    },
  }); };
  const openFree = () => { if (!guard()) return; setModal({ prefill: { source: utm ? 'video_landing' : 'free_form', utm } }); };

  // In live mode the form submits to the API; otherwise ConciergeForm falls back
  // to the localStorage store.
  const liveSubmit = async (payload) => (await api.createRequest(payload)).request;

  const onCreated = () => {
    setModal(null);
    setToast(S.created);
    if (live) setCabRefresh((n) => n + 1);
    else setRequests(loadRequests());
    setTimeout(scrollCabinet, 60);
    setTimeout(() => setToast(''), 5000);
  };

  const logout = () => { setToken(null); setUser(null); };

  return (
    <div className="tr2-page">
      <div className="container">
        {/* Hero */}
        <AnimatedSection>
          <div className="tr2-hero">
            <span className="tr2-hero__badge"><Sparkles size={13} aria-hidden="true" /> {S.badge}</span>
            <h1 className="tr2-hero__title">{S.heroTitle}</h1>
            <p className="tr2-hero__lead">{S.heroLead}</p>
            <div className="tr2-hero__cta">
              <button className="btn btn-primary" onClick={openFree}>{S.ctaFreeForm} <ArrowRight size={16} /></button>
              <button className="btn" onClick={scrollCabinet}>{S.ctaMyRequests}{requests.length ? ` (${requests.length})` : ''}</button>
            </div>
          </div>
        </AnimatedSection>

        {/* How it works */}
        <AnimatedSection delay={0.05}>
          <div className="tr2-how">
            {[Headphones, Sparkles, CreditCard, Plane].map((Icon, i) => (
              <div className="tr2-how__step" key={i}>
                <div className="tr2-how__num"><Icon size={18} aria-hidden="true" /></div>
                <p>{S.how[i]}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Live feed with concierge CTA */}
        <AnimatedSection delay={0.1}>
          <div className="tr2-section-head">
            <h2>{S.feedTitle}</h2>
            <p>{S.feedLead}</p>
          </div>

          {loading ? (
            <div className="tr2-deals">
              {[1, 2, 3, 4].map((i) => <div key={i} className="tr2-deal tr2-deal--skeleton" />)}
            </div>
          ) : deals.length ? (
            <div className="tr2-deals">
              {deals.map(({ tour, meta }) => {
                const Icon = TYPE_ICON[meta.type] || Plane;
                return (
                  <div className="tr2-deal" key={tour.id}>
                    <div className={`tr2-deal__type tr2-deal__type--${meta.type}`}><Icon size={16} aria-hidden="true" /></div>
                    <div className="tr2-deal__body">
                      <p className="tr2-deal__route">{meta.primary || tour.text.slice(0, 70)}</p>
                      <p className="tr2-deal__sub">
                        {meta.price && <span className="tr2-deal__price">{meta.price}</span>}
                        {meta.when && <span className="tr2-deal__when">{meta.when}</span>}
                        <span className="tr2-deal__src">@{tour.channel}</span>
                      </p>
                    </div>
                    <button className="btn btn-primary tr2-deal__cta" onClick={() => openDeal(tour, meta)}>
                      {S.conciergeCta}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="tr2-empty">
              <p>{S.noFeed}</p>
              <button className="btn btn-primary" onClick={openFree}>{S.ctaFreeForm}</button>
            </div>
          )}
        </AnimatedSection>

        {/* Client cabinet */}
        <AnimatedSection delay={0.1}>
          <div className="tr2-section-head" ref={cabinetRef}>
            <h2>{S.cabinetTitle}</h2>
            {live && <button className="tr2-ghost" onClick={logout}>{user.email} · {lang === 'en' ? 'log out' : 'выйти'}</button>}
          </div>
          {requireAuth ? (
            <AuthPanel lang={lang} onAuthed={(u) => { setUser(u); setCabRefresh((n) => n + 1); }} />
          ) : live ? (
            <LiveCabinet lang={lang} refreshSignal={cabRefresh} />
          ) : (
            <RequestCabinet lang={lang} requests={requests} setRequests={(next) => setRequests([...next])} />
          )}
        </AnimatedSection>
      </div>

      {modal && (
        <ConciergeForm lang={lang} prefill={modal.prefill} onClose={() => setModal(null)} onCreated={onCreated} submitRequest={live ? liveSubmit : undefined} />
      )}
      {toast && <div className="tr2-toast">{toast}</div>}
    </div>
  );
}
