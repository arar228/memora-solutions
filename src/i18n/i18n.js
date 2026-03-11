import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './ru.json';
import en from './en.json';

const savedLang = localStorage.getItem('memora-lang') || 'ru';

i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en } },
  lng: savedLang,
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('memora-lang', lng);
  document.documentElement.lang = lng;
});

export default i18n;
