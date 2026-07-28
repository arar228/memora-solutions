import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Users, ContactRound, Sparkles, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button } from '../../ui';
import { adminApi } from '../api';

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function BdayBotPanel() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        adminApi.getBdayBot()
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(load, [load]);

    const stats = data?.stats;

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <CardTitle>BdayBot</CardTitle>
                            <CardDescription className="mt-1">
                                Живые показатели Telegram-бота из его рабочей базы.
                            </CardDescription>
                        </div>
                        <Badge variant={data?.configured ? 'ok' : 'warn'}>
                            {loading ? 'подключение…' : data?.configured ? 'база подключена' : 'нужна настройка'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={14} /> Обновить
                    </Button>
                    <Button variant="outline" onClick={() => window.open('https://t.me/MemoraBDayBot', '_blank', 'noopener')}>
                        Открыть бота <ExternalLink size={14} />
                    </Button>
                    {data?.adminUrl && (
                        <Button variant="outline" onClick={() => window.open(data.adminUrl, '_blank', 'noopener')}>
                            Старая панель <ExternalLink size={14} />
                        </Button>
                    )}
                </CardContent>
            </Card>

            {error && (
                <div className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-ui-sm text-danger">
                    Не удалось получить данные BdayBot: {error}
                </div>
            )}

            {!loading && data && !data.configured && (
                <Card>
                    <CardHeader>
                        <CardTitle>Подключение базы BdayBot</CardTitle>
                        <CardDescription>
                            Код панели уже подключён. В сервис сайта на Railway нужно добавить
                            секретную переменную <code className="text-ink-2">BDAY_DATABASE_URL</code>
                            с адресом рабочей базы BdayBot. Значение не попадает в браузер или репозиторий.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {stats && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Stat icon={Users} label="Пользователи" value={stats.total_users} sub={`активны 7 дней: ${stats.active_users_7d}`} />
                        <Stat icon={ContactRound} label="Контакты" value={stats.total_contacts} sub={`активны 30 дней: ${stats.active_users_30d}`} />
                        <Stat icon={Sparkles} label="Поздравления" value={stats.total_generations} sub={`сегодня: ${stats.generations_today}`} />
                        <Stat icon={Radio} label="Рассылки" value={stats.broadcasts_total} sub="история отправок" />
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Недавно активные пользователи</CardTitle>
                                <CardDescription>Последние 25 записей по времени активности.</CardDescription>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-ui-sm">
                                    <thead className="text-ink-3">
                                        <tr>
                                            <th className="border-b border-line px-2 py-2 font-medium">Пользователь</th>
                                            <th className="border-b border-line px-2 py-2 font-medium">Telegram ID</th>
                                            <th className="border-b border-line px-2 py-2 font-medium">Активность</th>
                                            <th className="border-b border-line px-2 py-2 font-medium">Статус</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.users || []).map(user => (
                                            <tr key={user.telegram_id}>
                                                <td className="border-b border-line/60 px-2 py-2 text-ink">
                                                    {user.username
                                                        ? <a className="text-brand no-underline" href={`https://t.me/${user.username}`} target="_blank" rel="noreferrer">@{user.username}</a>
                                                        : user.full_name || 'без имени'}
                                                </td>
                                                <td className="border-b border-line/60 px-2 py-2 font-mono text-ink-2">{user.telegram_id}</td>
                                                <td className="border-b border-line/60 px-2 py-2 text-ink-2">{formatDate(user.last_activity)}</td>
                                                <td className="border-b border-line/60 px-2 py-2">
                                                    <Badge variant={user.is_blocked ? 'warn' : 'ok'}>{user.is_blocked ? 'заблокирован' : 'активен'}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Подписки</CardTitle>
                                <CardDescription>Активные подписки по тарифам.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                {(data.plans || []).map(plan => (
                                    <div key={plan.display_name} className="flex items-center justify-between rounded-control border border-line bg-black/20 px-3 py-2">
                                        <span className="text-ink-2">{plan.display_name}</span>
                                        <strong className="tabular-nums text-ink">{plan.active}</strong>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

function Stat({ icon: Icon, label, value, sub }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 pt-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-brand-dim text-brand">
                    <Icon size={18} />
                </div>
                <div>
                    <div className="text-ui-sm text-ink-3">{label}</div>
                    <div className="text-2xl font-extrabold tabular-nums text-ink">{value ?? '—'}</div>
                    <div className="text-ui-sm text-ink-3">{sub}</div>
                </div>
            </CardContent>
        </Card>
    );
}
