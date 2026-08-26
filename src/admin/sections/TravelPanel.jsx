import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Ban, Bot, CreditCard, ExternalLink, RefreshCw, Search, Send, Trash2, UserPlus,
} from 'lucide-react';
import {
    Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select,
} from '../../ui';
import { adminApi } from '../api';

const STATUS = {
    awaiting_telegram: ['ожидает Telegram', 'warn'],
    awaiting_payment: ['готов к активации', 'warn'],
    active: ['активен', 'ok'],
    canceling: ['завершится в срок', 'muted'],
    canceled: ['завершён', 'muted'],
    past_due: ['срок завершён', 'muted'],
};

const formatDate = (value, withTime = true) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU', withTime
        ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: 'short', year: 'numeric' });
};

const dateInputValue = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
};

const subscriptionTitle = item => (
    item.telegramUsername ? `@${item.telegramUsername}` : item.email || 'Подписка'
);

const placeLabel = filter => filter?.value || 'Любое направление';

export default function TravelPanel() {
    const [radar, setRadar] = useState(null);
    const [deals, setDeals] = useState(null);
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState('');
    const [search, setSearch] = useState('');
    const [grant, setGrant] = useState({ username: '', days: '30' });

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        return Promise.all([
            adminApi.getOverview(),
            adminApi.getTravel(),
        ])
            .then(([overview, nextAdmin]) => {
                setRadar(overview?.radar || null);
                setDeals(overview?.deals || null);
                setAdmin(nextAdmin);
                if (overview?.unavailable?.length) {
                    setError(`Источники данных недоступны: ${overview.unavailable.join(', ')}`);
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const run = async (key, action, successText) => {
        setBusy(key);
        setError('');
        setNotice('');
        try {
            const result = await action();
            setNotice(typeof successText === 'function' ? successText(result) : successText);
            await load();
            return result;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setBusy('');
        }
    };

    const grantByUsername = async () => {
        const username = grant.username.trim();
        if (!username) return setError('Укажите Telegram-имя пользователя');
        const result = await run(
            'grant',
            () => adminApi.grantTravelAccess({ username, days: Number(grant.days) }),
            response => response.messageSent
                ? `Доступ ${username} активирован, сообщение отправлено`
                : `Доступ ${username} активирован`,
        );
        if (result) setGrant(current => ({ ...current, username: '' }));
    };

    const subscriptions = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        const items = admin?.subscriptions || [];
        if (!query) return items;
        return items.filter(item => [
            item.telegramUsername, item.email, item.status, item.filters?.origin?.value, item.filters?.destination?.value,
        ].some(value => String(value || '').toLocaleLowerCase().includes(query)));
    }, [admin?.subscriptions, search]);

    const stats = admin?.stats || {};

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <CardTitle>Платные пользователи</CardTitle>
                            <CardDescription>Подписки, сроки доступа и сообщения пользователям.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={admin?.capabilities?.subscriptionsAvailable ? 'ok' : 'warn'}>
                                {admin?.capabilities?.subscriptionsAvailable ? 'сервис подключён' : 'требуется настройка'}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                                <RefreshCw size={16} /> Обновить
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Stat title="Всего" value={stats.total || 0} sub="созданных подписок" />
                        <Stat title="Telegram" value={stats.connected || 0} sub="подключённых чатов" />
                        <Stat title="Активные" value={stats.active || 0} sub="получают уведомления" />
                        <Stat title="К активации" value={stats.awaitingPayment || 0} sub="Telegram подключён" />
                    </div>

                    <div className="grid gap-3 rounded-control border border-line bg-surface-2 p-4 lg:grid-cols-[minmax(240px,1fr)_180px_auto] lg:items-end">
                        <Field label="Telegram-пользователь">
                            <Input
                                value={grant.username}
                                onChange={event => setGrant({ ...grant, username: event.target.value })}
                                placeholder="@username"
                            />
                        </Field>
                        <Field label="Тестовый период">
                            <Select value={grant.days} onChange={event => setGrant({ ...grant, days: event.target.value })}>
                                <option value="14">14 дней</option>
                                <option value="30">30 дней</option>
                                <option value="60">60 дней</option>
                                <option value="90">90 дней</option>
                            </Select>
                        </Field>
                        <Button onClick={grantByUsername} disabled={busy === 'grant'}>
                            <UserPlus size={18} /> Выдать доступ
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" size={18} />
                        <Input
                            className="pl-10"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Имя, email, направление или статус"
                            aria-label="Поиск подписок"
                        />
                    </div>

                    {error && <p className="m-0 rounded-control border border-danger/30 bg-danger/10 p-3 text-danger">{error}</p>}
                    {notice && <p className="m-0 rounded-control border border-ok/30 bg-ok/10 p-3 text-ok">{notice}</p>}

                    <div className="overflow-x-auto rounded-control border border-line">
                        <table className="w-full min-w-[980px] border-collapse text-left">
                            <thead className="bg-surface-2 text-ink-3">
                                <tr>
                                    <th className="px-3 py-3 font-semibold">Пользователь</th>
                                    <th className="px-3 py-3 font-semibold">Настройки</th>
                                    <th className="px-3 py-3 font-semibold">Статус</th>
                                    <th className="px-3 py-3 font-semibold">Доступ до</th>
                                    <th className="px-3 py-3 font-semibold">Управление</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.map(item => (
                                    <SubscriptionRow key={item.id} item={item} busy={busy} run={run} />
                                ))}
                                {!subscriptions.length && (
                                    <tr><td colSpan="5" className="px-3 py-8 text-center text-ink-3">Подключите первого тестового пользователя</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle>Лента предложений</CardTitle>
                        <a className="inline-flex items-center gap-2 text-brand no-underline" href="https://memorasolutions.ru/travel-radar" target="_blank" rel="noopener noreferrer">
                            Открыть продукт <ExternalLink size={16} />
                        </a>
                    </div>
                    <CardDescription>Состояние предложений, которые сейчас видят пользователи.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat title="Всего находок" value={deals?.total || 0} sub={`обновлено ${formatDate(deals?.updatedAt)}`} />
                    <Stat title="Билеты" value={deals?.flights || 0} sub="в текущей ленте" />
                    <Stat title="Туры" value={deals?.tours || 0} sub="в текущей ленте" />
                    <Stat title="С экономией" value={deals?.withSavings || 0} sub={`из ${deals?.flights || 0} билетов`} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Служебные данные</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat title="Горящие билеты" value={radar?.hot || 0} sub={`обновлено ${formatDate(radar?.updatedAt)}`} />
                    <Stat title="Города вылета" value={radar?.cities || 0} sub="в подборе" />
                    <Stat title="Стыковочные плечи" value={radar?.legs || 0} sub="в маршрутах" />
                    <Stat title="Календари цен" value={radar?.calendars || 0} sub="маршрутов" />
                </CardContent>
            </Card>
        </div>
    );
}

function SubscriptionRow({ item, busy, run }) {
    const [expiresAt, setExpiresAt] = useState(dateInputValue(item.currentPeriodEnd));
    const key = item.id;
    const isBusy = busy.startsWith(key);
    const status = STATUS[item.status] || [item.status, 'muted'];

    useEffect(() => setExpiresAt(dateInputValue(item.currentPeriodEnd)), [item.currentPeriodEnd]);

    const save = () => run(
        `${key}:grant`,
        () => adminApi.grantTravelSubscription(key, { expiresAt }),
        response => response.messageSent
            ? `Доступ ${subscriptionTitle(item)} обновлён, сообщение отправлено`
            : `Доступ ${subscriptionTitle(item)} обновлён`,
    );

    const disable = () => {
        if (!window.confirm(`Завершить доступ ${subscriptionTitle(item)}?`)) return;
        run(`${key}:disable`, () => adminApi.disableTravelSubscription(key), 'Доступ завершён');
    };

    const message = () => {
        const text = window.prompt(`Сообщение для ${subscriptionTitle(item)}:`);
        if (!text?.trim()) return;
        run(`${key}:message`, () => adminApi.sendTravelMessage(key, text), 'Сообщение отправлено');
    };

    const remove = () => {
        const confirmation = window.prompt(`Введите DELETE для удаления ${subscriptionTitle(item)}:`);
        if (confirmation !== 'DELETE') return;
        run(`${key}:delete`, () => adminApi.deleteTravelSubscription(key), 'Подписка удалена');
    };

    return (
        <tr>
            <td className="border-t border-line px-3 py-3 align-top">
                {item.telegramUsername
                    ? <a className="font-semibold text-brand no-underline" href={`https://t.me/${item.telegramUsername}`} target="_blank" rel="noreferrer">@{item.telegramUsername}</a>
                    : <strong className="text-ink">Telegram подключается</strong>}
                <div className="mt-1 text-ink-3">{item.email}</div>
                <div className="mt-1 text-ink-3">с {formatDate(item.createdAt, false)}</div>
            </td>
            <td className="border-t border-line px-3 py-3 align-top text-ink-2">
                <div>{placeLabel(item.filters?.origin)} → {placeLabel(item.filters?.destination)}</div>
                <div className="mt-1 text-ink-3">
                    {item.filters?.dealType === 'flight' ? 'Билеты' : item.filters?.dealType === 'tour' ? 'Туры' : 'Все предложения'}
                    {item.filters?.maxPrice ? ` · до ${Number(item.filters.maxPrice).toLocaleString('ru-RU')} ₽` : ''}
                </div>
            </td>
            <td className="border-t border-line px-3 py-3 align-top">
                <Badge variant={status[1]}>{status[0]}</Badge>
                {item.manualAccess && <div className="mt-2"><Badge variant="default">тестовый доступ</Badge></div>}
                <div className="mt-2 flex items-center gap-2 text-ink-3">
                    {item.telegramConnected ? <Bot size={16} /> : <CreditCard size={16} />}
                    {item.telegramConnected ? 'чат подключён' : 'ожидает подключения'}
                </div>
            </td>
            <td className="border-t border-line px-3 py-3 align-top">
                <Input type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} aria-label={`Доступ ${subscriptionTitle(item)}`} />
                <div className="mt-1 text-ink-3">{formatDate(item.currentPeriodEnd, false)}</div>
            </td>
            <td className="border-t border-line px-3 py-3 align-top">
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={save} disabled={isBusy || !item.telegramConnected || !expiresAt}>Сохранить</Button>
                    <Button size="icon" variant="ghost" title="Написать" onClick={message} disabled={isBusy || !item.telegramConnected}><Send size={17} /></Button>
                    <Button size="icon" variant="ghost" title="Завершить доступ" onClick={disable} disabled={isBusy}><Ban size={17} /></Button>
                    <Button size="icon" variant="ghost" title="Удалить" onClick={remove} disabled={isBusy}><Trash2 size={17} /></Button>
                </div>
            </td>
        </tr>
    );
}

function Field({ label, children }) {
    return <label className="grid gap-2"><Label>{label}</Label>{children}</label>;
}

function Stat({ title, value, sub }) {
    return (
        <div className="rounded-control border border-line bg-surface-2 p-4">
            <div className="text-ink-3">{title}</div>
            <div className="mt-1 font-extrabold tabular-nums text-ink">{value}</div>
            <div className="mt-1 text-ink-3">{sub}</div>
        </div>
    );
}
