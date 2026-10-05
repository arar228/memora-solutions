import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './AttentionPortal.css';

const COPY = {
  ru: {
    label: 'За пределами кейса',
    title: 'А теперь — попробуйте сами.',
    text: 'Найдите акцент, выберите цель и соберите путь к действию. Посмотрите, как дизайн направляет ваше внимание.',
    action: 'Войти в лабораторию',
    sheet: 'От акцента к действию',
    caption: 'Ваша цель станет частью результата.',
    items: ['Внимание', 'Выбор', 'Действие'],
    note: 'Внимание → выбор → действие',
  },
  en: {
    label: 'Beyond the case study',
    title: 'Now, try it yourself.',
    text: 'Find the focus, choose a goal and build a path to action. Experience how design guides your attention.',
    action: 'Enter the lab',
    sheet: 'From focus to action',
    caption: 'Your goal becomes part of the result.',
    items: ['Attention', 'Choice', 'Action'],
    note: 'Attention → choice → action',
  },
};

export default function AttentionPortal({ lang = 'ru' }) {
  const c = COPY[lang] || COPY.ru;
  const reducedMotion = useReducedMotion();
  return <section id="attention-entry" className="attention-portal" aria-labelledby="attention-portal-title">
    <div className="container">
      <div className="attention-portal__caption"><span>MEMORA / LAB</span><span>{c.label}</span></div>
      <Link to="/attention-lab" className="attention-aperture">
        <div className="attention-aperture__copy">
          <h2 id="attention-portal-title">{c.title}</h2>
          <p>{c.text}</p>
          <span className="attention-aperture__action">{c.action}<ArrowUpRight size={28} aria-hidden="true" /></span>
        </div>
        <div className="attention-aperture__window" aria-hidden="true">
          <motion.div className="attention-aperture__sheet"
            initial={reducedMotion ? false : { y: 90, rotate: -5 }}
            whileInView={{ y: 0, rotate: -2 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <span className="attention-aperture__sheet-index">01 / {c.sheet}</span>
            <div className="attention-aperture__steps">{c.items.map((item, index) => <div key={item}><span>0{index + 1}</span><strong>{item}</strong><ArrowUpRight size={22} /></div>)}</div>
            <span className="attention-aperture__sheet-note">{c.caption}</span>
          </motion.div>
        </div>
      </Link>
      <p className="attention-portal__note">{c.note}</p>
    </div>
  </section>;
}
