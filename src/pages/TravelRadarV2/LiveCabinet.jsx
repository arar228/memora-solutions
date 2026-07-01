import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Send, RefreshCw, CreditCard, Check } from 'lucide-react';
import { api } from './api';
import { STATUS_TONE } from './conciergeStore';
import { getStrings } from './strings';

function fmt(iso, lang) {
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function LiveCard({ req, lang, reload, onError }) {
  const S = getStrings(lang);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const tone = STATUS_TONE[req.status] || 'grey';
  const terminal = ['completed', 'cancelled', 'refunded'].includes(req.status);

  const wrap = (fn) => async () => { setBusy(true); onError(''); try { await fn(); await reload(); } catch (e) { onError(e.message); } finally { setBusy(false); } };
  const accept = (offerId) => wrap(() => api.acceptOffer(offerId))();
  const pay = wrap(async () => { const r = await api.invoice(req.id); if (r.confirmationUrl) window.open(r.confirmationUrl, '_blank', 'noopener'); })();
  const send = async (e) => { e.preventDefault(); if (!msg.trim()) return; const t = msg; setMsg(''); try { await api.message(req.id, t); await reload(); } catch (er) { onError(er.message); } };

  return (
    <div className={`tr2-req ${open ? 'is-open' : ''}`}>
      <button type="button" className="tr2-req__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`tr2-badge tr2-badge--${tone}`}>{S.statuses[req.status] || req.status}</span>
        <span className="tr2-req__route">{req.payload?.route || req.external || S.request}</span>
        <span className="tr2-req__meta">{fmt(req.createdAt, lang)}</span>
        <ChevronDown size={16} className="tr2-req__chev" aria-hidden="true" />
      </button>
      {open && (
        <div className="tr2-req__body">
          <div className="tr2-timeline">
            <div className="tr2-timeline__label">{S.timeline}</div>
            <ol>{(req.history || []).map((h, i) => (
              <li key={i} className={i === req.history.length - 1 ? 'is-current' : ''}>
                <span className="tr2-timeline__dot" /><span>{S.statuses[h.status] || h.status}</span><time>{fmt(h.at, lang)}</time>
              </li>))}
            </ol>
          </div>

          {/* Offers to accept */}
          {(req.offers || []).filter((o) => o.status === 'sent').map((o) => (
            <div key={o.id} className="tr2-offer-card">
              <div><b>{o.totalRub} ₽</b>{o.description ? ` · ${o.description}` : ''}</div>
              <button className="btn btn-primary" disabled={busy} onClick={() => accept(o.id)}><Check size={14} /> {lang === 'en' ? 'Accept' : 'Принять'}</button>
            </div>
          ))}

          {/* Pay */}
          {req.status === 'quote_accepted' && (
            <button className="btn btn-primary tr2-pay" disabled={busy} onClick={pay}><CreditCard size={15} /> {lang === 'en' ? 'Pay' : 'Оплатить'}</button>
          )}

          {/* Chat */}
          <div className="tr2-chat">
            <div className="tr2-timeline__label">{S.chat}</div>
            <div className="tr2-chat__log">
              {(req.messages || []).length === 0 && <p className="tr2-chat__empty">—</p>}
              {(req.messages || []).map((m, i) => (
                <div key={m.id || i} className={`tr2-msg tr2-msg--${m.from}`}>
                  <span className="tr2-msg__who">{m.from === 'client' ? S.you : S.operator}</span>
                  <span className="tr2-msg__text">{m.body}</span>
                </div>))}
            </div>
            {!terminal && (
              <form className="tr2-chat__input" onSubmit={send}>
                <input className="tr2-input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={S.chatPh} />
                <button className="btn btn-primary tr2-chat__send" type="submit" aria-label={S.send}><Send size={15} /></button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveCabinet({ lang, refreshSignal }) {
  const S = getStrings(lang);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { const r = await api.listRequests(); setItems(r.requests || []); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load, refreshSignal]);
  // Light polling so operator-side updates appear without a manual refresh.
  useEffect(() => { const id = setInterval(load, 12000); return () => clearInterval(id); }, [load]);

  return (
    <div>
      <button className="tr2-ghost" style={{ marginBottom: 10 }} onClick={load}><RefreshCw size={13} /> {lang === 'en' ? 'Refresh' : 'Обновить'}</button>
      {err && <p className="tr2-error">{err}</p>}
      {items.length === 0 ? <p className="tr2-empty">{S.cabinetEmpty}</p> : (
        <div className="tr2-cabinet">
          {items.map((req) => <LiveCard key={req.id} req={req} lang={lang} reload={load} onError={setErr} />)}
        </div>
      )}
    </div>
  );
}
