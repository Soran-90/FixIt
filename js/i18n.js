const LANGUAGE_KEY = 'fixit:language';
const SUPPORTED_LANGS = ['ar', 'en'];
const FALLBACK_LANG = 'ar';
let translations = {};
let currentLang = FALLBACK_LANG;

function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
}

async function fetchTranslations(lang) {
  const response = await fetch(`./locales/${lang}.json`);
  if (!response.ok) {
    throw new Error(`Unable to load translations for ${lang}`);
  }
  return response.json();
}

function applyToElement(el, dict) {
  const key = el.dataset.i18n;
  if (!key) return;
  const value = dict[key];
  if (!value) return;

  const attrList = (el.dataset.i18nAttr || '').split(',').map((a) => a.trim()).filter(Boolean);
  if (attrList.length) {
    attrList.forEach((attr) => {
      if (attr === 'placeholder') {
        el.placeholder = value;
      } else if (attr === 'value') {
        el.value = value;
      } else {
        el.setAttribute(attr, value);
      }
    });
  } else {
    el.textContent = value;
  }
}

function applyTranslations() {
  const dict = translations;
  document.querySelectorAll('[data-i18n]').forEach((el) => applyToElement(el, dict));

  const titleKey = document.body?.dataset?.pageTitleKey;
  if (titleKey && dict[titleKey]) {
    document.title = dict[titleKey];
  }
}

export function t(key, fallback = '') {
  return translations[key] || fallback || key;
}

export async function setLanguage(lang, { persist = true } = {}) {
  const normalized = normalizeLang(lang);
  if (normalized === currentLang && Object.keys(translations).length) {
    document.documentElement.lang = normalized;
    document.documentElement.dir = normalized === 'ar' ? 'rtl' : 'ltr';
    if (persist) {
      localStorage.setItem(LANGUAGE_KEY, normalized);
    }
    applyTranslations();
    return;
  }
  const newTranslations = await fetchTranslations(normalized);
  translations = newTranslations;
  currentLang = normalized;

  document.documentElement.lang = normalized;
  document.documentElement.dir = normalized === 'ar' ? 'rtl' : 'ltr';

  if (persist) {
    localStorage.setItem(LANGUAGE_KEY, normalized);
  }

  applyTranslations();
}

export function getCurrentLanguage() {
  return currentLang;
}

export const i18nReady = (async () => {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  const initial = normalizeLang(saved || document.documentElement.lang || FALLBACK_LANG);
  await setLanguage(initial, { persist: false });
})();

document.addEventListener('DOMContentLoaded', () => {
  i18nReady.catch((err) => console.error('i18n init failed', err));
});
