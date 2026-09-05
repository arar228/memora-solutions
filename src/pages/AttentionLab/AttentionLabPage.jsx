import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Bookmark, Check, Clipboard, ExternalLink } from 'lucide-react';
import LabWorkbench from './LabWorkbench';
import { EXHIBITS, OUTPUTS, REFERENCES, STORAGE_KEY, TOOLS, createBrief, readSelection, say } from './labData';
import './AttentionLabPage.css';

export default function AttentionLabPage() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage?.startsWith('ru') ? 'ru' : 'en';
  const ru = lang === 'ru';
  const [params, setParams] = useSearchParams();
  const exhibit = EXHIBITS.find(item => item.id === params.get('example')) || EXHIBITS[0];
  const [saved, setSaved] = useState(() => {
    try { return readSelection(localStorage.getItem(STORAGE_KEY)); } catch { return []; }
  });
  const [storageFailed, setStorageFailed] = useState(false);
  const [output, setOutput] = useState('web');
  const [copyState, setCopyState] = useState('');
  const [manualCopy, setManualCopy] = useState('');
  const [copyTarget, setCopyTarget] = useState('');

  function toggleSaved(id) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    setSaved(next);
    setCopyState('');
    setManualCopy('');
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  }

  async function copy(text, target) {
    setCopyTarget(target);
    setCopyState('');
    setManualCopy('');
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('success');
    } catch {
      setManualCopy(text);
      setCopyState('manual');
    }
  }

  function selectExample(id) {
    const next = new URLSearchParams(params);
    next.set('example', id);
    setParams(next, { replace: true });
  }

  function copyFeedback(target) {
    if (copyTarget !== target) return null;
    return <div className="lab-copy-result">
      <p className="lab-copy-feedback" role="status">
        {copyState === 'success' && (target === 'brief' ? (ru ? 'Бриф скопирован.' : 'Brief copied.') : (ru ? 'Команда скопирована.' : 'Command copied.'))}
        {copyState === 'manual' && (ru ? 'Доступ к буферу обмена закрыт. Выделите текст ниже и скопируйте вручную.' : 'Clipboard access is blocked. Select the text below and copy it manually.')}
      </p>
      {manualCopy && <label className="lab-manual-copy">{ru ? 'Текст для копирования' : 'Text to copy'}<textarea readOnly value={manualCopy} onFocus={event => event.target.select()} rows={8} /></label>}
    </div>;
  }

  const brief = createBrief(saved, output, lang);
  const selectedItems = [...EXHIBITS, ...REFERENCES].filter(item => saved.includes(item.id));
  return <div className="attention-lab">
    <div className="container">
      <header className="lab-intro">
        <Link to="/#attention-entry" className="lab-back"><ArrowLeft size={18} aria-hidden="true" />{ru ? 'В портфолио' : 'Back to portfolio'}</Link>
        <div className="lab-intro-row">
          <div><span className="lab-kicker">MEMORA / {ru ? 'Лаборатория внимания' : 'Attention Lab'}</span><h1 data-typography-exempt>{ru ? <>Данные.<br /><em>Смысл. Внимание.</em></> : <>Data.<br /><em>Meaning. Attention.</em></>}</h1></div>
          <p>{ru ? 'Меняйте подачу данных и собирайте референсы для своего проекта.' : 'Explore how visual choices shape understanding. Collect references for your project.'}</p>
        </div>
      </header>
      <div className="lab-questions" role="group" aria-label={ru ? 'Вопрос к данным' : 'Question for your data'} data-typography-exempt>
        {EXHIBITS.map(item => <button key={item.id} type="button" aria-pressed={item.id === exhibit.id} onClick={() => selectExample(item.id)}>
          <span>{item.number}</span><strong>{say(item.name, lang)}</strong><ArrowRight size={18} aria-hidden="true" />
        </button>)}
      </div>
      <LabWorkbench key={exhibit.id} exhibit={exhibit} lang={lang} saved={saved.includes(exhibit.id)} onSave={() => toggleSaved(exhibit.id)} />
      <p className="lab-data-note">{ru ? 'Все числа здесь — демонстрационные. Они показывают работу визуальных приёмов. Реальные выводы строим на данных вашего проекта.' : 'All numbers here are illustrative. They demonstrate visual techniques. Real conclusions come from your project’s data.'}</p>

      <section className="lab-collection" aria-labelledby="lab-collection-title">
        <div className="lab-section-head"><div><span className="lab-kicker">02 / {ru ? 'В работу' : 'Put it to work'}</span><h2 id="lab-collection-title">{ru ? 'Ваша подборка' : 'Your collection'} <span>({saved.length})</span></h2></div><p>{ru ? 'Сохраните подходящие примеры и источники. Бриф объединит их в отправную точку для проекта.' : 'Save useful examples and sources. A brief brings them together as a starting point for your project.'}</p></div>
        <div className="lab-collection-body">
          <div className="lab-saved-list">
            {selectedItems.length ? selectedItems.map(item => <div className="lab-saved-item" key={item.id}>
              <span>{item.number || '↗'}</span>
              {item.rows ? <button type="button" onClick={() => { selectExample(item.id); document.getElementById('lab-study-title')?.scrollIntoView({ block: 'center' }); }}>{say(item.form, lang)}</button> : <a href={item.href} target="_blank" rel="noopener noreferrer">{item.title}<ExternalLink size={16} aria-hidden="true" /></a>}
              <button className="lab-remove" type="button" onClick={() => toggleSaved(item.id)} aria-label={(ru ? 'Убрать из подборки: ' : 'Remove from collection: ') + say(item.form || item.title, lang)}>{ru ? 'Убрать' : 'Remove'}</button>
            </div>) : <p className="lab-empty"><Bookmark size={24} aria-hidden="true" />{ru ? 'Начните с примера выше: нажмите «Сохранить пример».' : 'Start with a study above: choose “Save example”.'}</p>}
            <p className="lab-storage-note">{storageFailed ? (ru ? 'Браузер запретил сохранение. Подборка доступна до закрытия страницы — скопируйте бриф.' : 'Browser storage is blocked. Your collection lasts until the page closes — copy the brief.') : (ru ? 'Подборка сохраняется в этом браузере.' : 'Your collection is saved in this browser.')}</p>
          </div>
          <div className="lab-brief">
            <label htmlFor="lab-output">{ru ? 'Что создаём' : 'What are we making?'}</label>
            <select id="lab-output" value={output} onChange={event => { setOutput(event.target.value); setCopyState(''); setManualCopy(''); }}>{OUTPUTS.map(item => <option value={item.id} key={item.id}>{say(item.title, lang)}</option>)}</select>
            <span>{OUTPUTS.find(item => item.id === output).engine}</span>
            <button type="button" className="lab-primary" disabled={!saved.length} onClick={() => copy(brief, 'brief')}><Clipboard size={18} aria-hidden="true" />{ru ? 'Скопировать бриф' : 'Copy brief'}</button>
            {copyFeedback('brief')}
          </div>
        </div>
      </section>

      <section className="lab-library" aria-labelledby="lab-library-title">
        <div className="lab-section-head"><div><span className="lab-kicker">03 / {ru ? 'Насмотренность' : 'Visual literacy'}</span><h2 id="lab-library-title">{ru ? 'Библиотека приёмов' : 'A library of techniques'}</h2></div><p>{ru ? 'Источники, к которым возвращаемся при выборе формы и сценария.' : 'Sources to return to when choosing a visual form and interaction.'}</p></div>
        <div className="lab-reference-grid">{REFERENCES.map(item => <article key={item.id}>
          <a href={item.href} target="_blank" rel="noopener noreferrer"><h3>{item.title}</h3><ExternalLink size={18} aria-hidden="true" /></a>
          <p>{say(item.text, lang)}</p>
          <button type="button" aria-pressed={saved.includes(item.id)} onClick={() => toggleSaved(item.id)}>{saved.includes(item.id) ? <Check size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}{saved.includes(item.id) ? (ru ? 'В подборке' : 'In collection') : (ru ? 'В подборку' : 'Save reference')}</button>
        </article>)}</div>
      </section>
      <details className="lab-tools">
        <summary>{ru ? 'Как перенести приём в проект' : 'How to bring a technique into your project'}</summary>
        <p>{ru ? 'Эти этюды работают на React и SVG. Для следующих проектов выбираем инструмент под формат результата:' : 'These studies use React and SVG. For future projects, we choose tools around the output:'}</p>
        <div className="lab-output-grid">{OUTPUTS.map(item => <article key={item.id}><h3>{say(item.title, lang)}</h3><strong>{item.engine}</strong><p>{item.route}</p></article>)}</div>
        <h3>{ru ? 'Инструменты для команды' : 'Tools for the team'}</h3>
        <p>{ru ? 'Команды для собственной среды разработки. Перед установкой изучите документацию и содержимое пакета. Для OpenSkills замените SOURCE на выбранный репозиторий.' : 'Commands for your development environment. Review the documentation and package contents before installing. For OpenSkills, replace SOURCE with your selected repository.'}</p>
        {TOOLS.map(tool => <div className="lab-tool" key={tool.title}><a href={tool.href} target="_blank" rel="noopener noreferrer">{tool.title}<ExternalLink size={16} aria-hidden="true" /></a><code>{tool.code}</code><button type="button" onClick={() => copy(tool.code, tool.title)}>{ru ? 'Копировать команду' : 'Copy command'}</button>{copyFeedback(tool.title)}</div>)}
      </details>
      <footer className="lab-end"><p>{ru ? 'Какие данные стоит сделать понятнее в вашем продукте?' : 'Which data deserves more clarity in your product?'}</p><Link to="/#contact">{ru ? 'Обсудить задачу' : 'Discuss your project'}<ArrowRight size={20} aria-hidden="true" /></Link></footer>
    </div>
  </div>;
}
