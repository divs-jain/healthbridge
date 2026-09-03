import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import hi from './locales/hi.json';

const STORE_LANGUAGE_KEY = 'settings.lang';

const languageDetectorPlugin = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: async function (callback) {
    try {
      if (typeof window !== 'undefined') {
        const language = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
        if (language) {
          return callback(language);
        }
      }
      return callback(Localization.locale);
    } catch (error) {
      console.log('Error reading language', error);
      return callback(Localization.locale);
    }
  },
  cacheUserLanguage: async function (language) {
    try {
      if (typeof window !== 'undefined') {
        await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
      }
    } catch (error) {
      console.log('Error caching language', error);
    }
  },
};

const resources = {
  en: {
    translation: en,
  },
  hi: {
    translation: hi,
  },
};

i18n
  .use(initReactI18next)
  .use(languageDetectorPlugin)
  .init({
    resources,
    compatibilityJSON: 'v3',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
