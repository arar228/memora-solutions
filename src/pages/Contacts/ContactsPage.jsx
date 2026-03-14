import { useTranslation } from 'react-i18next';
import { Mail, Send, MapPin, Clock, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedSection from '../../shared/AnimatedSection';
import './ContactsPage.css';

export default function ContactsPage() {
    const { t } = useTranslation();

    return (
        <div className="contacts-page">
            <div className="container">
                <div className="contacts-layout">

                    {/* Visual / Branding Side */}
                    <AnimatedSection direction="up">
                        <div className="contacts-visual card">
                            <div className="contacts-visual__content">
                                <motion.div
                                    className="contacts-visual__icon"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                >
                                    <Headphones size={32} />
                                </motion.div>
                                <h1>{t('contacts.pageTitle')}</h1>
                                <p>{t('contacts.message')}</p>
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Content / Info Side */}
                    <div className="contacts-info">
                        <AnimatedSection direction="up" delay={0.1}>
                            <div className="contacts-header">
                                <h2>{t('contacts.pageSubtitle')}</h2>
                                <p>Выбирайте удобный способ связи, мы ответим в кратчайшие сроки.</p>
                            </div>
                        </AnimatedSection>

                        <AnimatedSection direction="up" delay={0.2}>
                            <div className="contacts-grid">
                                <a href="mailto:hello@memora.solutions" className="contact-card card">
                                    <div className="contact-card__icon">
                                        <Mail size={28} />
                                    </div>
                                    <h3>{t('contacts.email')}</h3>
                                    <p>hello@memora.solutions</p>
                                </a>

                                <a href="https://t.me/MemoraTravelRadarBot" target="_blank" rel="noopener noreferrer" className="contact-card card">
                                    <div className="contact-card__icon contact-card__icon--blue">
                                        <Send size={28} />
                                    </div>
                                    <h3>{t('contacts.telegram')}</h3>
                                    <p>@MemoraTravelRadarBot</p>
                                </a>
                            </div>
                        </AnimatedSection>

                        {/* Company Details */}
                        <AnimatedSection direction="up" delay={0.3}>
                            <div className="company-info">
                                <div className="info-item">
                                    <div className="info-item__icon"><Clock size={20} /></div>
                                    <div className="info-item__text">
                                        <span className="info-item__label">Часы работы</span>
                                        <span className="info-item__value">Ежедневно 10:00 — 20:00 (МСК)</span>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <div className="info-item__icon"><MapPin size={20} /></div>
                                    <div className="info-item__text">
                                        <span className="info-item__label">Штаб-квартира</span>
                                        <span className="info-item__value">Memora Solutions, Remote First</span>
                                    </div>
                                </div>
                            </div>
                        </AnimatedSection>
                    </div>

                </div>
            </div>
        </div>
    );
}
