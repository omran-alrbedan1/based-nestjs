import { pickLabel, isArabic } from 'src/common/utils/locale.util';

/**
 * A stored bilingual option row. Shared by the three lookup models
 * (visit reason / vehicle condition option / vehicle item option), all of
 * which expose the same `labelEn` + `labelAr` pair plus `code`.
 */
export type LocalizedOptionEntity = {
  id: number;
  code: string;
  labelEn: string;
  labelAr: string;
  displayOrder: number;
  isActive: boolean;
};

/**
 * One-language public contract. The frontend always receives a single
 * `label` already resolved for the request language (never the raw
 * bilingual pair).
 */
export type OptionResponse = {
  id: number;
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
};

/** Maps a stored bilingual row to the localized public contract. */
export function toOptionResponse(option: LocalizedOptionEntity, lang: string): OptionResponse {
  return {
    id: option.id,
    code: option.code,
    label: pickLabel(option.labelEn, option.labelAr, lang),
    displayOrder: option.displayOrder,
    isActive: option.isActive,
  };
}

/** Variant for callers that already resolved the language ahead of time. */
export function toOptionResponseOrEnum(
  option: LocalizedOptionEntity,
  lang: string,
): OptionResponse {
  return toOptionResponse(option, isArabic(lang) ? 'ar' : 'en');
}
