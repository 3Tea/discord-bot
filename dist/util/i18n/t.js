"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.t = t;
const i18next_1 = __importDefault(require("i18next"));
const translators = new Map();
function t(locale, key, options) {
    let translator = translators.get(locale);
    if (!translator) {
        translator = i18next_1.default.getFixedT(locale);
        translators.set(locale, translator);
    }
    return translator(key, options ?? {});
}
