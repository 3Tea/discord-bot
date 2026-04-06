import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "node:path";

const SUPPORTED_LOCALES = [
    "en", "vi", "id", "es", "ja", "zh", "ko",
    "pt-BR", "fr", "de", "ru", "tr", "it", "pl", "nl",
] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: SupportedLocale = "en";

async function initI18n(): Promise<void> {
    await i18next.use(Backend).init({
        lng: DEFAULT_LOCALE,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: [...SUPPORTED_LOCALES],
        preload: [...SUPPORTED_LOCALES],
        ns: ["translation"],
        defaultNS: "translation",
        backend: {
            loadPath: path.join(__dirname, "../../locales/{{lng}}.json"),
        },
        interpolation: {
            escapeValue: false,
        },
    });
}

export { initI18n, SUPPORTED_LOCALES, DEFAULT_LOCALE };
export type { SupportedLocale };
