import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import TravelRadarPage from './pages/TravelRadarPage';
import WalletPage from './pages/WalletPage';
import BdayBotPage from './pages/BdayBotPage';
import KanbanPage from './pages/KanbanPage';
import ContactsPage from './pages/ContactsPage';
import AdminPage from './pages/AdminPage';

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
        <Route path="/contacts" element={<PageTransition><ContactsPage /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="app__main">
          <AnimatedRoutes />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
