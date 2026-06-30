import { useState } from 'react';
import { ChevronDown, FastForward, XCircle, Send } from 'lucide-react';
import { getStrings } from './strings';
import { advanceStatus, cancelRequest, addMessage, STATUS_TONE } from './conciergeStore';

function fmt(iso, lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function RequestCard({ req, lang, setRequests }) {
  const S = getStrings(lang);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const tone = STATUS_TONE[req.status] || 'grey';
  const isTerminal = req.status === 'completed' || req.status === 'cancelled';

  const send = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setRequests(addMessage(req.id, 'client', msg));
    setMsg('');
  };

  return (
    <div className={`tr2-req ${open ? 'is-open' : ''}`}>
      <button type="button" className="tr2-req__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`tr2-badge tr2-badge--${tone}`}>{S.statuses[req.status] || req.status}</span>
        <span className="tr2-req__route">{req.route || (req.external ? req.external.slice(0, 60) : null) || S.request}</span>
        <span className="tr2-req__meta">{S.source[req.source] || req.source} · {fmt(req.createdAt, lang)}</span>
        <ChevronDown size={16} className="tr2-req__chev" aria-hidden="true" />
      </button>

      {open && (
        <div className="tr2-req__body">
          <div className="tr2-timeline">
            <div className="tr2-timeline__label">{S.timeline}</div>
            <ol>
              {req.history.map((h, i) => (
                <li key={i} className={i === req.history.length - 1 ? 'is-current' : ''}>
                  <span className="tr2-timeline__dot" />
                  <span>{S.statuses[h.status] || h.status}</span>
                  <time>{fmt(h.at, lang)}</time>
                </li>
              ))}
            </ol>
          </div>

          <div className="tr2-chat">
            <div className="tr2-timeline__label">{S.chat}</div>
            <div className="tr2-chat__log">
              {req.messages.length === 0 && <p className="tr2-chat__empty">—</p>}
              {req.messages.map((m, i) => (
                <div key={i} className={`tr2-msg tr2-msg--${m.from}`}>
                  <span className="tr2-msg__who">{m.from === 'client' ? S.you : S.operator}</span>
                  <span className="tr2-msg__text">{m.text}</span>
                </div>
              ))}
            </div>
            {!isTerminal && (
              <form className="tr2-chat__input" onSubmit={send}>
                <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={S.chatPh} className="tr2-input" />
                <button type="submit" className="btn btn-primary tr2-chat__send" aria-label={S.send}><Send size={15} /></button>
              </form>
            )}
          </div>

          {!isTerminal && (
            <div className="tr2-req__actions">
              <button type="button" className="tr2-ghost" onClick={() => setRequests(advanceStatus(req.id, S.autoMsg))}>
                <FastForward size={14} /> {S.demoAdvance}
              </button>
              <button type="button" className="tr2-ghost tr2-ghost--danger" onClick={() => setRequests(cancelRequest(req.id))}>
                <XCircle size={14} /> {S.cancelRequest}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequestCabinet({ lang, requests, setRequests }) {
  const S = getStrings(lang);
  if (!requests.length) {
    return <p className="tr2-empty">{S.cabinetEmpty}</p>;
  }
  return (
    <div className="tr2-cabinet">
      {requests.map((req) => (
        <RequestCard key={req.id} req={req} lang={lang} setRequests={setRequests} />
      ))}
    </div>
  );
}
