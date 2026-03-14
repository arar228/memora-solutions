import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Lightbulb, Clock, CheckCircle2, Send, ChevronDown, ChevronUp } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { kanbanData } from '../../data/mockData';
import './KanbanPage.css';

const priorityColors = { high: 'var(--color-danger)', medium: 'var(--color-gold)', low: 'var(--color-green)' };

function TaskCard({ task, lang }) {
    return (
        <motion.div className="kanban-card" whileHover={{ y: -4 }}>
            <div
                className="kanban-card__priority"
                style={{ background: `linear-gradient(90deg, ${priorityColors[task.priority]}, transparent)` }}
            />
            <h4 className="kanban-card__title">{lang === 'ru' ? task.title : task.titleEn}</h4>
            <p className="kanban-card__desc">{lang === 'ru' ? task.desc : task.descEn}</p>
        </motion.div>
    );
}

function ReportAccordion({ task, lang }) {
    const [open, setOpen] = useState(false);
    if (!task.report) return null;

    return (
        <div className={`report-item ${open ? 'is-open' : ''}`}>
            <button className="report-item__header" onClick={() => setOpen(!open)}>
                <CheckCircle2 size={24} className="report-item__icon" />
                <span>{lang === 'ru' ? task.title : task.titleEn}</span>
                <ChevronDown size={20} className="report-item__toggle" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="report-item__content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="report-item__inner">
                            <p>{task.report}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function KanbanPage() {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackItems, setFeedbackItems] = useState([]);

    const columns = [
        {
            key: 'feedback',
            label: t('kanban.feedback'),
            desc: t('kanban.feedbackDesc'),
            icon: <MessageSquare size={18} />,
            color: 'var(--color-gold)',
            items: [...kanbanData.feedback, ...feedbackItems],
        },
        {
            key: 'potential',
            label: t('kanban.potential'),
            desc: t('kanban.potentialDesc'),
            icon: <Lightbulb size={18} />,
            color: 'var(--color-blue-dark)',
            items: kanbanData.potential,
        },
        {
            key: 'inProgress',
            label: t('kanban.inProgress'),
            desc: t('kanban.inProgressDesc'),
            icon: <Clock size={18} />,
            color: 'var(--color-green-dark)',
            items: kanbanData.inProgress,
        },
    ];

    const doneTasks = kanbanData.done.filter(t => t.report);

    const handleFeedback = () => {
        if (!feedbackText.trim()) return;
        setFeedbackItems(prev => [...prev, {
            id: Date.now(),
            title: feedbackText,
            titleEn: feedbackText,
            desc: '',
            descEn: '',
            priority: 'low',
        }]);
        setFeedbackText('');
    };

    return (
        <div className="kanban-page">
            <div className="container">
                <AnimatedSection>
                    <div className="kanban-page__header">
                        <h1>{t('kanban.pageTitle')}</h1>
                        <p className="kanban-page__subtitle">{t('kanban.pageSubtitle')}</p>
                    </div>
                </AnimatedSection>

                {/* Feedback input */}
                <AnimatedSection delay={0.05}>
                    <div className="feedback-form">
                        <input
                            type="text"
                            className="feedback-form__input"
                            placeholder={t('kanban.feedbackPlaceholder')}
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleFeedback()}
                        />
                        <button className="btn btn-primary" onClick={handleFeedback}>
                            <Send size={18} /> {t('kanban.addFeedback')}
                        </button>
                    </div>
                </AnimatedSection>

                <AnimatedSection delay={0.1}>
                    <div className="kanban-board">
                        {columns.map((col) => (
                            <div key={col.key} className="kanban-column">
                                <div className="kanban-column__header">
                                    <span className="kanban-column__icon" style={{ color: col.color }}>{col.icon}</span>
                                    <div className="kanban-column__info">
                                        <h3 className="kanban-column__title">{col.label}</h3>
                                        <p className="kanban-column__desc">{col.desc}</p>
                                    </div>
                                    <span className="kanban-column__count">{col.items.length}</span>
                                </div>
                                <div className="kanban-column__body">
                                    {col.items.map((task) => (
                                        <TaskCard key={task.id} task={task} lang={lang} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </AnimatedSection>

                {/* Reports */}
                {doneTasks.length > 0 && (
                    <AnimatedSection delay={0.2}>
                        <div className="reports-section">
                            <h2>{t('kanban.reportsTitle')}</h2>
                            <div className="reports-list">
                                {doneTasks.map(task => (
                                    <ReportAccordion key={task.id} task={task} lang={lang} />
                                ))}
                            </div>
                        </div>
                    </AnimatedSection>
                )}
            </div>
        </div>
    );
}
