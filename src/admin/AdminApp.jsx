import { useState } from 'react';
import {
    LayoutDashboard, Timer, Cake, Plane, KanbanSquare, Info,
} from 'lucide-react';
import { Badge } from '../ui';
import Overview from './sections/Overview';
import PomodoroPanel from './sections/PomodoroPanel';
import KanbanPanel from './sections/KanbanPanel';
import BdayBotPanel from './sections/BdayBotPanel';
import TravelPanel from './sections/TravelPanel';
import './admin.css';

/**
 * Единая панель управления продуктами Memora (admin.memorasolutions.ru).
 *
 * Доступ закрыт HTTP Basic Auth на сервере (server.js) — пароль живёт в
 * переменной окружения Railway и в этот бандл не попадает.
 *
 * Раздел рассчитан и на разработчика, и на менеджмент/маркетинг, поэтому у
 * каждой панели есть человеческое описание: что это, на что влияет и что
 * будет после сохранения.
 */
const SECTIONS = [
    { id: 'overview', label: 'Обзор', icon: LayoutDashboard, Component: Overview },
    { id: 'pomodoro', label: 'Помодоро', icon: Timer, Component: PomodoroPanel },
    { id: 'kanban', label: 'Задачи', icon: KanbanSquare, Component: KanbanPanel },
    { id: 'bdaybot', label: 'BdayBot', icon: Cake, Component: BdayBotPanel },
    { id: 'travel', label: 'Радар путешествий', icon: Plane, Component: TravelPanel },
];

export default function AdminApp() {
    const [active, setActive] = useState('overview');
    const Current = SECTIONS.find(s => s.id === active)?.Component ?? Overview;

    return (
        <div className="admin-root min-h-screen bg-bg text-ink text-ui">
            <header className="admin-header flex items-center justify-between gap-4 border-b border-line px-6 py-4">
                <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-control bg-brand-dim text-brand font-extrabold">M</span>
                    <div>
                        <div className="font-semibold leading-tight">Memora · панель управления</div>
                        <div className="text-ui-sm text-ink-3 leading-tight">Все продукты проекта в одном месте</div>
                    </div>
                </div>
                <Badge variant="ok">вход по паролю</Badge>
            </header>

            <div className="admin-layout flex flex-col gap-6 p-6 md:flex-row">
                <nav className="admin-nav flex shrink-0 flex-row flex-wrap gap-1 md:w-56 md:flex-col">
                    {SECTIONS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActive(id)}
                            className={[
                                'flex items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-ui transition-colors border-none cursor-pointer',
                                active === id
                                    ? 'bg-brand-dim text-brand font-semibold'
                                    : 'bg-transparent text-ink-2 hover:bg-black/5 hover:text-ink',
                            ].join(' ')}
                        >
                            <Icon size={16} aria-hidden="true" /> {label}
                        </button>
                    ))}
                    <a
                        href="https://memorasolutions.ru"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2.5 rounded-control px-3 py-2.5 text-ui-sm text-ink-3 no-underline transition-colors hover:text-ink"
                    >
                        <Info size={15} aria-hidden="true" /> Открыть сайт
                    </a>
                </nav>

                <main className="admin-main min-w-0 flex-1">
                    <Current />
                </main>
            </div>
        </div>
    );
}
