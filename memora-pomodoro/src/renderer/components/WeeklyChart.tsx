import React, { useEffect, useMemo, useState } from 'react';
import type { DayStat } from '../../shared/types';

interface WeeklyChartProps {
  accentColor: string;
  lang: 'ru' | 'en';
  refreshKey?: number;
  animate?: boolean;
}

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// The 7 local dates of the current Monday-start week.
function currentWeek(): string[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun..6=Sat
  const backToMon = dow === 0 ? 6 : dow - 1;
  const mon = new Date(today);
  mon.setDate(today.getDate() - backToMon);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    out.push(localDateStr(d));
  }
  return out;
}

function fmtTime(sec: number, lang: 'ru' | 'en'): string {
  const m = Math.round(sec / 60);
  if (m < 60) return lang === 'ru' ? `${m} мин` : `${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (lang === 'ru') return mm ? `${h} ч ${mm} м` : `${h} ч`;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

// Weekly focus-time bar chart (Mon–Sun of the current week). Bars are scaled to
// the busiest day; includes stopwatch sessions, so it reflects real work time.
export default function WeeklyChart({ accentColor, lang, refreshKey = 0, animate = true }: WeeklyChartProps) {
  const [byDay, setByDay] = useState<Record<string, DayStat>>({});
  const [dayKey, setDayKey] = useState(() => localDateStr(new Date()));
  const week = useMemo(() => currentWeek(), [dayKey]);
  const today = localDateStr(new Date());
  const labels = lang === 'ru' ? DAYS_RU : DAYS_EN;

  // Rebuild when the local day rolls over while the app stays open.
  useEffect(() => {
    const check = () => setDayKey(prev => {
      const n = localDateStr(new Date());
      return prev === n ? prev : n;
    });
    const id = setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.db.getWeekly(week[0], week[6]).then((rows: DayStat[]) => {
      if (cancelled) return;
      const m: Record<string, DayStat> = {};
      for (const r of rows) m[r.day] = r;
      setByDay(m);
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [week, refreshKey]);

  const stats = week.map(d => byDay[d] || { day: d, count: 0, seconds: 0 });
  const maxSec = Math.max(1, ...stats.map(s => s.seconds));
  const totalSec = stats.reduce((a, s) => a + s.seconds, 0);
  const totalCount = stats.reduce((a, s) => a + s.count, 0);
  const isEmpty = totalSec === 0;

  return (
    <div className="week-section">
      <div className="week-header">
        <span className="week-total">⏱ {fmtTime(totalSec, lang)}</span>
        <span className="week-sub">
          {totalCount} 🍅 · {lang === 'ru' ? 'эта неделя' : 'this week'}
        </span>
      </div>

      <div className={`week-chart ${animate ? 'week-chart--anim' : ''}`}>
        {stats.map((s, i) => {
          const h = s.seconds ? Math.max(6, Math.round((s.seconds / maxSec) * 100)) : 0;
          const isToday = s.day === today;
          return (
            <div key={s.day} className="week-col" style={{ '--i': i } as React.CSSProperties}>
              <div className="week-bar-track">
                <div
                  className={`week-bar ${isToday ? 'is-today' : ''}`}
                  style={{ height: `${h}%`, background: accentColor }}
                  aria-label={`${labels[i]}: ${fmtTime(s.seconds, lang)}, ${s.count}`}
                  title={`${labels[i]}: ${fmtTime(s.seconds, lang)} · ${s.count} 🍅`}
                />
              </div>
              <span className={`week-day ${isToday ? 'is-today' : ''}`}>{labels[i]}</span>
            </div>
          );
        })}
      </div>

      {isEmpty && (
        <div className="week-empty">
          {lang === 'ru'
            ? 'На этой неделе пока пусто — запусти таймер или секундомер'
            : 'Nothing this week yet — start the timer or stopwatch'}
        </div>
      )}
    </div>
  );
}
