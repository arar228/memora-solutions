import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button } from '../../ui';

/**
 * Радар путешествий: показывает состояние лент, которыми живёт продукт.
 * Данные читаются из тех же файлов, что и сайт, — то есть панель показывает
 * ровно то, что сейчас видят пользователи.
 */
export default function TravelPanel() {
    const [radar, setRadar] = useState(null);
    const [deals, setDeals] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        Promise.all([
            fetch('/radar.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
            fetch('/hot-deals.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
        ]).then(([r, d]) => { setRadar(r); setDeals(d); setLoading(false); });
    };
    useEffect(load, []);

    const when = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? '—'
            : d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const tours = (deals?.deals || []).filter(x => x.type === 'tour');
    const flights = (deals?.deals || []).filter(x => x.type === 'flight');
    const withSavings = (deals?.deals || []).filter(x => x.savings);

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle>Ленты радара</CardTitle>
                        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                            <RefreshCw size={14} /> Обновить
                        </Button>
                    </div>
                    <CardDescription>
                        Данные собираются по расписанию и лежат в файлах, которые читает сайт.
                        Если цифры не меняются много часов — значит сбор упал, это первый признак проблемы.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat title="Горящие билеты" value={(radar?.hotFlights || []).length} sub={`обновлено ${when(radar?.updatedAt)}`} />
                    <Stat title="Городов вылета" value={(radar?.cheapFrom || []).length} sub="в подборе направлений" />
                    <Stat title="Плечи для стыковок" value={(radar?.stitchLegs || []).length} sub="перелёты до городов туров" />
                    <Stat title="Календари цен" value={(radar?.calendars || []).length} sub="маршрутов" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle>Находки из Telegram-каналов</CardTitle>
                        <Badge variant={tours.length ? 'ok' : 'muted'}>{when(deals?.updatedAt)}</Badge>
                    </div>
                    <CardDescription>
                        Предложения, вытащенные из тревел-каналов и переупакованные с нашей партнёрской ссылкой.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Stat title="Всего находок" value={(deals?.deals || []).length} sub="после разбора постов" />
                        <Stat title="Туры" value={tours.length} sub="для модуля горящих туров" />
                        <Stat title="С посчитанной экономией" value={withSavings.length} sub={`из ${flights.length} авиа`} />
                    </div>

                    {withSavings.length === 0 && tours.length > 0 && (
                        <p className="m-0 rounded-control border border-warn/40 bg-warn/10 p-3 text-ui-sm text-ink-2">
                            У туров пока нет «обычной цены», поэтому экономию в рублях показать не из чего.
                            Это решается подключением API туроператоров (Level.Travel / Travelata) — нужны ключи в настройках проекта.
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <a className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-ui-sm text-ink-2 no-underline hover:text-ink"
                            href="https://memorasolutions.ru/travel-radar-3" target="_blank" rel="noopener noreferrer">
                            Радар 3.0 <ExternalLink size={12} />
                        </a>
                        <a className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-ui-sm text-ink-2 no-underline hover:text-ink"
                            href="https://memorasolutions.ru/travel-radar-4" target="_blank" rel="noopener noreferrer">
                            Радар 4.0 <ExternalLink size={12} />
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Stat({ title, value, sub }) {
    return (
        <div className="rounded-control border border-line bg-black/20 p-4">
            <div className="text-ui-sm text-ink-3">{title}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</div>
            <div className="mt-1 text-ui-sm text-ink-3">{sub}</div>
        </div>
    );
}
