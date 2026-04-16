import { ButtonBuilder, ButtonStyle } from "discord.js";
import { URL_HOMEPAGE } from "../config/index";
import type { SupportedLocale } from "../i18n/index";
import { t } from "../i18n/t";

export function buildPremiumButton(locale: SupportedLocale): ButtonBuilder {
    return new ButtonBuilder()
        .setLabel(t(locale, "premium.upgrade_btn"))
        .setURL(`${URL_HOMEPAGE}/en/guide/premium/`)
        .setStyle(ButtonStyle.Link)
        .setEmoji("⭐");
}
