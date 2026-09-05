import { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './shared/Header';
import GoldParticles from './shared/GoldParticles';
import ErrorBoundary from './shared/ErrorBoundary';
import LoadingFallback from './shared/LoadingFallback';
import NotFound from './shared/NotFound';
import lazyWithRetry from './shared/lazyWithRetry';

// Lazy-loaded pages — wrapped to recover from stale-chunk errors after deploys.
const HomePage = lazyWithRetry(() => import('./pages/Home'));
// One focused Travel Radar: a shared feed of Telegram flight and tour deals.
// Historical versioned URLs redirect to the canonical /travel-radar route.
const TravelRadar3Page = lazyWithRetry(() => import('./pages/TravelRadar3'));
const WalletPage = lazyWithRetry(() => import('./pages/Wallet'));
const BdayBotPage = lazyWithRetry(() => import('./pages/BdayBot'));
const KanbanPage = lazyWithRetry(() => import('./pages/Kanban'));
const CreatorPage = lazyWithRetry(() => import('./pages/Creator'));
const PomodoroPage = lazyWithRetry(() => import('./pages/Pomodoro'));
const AttentionLabPage = lazyWithRetry(() => import('./pages/AttentionLab'));
const PrivacyPage = lazyWithRetry(() => import('./pages/Privacy'));

// Admin is dev-only — import.meta.env.DEV is statically replaced at build time,
// so the import and chunk are tree-shaken out of production bundles.
const AdminPage = import.meta.env.DEV ? lazyWithRetry(() => import('./pages/Admin')) : null;

// Панель управления продуктами живёт на отдельном поддомене
// (admin.memorasolutions.ru) и защищена паролем на сервере — см. server.js.
// Здесь только выбор, что рендерить: сайт или админку.
const AdminApp = lazyWithRetry(() => import('./admin/AdminApp'));
const IS_ADMIN_HOST = typeof window !== 'undefined'
  && (window.location.hostname.startsWith('admin.')
    // локальная проверка без поддомена: ?admin=1
    || new URLSearchParams(window.location.search).has('admin'));

const ROUTE_META = {
  '/': ['Разработка цифровых продуктов | Memora Solutions', 'Проектируем интерфейсы, разрабатываем сервисы и доводим цифровые продукты до стабильного релиза.'],
  '/products': ['Продукты Memora Solutions', 'Цифровые инструменты Memora Solutions для внимания, планирования, путешествий и повседневных задач.'],
  '/travel-radar': ['Радар путешествий | Memora Solutions', 'Актуальные предложения на билеты и туры, фильтры маршрутов и персональные уведомления в Telegram.'],
  '/wallet': ['Memora Wallet Manager', 'Telegram-инструмент для учёта расходов, бюджетов, валют и регулярных финансовых отчётов.'],
  '/bday-bot': ['Memora BDayBot', 'Telegram-помощник для дней рождения, контактов, напоминаний и персональных поздравлений.'],
  '/kanban': ['Задать вопрос | Memora Solutions', 'Прямой канал связи с командой Memora Solutions и открытая доска текущих задач.'],
  '/pomodoro': ['Memora Pomodoro', 'Таймер фокуса с анимированными сценами, статистикой и режимом оверлея.'],
  '/attention-lab': ['Лаборатория внимания | Memora Solutions', 'Интерактивная демонстрация управления вниманием пользователя с помощью грамотного дизайна.'],
  '/privacy': ['Политика обработки данных | Memora Solutions', 'Какие данные обрабатывает Memora Solutions, для каких целей и как управлять своими данными.'],
};

function setMeta(selector, attributes, content) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const canonicalPath = ['/travel-radar-3', '/travel-radar-4'].includes(pathname)
      || pathname.startsWith('/travel-radar-v2/') ? '/travel-radar' : pathname;
    const meta = ROUTE_META[canonicalPath];
    const title = meta?.[0] || 'Страница не найдена | Memora Solutions';
    const description = meta?.[1] || 'Перейдите к продуктам и сервисам Memora Solutions.';
    const canonicalUrl = `https://memorasolutions.ru${meta ? canonicalPath : pathname}`;
    document.title = title;
    setMeta('meta[name="description"]', { name: 'description' }, description);
    setMeta('meta[name="robots"]', { name: 'robots' }, meta ? 'index,follow' : 'noindex,follow');
    setMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    setMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    setMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', canonicalUrl);
  }, [pathname]);
  return null;
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><CreatorPage /></PageTransition>} />
        <Route path="/products" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/travel-radar" element={<PageTransition><TravelRadar3Page /></PageTransition>} />
        {/* Preserve old bookmarks without exposing multiple competing versions. */}
        <Route path="/travel-radar-3" element={<Navigate to="/travel-radar" replace />} />
        <Route path="/travel-radar-4" element={<Navigate to="/travel-radar" replace />} />
        <Route path="/travel-radar-v2/*" element={<Navigate to="/travel-radar" replace />} />
        <Route path="/wallet" element={<PageTransition><WalletPage /></PageTransition>} />
        <Route path="/bday-bot" element={<PageTransition><BdayBotPage /></PageTransition>} />
        <Route path="/kanban" element={<PageTransition><KanbanPage /></PageTransition>} />
        <Route path="/creator" element={<Navigate to="/" replace />} />
        <Route path="/pomodoro" element={<PageTransition><PomodoroPage /></PageTransition>} />
        <Route path="/attention-lab" element={<PageTransition><AttentionLabPage /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><PrivacyPage /></PageTransition>} />
        <Route path="/internal" element={<Navigate to="/" replace />} />
        {AdminPage && (
          <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
        )}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }

    let attempts = 0;
    let timer;
    const scrollToAnchor = () => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        // Cross-route layout changes can move a smooth scroll's destination.
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
        return;
      }
      attempts += 1;
      if (attempts < 20) timer = window.setTimeout(scrollToAnchor, 100);
    };
    scrollToAnchor();
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);
  return null;
}

function SiteAmbience() {
  const { pathname } = useLocation();
  // Keep the data studies visually quiet and stop decorative background work.
  return pathname === '/attention-lab' ? null : <GoldParticles />;
}

function GlobalLoaderHider() {
  // Runs once after the React tree is mounted. The HTML splash loader in
  // index.html is no longer needed — Suspense's LoadingFallback covers
  // any further lazy-chunk waits.
  useEffect(() => {
    window.__memoraBootDone?.();
    const loader = document.getElementById('global-loader');
    if (!loader) return;
    loader.classList.add('hide');
    const remove = () => loader.remove();
    loader.addEventListener('transitionend', remove, { once: true });
    // Fallback in case the transition never fires.
    const t = setTimeout(remove, 1000);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export default function App() {
  // На поддомене админки сайт не рендерится вообще: ни шапки, ни частиц,
  // ни маршрутов — только панель управления.
  if (IS_ADMIN_HOST) {
    return (
      <>
        <GlobalLoaderHider />
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <AdminApp />
          </Suspense>
        </ErrorBoundary>
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <GlobalLoaderHider />
        <ScrollToTop />
        <RouteMetadata />
        <SiteAmbience />
        <Header />
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <main className="app__main">
              <AnimatedRoutes />
            </main>
          </Suspense>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}
