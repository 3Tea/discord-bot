"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.descriptionLocales = descriptionLocales;
const i18next_1 = __importDefault(require("i18next"));
const index_1 = require("./index");
/**
 * Maps i18next locale codes to Discord API locale codes.
 * Discord requires specific locale formats for setDescriptionLocalizations().
 * See: https://discord.com/developers/docs/reference#locales
 */
const I18N_TO_DISCORD_LOCALE = {
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
function descriptionLocales(key, options) {
    const result = {};
    for (const locale of index_1.SUPPORTED_LOCALES) {
        if (locale === "en")
            continue;
        const discordCode = I18N_TO_DISCORD_LOCALE[locale];
        if (discordCode) {
            result[discordCode] = i18next_1.default.t(key, { lng: locale, ...options });
        }
    }
    return result;
}
