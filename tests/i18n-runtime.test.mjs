import test from 'node:test';
import assert from 'node:assert/strict';
import { createInstance } from 'i18next';
import { initReactI18next, I18nextProvider, useTranslation } from 'react-i18next';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

test('installed localization libraries render React and switch Russian/English together', async () => {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'ru', fallbackLng: 'ru', interpolation: { escapeValue: false },
    resources: {
      ru: { translation: { title: 'Фокус', session_one: '{{count}} сессия', session_few: '{{count}} сессии', session_many: '{{count}} сессий' } },
      en: { translation: { title: 'Focus', session_one: '{{count}} session', session_other: '{{count}} sessions' } },
    },
  });
  function Heading() { return createElement('h1', null, useTranslation().t('title')); }
  const render = () => renderToString(createElement(I18nextProvider, { i18n }, createElement(Heading)));
  assert.equal(render(), '<h1>Фокус</h1>');
  assert.equal(i18n.t('session', { count: 2 }), '2 сессии');
  assert.equal(i18n.t('session', { count: 5 }), '5 сессий');
  await i18n.changeLanguage('en');
  assert.equal(render(), '<h1>Focus</h1>');
  assert.equal(i18n.t('session', { count: 2 }), '2 sessions');
  await i18n.changeLanguage('ru');
  assert.equal(render(), '<h1>Фокус</h1>');
});
