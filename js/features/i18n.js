import { CONFIG } from '../utils/config.js';

export class I18nManager {
  constructor() {
    this.currentLanguage = CONFIG.I18N.DEFAULT_LANGUAGE;
    this.translations = new Map();
    this.translationElements = [];
  }

  async init() {
    if (CONFIG.I18N.AUTO_DETECT) {
      this.currentLanguage = this.detectLanguage();
    }

    await this.loadTranslations(this.currentLanguage);
    this.createLanguageSwitcher();
    this.applyTranslations();
  }

  detectLanguage() {
    const browserLang = navigator.language.split('-')[0];
    return CONFIG.I18N.SUPPORTED_LANGUAGES.includes(browserLang) 
      ? browserLang 
      : CONFIG.I18N.DEFAULT_LANGUAGE;
  }

  async loadTranslations(language) {
    try {
      const response = await fetch(`resources/locales/${language}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${language}`);
      }
      const data = await response.json();
      this.translations.set(language, data);
    } catch (error) {
      if (language !== 'en') {
        await this.loadTranslations('en');
      }
    }
  }

  createLanguageSwitcher() {
    const switcher = document.createElement('div');
    switcher.id = 'language-switcher';
    switcher.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(6, 182, 212, 0.3);
      z-index: 1500;
      display: flex;
      gap: 8px;
    `;

    const languageNames = {
      en: '🇬🇧 EN',
      es: '🇪🇸 ES',
      fr: '🇫🇷 FR',
      hi: '🇮🇳 HI'
    };

    CONFIG.I18N.SUPPORTED_LANGUAGES.forEach(lang => {
      const btn = document.createElement('button');
      btn.textContent = languageNames[lang] || lang.toUpperCase();
      btn.style.cssText = `
        padding: 6px 12px;
        background: ${this.currentLanguage === lang ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'};
        border: 1px solid ${this.currentLanguage === lang ? '#06b6d4' : 'rgba(255, 255, 255, 0.2)'};
        border-radius: 4px;
        color: ${this.currentLanguage === lang ? '#000' : '#fff'};
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.2s;
      `;
      
      btn.onclick = () => this.changeLanguage(lang);
      
      btn.onmouseover = () => {
        if (this.currentLanguage !== lang) {
          btn.style.background = 'rgba(6, 182, 212, 0.2)';
        }
      };
      
      btn.onmouseout = () => {
        if (this.currentLanguage !== lang) {
          btn.style.background = 'rgba(255, 255, 255, 0.1)';
        }
      };
      
      switcher.appendChild(btn);
    });

    document.body.appendChild(switcher);
  }

  async changeLanguage(language) {
    if (language === this.currentLanguage) return;

    if (!this.translations.has(language)) {
      await this.loadTranslations(language);
    }

    this.currentLanguage = language;
    this.applyTranslations();
    this.updateLanguageSwitcher();
  }

  applyTranslations() {
    const translations = this.translations.get(this.currentLanguage);
    if (!translations) return;

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.getNestedTranslation(translations, key);
      
      if (translation) {
        if (element.placeholder !== undefined) {
          element.placeholder = translation;
        } else {
          element.textContent = translation;
        }
      }
    });

    // Update document title
    if (translations.meta && translations.meta.title) {
      document.title = translations.meta.title;
    }
  }

  getNestedTranslation(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  updateLanguageSwitcher() {
    const switcher = document.getElementById('language-switcher');
    if (!switcher) return;

    const buttons = switcher.querySelectorAll('button');
    buttons.forEach((btn, index) => {
      const lang = CONFIG.I18N.SUPPORTED_LANGUAGES[index];
      const isActive = lang === this.currentLanguage;
      
      btn.style.background = isActive ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)';
      btn.style.borderColor = isActive ? '#06b6d4' : 'rgba(255, 255, 255, 0.2)';
      btn.style.color = isActive ? '#000' : '#fff';
    });
  }

  t(key, params = {}) {
    const translations = this.translations.get(this.currentLanguage);
    let text = this.getNestedTranslation(translations, key) || key;
    
    // Replace parameters
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
  }
}
