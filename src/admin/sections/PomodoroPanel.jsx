import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Copy, Download, Check, Save } from 'lucide-react';
import {
    Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
    Label, Slider, Badge,
} from '../../ui';
import { adminApi } from '../api';

/**
 * Панель Помодоро: крутим раскладку приложения ползунками и сразу видим
 * результат в живой копии справа (тот же самый билд, что и на сайте).
 *
 * Как это работает: приложение размечено CSS-переменными («токенами»).
 * Панель меняет их прямо в превью, поэтому изменения видно мгновенно, без
 * пересборки. Кнопка публикации сохраняет значения в общее хранилище:
 * их сразу получают и web, и подключённые к интернету desktop-клиенты.
 */

// Дефолты обязаны совпадать с tokens.json и :root в app.css.
const DEFAULTS = {
    'mp-col': 480,
    'mp-gap': 6,
    'mp-row-h': 40,
    'mp-ctrl-h': 46,
    'mp-radius': 10,
    'mp-pad-x': 15,
    'mp-pad-y': 12,
    'mp-scene-ratio': 2.6,
    'mp-scene-h': 185,
};

const CONTROLS = [
    { key: 'mp-col', label: 'Ширина рабочей колонки', min: 320, max: 540, step: 4, unit: 'px', hint: 'По ней выравниваются кнопки, цифры и шкала прогресса.' },
    { key: 'mp-gap', label: 'Зазор между блоками', min: 0, max: 24, step: 1, unit: 'px', hint: 'Вертикальное расстояние между рядами.' },
    { key: 'mp-row-h', label: 'Высота кнопок-режимов', min: 30, max: 64, step: 1, unit: 'px', hint: 'Таймер / Секундомер / Фокус / Пауза.' },
    { key: 'mp-ctrl-h', label: 'Высота кнопок управления', min: 32, max: 72, step: 1, unit: 'px', hint: 'Сброс / Старт / Пропустить.' },
    { key: 'mp-radius', label: 'Скругление углов', min: 0, max: 24, step: 1, unit: 'px', hint: 'Единое для кнопок и панелей.' },
    { key: 'mp-pad-x', label: 'Боковые поля', min: 4, max: 48, step: 1, unit: 'px', hint: 'Отступ от краёв окна до содержимого.' },
    { key: 'mp-pad-y', label: 'Верхнее поле', min: 4, max: 48, step: 1, unit: 'px', hint: 'Отступ под шапкой.' },
    { key: 'mp-scene-ratio', label: 'Пропорции сцены', min: 1.4, max: 4, step: 0.1, unit: '', hint: 'Ширина ÷ высота блока с анимацией. Больше — сцена ниже.' },
    { key: 'mp-scene-h', label: 'Высота окна сцены', min: 100, max: 320, step: 5, unit: 'px', hint: 'Фиксированная высота всех сцен: соседние элементы не смещаются при переключении.' },
];

const APP_URL = '/app/pomodoro/index.html';

const toCss = (key, value) => (key === 'mp-scene-ratio' ? String(value) : `${value}px`);
const fromCss = (tokens) => Object.fromEntries(
    Object.entries(DEFAULTS).map(([key, fallback]) => {
        const parsed = Number.parseFloat(tokens?.[key]);
        return [key, Number.isFinite(parsed) ? parsed : fallback];
    }),
);

export default function PomodoroPanel() {
    const [values, setValues] = useState({ ...DEFAULTS });
    const [published, setPublished] = useState({ ...DEFAULTS });
    const [copied, setCopied] = useState(false);
    const [saveState, setSaveState] = useState('loading');
    const [error, setError] = useState('');
    const frameRef = useRef(null);

    useEffect(() => {
        adminApi.getState('pomodoro_tokens')
            .then(({ value }) => {
                const loaded = fromCss(value);
                setValues(loaded);
                setPublished(loaded);
                setSaveState('saved');
            })
            .catch(err => {
                setError(err.message);
                setSaveState('error');
            });
    }, []);

    // Применяем токены в превью. Фрейм с того же домена, поэтому переменные
    // ставятся напрямую — без пересборки и без перезагрузки приложения.
    const applyToPreview = useCallback((vals) => {
        const doc = frameRef.current?.contentDocument;
        if (!doc?.documentElement) return;
        for (const [key, v] of Object.entries(vals)) {
            doc.documentElement.style.setProperty(`--${key}`, toCss(key, v));
        }
    }, []);

    useEffect(() => {
        applyToPreview(values);
    }, [values, applyToPreview]);

    const json = JSON.stringify(
        Object.fromEntries(Object.entries(values).map(([k, v]) => [k, toCss(k, v)])),
        null, 2,
    ) + '\n';

    const changed = Object.keys(DEFAULTS).filter(k => values[k] !== published[k]);

    const publish = async () => {
        setSaveState('saving');
        setError('');
        try {
            await adminApi.setState('pomodoro_tokens', JSON.parse(json));
            setPublished({ ...values });
            setSaveState('saved');
        } catch (err) {
            setError(err.message);
            setSaveState('error');
        }
    };

    const copyJson = async () => {
        try {
            await navigator.clipboard.writeText(json);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* буфер недоступен — рядом есть кнопка «Скачать» */ }
    };

    const downloadJson = () => {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'tokens.json'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle>Помодоро — внешний вид</CardTitle>
                        {changed.length > 0
                            ? <Badge variant="warn">изменено: {changed.length}</Badge>
                            : <Badge variant="muted">как в продакшене</Badge>}
                    </div>
                    <CardDescription>
                        Двигайте ползунки — приложение справа меняется сразу. Это та же сборка,
                        что стоит на сайте и в десктопе, поэтому вы видите реальный результат,
                        а не макет. Нажмите «Опубликовать», и новые значения сразу получат
                        веб-версия и desktop-приложение при следующем запуске с интернетом.
                    </CardDescription>
                </CardHeader>
            </Card>

            {error && (
                <div className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-ui-sm text-danger">
                    {error}
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
                <Card>
                    <CardContent className="flex flex-col gap-5 pt-5">
                        {CONTROLS.map(c => (
                            <div key={c.key} className="flex flex-col gap-1.5">
                                <div className="flex items-baseline justify-between gap-3">
                                    <Label>{c.label}</Label>
                                    <span className="tabular-nums text-ui-sm text-ink">
                                        {values[c.key]}{c.unit}
                                        {values[c.key] !== DEFAULTS[c.key] && (
                                            <span className="ml-2 text-ink-3">было {DEFAULTS[c.key]}{c.unit}</span>
                                        )}
                                    </span>
                                </div>
                                <Slider
                                    value={values[c.key]}
                                    min={c.min} max={c.max} step={c.step}
                                    onValueChange={(v) => setValues(prev => ({ ...prev, [c.key]: v }))}
                                />
                                <p className="m-0 text-ui-sm text-ink-3">{c.hint}</p>
                            </div>
                        ))}

                        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                            <Button onClick={publish} disabled={!changed.length || saveState === 'saving'}>
                                {saveState === 'saving' ? <RotateCcw className="animate-spin" size={15} /> : <Save size={15} />}
                                {saveState === 'saving' ? 'Сохраняю…' : 'Опубликовать'}
                            </Button>
                            <Button variant="outline" onClick={() => setValues({ ...published })}>
                                <RotateCcw size={15} /> Отменить правки
                            </Button>
                            <Button onClick={copyJson}>
                                {copied ? <Check size={15} /> : <Copy size={15} />}
                                {copied ? 'Скопировано' : 'Скопировать JSON'}
                            </Button>
                            <Button variant="outline" onClick={downloadJson}>
                                <Download size={15} /> Скачать для репозитория
                            </Button>
                        </div>

                        <details className="rounded-control border border-line bg-surface-2 p-3">
                            <summary className="cursor-pointer text-ui-sm text-ink-2">Показать JSON</summary>
                            <pre className="m-0 mt-2 overflow-x-auto text-ui-sm text-ink-2">{json}</pre>
                        </details>
                    </CardContent>
                </Card>

                <Card className="justify-self-center">
                    <CardHeader>
                        <CardTitle>Живое превью</CardTitle>
                        <CardDescription>Рабочее приложение — можно нажимать кнопки.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <iframe
                            ref={frameRef}
                            src={APP_URL}
                            title="Помодоро — превью"
                            onLoad={() => applyToPreview(values)}
                            className="h-[720px] w-[420px] max-w-full rounded-control border border-line bg-bg"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
