// Shared i18n wrapper — injected as plain script (no ES modules)
// Exports globals: initI18n(), t(), currentLang, applyI18n()

let _i18nCustomMessages = null;
let currentLang = 'browser';

async function initI18n() {
  const { language } = await chrome.storage.sync.get({ language: 'browser' });
  currentLang = language;
  if (language === 'browser') { _i18nCustomMessages = null; return; }
  try {
    const url = chrome.runtime.getURL(`assets/locales/${language}.json`);
    _i18nCustomMessages = await fetch(url).then(r => r.json());
  } catch (e) {
    _i18nCustomMessages = null;
  }
}

function t(key) {
  if (_i18nCustomMessages?.[key]) return _i18nCustomMessages[key].message;
  return chrome.i18n.getMessage(key) || key;
}

const _i18nCallbacks = [];

function onI18nApply(fn) {
  _i18nCallbacks.push(fn);
}

function applyI18n(root) {
  const el = root || document;
  el.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });
  for (const fn of _i18nCallbacks) fn();
}
