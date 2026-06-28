import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { vi, en, type Lang, type Dict, type DictKey } from '../i18n/dict';

const dicts: Record<Lang, Dict> = { vi, en };
const fallbackLang: Lang = 'vi';

function isLang(value: unknown): value is Lang {
  return value === 'vi' || value === 'en';
}

export interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return fallbackLang;
    const savedLang = localStorage.getItem('lang');
    return isLang(savedLang) ? savedLang : fallbackLang;
  });

  const setLang = useCallback((l: Lang) => {
    if (!isLang(l)) return;
    setLangState(l);
    localStorage.setItem('lang', l);
  }, []);

  const t = useCallback(
    (key: DictKey): string => {
      const currentDict = dicts[lang] as Record<string, string>;
      const fallbackDict = vi as Record<string, string>;
      return currentDict[key] ?? fallbackDict[key] ?? String(key);
    },
    [lang],
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
