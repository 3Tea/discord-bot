import i18next from "i18next";
import { SUPPORTED_LOCALES } from "./index";

/**
 * Maps i18next locale codes to Discord API locale codes.
 * Discord requires specific locale formats for setDescriptionLocalizations().
 * See: https://discord.com/developers/docs/reference#locales
 */
const I18N_TO_DISCORD_LOCALE: Record<string, string> = {
    en: "en-US",
    vi: "vi",
    id: "id",
    es: "es-ES",
    ja: "ja",
    zh: "zh-CN",
    ko: "ko",
    "pt-BR": "pt-BR",
    fr: "fr",
    de: "de",
    ru: "ru",
    tr: "tr",
    it: "it",
    pl: "pl",
    nl: "nl",
};

/**
 * Generates a localization object for Discord's setDescriptionLocalizations()
 * by reading translations from i18next for a given key.
 *
 * Must be called after initI18n() has completed.
 */
export function descriptionLocales(key: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const locale of SUPPORTED_LOCALES) {
        if (locale === "en") continue;
        const discordCode = I18N_TO_DISCORD_LOCALE[locale];
        if (discordCode) {
            result[discordCode] = i18next.t(key, { lng: locale });
        }
    }
    return result;
}
