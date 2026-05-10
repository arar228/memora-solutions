import { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './shared/Header';
import GoldParticles from './shared/GoldParticles';
import ErrorBoundary from './shared/ErrorBoundary';
import LoadingFallback from './shared/LoadingFallback';
import NotFound from './shared/NotFound';
import lazyWithRetry from './shared/lazyWithRetry';

// Lazy-loaded pages — wrapped to recover from stale-chunk errors after deploys.
const HomePage = lazyWithRetry(() => import('./pages/Home'));
const TravelRadarPage = lazyWithRetry(() => import('./pages/TravelRadar'));
const WalletPage = lazyWithRetry(() => import('./pages/Wallet'));
const BdayBotPage = lazyWithRetry(() => import('./pages/BdayBot'));
const KanbanPage = lazyWithRetry(() => import('./pages/Kanban'));
const CreatorPage = lazyWithRetry(() => import('./pages/Creator'));

// Admin is dev-only — import.meta.env.DEV is statically replaced at build time,
// so the import and chunk are tree-shaken out of production bundles.
const AdminPage = import.meta.env.DEV ? lazyWithRetry(() => import('./pages/Admin')) : null;

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
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/travel-radar" element={<PageTransition><TravelRadarPage /></PageTransition>} />
        <Route path="/wallet" element={<PageTransition><WalletPage /></PageTransition>} />
        <Route path="/bday-bot" element={<PageTransition><BdayBotPage /></PageTransition>} />
        <Route path="/kanban" element={<PageTransition><KanbanPage /></PageTransition>} />
        <Route path="/creator" element={<PageTransition><CreatorPage /></PageTransition>} />
        {AdminPage && (
          <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
        )}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function GlobalLoaderHider() {
  // Runs once after the React tree is mounted. The HTML splash loader in
  // index.html is no longer needed — Suspense's LoadingFallback covers
  // any further lazy-chunk waits.
  useEffect(() => {
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
  return (
    <BrowserRouter>
      <div className="app">
        <GlobalLoaderHider />
        <ScrollToTop />
        <GoldParticles />
        <Header />
        <main className="app__main">
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AnimatedRoutes />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
