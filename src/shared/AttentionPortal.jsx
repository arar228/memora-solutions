import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './AttentionPortal.css';

const COPY = {
  ru: {
    label: 'За пределами кейса',
    title: 'А теперь — попробуйте сами.',
    text: 'Как превратить набор чисел в понятную историю? Откройте лабораторию внимания: четыре интерактивных примера нашей работы с данными.',
    action: 'Войти в лабораторию',
    sheet: 'Один акцент. Ясный приоритет.',
    caption: 'Демо · обращения за неделю',
    items: ['Каталог', 'Заказы', 'Оплата', 'Профиль'],
    note: 'Исследуйте → сохраняйте → применяйте',
  },
  en: {
    label: 'Beyond the case study',
    title: 'Now, try it yourself.',
    text: 'How can a set of numbers tell a clear story? Step inside the Attention Lab: four interactive studies in data design.',
    action: 'Enter the lab',
    sheet: 'One focus. A clear priority.',
    caption: 'Demo · requests in one week',
    items: ['Catalog', 'Orders', 'Payment', 'Account'],
    note: 'Explore → collect → apply',
  },
};
const VALUES = [46, 32, 18, 12];

export default function AttentionPortal({ lang = 'ru' }) {
  const c = COPY[lang] || COPY.ru;
  const reducedMotion = useReducedMotion();
  return <section id="attention-entry" className="attention-portal" aria-labelledby="attention-portal-title">
    <div className="container">
      <div className="attention-portal__caption"><span>MEMORA / LAB</span><span>{c.label}</span></div>
      <Link to="/attention-lab" className="attention-aperture">
        <div className="attention-aperture__copy">
          <h2 id="attention-portal-title" data-typography-exempt>{c.title}</h2>
          <p>{c.text}</p>
          <span className="attention-aperture__action">{c.action}<ArrowUpRight size={28} aria-hidden="true" /></span>
        </div>
        <div className="attention-aperture__window" data-typography-exempt aria-hidden="true">
          <motion.div className="attention-aperture__sheet"
            initial={reducedMotion ? false : { y: 90, rotate: -5 }}
            whileInView={{ y: 0, rotate: -2 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <span className="attention-aperture__sheet-index">01 / {c.sheet}</span>
            <strong>43<span>%</span></strong>
            <span className="attention-aperture__sheet-label">{c.items[0]}</span>
            <div className="attention-aperture__bars">{VALUES.map((value, i) => <div key={value}>
              <span>{c.items[i]}</span><i style={{ width: value / 50 * 100 + '%' }} /><b>{value}</b>
            </div>)}</div>
            <span className="attention-aperture__sheet-note">{c.caption}</span>
          </motion.div>
        </div>
      </Link>
      <p className="attention-portal__note">{c.note}</p>
    </div>
  </section>;
}
