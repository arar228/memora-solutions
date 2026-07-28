import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Bot,
    CheckCircle2,
    ContactRound,
    CreditCard,
    ExternalLink,
    History,
    Image,
    MessageSquare,
    Radio,
    RefreshCw,
    Search,
    Send,
    ShieldBan,
    ShieldCheck,
    Sparkles,
    Trash2,
    Users,
} from 'lucide-react';
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Select,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '../../ui';
import { adminApi } from '../api';

const FILTERS = [
    { value: 'all', label: 'Все пользователи' },
    { value: 'active_7d', label: 'Активные за 7 дней' },
    { value: 'active_30d', label: 'Активные за 30 дней' },
    { value: 'with_subscription', label: 'С платной подпиской' },
    { value: 'not_blocked', label: 'Все незаблокированные' },
];

const formatDate = (value, withTime = true) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU', withTime
        ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: 'short', year: 'numeric' });
};

const dateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const userTitle = (user) => (
    user.username ? `@${user.username}` : user.full_name || user.first_name || `ID ${user.telegram_id}`
);

export default function BdayBotPanel() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState('');
    const [recipient, setRecipient] = useState('');
    const [directDraft, setDirectDraft] = useState({ message: '', photoUrl: '' });
    const [broadcastDraft, setBroadcastDraft] = useState({
        filter: 'all',
        message: '',
        photoUrl: '',
    });
    const [recipientCount, setRecipientCount] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        return adminApi.getBdayBot()
            .then(next => {
                setData(next);
                if (!recipient && next.users?.length) setRecipient(next.users[0].telegram_id);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [recipient]);

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!data?.configured) return;
        let alive = true;
        setRecipientCount(null);
        adminApi.getBdayRecipientCount(broadcastDraft.filter)
            .then(result => { if (alive) setRecipientCount(result.count); })
            .catch(err => { if (alive) setError(err.message); });
        return () => { alive = false; };
    }, [broadcastDraft.filter, data?.configured]);

    const users = useMemo(() => data?.users || [], [data?.users]);
    const plans = (data?.plans || []).filter(plan => plan.is_active !== false);
    const stats = data?.stats;
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filteredUsers = useMemo(() => {
        if (!normalizedSearch) return users;
        return users.filter(user => [
            user.telegram_id,
            user.username,
            user.full_name,
            user.first_name,
            user.last_name,
            user.plan_display_name,
        ].some(value => String(value || '').toLocaleLowerCase().includes(normalizedSearch)));
    }, [users, normalizedSearch]);

    const run = async (key, action, successText, { reload = true } = {}) => {
        setBusy(key);
        setError('');
        setNotice('');
        try {
            const result = await action();
            setNotice(typeof successText === 'function' ? successText(result) : successText);
            if (reload) await load();
            return result;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setBusy('');
        }
    };

    const chooseRecipient = (telegramId) => {
        setRecipient(String(telegramId));
        setTab('message');
        setNotice(`Получатель выбран: ${userTitle(users.find(user => user.telegram_id === telegramId) || { telegram_id: telegramId })}`);
    };

    const sendDirect = async () => {
        if (!recipient) return setError('Выберите получателя');
        const result = await run(
            'direct',
            () => adminApi.sendBdayMessage({ telegramId: recipient, ...directDraft }),
            'Сообщение отправлено и записано в историю',
        );
        if (result) setDirectDraft({ message: '', photoUrl: '' });
    };

    const previewBroadcast = async () => {
        await run(
            'preview',
            () => adminApi.previewBdayBroadcast(broadcastDraft),
            'Предпросмотр отправлен администратору в Telegram',
            { reload: false },
        );
    };

    const sendBroadcast = async () => {
        const audience = recipientCount ?? 0;
        if (!window.confirm(`Отправить сообщение аудитории: ${audience} чел.?`)) return;
        const result = await run(
            'broadcast',
            () => adminApi.sendBdayBroadcast(broadcastDraft),
            response => `Рассылка завершена: доставлено ${response.sent}, ошибок ${response.errors}`,
        );
        if (result) setBroadcastDraft(current => ({ ...current, message: '', photoUrl: '' }));
    };

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                BdayBot
                                <Badge variant={data?.bot?.online ? 'ok' : 'warn'}>
                                    {loading ? 'подключение…' : data?.bot?.online ? 'бот отвечает' : 'бот недоступен'}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Статистика, пользователи, тарифы и коммуникации Telegram-бота в одной панели.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                                <RefreshCw className={loading ? 'animate-spin' : ''} size={14} /> Обновить
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.open('https://t.me/MemoraBDayBot', '_blank', 'noopener')}>
                                Открыть бота <ExternalLink size={14} />
                            </Button>
                            {data?.adminUrl && (
                                <Button variant="ghost" size="sm" onClick={() => window.open(data.adminUrl, '_blank', 'noopener')}>
                                    Архивная панель <ExternalLink size={14} />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {error && (
                <div className="flex items-start gap-2 rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-ui-sm text-danger">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
                </div>
            )}
            {notice && (
                <div className="flex items-start gap-2 rounded-control border border-ok/40 bg-ok/10 px-4 py-3 text-ui-sm text-ok">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {notice}
                </div>
            )}

            {!loading && data && !data.configured && (
                <Card>
                    <CardHeader>
                        <CardTitle>Подключение базы BdayBot</CardTitle>
                        <CardDescription>
                            Добавьте в Railway переменную <code className="text-ink-2">BDAY_DATABASE_URL</code>
                            с публичным адресом рабочей PostgreSQL BdayBot.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {data?.configured && (
                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="w-full">
                        <TabsTrigger value="overview">Обзор</TabsTrigger>
                        <TabsTrigger value="users">Пользователи</TabsTrigger>
                        <TabsTrigger value="message">Личное сообщение</TabsTrigger>
                        <TabsTrigger value="broadcast">Рассылка</TabsTrigger>
                        <TabsTrigger value="history">История</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <OverviewTab data={data} stats={stats} />
                    </TabsContent>

                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <CardTitle>Пользователи и подписки</CardTitle>
                                        <CardDescription>Поиск, связь, блокировка и изменение тарифа.</CardDescription>
                                    </div>
                                    <label className="relative block w-full sm:w-80">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" size={15} />
                                        <Input
                                            value={search}
                                            onChange={event => setSearch(event.target.value)}
                                            placeholder="Имя, username, Telegram ID…"
                                            className="pl-9"
                                        />
                                    </label>
                                </div>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full min-w-[980px] border-collapse text-left text-ui-sm">
                                    <thead className="text-ink-3">
                                        <tr>
                                            <TableHead>Пользователь</TableHead>
                                            <TableHead>Активность</TableHead>
                                            <TableHead>Контакты</TableHead>
                                            <TableHead>Подписка</TableHead>
                                            <TableHead>Статус и действия</TableHead>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <UserRow
                                                key={user.telegram_id}
                                                user={user}
                                                plans={plans}
                                                busy={busy}
                                                onMessage={() => chooseRecipient(user.telegram_id)}
                                                onRun={run}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                                {!filteredUsers.length && (
                                    <p className="m-0 py-8 text-center text-ink-3">Пользователи не найдены</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="message">
                        <MessageComposer
                            users={users}
                            recipient={recipient}
                            setRecipient={setRecipient}
                            draft={directDraft}
                            setDraft={setDirectDraft}
                            busy={busy === 'direct'}
                            onSend={sendDirect}
                        />
                    </TabsContent>

                    <TabsContent value="broadcast">
                        <BroadcastComposer
                            draft={broadcastDraft}
                            setDraft={setBroadcastDraft}
                            recipientCount={recipientCount}
                            busy={busy}
                            onPreview={previewBroadcast}
                            onSend={sendBroadcast}
                        />
                    </TabsContent>

                    <TabsContent value="history">
                        <HistoryTab broadcasts={data.broadcasts || []} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

function OverviewTab({ data, stats }) {
    const deliveryTotal = (stats?.messages_sent || 0) + (stats?.messages_failed || 0);
    const deliveryRate = deliveryTotal
        ? Math.round((stats.messages_sent / deliveryTotal) * 100)
        : 100;
    return (
        <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat icon={Users} label="Пользователи" value={stats?.total_users} sub={`активны 7 дней: ${stats?.active_users_7d ?? 0}`} />
                <Stat icon={ContactRound} label="Контакты" value={stats?.total_contacts} sub={`добавлено за 2 недели: ${stats?.contacts_last_2_weeks ?? 0}`} />
                <Stat icon={Sparkles} label="Поздравления" value={stats?.total_generations} sub={`сегодня: ${stats?.generations_today ?? 0}`} />
                <Stat icon={Radio} label="Рассылки" value={stats?.broadcasts_total} sub={`доставляемость: ${deliveryRate}%`} />
            </div>

            <DetailedActivity stats={stats} />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle>Состояние продукта</CardTitle>
                        <CardDescription>Рабочие метрики, которые помогают оценить активность и качество доставки.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <MiniStat label="Активны 30 дней" value={stats?.active_users_30d} />
                        <MiniStat label="Заблокированы" value={stats?.blocked_users} />
                        <MiniStat label="Генерации за неделю" value={stats?.generations_week} />
                        <MiniStat label="Генерации за месяц" value={stats?.generations_month} />
                        <MiniStat label="Сообщений доставлено" value={stats?.messages_sent} />
                        <MiniStat label="Ошибок доставки" value={stats?.messages_failed} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bot size={16} /> Telegram-бот</CardTitle>
                        <CardDescription>Проверка выполняется через Telegram API, а не по локальному PID.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex items-center justify-between rounded-control border border-line bg-surface-2 px-3 py-3">
                            <span className="text-ink-2">Состояние</span>
                            <Badge variant={data.bot?.online ? 'ok' : 'warn'}>
                                {data.bot?.online ? 'онлайн' : 'нет ответа'}
                            </Badge>
                        </div>
                        {data.bot?.username && (
                            <a
                                href={`https://t.me/${data.bot.username}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-control border border-line bg-surface-2 px-3 py-3 text-brand no-underline"
                            >
                                @{data.bot.username}
                            </a>
                        )}
                        {data.bot?.reason && <p className="m-0 text-ui-sm text-warn">{data.bot.reason}</p>}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CreditCard size={16} /> Тарифы</CardTitle>
                    <CardDescription>Действующие планы и количество активных подписок.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(data.plans || []).map(plan => (
                        <div key={plan.id} className="rounded-control border border-line bg-surface-2 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <strong className="text-ink">{plan.display_name}</strong>
                                    <div className="mt-1 text-ui-sm text-ink-3">
                                        до {plan.max_contacts} контактов
                                    </div>
                                </div>
                                <span className="text-2xl font-extrabold tabular-nums text-brand">{plan.active}</span>
                            </div>
                            <div className="mt-3 text-ui-sm text-ink-2">
                                {plan.price_monthly ? `${(plan.price_monthly / 100).toLocaleString('ru-RU')} ₽/мес.` : 'Бесплатно'}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

function DetailedActivity({ stats }) {
    const dailyStats = stats?.daily_stats || [];
    const dailyMax = Math.max(
        1,
        ...dailyStats.flatMap(day => [Number(day.contacts) || 0, Number(day.generations) || 0]),
    );

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Методы добавления контактов</CardTitle>
                    <CardDescription>Полная воронка действий из прежней панели.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <ProgressMetric
                        label="Пошаговый ввод"
                        started={stats?.step_input_start}
                        completed={stats?.step_input_complete}
                        rate={stats?.step_input_completion_rate}
                    />
                    <ProgressMetric
                        label="Свободный ввод"
                        started={stats?.free_input_start}
                        completed={stats?.free_input_complete}
                        rate={stats?.free_input_completion_rate}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Генерации поздравлений</CardTitle>
                    <CardDescription>Источники, повторы и динамика за последние 7 дней.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2">
                        <MiniStat label="Главное меню" value={stats?.generate_from_main} />
                        <MiniStat label="Контакт" value={stats?.generate_from_contact} />
                        <MiniStat label="Генерация" value={stats?.generate_from_generate} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-ui-sm text-ink-2">
                        <span>Всего: <strong className="text-ink">{stats?.generate_greeting ?? 0}</strong></span>
                        <span>Регенераций: <strong className="text-ink">{stats?.regenerate_greeting ?? 0}</strong></span>
                        <Badge variant={Number(stats?.regenerate_rate) > 35 ? 'warn' : 'muted'}>
                            {stats?.regenerate_rate ?? 0}% повторов
                        </Badge>
                    </div>
                    <div className="grid grid-cols-7 gap-2" aria-label="Активность за последние 7 дней">
                        {dailyStats.map(day => (
                            <div key={day.date} className="flex min-w-0 flex-col items-center gap-2">
                                <div className="flex h-20 w-full items-end justify-center gap-1 rounded-control bg-surface-2 px-1.5 pt-2">
                                    <span
                                        className="w-2 rounded-t bg-brand/80"
                                        style={{ height: `${Math.max(3, (Number(day.generations) / dailyMax) * 100)}%` }}
                                        title={`${day.generations} генераций`}
                                    />
                                    <span
                                        className="w-2 rounded-t bg-ok/70"
                                        style={{ height: `${Math.max(3, (Number(day.contacts) / dailyMax) * 100)}%` }}
                                        title={`${day.contacts} контактов`}
                                    />
                                </div>
                                <span className="text-[10px] text-ink-3">{day.date}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 text-[11px] text-ink-3">
                        <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand/80" />генерации</span>
                        <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-ok/70" />контакты</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ProgressMetric({ label, started, completed, rate }) {
    const safeRate = Math.max(0, Math.min(100, Number(rate) || 0));
    return (
        <div className="rounded-control border border-line bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-3">
                <strong className="text-ink">{label}</strong>
                <span className="font-bold tabular-nums text-brand">{safeRate}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
                <div className="h-full rounded-full bg-brand" style={{ width: `${safeRate}%` }} />
            </div>
            <div className="mt-3 flex justify-between text-ui-sm text-ink-3">
                <span>{started ?? 0} начали</span>
                <span>{completed ?? 0} завершили</span>
            </div>
        </div>
    );
}

function UserRow({ user, plans, busy, onMessage, onRun }) {
    const [planName, setPlanName] = useState(user.plan_name || 'free');
    const [expiresAt, setExpiresAt] = useState(dateInputValue(user.expires_at));
    const key = user.telegram_id;
    const isBusy = busy.startsWith(`${key}:`);

    const saveSubscription = () => onRun(
        `${key}:subscription`,
        () => adminApi.updateBdaySubscription(key, { planName, expiresAt: expiresAt || null }),
        `Подписка ${userTitle(user)} обновлена`,
    );

    const toggleBlock = () => onRun(
        `${key}:block`,
        () => adminApi.setBdayUserBlocked(key, !user.is_blocked),
        user.is_blocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован',
    );

    const disableSubscription = () => {
        if (!window.confirm(`Перевести ${userTitle(user)} на тариф Free?`)) return;
        onRun(
            `${key}:disable`,
            () => adminApi.disableBdaySubscription(key),
            'Пользователь переведён на тариф Free',
        );
    };

    const remove = () => {
        const confirmation = window.prompt(
            `Будут удалены пользователь ${userTitle(user)} и связанные данные.\nВведите Telegram ID ${key} для подтверждения:`,
        );
        if (confirmation !== String(key)) return;
        onRun(
            `${key}:delete`,
            () => adminApi.deleteBdayUser(key),
            'Пользователь и связанные данные удалены',
        );
    };

    return (
        <tr className={user.is_blocked ? 'opacity-60' : ''}>
            <td className="border-b border-line/60 px-2 py-3">
                {user.username
                    ? <a className="font-semibold text-brand no-underline" href={`https://t.me/${user.username}`} target="_blank" rel="noreferrer">@{user.username}</a>
                    : <strong className="text-ink">{user.full_name || user.first_name || 'Без имени'}</strong>}
                <div className="mt-1 font-mono text-[11px] text-ink-3">{user.telegram_id}</div>
                <div className="mt-1 text-[11px] text-ink-3">с {formatDate(user.created_at, false)}</div>
            </td>
            <td className="border-b border-line/60 px-2 py-3 text-ink-2">
                {formatDate(user.last_activity)}
            </td>
            <td className="border-b border-line/60 px-2 py-3">
                <strong className="tabular-nums text-ink">{user.contact_count}</strong>
                <span className="text-ink-3"> / {user.max_contacts ?? '—'}</span>
            </td>
            <td className="border-b border-line/60 px-2 py-3">
                <div className="grid grid-cols-[110px_135px_auto] gap-2">
                    <Select value={planName} onChange={event => setPlanName(event.target.value)} className="h-8">
                        {plans.map(plan => <option key={plan.name} value={plan.name}>{plan.display_name}</option>)}
                    </Select>
                    <Input
                        type="date"
                        value={expiresAt}
                        onChange={event => setExpiresAt(event.target.value)}
                        className="h-8"
                        aria-label={`Срок подписки ${userTitle(user)}`}
                    />
                    <Button size="sm" variant="outline" onClick={saveSubscription} disabled={isBusy}>Сохранить</Button>
                </div>
                <button
                    type="button"
                    className="mt-2 cursor-pointer border-none bg-transparent p-0 text-[11px] text-ink-3 hover:text-brand"
                    onClick={disableSubscription}
                >
                    Сбросить на Free
                </button>
            </td>
            <td className="border-b border-line/60 px-2 py-3">
                <div className="mb-2">
                    <Badge variant={user.is_blocked ? 'warn' : 'ok'}>
                        {user.is_blocked ? 'заблокирован' : 'активен'}
                    </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                    <Button size="icon" variant="ghost" title="Написать" onClick={onMessage} disabled={isBusy}>
                        <MessageSquare size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" title={user.is_blocked ? 'Разблокировать' : 'Заблокировать'} onClick={toggleBlock} disabled={isBusy}>
                        {user.is_blocked ? <ShieldCheck size={14} /> : <ShieldBan size={14} />}
                    </Button>
                    <Button size="icon" variant="ghost" title="Удалить" onClick={remove} disabled={isBusy} className="hover:text-danger">
                        <Trash2 size={14} />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

function MessageComposer({ users, recipient, setRecipient, draft, setDraft, busy, onSend }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare size={16} /> Личное сообщение</CardTitle>
                <CardDescription>Отправка текста или изображения конкретному пользователю через рабочий Telegram-бот.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
                <div className="flex flex-col gap-4">
                    <Field label="Получатель">
                        <Select value={recipient} onChange={event => setRecipient(event.target.value)}>
                            {users.map(user => (
                                <option key={user.telegram_id} value={user.telegram_id}>
                                    {userTitle(user)} · {user.telegram_id}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Сообщение">
                        <textarea
                            value={draft.message}
                            onChange={event => setDraft(current => ({ ...current, message: event.target.value }))}
                            rows={10}
                            maxLength={4096}
                            placeholder="Текст сообщения. Поддерживается Telegram HTML."
                            className="w-full resize-y rounded-control border border-line bg-surface-2 p-3 text-ui text-ink outline-none placeholder:text-ink-3 focus:border-brand"
                        />
                    </Field>
                    <Field label="Ссылка на изображение — необязательно">
                        <Input
                            type="url"
                            value={draft.photoUrl}
                            onChange={event => setDraft(current => ({ ...current, photoUrl: event.target.value }))}
                            placeholder="https://…"
                        />
                    </Field>
                    <Button onClick={onSend} disabled={busy || !draft.message.trim()}>
                        {busy ? <RefreshCw className="animate-spin" size={15} /> : <Send size={15} />}
                        Отправить сообщение
                    </Button>
                </div>
                <ComposerHint />
            </CardContent>
        </Card>
    );
}

function BroadcastComposer({ draft, setDraft, recipientCount, busy, onPreview, onSend }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Radio size={16} /> Массовая рассылка</CardTitle>
                        <CardDescription>Сегментация аудитории, предпросмотр и фиксация результата в истории.</CardDescription>
                    </div>
                    <Badge variant="default">
                        получателей: {recipientCount === null ? '…' : recipientCount}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
                <div className="flex flex-col gap-4">
                    <Field label="Аудитория">
                        <Select
                            value={draft.filter}
                            onChange={event => setDraft(current => ({ ...current, filter: event.target.value }))}
                        >
                            {FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
                        </Select>
                    </Field>
                    <Field label="Сообщение">
                        <textarea
                            value={draft.message}
                            onChange={event => setDraft(current => ({ ...current, message: event.target.value }))}
                            rows={11}
                            maxLength={4096}
                            placeholder="Текст рассылки. Поддерживается Telegram HTML."
                            className="w-full resize-y rounded-control border border-line bg-surface-2 p-3 text-ui text-ink outline-none placeholder:text-ink-3 focus:border-brand"
                        />
                    </Field>
                    <Field label="Ссылка на изображение — необязательно">
                        <Input
                            type="url"
                            value={draft.photoUrl}
                            onChange={event => setDraft(current => ({ ...current, photoUrl: event.target.value }))}
                            placeholder="https://…"
                        />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={onPreview} disabled={busy === 'preview' || !draft.message.trim()}>
                            {busy === 'preview' ? <RefreshCw className="animate-spin" size={15} /> : <Image size={15} />}
                            Предпросмотр себе
                        </Button>
                        <Button onClick={onSend} disabled={busy === 'broadcast' || !draft.message.trim() || !recipientCount}>
                            {busy === 'broadcast' ? <RefreshCw className="animate-spin" size={15} /> : <Send size={15} />}
                            Запустить рассылку
                        </Button>
                    </div>
                </div>
                <ComposerHint broadcast />
            </CardContent>
        </Card>
    );
}

function ComposerHint({ broadcast = false }) {
    return (
        <div className="rounded-control border border-line bg-surface-2 p-4 text-ui-sm text-ink-2">
            <strong className="text-ink">Перед отправкой</strong>
            <ul className="mb-0 mt-3 flex flex-col gap-2 pl-5">
                <li>Проверьте ссылки и разметку HTML.</li>
                <li>Изображение отправляется как фото с подписью.</li>
                {broadcast && <li>Сначала отправьте предпросмотр себе.</li>}
                <li>Успехи и ошибки сохраняются в истории.</li>
            </ul>
        </div>
    );
}

function HistoryTab({ broadcasts }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History size={16} /> История сообщений</CardTitle>
                <CardDescription>Последние 100 личных сообщений и массовых рассылок.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left text-ui-sm">
                    <thead className="text-ink-3">
                        <tr>
                            <TableHead>Дата</TableHead>
                            <TableHead>Тип</TableHead>
                            <TableHead>Сообщение</TableHead>
                            <TableHead>Аудитория</TableHead>
                            <TableHead>Результат</TableHead>
                        </tr>
                    </thead>
                    <tbody>
                        {broadcasts.map(item => (
                            <tr key={item.id}>
                                <td className="border-b border-line/60 px-2 py-3 text-ink-2">{formatDate(item.created_at)}</td>
                                <td className="border-b border-line/60 px-2 py-3">
                                    <Badge variant={item.target_type === 'single' ? 'muted' : 'default'}>
                                        {item.target_type === 'single' ? 'личное' : 'рассылка'}
                                    </Badge>
                                </td>
                                <td className="max-w-[430px] border-b border-line/60 px-2 py-3 text-ink">
                                    <div className="line-clamp-3 whitespace-pre-wrap">{item.message_text}</div>
                                    {item.photo_url && (
                                        <a href={item.photo_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-brand no-underline">
                                            изображение ↗
                                        </a>
                                    )}
                                </td>
                                <td className="border-b border-line/60 px-2 py-3 text-ink-2">
                                    {item.target_user_id || FILTERS.find(filter => filter.value === item.filter_criteria)?.label || 'Все'}
                                </td>
                                <td className="border-b border-line/60 px-2 py-3">
                                    <span className="text-ok">{item.total_sent} доставлено</span>
                                    {item.total_errors > 0 && <div className="text-danger">{item.total_errors} ошибок</div>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!broadcasts.length && <p className="m-0 py-8 text-center text-ink-3">История пока пуста</p>}
            </CardContent>
        </Card>
    );
}

function Field({ label, children }) {
    return (
        <label className="flex flex-col gap-1.5">
            <Label>{label}</Label>
            {children}
        </label>
    );
}

function TableHead({ children }) {
    return <th className="border-b border-line px-2 py-2 font-medium">{children}</th>;
}

function MiniStat({ label, value }) {
    return (
        <div className="rounded-control border border-line bg-surface-2 p-3">
            <div className="text-ui-sm text-ink-3">{label}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-ink">{value ?? '—'}</div>
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
