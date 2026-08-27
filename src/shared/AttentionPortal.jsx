import { ArrowRight, BarChart3, Layers, MousePointer2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './AttentionPortal.css';

const COPY = {
    ru: {
        label: 'Экспериментальный раздел · 07',
        title: 'Лаборатория внимания',
        text: 'Живой стенд по инфографике: выбираем форму под задачу, выстраиваем иерархию и сохраняем решение как референс для следующего проекта.',
        action: 'Войти в лабораторию',
        signals: ['Задача → форма', 'Стек → результат', 'Референс → бриф'],
        door: 'UX / UI',
    },
    en: {
        label: 'Experimental space · 07',
        title: 'Attention Lab',
        text: 'A live infographic studio: match form to intent, build hierarchy, and save a decision as a reference for the next project.',
        action: 'Enter the lab',
        signals: ['Intent → form', 'Stack → output', 'Reference → brief'],
        door: 'UX / UI',
    },
};

const SIGNAL_ICONS = [BarChart3, Layers, MousePointer2];

export default function AttentionPortal({ lang = 'ru' }) {
    const c = COPY[lang] || COPY.ru;
    const reducedMotion = useReducedMotion();

    return (
        <section className="attention-portal" aria-labelledby="attention-portal-title">
            <div className="attention-portal__grid" aria-hidden="true" />
            <div className="attention-portal__glow" aria-hidden="true" />
            <div className="container attention-portal__inner">
                <motion.div
                    className="attention-portal__copy"
                    initial={reducedMotion ? false : { opacity: 0, x: -28 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                    <span className="attention-portal__label">{c.label}</span>
                    <h2 id="attention-portal-title">{c.title}</h2>
                    <p>{c.text}</p>
                    <div className="attention-portal__signals">
                        {c.signals.map((signal, index) => {
                            const Icon = SIGNAL_ICONS[index];
                            return <span key={signal}><Icon size={18} aria-hidden="true" /> {signal}</span>;
                        })}
                    </div>
                </motion.div>

                <motion.div
                    className="attention-door-stage"
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.82, y: 50 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: reducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="attention-door-stage__orbit" aria-hidden="true" />
                    <Link to="/attention-lab" className="attention-door">
                        <span className="attention-door__frame" aria-hidden="true" />
                        <span className="attention-door__panel">
                            <span className="attention-door__index">07 · LAB</span>
                            <strong>{c.door}</strong>
                            <span className="attention-door__chart" aria-hidden="true">
                                <i style={{ '--bar': '34%' }} />
                                <i style={{ '--bar': '68%' }} />
                                <i style={{ '--bar': '48%' }} />
                                <i style={{ '--bar': '86%' }} />
                            </span>
                            <span className="attention-door__action">{c.action} <ArrowRight size={20} /></span>
                        </span>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
