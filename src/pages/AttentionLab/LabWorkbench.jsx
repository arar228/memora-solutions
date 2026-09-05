import { useId, useState } from 'react';
import { Bookmark, Check } from 'lucide-react';
import { getInsight, say } from './labData';

function Bars({ exhibit, lang, selected, onSelect, focused }) {
  const rows = exhibit.id === 'compare' && focused
    ? [...exhibit.rows].sort((a, b) => b.value - a.value) : exhibit.rows;
  const max = exhibit.id === 'flow' ? 1000 : 50;
  return <div className="lab-bars">
    <div className="lab-scale" aria-hidden="true"><span>0</span><span>{max / 2}</span><span>{max}</span></div>
    {rows.map((row, index) => <button type="button" key={row.id} className="lab-bar-row"
      aria-pressed={row.id === selected} onClick={() => onSelect(row.id)}
      data-active={focused && row.id === selected}>
      <span className="lab-bar-label">{exhibit.id === 'flow' && <small>{String(index + 1).padStart(2, '0')}</small>}{say(row.label, lang)}</span>
      <span className="lab-bar-track" aria-hidden="true"><span style={{ width: row.value / max * 100 + '%' }} /></span>
      <strong>{row.value.toLocaleString(lang)}</strong>
    </button>)}
  </div>;
}

function Timeline({ exhibit, lang, selected, onSelect, focused }) {
  const titleId = useId();
  const point = index => [16 + index * 120, 218 - exhibit.rows[index].value * 2];
  const path = exhibit.rows.map((_, i) => (i ? 'L' : 'M') + point(i).join(',')).join(' ');
  const activeIndex = exhibit.rows.findIndex(row => row.id === selected);
  const [x, y] = point(activeIndex);
  return <div className="lab-timeline">
    <div className="lab-timeline-plot">
      <div className="lab-y-axis" aria-hidden="true">{[100, 75, 50, 25, 0].map(v => <span key={v}>{v}%</span>)}</div>
      <svg viewBox="0 0 632 236" preserveAspectRatio="none" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{say(exhibit.subject, lang)}: {exhibit.rows.map(row => say(row.label, lang) + ' ' + row.value + '%').join(', ')}</title>
        {[0, 25, 50, 75, 100].map(v => <line key={v} x1="16" x2="616" y1={218 - v * 2} y2={218 - v * 2} className="lab-grid-line" />)}
        <path d={path + ' L616,218 L16,218 Z'} className="lab-line-area" />
        <path d={path} className="lab-line" />
        {focused && <line x1={x} x2={x} y1={y} y2="218" className="lab-selected-guide" />}
        {exhibit.rows.map((row, i) => {
          const [cx, cy] = point(i);
          return <circle key={row.id} cx={cx} cy={cy} r={focused && row.id === selected ? 7 : 4} className={focused && row.id === selected ? 'lab-point is-active' : 'lab-point'} />;
        })}
      </svg>
    </div>
    <div className="lab-months">{exhibit.rows.map(row => <button key={row.id} type="button"
      aria-pressed={selected === row.id} onClick={() => onSelect(row.id)}>
      <span>{say(row.label, lang)}</span><strong>{row.value}%</strong>
    </button>)}</div>
  </div>;
}

function Parts({ exhibit, lang, selected, onSelect, focused }) {
  const total = exhibit.rows.reduce((sum, row) => sum + row.value, 0);
  return <div className="lab-parts">
    <div className="lab-part-total"><span>{lang === 'ru' ? 'Весь спринт' : 'Full sprint'}</span><strong>{total} <small>{say(exhibit.unit, lang)}</small></strong></div>
    <div className="lab-stacked-bar" aria-hidden="true">{exhibit.rows.map((row, index) => <span key={row.id}
      data-active={focused && selected === row.id} style={{ flex: row.value, '--segment': index }} />)}</div>
    <div className="lab-part-legend">{exhibit.rows.map((row, index) => <button key={row.id} type="button"
      aria-pressed={selected === row.id} onClick={() => onSelect(row.id)}>
      <span><i style={{ '--segment': index }} aria-hidden="true" />{say(row.label, lang)}</span>
      <strong>{row.value}%</strong>
    </button>)}</div>
  </div>;
}

export default function LabWorkbench({ exhibit, lang, saved, onSave }) {
  const [selected, setSelected] = useState(exhibit.focusId);
  const [focused, setFocused] = useState(true);
  const insight = getInsight(exhibit, selected, lang);
  const Chart = exhibit.id === 'change' ? Timeline : exhibit.id === 'parts' ? Parts : Bars;
  const ru = lang === 'ru';
  return <section className="lab-workbench" aria-labelledby="lab-study-title" data-typography-exempt>
    <div className="lab-sheet">
      <header className="lab-sheet-head">
        <div><span className="lab-eyebrow">{exhibit.number} / {say(exhibit.form, lang)}</span><h2 id="lab-study-title">{say(exhibit.title, lang)}</h2></div>
        <div className="lab-mode" role="group" aria-label={ru ? 'Подача данных' : 'Data presentation'}>
          <button type="button" aria-pressed={!focused} onClick={() => setFocused(false)}>{ru ? 'Общий вид' : 'Overview'}</button>
          <button type="button" aria-pressed={focused} onClick={() => setFocused(true)}>{ru ? 'С акцентом' : 'With focus'}</button>
        </div>
      </header>
      <div className="lab-chart-head"><h3>{say(exhibit.subject, lang)}</h3><span>{ru ? 'Демо-данные' : 'Demo data'}</span></div>
      <div className={'lab-chart lab-chart--' + exhibit.id}><Chart {...{ exhibit, lang, selected, focused }} onSelect={id => { setSelected(id); setFocused(true); }} /></div>
      <div className="lab-chart-foot">
        <span>{ru ? 'Выберите элемент, чтобы рассмотреть детали.' : 'Select an element to explore the details.'}</span>
        <details><summary>{ru ? 'Таблица данных' : 'Data table'}</summary>
          <table><caption>{say(exhibit.subject, lang)} · {ru ? 'Демонстрационные данные' : 'Demonstration data'}</caption>
            <thead><tr><th scope="col">{ru ? 'Показатель' : 'Item'}</th><th scope="col">{say(exhibit.unit, lang)}</th></tr></thead>
            <tbody>{exhibit.rows.map(row => <tr key={row.id}><th scope="row">{say(row.label, lang)}</th><td>{row.value}</td></tr>)}</tbody>
          </table>
        </details>
      </div>
    </div>
    <aside className="lab-reading">
      <span className="lab-eyebrow">{ru ? 'Что становится заметно' : 'What comes into focus'}</span>
      <div className="lab-insight" aria-live="polite" aria-atomic="true">
        {focused ? <><strong className="lab-insight-number">{insight.value}</strong><h3>{insight.label}</h3><p>{insight.detail}</p></>
          : <><strong className="lab-overview-label">{say(exhibit.form, lang)}</strong><p>{ru ? 'Все значения перед вами. Включите акцент, чтобы выделить один фрагмент и прочитать его в контексте.' : 'Every value is visible. Turn on focus to isolate one element and read it in context.'}</p></>}
      </div>
      <div className="lab-principle"><span className="lab-eyebrow">{ru ? 'Приём' : 'Technique'}</span><h3>{say(exhibit.principle, lang)}</h3><p>{say(exhibit.explanation, lang)}</p></div>
      <div className="lab-application"><span className="lab-eyebrow">{ru ? 'Для вашего проекта' : 'For your project'}</span><p>{say(exhibit.application, lang)}</p></div>
      <button type="button" className="lab-save" aria-pressed={saved} onClick={onSave}>
        {saved ? <Check size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}{saved ? (ru ? 'В подборке' : 'In your collection') : (ru ? 'Сохранить пример' : 'Save example')}
      </button>
    </aside>
  </section>;
}
