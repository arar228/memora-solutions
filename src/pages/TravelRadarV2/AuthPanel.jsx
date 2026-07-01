import { useState } from 'react';
import { api, setToken } from './api';

// Lightweight client auth (register / login). Shown when a backend is reachable
// but the visitor isn't signed in — so real requests persist to the DB.
export default function AuthPanel({ lang, onAuthed }) {
  const ru = lang !== 'en';
  const [mode, setMode] = useState('register');
  const [f, setF] = useState({ name: '', email: '', password: '', consent: false });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const res = mode === 'register'
        ? await api.register({ name: f.name, email: f.email, password: f.password, consent: f.consent })
        : await api.login(f.email, f.password);
      setToken(res.token);
      onAuthed(res.user);
    } catch (e2) {
      setErr(e2.message || 'error');
    } finally { setBusy(false); }
  };

  return (
    <form className="tr2-auth" onSubmit={submit}>
      <div className="tr2-auth__tabs">
        <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => setMode('register')}>{ru ? 'Регистрация' : 'Sign up'}</button>
        <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>{ru ? 'Вход' : 'Log in'}</button>
      </div>
      {mode === 'register' && (
        <label className="tr2-field"><span>{ru ? 'Имя' : 'Name'}</span>
          <input className="tr2-input" value={f.name} onChange={(e) => set('name', e.target.value)} /></label>
      )}
      <label className="tr2-field"><span>Email</span>
        <input className="tr2-input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} required /></label>
      <label className="tr2-field"><span>{ru ? 'Пароль' : 'Password'}</span>
        <input className="tr2-input" type="password" value={f.password} onChange={(e) => set('password', e.target.value)} required /></label>
      {mode === 'register' && (
        <label className="tr2-consent">
          <input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} />
          <span>{ru ? 'Согласен с офертой и обработкой персональных данных' : 'I accept the terms and data processing'}</span>
        </label>
      )}
      {err && <p className="tr2-error">{err}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? '…' : (mode === 'register' ? (ru ? 'Создать аккаунт' : 'Create account') : (ru ? 'Войти' : 'Log in'))}
      </button>
    </form>
  );
}
