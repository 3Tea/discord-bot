"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOCALE = exports.SUPPORTED_LOCALES = void 0;
exports.initI18n = initI18n;
const i18next_1 = __importDefault(require("i18next"));
const i18next_fs_backend_1 = __importDefault(require("i18next-fs-backend"));
const node_path_1 = __importDefault(require("node:path"));
const SUPPORTED_LOCALES = [
    "en",
    "vi",
    "id",
    "es",
    "ja",
    "zh",
    "ko",
    "pt-BR",
    "fr",
    "de",
    "ru",
    "tr",
    "it",
    "pl",
    "nl",
];
exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
const DEFAULT_LOCALE = "en";
exports.DEFAULT_LOCALE = DEFAULT_LOCALE;
async function initI18n() {
    await i18next_1.default.use(i18next_fs_backend_1.default).init({
        lng: DEFAULT_LOCALE,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: [...SUPPORTED_LOCALES],
        preload: [...SUPPORTED_LOCALES],
        ns: ["translation"],
        defaultNS: "translation",
        backend: {
            loadPath: node_path_1.default.join(__dirname, "../../locales/{{lng}}.json"),
        },
        interpolation: {
            escapeValue: false,
        },
    });
}
