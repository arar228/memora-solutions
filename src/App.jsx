import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './shared/Header';
import GoldParticles from './shared/GoldParticles';
import ErrorBoundary from './shared/ErrorBoundary';
import LoadingFallback from './shared/LoadingFallback';

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/Home'));
const TravelRadarPage = lazy(() => import('./pages/TravelRadar'));
const WalletPage = lazy(() => import('./pages/Wallet'));
const BdayBotPage = lazy(() => import('./pages/BdayBot'));
const KanbanPage = lazy(() => import('./pages/Kanban'));
const AdminPage = lazy(() => import('./pages/Admin'));
const CreatorPage = lazy(() => import('./pages/Creator'));

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
        <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
        <Route path="/creator" element={<PageTransition><CreatorPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
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
