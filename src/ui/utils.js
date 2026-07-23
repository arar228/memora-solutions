import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Идиома shadcn/ui: cn() склеивает классы и разруливает конфликты Tailwind
// (последний выигрывает), поэтому варианты компонентов можно переопределять
// пропом className без !important.
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
