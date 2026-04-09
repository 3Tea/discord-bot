import { ui, defaultLang, showDefaultLang } from "./ui";

export type Lang = keyof typeof ui;
export type TranslationKey = keyof (typeof ui)[typeof defaultLang];

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split("/");
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey | (string & {})): string {
    return (ui[lang] as Record<string, string>)[key] || (ui[defaultLang] as Record<string, string>)[key] || key;
  };
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string): string {
    return !showDefaultLang && lang === defaultLang ? path : `/${lang}${path}`;
  };
}
