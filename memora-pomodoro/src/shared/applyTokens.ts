import tokens from './tokens.json';

// Токены раскладки применяются на старте и в десктопе, и в web — файл один,
// поэтому правка из админки (после коммита) меняет обе версии сразу.
// Значения по умолчанию продублированы в app.css, так что даже пустой
// tokens.json оставит приложение рабочим.
export function applyTokens(): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens as Record<string, string>)) {
    if (typeof value === 'string' && value.trim()) {
      root.style.setProperty(`--${key}`, value);
    }
  }
}
