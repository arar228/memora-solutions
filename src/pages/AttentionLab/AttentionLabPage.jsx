import { lazy, Suspense, useEffect, useReducer, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Grip, MousePointer2, RotateCcw, Sparkles, Target, Waypoints } from 'lucide-react';
import { GOALS, INITIAL_JOURNEY, journeyReducer, pointInTarget } from './journey';
import './AttentionJourney.css';

const ReferenceLibrary = lazy(() => import('./ReferenceLibrary'));
const ICONS = [Sparkles, Waypoints, MousePointer2];
const COPY = {
  ru: {
    title: 'Управляем вниманием пользователя с помощью грамотного дизайна',
    intro: 'Попробуйте сами: найдите акцент, выберите цель и соберите путь к действию.',
    steps: ['Внимание', 'Выбор', 'Действие'],
    titles: ['Начните с акцента', 'К чему ведём пользователя?', 'Соедините интерес и действие', 'Этот путь вы собрали сами'],
    hints: ['Нажмите на светящуюся кнопку.', 'Выберите цель для своего продукта.', 'Перетащите вашу цель в подсвеченную область. Или соедините шаги кнопкой.', 'Акцент, выбор и следующий шаг стали одним целым.'],
    start: 'Начать опыт', restart: 'Пройти ещё раз', drag: 'Перетащите цель', drop: 'Следующий шаг', connect: 'Соединить шаги', retry: 'Перенесите карточку в подсвеченную область или нажмите «Соединить шаги».',
    attention: 'Вы нашли акцент', attentionDetail: 'Свет и движение указали точку входа.',
    choice: 'Вы выбрали цель', choiceDetail: 'У каждого варианта появился понятный результат.',
    action: 'Вы связали шаги', actionDetail: 'Ваше действие получило видимый ответ.',
    result: 'Так может работать ваш продукт.', proposal: 'Спроектируем такой путь вместе?', cta: 'Обсудить мой проект',
    note: 'Выбор перейдёт в черновик заявки. Отправку подтверждаете вы.',
    library: 'Референсы и инфографика', libraryNote: 'Откройте приёмы, которые можно взять в следующий проект.', loading: 'Открываем библиотеку…',
  },
  en: {
    title: 'Guiding user attention through thoughtful design',
    intro: 'Try it yourself: find the focus, choose a goal and build a path to action.',
    steps: ['Attention', 'Choice', 'Action'],
    titles: ['Start with the focus', 'Where are we guiding the user?', 'Connect interest and action', 'You built this path yourself'],
    hints: ['Press the glowing button.', 'Choose a goal for your product.', 'Drag your goal into the highlighted area. Or connect the steps with the button.', 'Focus, choice and the next step have come together.'],
    start: 'Start the experience', restart: 'Try again', drag: 'Drag your goal', drop: 'Next step', connect: 'Connect the steps', retry: 'Move the card into the highlighted area or press “Connect the steps”.',
    attention: 'You found the focus', attentionDetail: 'Light and motion marked the entrance.',
    choice: 'You chose a goal', choiceDetail: 'Each option showed a clear outcome.',
    action: 'You connected the steps', actionDetail: 'Your action received a visible response.',
    result: 'Your product could work this way.', proposal: 'Shall we design that journey together?', cta: 'Discuss my project',
    note: 'Your choice goes into an enquiry draft. You decide when to send it.',
    library: 'References and information design', libraryNote: 'Explore techniques for your next project.', loading: 'Opening the library…',
  },
};

export default function AttentionLabPage() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage?.startsWith('ru') ? 'ru' : 'en';
  const c = COPY[lang];
  const reduced = useReducedMotion();
  const [params] = useSearchParams();
  const [libraryOpen, setLibraryOpen] = useState(() => params.has('example') || window.location.hash === '#playground');
  const [libraryMounted, setLibraryMounted] = useState(libraryOpen);
  const [state, dispatch] = useReducer(journeyReducer, INITIAL_JOURNEY);
  const [missed, setMissed] = useState(false);
  const titleRef = useRef(null);
  const dragAreaRef = useRef(null);
  const targetRef = useRef(null);
  const restartFocusRef = useRef(false);
  const goal = GOALS.find(item => item.id === state.goal);
  const duration = reduced ? 0 : .5;
  const completed = state.step === 3;

  useEffect(() => {
    if (state.step > 0) titleRef.current?.focus({ preventScroll: true });
  }, [state.step]);

  function restart() {
    restartFocusRef.current = true;
    setMissed(false);
    dispatch({ type: 'restart' });
  }

  const receipts = [
    { title: c.attention, text: c.attentionDetail, Icon: Sparkles },
    { title: c.choice, text: goal?.[lang].title || c.choiceDetail, Icon: Target },
    { title: c.action, text: c.actionDetail, Icon: Waypoints },
  ];

  return <div className="attention-lab attention-journey">
    <div className="container">
      <header className="journey-intro">
        <div className="journey-intro-top"><span className="lab-kicker">MEMORA / {lang === 'ru' ? 'Лаборатория внимания' : 'Attention Lab'}</span><Link to="/#attention-entry" className="lab-back"><ArrowLeft size={18} aria-hidden="true" />{lang === 'ru' ? 'В портфолио' : 'Back to portfolio'}</Link></div>
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
      </header>
      <LayoutGroup id="attention-journey">
        <section className="journey" aria-labelledby="journey-title" data-step={state.step}>
          <header className="journey-toolbar">
            <ol aria-label={lang === 'ru' ? 'Ход опыта' : 'Experience progress'}>{c.steps.map((step, index) => <li key={step} aria-current={!completed && state.step === index ? 'step' : undefined} data-done={state.step > index}><span>{state.step > index ? <Check size={18} aria-hidden="true" /> : `0${index + 1}`}</span>{step}</li>)}</ol>
            {state.step > 0 && <button type="button" className="journey-restart" onClick={restart}><RotateCcw size={18} aria-hidden="true" />{c.restart}</button>}
          </header>
          <div className="journey-heading">
            <h2 id="journey-title" ref={titleRef} tabIndex={-1}>{c.titles[state.step]}</h2>
            <p role="status" aria-live="polite" aria-atomic="true">{state.step === 2 && <>{goal[lang].title}. </>}{c.hints[state.step]}</p>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={state.step} className={`journey-scene journey-scene--${state.step}`} initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8, transition: { duration: reduced ? 0 : .15 } }} transition={{ duration }} onAnimationComplete={() => {
              if (state.step === 0 && restartFocusRef.current) {
                document.getElementById('lab-start')?.focus({ preventScroll: true });
                restartFocusRef.current = false;
              }
            }}>
              {state.step === 0 && <div className="journey-entry">
                <div className="journey-fragments" aria-hidden="true">{[0, 1, 2, 3].map(n => <span key={n}><i /><i /><i /></span>)}</div>
                <svg className="journey-beam" viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true"><motion.path d="M40 250 C150 250 130 90 290 90 S340 160 500 160" fill="none" stroke="currentColor" strokeWidth="2" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 1.4 }} /></svg>
                <motion.button layoutId={reduced ? undefined : 'journey-focus'} id="lab-start" type="button" className="journey-start" onClick={() => dispatch({ type: 'start' })} whileInView={reduced ? {} : { boxShadow: ['0 0 0 0px #75dfeb30', '0 0 0 20px #75dfeb00', '0 0 0 0px #75dfeb00'] }} viewport={{ once: true, amount: .8 }} transition={{ duration: reduced ? 0 : 1.8, repeat: reduced ? 0 : 2 }}><MousePointer2 size={22} aria-hidden="true" />{c.start}<ArrowRight size={22} aria-hidden="true" /></motion.button>
              </div>}
              {state.step === 1 && <div className="journey-goals">{GOALS.map((item, index) => {
                const Icon = ICONS[index];
                return <motion.button layoutId={reduced ? undefined : `journey-goal-${item.id}`} type="button" key={item.id} className="journey-goal" onClick={() => dispatch({ type: 'choose', goal: item.id })} initial={{ opacity: 0, y: reduced ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, delay: reduced ? 0 : index * .12 }} whileHover={reduced ? {} : { y: -6 }}>
                  <span className="journey-goal-top"><Icon size={28} aria-hidden="true" /><span>0{index + 1}</span></span><h3>{item[lang].title}</h3><p>{item[lang].detail}</p><ArrowRight className="journey-goal-arrow" size={22} aria-hidden="true" />
                </motion.button>;
              })}</div>}
              {state.step === 2 && <div className="journey-connect">
                <div className="journey-drag-area" ref={dragAreaRef}>
                  <svg className="journey-link-line" viewBox="0 0 800 150" preserveAspectRatio="none" aria-hidden="true"><motion.path d="M170 75 H630" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 10" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration }} /></svg>
                  <motion.div layoutId={reduced ? undefined : `journey-goal-${goal.id}`} className="journey-token" drag dragConstraints={dragAreaRef} dragSnapToOrigin dragElastic={0} onDragEnd={(event, info) => {
                    // Motion reports page coordinates; target bounds use viewport coordinates.
                    const point = { x: event.clientX ?? info.point.x - window.scrollX, y: event.clientY ?? info.point.y - window.scrollY };
                    if (targetRef.current && pointInTarget(point, targetRef.current.getBoundingClientRect())) dispatch({ type: 'connect' });
                    else setMissed(true);
                  }} whileDrag={reduced ? {} : { scale: 1.04, cursor: 'grabbing' }} aria-hidden="true"><Grip size={22} /><strong>{goal[lang].title}</strong><span>{c.drag}</span></motion.div>
                  <motion.div layoutId={reduced ? undefined : 'journey-action'} className="journey-drop" ref={targetRef}><Target size={30} aria-hidden="true" /><strong>{c.drop}</strong></motion.div>
                </div>
                <button type="button" className="journey-connect-button" onClick={() => dispatch({ type: 'connect' })}>{c.connect}<ArrowRight size={22} aria-hidden="true" /></button>
                {missed && <p className="journey-drag-help" role="status">{c.retry}</p>}
              </div>}
              {completed && <div className="journey-result">
                <div className="journey-receipts">{receipts.map(({ title, text, Icon }, index) => <motion.div layoutId={reduced ? undefined : index === 0 ? 'journey-focus' : index === 1 ? `journey-goal-${goal.id}` : 'journey-action'} key={index} className="journey-receipt" initial={{ opacity: 0, y: reduced ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, delay: reduced ? 0 : index * .15 }}><Icon size={22} aria-hidden="true" /><strong>{title}</strong><p>{text}</p><Check size={18} aria-hidden="true" /></motion.div>)}</div>
                <motion.div className="journey-proposal" initial={{ opacity: 0, y: reduced ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, delay: reduced ? 0 : .5 }}>
                  <span className="lab-kicker">MEMORA × {lang === 'ru' ? 'ВАШ ПРОЕКТ' : 'YOUR PROJECT'}</span>
                  <h2>{c.result}</h2><p>{goal[lang].result}</p><p className="journey-invitation">{c.proposal}</p>
                  <Link className="journey-cta" to={`/?labGoal=${goal.id}#contact`}>{c.cta}<ArrowRight size={22} aria-hidden="true" /></Link><span className="journey-handoff-note">{c.note}</span>
                </motion.div>
              </div>}
            </motion.div>
          </AnimatePresence>
          {state.step > 0 && !completed && <div className="journey-feedback"><Check size={18} aria-hidden="true" /><span>{state.step === 1 ? c.attentionDetail : c.choiceDetail}</span></div>}
        </section>
      </LayoutGroup>
      <details className="journey-library" id="playground" open={libraryOpen} onToggle={event => {
        setLibraryOpen(event.currentTarget.open);
        if (event.currentTarget.open) setLibraryMounted(true);
      }}>
        <summary><span><strong>{c.library}</strong><span>{c.libraryNote}</span></span><ArrowRight size={22} aria-hidden="true" /></summary>
        {libraryMounted && <Suspense fallback={<p role="status">{c.loading}</p>}><ReferenceLibrary /></Suspense>}
      </details>
    </div>
  </div>;
}
