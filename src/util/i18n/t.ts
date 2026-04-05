import i18next, { type TFunction, type TOptions } from "i18next";
import type { SupportedLocale } from "./index";

const translators = new Map<string, TFunction>();

export function t(locale: SupportedLocale, key: string, options?: TOptions): string {
    let translator = translators.get(locale);
    if (!translator) {
        translator = i18next.getFixedT(locale);
        translators.set(locale, translator);
    }
    return translator(key, options ?? {});
}
