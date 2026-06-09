import { useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import './devCards.css';

const ProductDevOS = lazy(() => import('./ProductDevOS'));

const FULL_QUOTE = `Создали систему, которая превращает хаос проектной работы в управляемый конвейер. Суть простая: каждый проект стартует не с чистого листа, а с готовой структуры — набора «кармашков», куда команда складывает ключевые документы: от позиционирования до принципов разработки. Пустой кармашек — это задача. Заполненный — накопленный опыт, который автоматически работает на следующий проект. Чем больше проектов проходит через систему, тем быстрее, надёжнее и шире масштабируется каждый следующий. Мультипликатор, который растёт вместе с командой.`;

const FULL_QUOTE_EN = `We built a system that turns the chaos of project work into a managed pipeline. The idea is simple: every project starts not from scratch, but from a ready-made structure — a set of "pockets" where the team stores key documents: from positioning to development principles. An empty pocket is a task. A filled one is accumulated experience that automatically works for the next project. The more projects go through the system, the faster, more reliably, and more broadly each next one scales. A multiplier that grows with the team.`;

export default function DevShowcase() {
    const { i18n } = useTranslation();
    const [demoOpen, setDemoOpen] = useState(false);
    const [quoteOpen, setQuoteOpen] = useState(false);
    const isRu = i18n.language === 'ru';

    return (
        <div className="creator-dev-card">
            <div className="creator-dev-card__badge">PRODUCT DEV OS v4</div>
            <h3 className="creator-dev-card__title">
                {isRu ? 'Операционная система для проектов' : 'Operating System for Projects'}
            </h3>
            <p className="creator-dev-card__text">
                {isRu
                    ? <>Каждый проект, который вы видели выше, прошёл через одну систему. Мы назвали её <strong>Product Dev OS</strong> — операционная система для проектной работы. Проект никогда не стартует с чистого листа. В нём уже есть набор <strong>«кармашков»</strong> — позиционирование, принципы разработки, конкурентный анализ, архитектура. Пустой кармашек — это задача. Заполненный — опыт, который работает на каждый следующий проект.</>
                    : <>Every project you've seen above went through a single system. We call it <strong>Product Dev OS</strong> — an operating system for project work. A project never starts from scratch. It already has a set of <strong>"pockets"</strong> — positioning, development principles, competitive analysis, architecture. An empty pocket is a task. A filled one is experience that works for every next project.</>}
            </p>

            <button
                className="creator-dev-card__expand-btn"
                onClick={() => setQuoteOpen(!quoteOpen)}
            >
                {quoteOpen
                    ? (isRu ? 'Свернуть ↑' : 'Collapse ↑')
                    : (isRu ? 'Полная цитата от основателя →' : 'Full quote from founder →')}
            </button>

            {quoteOpen && (
                <div className="creator-dev-card__quote">
                    {isRu ? FULL_QUOTE : FULL_QUOTE_EN}
                    <div style={{ marginTop: 8, fontStyle: 'normal', fontSize: '0.75rem', opacity: 0.6 }}>
                        — @MemoraSolutions
                    </div>
                </div>
            )}

            {/* Desktop: interactive demo */}
            <div className="creator-dev-demo">
                <div className="creator-dev-window__bar">
                    <div className="creator-dev-window__dots">
                        <span className="creator-dev-window__dot creator-dev-window__dot--red" />
                        <span className="creator-dev-window__dot creator-dev-window__dot--yellow" />
                        <span className="creator-dev-window__dot creator-dev-window__dot--green" />
                    </div>
                    <span className="creator-dev-window__title">PRODUCT DEV OS v4</span>
                    {demoOpen && (
                        <button
                            className="creator-dev-window__toggle"
                            onClick={() => setDemoOpen(false)}
                        >
                            {isRu ? 'Свернуть' : 'Collapse'}
                        </button>
                    )}
                </div>
                <div className="creator-dev-window__content">
                    {!demoOpen && (
                        <div
                            className="creator-dev-window__blur-overlay"
                            onClick={() => setDemoOpen(true)}
                        >
                            <button className="creator-dev-window__open-btn">
                                {isRu ? 'Открыть систему →' : 'Open the system →'}
                            </button>
                            <span className="creator-dev-window__hint">
                                {isRu
                                    ? 'Это живая система. Раскройте проект, перетащите документ на «кармашек», нажмите на промпт.'
                                    : 'This is a live system. Expand a project, drag a document onto a "pocket", click on a prompt.'}
                            </span>
                        </div>
                    )}
                    {demoOpen && (
                        <Suspense fallback={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5c6484', fontFamily: 'monospace', fontSize: 12 }}>
                                {isRu ? 'Загрузка системы...' : 'Loading system...'}
                            </div>
                        }>
                            <ProductDevOS />
                        </Suspense>
                    )}
                </div>
            </div>

            {/* Mobile: fallback */}
            <div className="creator-dev-mobile-fallback">
                <p className="creator-dev-mobile-fallback__text">
                    {isRu
                        ? '💻 Интерактивная демо-версия Product Dev OS доступна на десктопе'
                        : '💻 Interactive Product Dev OS demo is available on desktop'}
                </p>
            </div>
        </div>
    );
}
