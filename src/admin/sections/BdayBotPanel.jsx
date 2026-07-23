import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button } from '../../ui';

/**
 * BdayBot: место под панель управления ботом. Сама панель живёт вне этого
 * репозитория, поэтому здесь честная заглушка со ссылками и списком того,
 * что нужно, чтобы перенести управление сюда, — а не имитация функционала.
 */
export default function BdayBotPanel() {
    return (
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle>BdayBot</CardTitle>
                        <Badge variant="warn">панель ещё не перенесена</Badge>
                    </div>
                    <CardDescription>
                        Телеграм-бот напоминаний о днях рождения. Управление ботом сейчас находится
                        за пределами сайта — в этом разделе оно появится после переноса.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => window.open('https://t.me/MemoraBDayBot', '_blank', 'noopener')}>
                            Открыть бота <ExternalLink size={14} />
                        </Button>
                        <Button variant="outline" onClick={() => window.open('https://memorasolutions.ru/bday-bot', '_blank', 'noopener')}>
                            Страница на сайте <ExternalLink size={14} />
                        </Button>
                    </div>

                    <div className="rounded-control border border-line bg-black/20 p-4">
                        <div className="text-ui font-semibold text-ink">Что нужно для переноса</div>
                        <ol className="mt-2 mb-0 pl-5 text-ui-sm text-ink-2 leading-relaxed">
                            <li>Сказать, где сейчас живёт панель бота: отдельный репозиторий, сервис на Railway или что-то ещё.</li>
                            <li>Определить, какие данные нужны здесь: список пользователей, статистика напоминаний, рассылки.</li>
                            <li>Дать доступ к API или базе бота (ключи — через переменные окружения, не в чат и не в код).</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
