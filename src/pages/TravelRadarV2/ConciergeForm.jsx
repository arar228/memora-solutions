import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getStrings } from './strings';
import { createRequest } from './conciergeStore';

// Segmented single-choice control (declared at module scope so it isn't
// recreated on every render).
function Segment({ value, options, onChange }) {
  return (
    <div className="tr2-seg">
      {Object.entries(options).map(([k, label]) => (
        <button
          type="button"
          key={k}
          className={`tr2-seg__btn ${value === k ? 'is-active' : ''}`}
          onClick={() => onChange(k)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Modal request form. `prefill` carries deal context (when opened from a card)
// or is empty (free-form "I found it myself"). Self-contained, localStorage-backed.
export default function ConciergeForm({ lang, prefill, onClose, onCreated, submitRequest }) {
  const S = getStrings(lang);
  const isFree = !prefill?.dealId;

  const [form, setForm] = useState({
    type: prefill?.type || 'air',
    route: prefill?.route || '',
    external: '',
    flex: 'range',
    departure: 'msk',
    adults: 1,
    kids: 0,
    budget: '',
    urgency: prefill?.urgency || 'week',
    contact: '',
    channel: 'telegram',
    consent: false,
  });
  const [error, setError] = useState('');

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.consent) return setError(S.needConsent);
    if (!form.route.trim() && !form.external.trim()) return setError(S.needRoute);
    if (!form.contact.trim()) return setError(S.needContact);

    const payload = {
      type: form.type,
      source: prefill?.source || (isFree ? 'free_form' : 'radar_deal'),
      dealId: prefill?.dealId || null,
      dealText: prefill?.dealText || null,
      external: form.external.trim() || null,
      route: form.route.trim(),
      flex: form.flex,
      departure: form.departure,
      passengers: {
        adults: Math.min(9, Math.max(1, parseInt(form.adults, 10) || 1)),
        kids: Math.min(9, Math.max(0, parseInt(form.kids, 10) || 0)),
      },
      budget: form.budget.trim() || null,
      urgency: form.urgency,
      contact: form.contact.trim(),
      channel: form.channel,
      utm: prefill?.utm || null,
    };
    try {
      // submitRequest (API) is injected in live mode; else fall back to the
      // localStorage demo store.
      const req = submitRequest ? await submitRequest(payload) : createRequest(payload);
      onCreated(req);
    } catch (err) {
      setError(err.message || 'error');
    }
  };

  return (
    <div className="tr2-modal" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <form className="tr2-modal__card" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="tr2-modal__close" onClick={onClose} aria-label={S.cancel}>
          <X size={18} />
        </button>
        <h3 className="tr2-modal__title">{isFree ? S.formFreeTitle : S.formTitle}</h3>

        {prefill?.dealText && (
          <div className="tr2-attached">
            <span className="tr2-attached__label">{S.attachedDeal}</span>
            <p>{prefill.dealText.slice(0, 160)}{prefill.dealText.length > 160 ? '…' : ''}</p>
          </div>
        )}

        <label className="tr2-field">
          <span>{S.fType}</span>
          <Segment value={form.type} options={S.types} onChange={(v) => set('type', v)} />
        </label>

        {isFree && (
          <label className="tr2-field">
            <span>{S.fExternal}</span>
            <textarea
              className="tr2-input" rows={2} value={form.external}
              onChange={(e) => set('external', e.target.value)} placeholder={S.fExternalPh}
            />
          </label>
        )}

        <label className="tr2-field">
          <span>{S.fRoute}</span>
          <input className="tr2-input" value={form.route}
            onChange={(e) => set('route', e.target.value)} placeholder={S.fRoutePh} />
        </label>

        <label className="tr2-field">
          <span>{S.fFlex}</span>
          <Segment value={form.flex} options={S.flex} onChange={(v) => set('flex', v)} />
        </label>

        <div className="tr2-row">
          <label className="tr2-field">
            <span>{S.fDeparture}</span>
            <select className="tr2-input" value={form.departure} onChange={(e) => set('departure', e.target.value)}>
              {Object.entries(S.departures).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="tr2-field tr2-field--sm">
            <span>{S.fAdults}</span>
            <input className="tr2-input" type="number" min="1" max="9" value={form.adults}
              onChange={(e) => set('adults', e.target.value)} />
          </label>
          <label className="tr2-field tr2-field--sm">
            <span>{S.fKids}</span>
            <input className="tr2-input" type="number" min="0" max="9" value={form.kids}
              onChange={(e) => set('kids', e.target.value)} />
          </label>
        </div>

        <div className="tr2-row">
          <label className="tr2-field">
            <span>{S.fBudget}</span>
            <input className="tr2-input" value={form.budget}
              onChange={(e) => set('budget', e.target.value)} placeholder={S.fBudgetPh} inputMode="numeric" />
          </label>
          <label className="tr2-field">
            <span>{S.fUrgency}</span>
            <select className="tr2-input" value={form.urgency} onChange={(e) => set('urgency', e.target.value)}>
              {Object.entries(S.urgency).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        <div className="tr2-row">
          <label className="tr2-field">
            <span>{S.fContact}</span>
            <input className="tr2-input" value={form.contact}
              onChange={(e) => set('contact', e.target.value)} placeholder={S.fContactPh} />
          </label>
          <label className="tr2-field">
            <span>{S.fChannel}</span>
            <select className="tr2-input" value={form.channel} onChange={(e) => set('channel', e.target.value)}>
              {Object.entries(S.channels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        <label className="tr2-consent">
          <input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} />
          <span>{S.consent}</span>
        </label>

        {error && <p className="tr2-error">{error}</p>}
        <p className="tr2-legal">{S.legalNote}</p>

        <div className="tr2-modal__actions">
          <button type="button" className="btn" onClick={onClose}>{S.cancel}</button>
          <button type="submit" className="btn btn-primary">{S.submit}</button>
        </div>
      </form>
    </div>
  );
}
