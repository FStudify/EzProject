import { useCallback, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Lang } from '@/i18n/dict';

const VI_RE = /(tiếng việt|vietnamese|bằng tiếng việt|nói tiếng việt)/i;
const EN_RE = /(tiếng anh|english|bằng tiếng anh|nói tiếng anh)/i;

export function detectOverrideLang(text: string): Lang | null {
  if (!text) return null;
  if (EN_RE.test(text)) return 'en';
  if (VI_RE.test(text)) return 'vi';
  return null;
}

/**
 * Quản lý ngôn ngữ cho AI:
 * - Mặc định theo ngôn ngữ hệ thống (`useLanguage`).
 * - User có thể yêu cầu đổi ngôn ngữ trong session (vd: "hãy chat với tôi bằng tiếng Việt")
 *   → lưu override trong state.
 * - Cung cấp `pick(key, vi, en)` để chọn string theo ngôn ngữ hiện tại.
 */
export function useAILang() {
  const { lang: systemLang } = useLanguage();
  const [override, setOverride] = useState<Lang | null>(null);

  const lang = override ?? systemLang;

  const trySetOverrideFromText = useCallback((text: string): Lang | null => {
    const detected = detectOverrideLang(text);
    if (detected) setOverride(detected);
    return detected;
  }, []);

  const pick = useCallback(
    (viText: string, enText: string): string => (lang === 'en' ? enText : viText),
    [lang],
  );

  return useMemo(
    () => ({ lang, pick, trySetOverrideFromText, resetOverride: () => setOverride(null) }),
    [lang, pick, trySetOverrideFromText],
  );
}