import i18next, { type TOptions } from "i18next";
import type { SupportedLocale } from "./index";

export function t(locale: SupportedLocale, key: string, options?: TOptions): string {
    return i18next.getFixedT(locale)(key, options ?? {});
}
