// Один renderer собирается в две цели: Electron-десктоп и web-копия на сайте.
// IS_WEB прячет то, чего в браузере не существует (кнопки окна, оверлей, трей,
// автозапуск, глобальные хоткеи). Всё остальное — общий код, поэтому правка в
// App.tsx/Scene.tsx автоматически попадает и в десктоп, и в web.
//
// Флаг подставляется НА СБОРКЕ (vite.web.config.ts → define), а не в рантайме:
// ESM поднимает импорты, поэтому присваивание window.* в точке входа
// выполнилось бы уже ПОСЛЕ вычисления этого модуля.
declare const __IS_WEB__: boolean | undefined;

export const IS_WEB: boolean = typeof __IS_WEB__ !== 'undefined' && __IS_WEB__ === true;

declare const __MEMORA_NINJA_AVAILABLE__: boolean | undefined;
export const HAS_NINJA_SCENE = typeof __MEMORA_NINJA_AVAILABLE__ === 'undefined' || __MEMORA_NINJA_AVAILABLE__;
