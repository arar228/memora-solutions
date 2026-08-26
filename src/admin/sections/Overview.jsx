import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '../../ui';
import { adminApi } from '../api';

/**
 * Обзор: одна страница, по которой и разработчик, и менеджер понимают,
 * что сейчас в проде и где что лежит. Данные тянутся из тех же файлов,
 * которые обновляются автоматически (сборкой и кронами) — руками
 * поддерживать список не нужно.
 */
const PRODUCTS = [
    {
        name: 'Мемора Помодоро',
        what: 'Таймер концентрации: десктоп (Windows) и веб-версия на сайте.',
        who: 'Продукт для пользователей. Управление внешним видом — раздел «Помодоро».',
        links: [
            { label: 'Страница на сайте', href: 'https://memorasolutions.ru/pomodoro' },
            { label: 'Веб-версия', href: 'https://memorasolutions.ru/app/pomodoro/index.html' },
            { label: 'Релизы', href: 'https://github.com/arar228/memora-solutions/releases' },
        ],
    },
    {
        name: 'Радар путешествий',
        what: 'Горящие авиабилеты и туры в безвизовые страны, партнёрские ссылки Travelpayouts.',
        who: 'Зарабатывающий продукт: доход идёт с переходов и бронирований.',
        links: [
            { label: 'Радар 3.0', href: 'https://memorasolutions.ru/travel-radar-3' },
            { label: 'Радар 4.0 (хаб услуг)', href: 'https://memorasolutions.ru/travel-radar-4' },
        ],
    },
    {
        name: 'BdayBot',
        what: 'Телеграм-бот напоминаний о днях рождения.',
        who: 'Пользовательский сервис в Telegram.',
        links: [
            { label: 'Страница на сайте', href: 'https://memorasolutions.ru/bday-bot' },
            { label: 'Бот', href: 'https://t.me/MemoraBDayBot' },
        ],
    },
];

export default function Overview() {
    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        adminApi.getOverview()
            .then(data => {
                setSnapshot(data);
                setError(data?.unavailable?.length
                    ? `Источники данных недоступны: ${data.unavailable.join(', ')}`
                    : '');
            })
            .catch(err => setError(err.message));
    }, []);

    const pomodoro = snapshot?.pomodoro;
    const radar = snapshot?.radar;
    const deals = snapshot?.deals;
    const loading = snapshot === null && !error;

    const when = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? '—'
            : d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <CardTitle>Что сейчас в проде</CardTitle>
                    <CardDescription>
                        Живые цифры из тех же файлов, которые читает сайт. Обновляются автоматически:
                        ленты путешествий — по расписанию каждые несколько часов, версия Помодоро — при выпуске сборки.
                    </CardDescription>
                </CardHeader>
                {error && (
                    <div className="mx-5 rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-ui-sm text-danger">
                        {error}
                    </div>
                )}
                <CardContent className="grid gap-4 sm:grid-cols-3">
                    <Stat
                        title="Помодоро"
                        value={loading ? '…' : pomodoro?.version ? `v${pomodoro.version}` : '—'}
                        sub={loading ? 'Загружаем данные…' : pomodoro?.date ? `от ${pomodoro.date}` : 'Источник недоступен'}
                    />
                    <Stat
                        title="Горящие билеты"
                        value={loading ? '…' : radar ? String(radar.hot) : '—'}
                        sub={loading ? 'Загружаем данные…' : radar ? `городов: ${radar.cities} · обновлено ${when(radar.updatedAt)}` : 'Источник недоступен'}
                    />
                    <Stat
                        title="Находки из каналов"
                        value={loading ? '…' : deals ? String(deals.total) : '—'}
                        sub={loading ? 'Загружаем данные…' : deals ? `из них туров: ${deals.tours} · ${when(deals.updatedAt)}` : 'Источник недоступен'}
                    />
                </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
                {PRODUCTS.map(p => (
                    <Card key={p.name}>
                        <CardHeader>
                            <CardTitle>{p.name}</CardTitle>
                            <CardDescription>{p.what}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <p className="m-0 text-ui-sm text-ink-2">{p.who}</p>
                            <div className="flex flex-wrap gap-2">
                                {p.links.map(l => (
                                    <a
                                        key={l.href}
                                        href={l.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-ui-sm text-ink-2 no-underline transition-colors hover:border-line-strong hover:text-ink"
                                    >
                                        {l.label} <ExternalLink size={12} />
                                    </a>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function Stat({ title, value, sub }) {
    return (
        <div className="rounded-control border border-line bg-surface-2 p-4">
            <div className="text-ui-sm text-ink-3">{title}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</div>
            <div className="mt-1 text-ui-sm text-ink-3">{sub}</div>
        </div>
    );
}
