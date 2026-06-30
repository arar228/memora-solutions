import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, LogOut, Send } from 'lucide-react';
import { api, getToken, setToken } from './api';
import { STATUS_TONE } from './conciergeStore';
import { getStrings } from './strings';
import './TravelRadarV2.css';
import './operator.css';

const S = getStrings('ru').statuses;
const STAFF = ['operator', 'lead', 'admin'];
const QUEUE_FILTERS = ['', 'new', 'assigned', 'quoting', 'quote_sent', 'quote_accepted', 'awaiting_payment', 'paid', 'booking', 'booked'];

function Badge({ status }) {
  return <span className={`tr2-badge tr2-badge--${STATUS_TONE[status] || 'grey'}`}>{S[status] || status}</span>;
}

function QuoteBuilder({ request, onDone, onError }) {
  const [f, setF] = useState({ supplierCost: '', supplierCurrency: 'USD', fxRate: '90', serviceFee: '3000', feeType: 'fixed', description: '' });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const supplierRub = (Number(f.supplierCost) || 0) * (Number(f.fxRate) || 1);
  const feeRub = f.feeType === 'percent' ? supplierRub * (Number(f.serviceFee) / 100) : Number(f.serviceFee) || 0;
  const total = Math.round((supplierRub + feeRub) * 100) / 100;
  const submit = async () => {
    try {
      await api.createOffer(request.id, {
        supplierCost: Number(f.supplierCost) || 0, supplierCurrency: f.supplierCurrency,
        fxRate: Number(f.fxRate) || 1, serviceFee: Number(f.serviceFee) || 0, feeType: f.feeType,
        description: f.description,
      });
      onDone();
    } catch (e) { onError(e.message); }
  };
  return (
    <div className="tr2op-quote">
      <h4>Котировка</h4>
      <div className="tr2-row">
        <label className="tr2-field"><span>Цена поставщика</span><input className="tr2-input" value={f.supplierCost} onChange={(e) => set('supplierCost', e.target.value)} inputMode="decimal" /></label>
        <label className="tr2-field tr2-field--sm"><span>Валюта</span>
          <select className="tr2-input" value={f.supplierCurrency} onChange={(e) => set('supplierCurrency', e.target.value)}>
            {['USD', 'EUR', 'RUB', 'AED', 'TRY'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="tr2-field tr2-field--sm"><span>Курс</span><input className="tr2-input" value={f.fxRate} onChange={(e) => set('fxRate', e.target.value)} inputMode="decimal" /></label>
      </div>
      <div className="tr2-row">
        <label className="tr2-field"><span>Сервисная комиссия</span><input className="tr2-input" value={f.serviceFee} onChange={(e) => set('serviceFee', e.target.value)} inputMode="decimal" /></label>
        <label className="tr2-field tr2-field--sm"><span>Тип</span>
          <select className="tr2-input" value={f.feeType} onChange={(e) => set('feeType', e.target.value)}>
            <option value="fixed">₽</option><option value="percent">%</option>
          </select>
        </label>
      </div>
      <label className="tr2-field"><span>Описание</span><input className="tr2-input" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Маршрут, условия…" /></label>
      <div className="tr2op-total">Поставщик: {Math.round(supplierRub)} ₽ · Комиссия: {Math.round(feeRub)} ₽ · <b>Итого: {total} ₽</b></div>
      <button className="btn btn-primary" onClick={submit}>Отправить котировку</button>
    </div>
  );
}

function BookingForm({ request, onDone, onError }) {
  const [f, setF] = useState({ supplier: '', bookingReference: '', supplierAmount: '', supplierCurrency: 'USD', fxRate: '90' });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    try { await api.booking(request.id, { ...f, supplierAmount: Number(f.supplierAmount) || 0, fxRate: Number(f.fxRate) || 1 }); onDone(); }
    catch (e) { onError(e.message); }
  };
  return (
    <div className="tr2op-quote">
      <h4>Бронирование</h4>
      <div className="tr2-row">
        <label className="tr2-field"><span>Поставщик</span><input className="tr2-input" value={f.supplier} onChange={(e) => set('supplier', e.target.value)} /></label>
        <label className="tr2-field"><span>Референс (PNR/ваучер)</span><input className="tr2-input" value={f.bookingReference} onChange={(e) => set('bookingReference', e.target.value)} /></label>
      </div>
      <div className="tr2-row">
        <label className="tr2-field"><span>Сумма поставщику</span><input className="tr2-input" value={f.supplierAmount} onChange={(e) => set('supplierAmount', e.target.value)} inputMode="decimal" /></label>
        <label className="tr2-field tr2-field--sm"><span>Курс</span><input className="tr2-input" value={f.fxRate} onChange={(e) => set('fxRate', e.target.value)} inputMode="decimal" /></label>
      </div>
      <button className="btn btn-primary" onClick={submit}>Подтвердить бронь</button>
    </div>
  );
}

export default function OperatorPage() {
  const [me, setMe] = useState(null);
  const [authErr, setAuthErr] = useState('');
  const [creds, setCreds] = useState({ email: 'operator@memora.local', password: 'operator123' });
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [sel, setSel] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');

  useEffect(() => { if (getToken()) api.me().then((r) => setMe(r.user)).catch(() => setToken(null)); }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await api.listRequests(filter ? `?status=${filter}` : '');
      setList(r.requests || []);
      api.funnel().then((f) => setFunnel(f)).catch(() => {});
    } catch (e) { setErr(e.message); }
  }, [filter]);

  useEffect(() => { if (me && STAFF.includes(me.role)) refresh(); }, [me, refresh]);

  const openRequest = async (id) => {
    setInvoiceUrl('');
    try { const r = await api.getRequest(id); setSel(r.request); } catch (e) { setErr(e.message); }
  };
  const act = async (fn) => {
    setErr('');
    try { const r = await fn(); if (r?.request) setSel(r.request); await refresh(); } catch (e) { setErr(e.message); }
  };

  const login = async () => {
    setAuthErr('');
    try {
      const r = await api.login(creds.email, creds.password);
      if (!STAFF.includes(r.user.role)) { setAuthErr('Нужна роль оператора/админа'); return; }
      setToken(r.token); setMe(r.user);
    } catch (e) { setAuthErr(e.message); }
  };
  const logout = () => { setToken(null); setMe(null); setSel(null); };

  if (!me || !STAFF.includes(me.role)) {
    return (
      <div className="tr2-page"><div className="container" style={{ maxWidth: 400 }}>
        <h1 className="tr2-hero__title" style={{ fontSize: '1.6rem' }}>Рабочее место оператора</h1>
        <p className="tr2-hero__lead" style={{ fontSize: '0.9rem' }}>Войдите учёткой оператора. Демо: operator@memora.local / operator123 (нужен запущенный бэкенд).</p>
        <label className="tr2-field"><span>Email</span><input className="tr2-input" value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} /></label>
        <label className="tr2-field"><span>Пароль</span><input className="tr2-input" type="password" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} /></label>
        {authErr && <p className="tr2-error">{authErr}</p>}
        <button className="btn btn-primary" onClick={login}>Войти</button>
      </div></div>
    );
  }

  const st = sel?.status;
  return (
    <div className="tr2-page"><div className="container">
      <div className="tr2op-head">
        <h1 className="tr2-hero__title" style={{ fontSize: '1.6rem', margin: 0 }}>Очередь заявок</h1>
        <div className="tr2op-head__r">
          {funnel && <span className="tr2op-stat">Оплачено: {funnel.paidCount} · {Math.round(funnel.paidSumRub)} ₽ · маржа {Math.round(funnel.acceptedMarginRub)} ₽</span>}
          <button className="tr2-ghost" onClick={refresh}><RefreshCw size={14} /> Обновить</button>
          <button className="tr2-ghost" onClick={logout}><LogOut size={14} /> {me.email}</button>
        </div>
      </div>

      <div className="tr2-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 16px' }}>
        {QUEUE_FILTERS.map((s) => (
          <button key={s || 'all'} className={`tr2-seg__btn ${filter === s ? 'is-active' : ''}`} onClick={() => setFilter(s)}>{s ? (S[s] || s) : 'Все'}</button>
        ))}
      </div>

      {err && <p className="tr2-error">{err}</p>}

      <div className="tr2op-grid">
        <div className="tr2op-queue">
          {list.length === 0 && <p className="tr2-empty">Пусто</p>}
          {list.map((r) => (
            <button key={r.id} className={`tr2op-qitem ${sel?.id === r.id ? 'is-sel' : ''}`} onClick={() => openRequest(r.id)}>
              <Badge status={r.status} />
              <span className="tr2op-qroute">{r.payload?.route || r.external || r.type}</span>
              <span className="tr2op-qsrc">{r.source}</span>
            </button>
          ))}
        </div>

        <div className="tr2op-detail">
          {!sel ? <p className="tr2-empty">Выберите заявку</p> : (
            <>
              <div className="tr2op-dhead"><Badge status={st} /><span>{sel.type} · {sel.payload?.route || sel.external}</span></div>
              <div className="tr2op-payload">
                <div><b>Контакт:</b> {sel.payload?.contact || '—'}</div>
                <div><b>Срочность:</b> {sel.payload?.urgency || '—'} · <b>Вылет:</b> {sel.payload?.departure || '—'} · <b>Пасс.:</b> {sel.payload?.passengers?.adults}+{sel.payload?.passengers?.kids}</div>
                <div><b>Бюджет:</b> {sel.payload?.budget || '—'} · <b>Источник:</b> {sel.source}{sel.utm ? ` (${sel.utm})` : ''}</div>
                {sel.external && <div><b>Найдено клиентом:</b> {sel.external}</div>}
              </div>

              {/* offers */}
              {sel.offers?.length > 0 && (
                <div className="tr2op-offers">
                  {sel.offers.map((o) => (
                    <div key={o.id} className="tr2op-offer">Котировка v{o.version}: <b>{o.totalRub} ₽</b> (комиссия {o.serviceFee}{o.feeType === 'percent' ? '%' : '₽'}) — {o.status}</div>
                  ))}
                </div>
              )}

              {/* actions by status */}
              <div className="tr2op-actions">
                {st === 'new' && <button className="btn btn-primary" onClick={() => act(() => api.assign(sel.id))}>Взять в работу</button>}
                {['assigned', 'clarifying'].includes(st) && <button className="tr2-ghost" onClick={() => act(() => api.transition(sel.id, 'clarifying'))}>Уточняю детали</button>}
                {st === 'quote_accepted' && (
                  <button className="btn btn-primary" onClick={async () => { setErr(''); try { const r = await api.invoice(sel.id); setInvoiceUrl(r.confirmationUrl); await openRequest(sel.id); await refresh(); } catch (e) { setErr(e.message); } }}>Выставить счёт</button>
                )}
                {!['completed', 'cancelled', 'refunded'].includes(st) && <button className="tr2-ghost tr2-ghost--danger" onClick={() => act(() => api.transition(sel.id, 'cancelled'))}>Отменить</button>}
                {st === 'booked' && <button className="btn btn-primary" onClick={() => act(() => api.complete(sel.id))}>Завершить</button>}
              </div>

              {invoiceUrl && <p className="tr2op-invoice">Ссылка на оплату: <a href={invoiceUrl} target="_blank" rel="noreferrer">{invoiceUrl}</a></p>}

              {['assigned', 'clarifying', 'quoting', 'quote_sent', 'quote_expired'].includes(st) && (
                <QuoteBuilder request={sel} onError={setErr} onDone={() => { openRequest(sel.id); refresh(); }} />
              )}
              {st === 'paid' && <BookingForm request={sel} onError={setErr} onDone={() => { openRequest(sel.id); refresh(); }} />}

              {/* chat */}
              <div className="tr2-chat" style={{ marginTop: 18 }}>
                <div className="tr2-timeline__label">Чат</div>
                <div className="tr2-chat__log">
                  {(sel.messages || []).map((m) => (
                    <div key={m.id} className={`tr2-msg tr2-msg--${m.from === 'client' ? 'operator' : 'client'}`}>
                      <span className="tr2-msg__who">{m.from === 'client' ? 'Клиент' : 'Оператор'}{m.isInternal ? ' (внутр.)' : ''}</span>
                      <span className="tr2-msg__text">{m.body}</span>
                    </div>
                  ))}
                </div>
                <form className="tr2-chat__input" onSubmit={(e) => { e.preventDefault(); if (!msg.trim()) return; act(() => api.message(sel.id, msg)); setMsg(''); }}>
                  <input className="tr2-input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ответ клиенту…" />
                  <button className="btn btn-primary tr2-chat__send" type="submit"><Send size={15} /></button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div></div>
  );
}
