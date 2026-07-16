import { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, Search } from 'lucide-react';
import './FlightSearch.css';

const MARKER = '748397';

// Aviasales/Travelpayouts public airport-city autocomplete (no key needed).
async function autocomplete(term, locale) {
    try {
        const u = new URL('https://autocomplete.travelpayouts.com/places2');
        u.searchParams.set('term', term);
        u.searchParams.set('locale', locale);
        u.searchParams.append('types[]', 'city');
        u.searchParams.append('types[]', 'airport');
        const r = await fetch(u);
        if (!r.ok) return [];
        const data = await r.json();
        return (Array.isArray(data) ? data : []).slice(0, 6);
    } catch { return []; }
}

const ddmm = (d) => (d ? d.slice(8, 10) + d.slice(5, 7) : '');

// Aviasales deep link carrying our affiliate marker.
function aviaUrl({ from, to, depart, ret, pax }) {
    let path = from + ddmm(depart) + to;
    if (ret) path += ddmm(ret);
    path += String(pax || 1);
    const u = new URL('https://www.aviasales.ru/search/' + path);
    u.searchParams.set('marker', MARKER);
    u.searchParams.set('currency', 'rub');
    return u.toString();
}

// Airport/city field, controlled by the parent as { code, name } | null.
function PlaceField({ id, label, value, onChange, lang, placeholder }) {
    const [opts, setOpts] = useState([]);
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);
    const name = value?.name || '';

    useEffect(() => {
        if (!open || value?.code || name.trim().length < 2) { setOpts([]); return; }
        const t = setTimeout(async () => setOpts(await autocomplete(name.trim(), lang)), 220);
        return () => clearTimeout(t);
    }, [name, open, value?.code, lang]);

    useEffect(() => {
        const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    return (
        <div className="rd4-field rd4-field--place" ref={boxRef}>
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                type="text"
                autoComplete="off"
                value={name}
                placeholder={placeholder}
                onChange={(e) => { onChange({ code: null, name: e.target.value }); setOpen(true); }}
                onFocus={() => setOpen(true)}
            />
            {value?.code && <span className="rd4-field__code">{value.code}</span>}
            {open && opts.length > 0 && (
                <ul className="rd4-ac">
                    {opts.map((o) => (
                        <li key={`${o.code}-${o.name}`} onMouseDown={() => { onChange({ code: o.code, name: o.name }); setOpen(false); }}>
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
    );
}

export default function FlightSearch({ lang, s }) {
    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);
    const [depart, setDepart] = useState('');
    const [ret, setRet] = useState('');
    const [pax, setPax] = useState(1);
    const [err, setErr] = useState('');

    const today = new Date().toISOString().slice(0, 10);
    const swap = () => { setFrom(to); setTo(from); };

    const submit = (e) => {
        e.preventDefault();
        if (!from?.code || !to?.code || !depart) { setErr(s.fillFields); return; }
        setErr('');
        window.open(aviaUrl({ from: from.code, to: to.code, depart, ret, pax }), '_blank', 'noopener,noreferrer');
    };

    return (
        <form className="rd4-search" onSubmit={submit}>
            <div className="rd4-search__places">
                <PlaceField id="rd4-from" label={s.from} value={from} onChange={setFrom} lang={lang} placeholder={s.fromPh} />
                <button type="button" className="rd4-swap" onClick={swap} aria-label={s.swap}>
                    <ArrowLeftRight size={16} aria-hidden="true" />
                </button>
                <PlaceField id="rd4-to" label={s.to} value={to} onChange={setTo} lang={lang} placeholder={s.toPh} />
            </div>
            <div className="rd4-search__opts">
                <div className="rd4-field rd4-field--date">
                    <label htmlFor="rd4-depart">{s.depart}</label>
                    <input id="rd4-depart" type="date" min={today} value={depart} onChange={(e) => setDepart(e.target.value)} />
                </div>
                <div className="rd4-field rd4-field--date">
                    <label htmlFor="rd4-return">{s.return}</label>
                    <input id="rd4-return" type="date" min={depart || today} value={ret} onChange={(e) => setRet(e.target.value)} />
                </div>
                <div className="rd4-field rd4-field--pax">
                    <label htmlFor="rd4-pax">{s.pax}</label>
                    <input id="rd4-pax" type="number" min={1} max={9} value={pax}
                        onChange={(e) => setPax(Math.max(1, Math.min(9, Number(e.target.value) || 1)))} />
                </div>
                <button type="submit" className="rd4-searchbtn">
                    <Search size={18} aria-hidden="true" /> {s.searchBtn}
                </button>
            </div>
            {err && <p className="rd4-err">{err}</p>}
        </form>
    );
}
