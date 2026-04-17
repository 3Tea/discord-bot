/**
 * Maps each top-level slash command name to a help embed section.
 * Update this map when adding new commands so /help stays grouped correctly.
 */
export const HELP_CATEGORY_ORDER = ["general", "xp", "economy", "rpg", "voice", "moderation", "manga", "other"] as const;

export type HelpCategoryId = (typeof HELP_CATEGORY_ORDER)[number];

const COMMAND_TO_CATEGORY: Record<string, HelpCategoryId> = {
    // General & utilities
    ping: "general",
    help: "general",
    info: "general",
    settings: "general",
    confession: "general",
    weather: "general",
    avatar: "general",
    trans: "general",
    profile: "general",
    achievements: "general",
    // XP and rankings
    xp: "xp",
    rank: "xp",
    leaderboard: "xp",
    "server-rank": "xp",
    // Economy
    balance: "economy",
    pray: "economy",
    curse: "economy",
    economy: "economy",
    shop: "economy",
    gamble: "economy",
    work: "economy",
    fish: "economy",
    gift: "economy",
    rob: "economy",
    mine: "economy",
    wallet: "economy",
    "global-shop": "economy",
    "global-inventory": "economy",
    premium: "economy",
    quest: "economy",
    // RPG & Adventure
    adventure: "rpg",
    dungeon: "rpg",
    guild: "rpg",
    "guild-admin": "rpg",
    pvp: "rpg",
    // Voice
    voice: "voice",
    // Moderation
    moderation: "moderation",
    // Manga (NSFW) — names must match SlashCommandBuilder#setName in manga sources
    nhentai: "manga",
    "3hentai": "manga",
    asmhentai: "manga",
    hentaifox: "manga",
    "nhentai-lite": "manga",
    pururin: "manga",
    hentai2read: "manga",
    "simply-hentai": "manga",
};

/**
 * Returns the help section for a command; unknown names go to "other".
 */
export function getHelpCategory(commandName: string): HelpCategoryId {
    return COMMAND_TO_CATEGORY[commandName] ?? "other";
}
