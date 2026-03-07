import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import he from '@/locales/he.json';

export type SupportedLocale = 'en' | 'he';

const RTL_LOCALES: SupportedLocale[] = ['he'];

const savedLocale = (localStorage.getItem('locale') as SupportedLocale) || 'en';

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, he },
});

export function setLocale(locale: SupportedLocale) {
  i18n.global.locale.value = locale;
  localStorage.setItem('locale', locale);

  const isRtl = RTL_LOCALES.includes(locale);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = locale;
}

// Apply dir/lang on initial load
setLocale(savedLocale);
