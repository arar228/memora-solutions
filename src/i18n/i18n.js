import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Russian locale files
import ruCommon from '../locales/ru/common.json';
import ruHome from '../locales/ru/home.json';
import ruProducts from '../locales/ru/products.json';
import ruTravel from '../locales/ru/travel.json';
import ruKanban from '../locales/ru/kanban.json';
import ruContacts from '../locales/ru/contacts.json';
import ruAdmin from '../locales/ru/admin.json';
import ruCreator from '../locales/ru/creator.json';

// English locale files
import enCommon from '../locales/en/common.json';
import enHome from '../locales/en/home.json';
import enProducts from '../locales/en/products.json';
import enTravel from '../locales/en/travel.json';
import enKanban from '../locales/en/kanban.json';
import enContacts from '../locales/en/contacts.json';
import enAdmin from '../locales/en/admin.json';
import enCreator from '../locales/en/creator.json';

const savedLang = localStorage.getItem('memora-lang') || 'ru';

i18n.use(initReactI18next).init({
  resources: {
    ru: {
      translation: {
        ...ruCommon,
        home: ruHome,
        products: ruProducts,
        travel: ruTravel,
        kanban: ruKanban,
        contacts: ruContacts,
        admin: ruAdmin,
        creator: ruCreator,
      },
    },
    en: {
      translation: {
        ...enCommon,
        home: enHome,
        products: enProducts,
        travel: enTravel,
        kanban: enKanban,
        contacts: enContacts,
        admin: enAdmin,
        creator: enCreator,
      },
    },
  },
  lng: savedLang,
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('memora-lang', lng);
  document.documentElement.lang = lng;
});

export default i18n;
