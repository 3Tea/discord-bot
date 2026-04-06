import type {
    ChatInputCommandInteraction,
    ButtonInteraction,
    ModalSubmitInteraction,
    UserSelectMenuInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    MentionableSelectMenuInteraction,
    ChannelSelectMenuInteraction,
} from "discord.js";
import redis from "../../connector/redis";
import UserModel from "../../models/user.model";
import GuildModel from "../../models/guild.model";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./index";
import type { SupportedLocale } from "./index";

export type LocaleInteraction =
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | UserSelectMenuInteraction
    | RoleSelectMenuInteraction
    | StringSelectMenuInteraction
    | MentionableSelectMenuInteraction
    | ChannelSelectMenuInteraction;

const LOCALE_TTL = 60 * 60 * 24 * 30; // 30 days

function isSupportedLocale(value: string): value is SupportedLocale {
    return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function mapDiscordLocale(discordLocale: string): SupportedLocale {
    if (discordLocale === "vi") return "vi";
    if (discordLocale === "id") return "id";
    if (discordLocale.startsWith("es")) return "es";
    if (discordLocale === "ja") return "ja";
    if (discordLocale.startsWith("zh")) return "zh";
    if (discordLocale === "ko") return "ko";
    if (discordLocale === "pt-BR") return "pt-BR";
    if (discordLocale === "fr") return "fr";
    if (discordLocale === "de") return "de";
    if (discordLocale === "ru") return "ru";
    if (discordLocale === "tr") return "tr";
    if (discordLocale === "it") return "it";
    if (discordLocale === "pl") return "pl";
    if (discordLocale === "nl") return "nl";
    if (discordLocale.startsWith("en")) return "en";
    return DEFAULT_LOCALE;
}

async function resolveFromRedisOrDb(
    redisKey: string,
    dbLookup: () => Promise<string | undefined>
): Promise<SupportedLocale | null> {
    const cached = await redis.getKey(redisKey);

    if (cached === "none") return null;
    if (cached && isSupportedLocale(cached)) return cached;

    const dbValue = await dbLookup();
    if (dbValue && isSupportedLocale(dbValue)) {
        await redis.setKey(redisKey, dbValue, LOCALE_TTL);
        return dbValue;
    }

    await redis.setKey(redisKey, "none", LOCALE_TTL);
    return null;
}

export async function resolveLocale(interaction: LocaleInteraction): Promise<SupportedLocale> {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const userLocale = await resolveFromRedisOrDb(`locale:user:${userId}`, async () => {
        const user = await UserModel.findOne({ userID: userId }).select("locale").lean();
        return user?.locale;
    });
    if (userLocale) return userLocale;

    if (guildId) {
        const guildLocale = await resolveFromRedisOrDb(`locale:guild:${guildId}`, async () => {
            const guild = await GuildModel.findOne({ guildID: guildId }).select("locale").lean();
            return guild?.locale;
        });
        if (guildLocale) return guildLocale;
    }

    return mapDiscordLocale(interaction.locale);
}

/**
 * Resolve locale for non-interaction contexts (events) using guild preference only.
 */
export async function resolveGuildLocale(guildId: string): Promise<SupportedLocale> {
    const guildLocale = await resolveFromRedisOrDb(`locale:guild:${guildId}`, async () => {
        const guild = await GuildModel.findOne({ guildID: guildId }).select("locale").lean();
        return guild?.locale;
    });
    return guildLocale ?? DEFAULT_LOCALE;
}

export async function setUserLocale(userId: string, locale: SupportedLocale): Promise<void> {
    await UserModel.findOneAndUpdate({ userID: userId }, { $set: { locale } }, { upsert: true });
    await redis.setKey(`locale:user:${userId}`, locale, LOCALE_TTL);
}

export async function resetUserLocale(userId: string): Promise<void> {
    await UserModel.findOneAndUpdate({ userID: userId }, { $unset: { locale: 1 } });
    await redis.setKey(`locale:user:${userId}`, "none", LOCALE_TTL);
}

export async function setGuildLocale(guildId: string, locale: SupportedLocale): Promise<void> {
    await GuildModel.findOneAndUpdate({ guildID: guildId }, { $set: { locale } }, { upsert: true });
    await redis.setKey(`locale:guild:${guildId}`, locale, LOCALE_TTL);
}

export async function resetGuildLocale(guildId: string): Promise<void> {
    await GuildModel.findOneAndUpdate({ guildID: guildId }, { $unset: { locale: 1 } });
    await redis.setKey(`locale:guild:${guildId}`, "none", LOCALE_TTL);
}
