import { useTranslation } from 'react-i18next';
import { Mail, Send } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import './ContactsPage.css';

export default function ContactsPage() {
    const { t } = useTranslation();

    return (
        <div className="contacts-page">
            <div className="container">
                <AnimatedSection>
                    <div className="contacts-page__header">
                        <h1>{t('contacts.pageTitle')}</h1>
                        <p className="contacts-page__subtitle">{t('contacts.pageSubtitle')}</p>
                    </div>
                </AnimatedSection>

                <AnimatedSection delay={0.1}>
                    <div className="contacts-content">
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

                        <div className="contacts-message">
                            <p>{t('contacts.message')}</p>
                        </div>
                    </div>
                </AnimatedSection>
            </div>
        </div>
    );
}
