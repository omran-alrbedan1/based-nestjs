import { I18nContext } from 'nestjs-i18n';

/**
 * Resolves the current request language from nestjs-i18n's per-request
 * context (set by the AcceptLanguageResolver from the Accept-Language
 * header), falling back to the application default (`'en'`).
 *
 * Mirrors the resolution already used by src/common/interceptors/transform.interceptor.ts
 * so every layer of the API localizes against the exact same value.
 */
export function getRequestLanguage(): string {
  return I18nContext.current()?.lang ?? 'en';
}

/** True when the resolved language is an Arabic variant (ar, ar-SA, ar-JO…). */
export function isArabic(lang: string): boolean {
  return lang.toLowerCase().startsWith('ar');
}

/** Picks the localized label for a stored bilingual row using the language. */
export function pickLabel(labelEn: string, labelAr: string, lang: string): string {
  return isArabic(lang) ? labelAr : labelEn;
}
