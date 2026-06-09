import React, { useEffect, useState, useMemo } from 'react';
import type { DayCount } from '../../shared/types';
import { GRID_LEVELS } from '../../shared/constants';

interface ContribGridProps {
  accentColor: string;
  lang: 'ru' | 'en';
  refreshKey?: number;
}

const MONTHS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_RU = ['Пн', '', 'Ср', '', 'Пт', '', 'Вс'];
const DAYS_EN = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

// Local calendar date (YYYY-MM-DD) so grid cells match the user's wall-clock
// day — consistent with the DB's date(started_at,'localtime') bucketing.
function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function getLevel(count: number): string {
  for (const l of GRID_LEVELS) {
    if (count >= l.min && count <= l.max) return l.class;
  }
  return '';
}

/**
 * Build an array of 26 weeks (columns), each containing 7 day slots (Mon-Sun).
 * Ends on today, aligned to Monday start-of-week.
 */
function buildGrid(weeks: number): { days: string[][]; allDays: string[] } {
  const today = new Date();
  // Find the end of target week (Sunday after today)
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysUntilSunday);
  
  // Start from (weeks) weeks before end
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (weeks * 7) + 1);
  
  const cols: string[][] = [];
  const allDays: string[] = [];
  const cursor = new Date(startDate);
  
  for (let w = 0; w < weeks; w++) {
    const col: string[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = localDateStr(cursor);
      // Only include dates up to today
      if (cursor <= today) {
        col.push(dateStr);
        allDays.push(dateStr);
      } else {
        col.push('');  // future date
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    cols.push(col);
  }
  
  return { days: cols, allDays };
}

export default function ContribGrid({ accentColor, lang, refreshKey = 0 }: ContribGridProps) {
  const [data, setData] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [hoveredCount, setHoveredCount] = useState(0);
  const weeks = 26;
  const monthNames = lang === 'ru' ? MONTHS_RU : MONTHS_EN;
  const dayLabels = lang === 'ru' ? DAYS_RU : DAYS_EN;

  const { days: grid, allDays } = useMemo(() => buildGrid(weeks), []);

  // Load history data from DB
  useEffect(() => {
    if (allDays.length === 0) return;
    const from = allDays[0];
    const to = allDays[allDays.length - 1];
    window.api.db.getHistory(from, to).then((result: DayCount[]) => {
      const map: Record<string, number> = {};
      let sum = 0;
      for (const r of result) {
        map[r.day] = r.count;
        sum += r.count;
      }
      setData(map);
      setTotal(sum);
    });
  }, [allDays, refreshKey]);

  // Compute month labels from actual first day in each week column
  const monthLabels = useMemo(() => {
    const labels: { month: string; col: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < grid.length; w++) {
      // First day of the week column (Monday)
      const day = grid[w][0];
      if (day) {
        const m = new Date(day + 'T12:00:00').getMonth();
        if (m !== lastMonth) {
          labels.push({ month: monthNames[m], col: w });
          lastMonth = m;
        }
      }
    }
    return labels;
  }, [grid, monthNames]);

  // Format tooltip date nicely
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDate();
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const isEmpty = total === 0;

  return (
    <div className="contrib-section">
      <div className="contrib-header">
        <span className="contrib-title">
          🍅 {total} {lang === 'ru' ? 'помидоров' : 'pomodoros'}
        </span>
      </div>

      <div className="contrib-wrapper">
        {/* Day labels */}
        <div className="contrib-days">
          {dayLabels.map((d, i) => (
            <span key={i} className="contrib-day-label">{d}</span>
          ))}
        </div>

        <div className="contrib-grid-area">
          {/* Month labels */}
          <div className="contrib-months" style={{ gridTemplateColumns: `repeat(${weeks}, 11px)` }}>
            {monthLabels.map((m, i) => (
              <span key={i} className="contrib-month" style={{ gridColumn: m.col + 1 }}>
                {m.month}
              </span>
            ))}
          </div>

          {/* Grid cells — 7 rows × 26 columns, auto-flow by column */}
          <div className="contrib-grid" style={{ gridTemplateColumns: `repeat(${weeks}, 11px)` }}>
            {grid.map((col, w) =>
              col.map((day, d) => {
                const count = day ? (data[day] || 0) : 0;
                const level = day ? getLevel(count) : '';
                const isFuture = !day;
                return (
                  <div
                    key={`${w}-${d}`}
                    className={`contrib-cell ${level}`}
                    style={{
                      ...(level ? {
                        backgroundColor: accentColor,
                        opacity: level === 'l1' ? 0.25 : level === 'l2' ? 0.5 : level === 'l3' ? 0.75 : 1,
                      } : {}),
                      ...(isFuture ? { opacity: 0.15 } : {}),
                    }}
                    onMouseEnter={() => { if (day) { setHoveredDay(day); setHoveredCount(count); } }}
                    onMouseLeave={() => setHoveredDay(null)}
                    aria-label={day ? `${formatDate(day)}: ${count}` : ''}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div className="contrib-tooltip">
          {formatDate(hoveredDay)} — {hoveredCount} 🍅
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="contrib-empty">
          {lang === 'ru'
            ? 'Ваша первая неделя продуктивности начинается здесь'
            : 'Your first week of productivity starts here'}
        </div>
      )}

      {/* Legend */}
      <div className="contrib-legend">
        <span>{lang === 'ru' ? 'Меньше' : 'Less'}</span>
        <div className="contrib-cell" />
        <div className="contrib-cell" style={{ backgroundColor: accentColor, opacity: 0.25 }} />
        <div className="contrib-cell" style={{ backgroundColor: accentColor, opacity: 0.5 }} />
        <div className="contrib-cell" style={{ backgroundColor: accentColor, opacity: 0.75 }} />
        <div className="contrib-cell" style={{ backgroundColor: accentColor, opacity: 1 }} />
        <span>{lang === 'ru' ? 'Больше' : 'More'}</span>
      </div>
    </div>
  );
}
