/**
 * Набор UI-примитивов админки в идиоме shadcn/ui: те же имена, варианты через
 * class-variance-authority и переопределение через className + cn().
 *
 * Почему компоненты лежат в проекте, а не ставятся пакетом: shadcn/ui и
 * задуман как копируемый код — так его можно править под себя. Здесь ещё и
 * нет зависимости от Radix: набор небольшой, а лишние пакеты в бандле сайта
 * нам ни к чему.
 */
import { createContext, useContext, useState, forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './utils';

// ---------- Button ----------
const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-ui font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
    {
        variants: {
            variant: {
                default: 'bg-brand text-[#06131a] hover:brightness-110',
                outline: 'border border-line text-ink-2 hover:text-ink hover:border-line-strong bg-white',
                ghost: 'text-ink-2 hover:text-ink hover:bg-black/5 border-none bg-transparent',
                danger: 'bg-danger text-white hover:brightness-110',
            },
            size: {
                default: 'h-12 px-4',
                sm: 'h-11 px-3 text-ui-sm',
                icon: 'h-12 w-12 p-0',
            },
        },
        defaultVariants: { variant: 'default', size: 'default' },
    },
);

export const Button = forwardRef(function Button({ className, variant, size, ...props }, ref) {
    return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

// ---------- Card ----------
export function Card({ className, ...props }) {
    return <div className={cn('rounded-card border border-line bg-surface shadow-card', className)} {...props} />;
}
export function CardHeader({ className, ...props }) {
    return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
    return <h3 className={cn('text-admin-heading font-semibold text-ink m-0', className)} {...props} />;
}
export function CardDescription({ className, ...props }) {
    return <p className={cn('text-ui-sm text-ink-3 m-0', className)} {...props} />;
}
export function CardContent({ className, ...props }) {
    return <div className={cn('p-5 pt-2', className)} {...props} />;
}

// ---------- Input / Label ----------
export const Input = forwardRef(function Input({ className, ...props }, ref) {
    return (
        <input
            ref={ref}
            className={cn(
                'h-12 w-full rounded-control border border-line bg-surface-2 px-3 text-ui text-ink outline-none transition-colors',
                'placeholder:text-ink-3 focus:border-brand',
                className,
            )}
            {...props}
        />
    );
});

export function Label({ className, ...props }) {
    return <label className={cn('text-ui-sm font-medium text-ink-2', className)} {...props} />;
}

export const Select = forwardRef(function Select({ className, ...props }, ref) {
    return (
        <select
            ref={ref}
            className={cn(
                'h-12 w-full rounded-control border border-line bg-surface-2 px-3 text-ui text-ink outline-none focus:border-brand',
                className,
            )}
            {...props}
        />
    );
});

// ---------- Slider (нативный range: без Radix, но с теми же токенами) ----------
export function Slider({ className, value, min = 0, max = 100, step = 1, onValueChange, ...props }) {
    return (
        <input
            type="range"
            className={cn('w-full accent-brand cursor-pointer', className)}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={e => onValueChange?.(Number(e.target.value))}
            {...props}
        />
    );
}

// ---------- Badge ----------
const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-1 text-ui font-semibold', {
    variants: {
        variant: {
            default: 'bg-brand-dim text-brand',
            muted: 'border border-line text-ink-3',
            ok: 'bg-ok/15 text-ok',
            warn: 'bg-warn/15 text-warn',
        },
    },
    defaultVariants: { variant: 'default' },
});
export function Badge({ className, variant, ...props }) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ---------- Tabs ----------
const TabsCtx = createContext(null);

export function Tabs({ defaultValue, value, onValueChange, className, children }) {
    const [inner, setInner] = useState(defaultValue);
    const active = value ?? inner;
    const set = (v) => { setInner(v); onValueChange?.(v); };
    return (
        <TabsCtx.Provider value={{ active, set }}>
            <div className={className}>{children}</div>
        </TabsCtx.Provider>
    );
}
export function TabsList({ className, ...props }) {
    return <div className={cn('inline-flex flex-wrap gap-1 rounded-control border border-line bg-surface-2 p-1', className)} {...props} />;
}
export function TabsTrigger({ value, className, ...props }) {
    const ctx = useContext(TabsCtx);
    const active = ctx?.active === value;
    return (
        <button
            type="button"
            onClick={() => ctx?.set(value)}
            className={cn(
                'rounded-[7px] px-3 h-11 text-ui-sm font-medium transition-colors border-none cursor-pointer',
                active ? 'bg-brand-dim text-brand' : 'bg-transparent text-ink-3 hover:text-ink',
                className,
            )}
            {...props}
        />
    );
}
export function TabsContent({ value, className, ...props }) {
    const ctx = useContext(TabsCtx);
    if (ctx?.active !== value) return null;
    return <div className={cn('mt-4', className)} {...props} />;
}
