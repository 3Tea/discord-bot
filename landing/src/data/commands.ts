export type Category =
  | "voice"
  | "xp"
  | "economy"
  | "rpg"
  | "moderation"
  | "manga"
  | "utility"
  | "info"
  | "settings"
  | "confession";

export interface Command {
  name: string;
  description: string;
  category: Category;
  subcommands?: string[];
  options?: string[];
}

export const categoryMeta: Record<
  Category,
  { labelKey: string; color: string; bg: string }
> = {
  voice: { labelKey: "commands.category.voice", color: "#5865F2", bg: "rgba(88,101,242,0.15)" },
  xp: { labelKey: "commands.category.xp", color: "#9B59B6", bg: "rgba(155,89,182,0.15)" },
  economy: {
    labelKey: "commands.category.economy",
    color: "#F1C40F",
    bg: "rgba(241,196,15,0.15)",
  },
  moderation: {
    labelKey: "commands.category.moderation",
    color: "#C0392B",
    bg: "rgba(192,57,43,0.15)",
  },
  manga: { labelKey: "commands.category.manga", color: "#ED4245", bg: "rgba(237,66,69,0.15)" },
  utility: { labelKey: "commands.category.utility", color: "#3BA55C", bg: "rgba(59,165,92,0.15)" },
  info: { labelKey: "commands.category.info", color: "#FAA61A", bg: "rgba(250,166,26,0.15)" },
  settings: {
    labelKey: "commands.category.settings",
    color: "#7289DA",
    bg: "rgba(114,137,218,0.15)",
  },
  rpg: { labelKey: "commands.category.rpg", color: "#e67e22", bg: "rgba(230,126,34,0.15)" },
  confession: {
    labelKey: "commands.category.confession",
    color: "#9B59B6",
    bg: "rgba(155,89,182,0.15)",
  },
};

export const commands: Command[] = [
  // Voice
  {
    name: "voice",
    description:
      "Voice channel management — lock, unlock, hide, permit, block, kick, transfer, rename, limit",
    category: "voice",
    subcommands: [
      "limit", "name", "lock", "unlock", "hide", "permit", "block", "kick", "transfer",
    ],
  },
  // XP & Leveling
  {
    name: "rank",
    description: "View your rank card — level, XP progress, server & global rank, activity stats",
    category: "xp",
    options: ["user (optional)"],
  },
  {
    name: "leaderboard",
    description:
      "Paginated XP leaderboard with period filtering (daily, weekly, monthly, yearly) and server/global/servers modes",
    category: "xp",
    options: ["mode (server/global/servers)"],
  },
  {
    name: "server-rank",
    description: "View this server's XP stats, ranking among all servers, and activity breakdown",
    category: "xp",
  },
  {
    name: "xp",
    description: "Admin XP management — set, add, remove XP or blacklist channels from XP gains",
    category: "xp",
    subcommands: ["set", "add", "remove", "channel-blacklist"],
  },
  // Economy
  {
    name: "balance",
    description: "View coin and gem balance, pray streak, and last activity",
    category: "economy",
    options: ["user (optional)"],
  },
  {
    name: "pray",
    description: "Daily prayer to receive coins — streak bonuses at 3, 7, 14, and 30 days",
    category: "economy",
    options: ["target (optional)"],
  },
  {
    name: "curse",
    description: "Daily curse action with coin rewards — mirrors pray mechanics",
    category: "economy",
    options: ["target (optional)"],
  },
  {
    name: "shop",
    description: "View and purchase server shop items — roles, cosmetics, and currency exchanges",
    category: "economy",
  },
  {
    name: "economy",
    description: "Admin currency management — set or add coins and gems for users",
    category: "economy",
    subcommands: ["set-coin", "add-coin", "set-gem", "add-gem"],
  },
  {
    name: "gamble",
    description: "Gambling mini-games — coinflip, slots, and dice with coin betting",
    category: "economy",
    subcommands: ["coinflip", "slots", "dice"],
  },
  {
    name: "work",
    description: "Work a job to earn coins — random reward with cooldown",
    category: "economy",
  },
  {
    name: "fish",
    description: "Go fishing to catch fish for coins — 4 rarity tiers from common to legendary",
    category: "economy",
  },
  {
    name: "gift",
    description: "Gift coins to another user — direct transfer with configurable max amount",
    category: "economy",
    options: ["user (required)", "amount (required)"],
  },
  {
    name: "rob",
    description: "Attempt to rob coins from another user — 40% success rate with protections",
    category: "economy",
    options: ["user (required)"],
  },
  {
    name: "wallet",
    description: "Global wallet — view star balance, claim daily rewards, and track history",
    category: "economy",
    subcommands: ["view", "daily", "history"],
  },
  {
    name: "mine",
    description: "Mine for minerals at increasing depth — risk collapse but earn bigger rewards deeper",
    category: "economy",
  },
  {
    name: "dungeon",
    description: "Explore dungeons with RPG combat, class skills, and boss encounters for Gold and equipment",
    category: "rpg",
    subcommands: ["enter", "team"],
  },
  {
    name: "adventure",
    description: "RPG adventure — manage your character, equipment, and stats",
    category: "rpg",
    subcommands: ["create", "profile", "equip", "inventory", "unequip", "craft", "crate", "shop", "advance"],
  },
  {
    name: "guild",
    description: "Adventurer Guild — quests, ranking, and rewards",
    category: "rpg",
    subcommands: ["register", "profile", "board", "quests", "ranking", "branch", "event"],
  },
  {
    name: "guild-admin",
    description: "Manage branch guild settings (Admin only)",
    category: "rpg",
    subcommands: ["setup", "config", "disband"],
  },
  {
    name: "pvp",
    description: "Player vs Player battles",
    category: "rpg",
    subcommands: ["challenge", "stats"],
  },
  {
    name: "premium",
    description: "View your premium status or compare tier benefits",
    category: "economy",
    subcommands: ["status", "compare"],
  },
  {
    name: "global-shop",
    description: "Browse and buy exclusive items with stars",
    category: "economy",
    subcommands: ["view", "buy"],
  },
  {
    name: "global-inventory",
    description: "View your purchased global items",
    category: "economy",
    subcommands: ["view"],
  },
  {
    name: "quest",
    description: "Daily quests — complete tasks for coin and star rewards",
    category: "economy",
    subcommands: ["view", "claim"],
  },
  {
    name: "profile",
    description: "View a comprehensive profile card showing level, economy, streaks, and activity stats — canvas image for premium users",
    category: "info",
    options: ["user (optional)"],
  },
  {
    name: "achievements",
    description: "Browse your achievements across 10 categories — paginated progress display with tiered rewards (coin, gem, star)",
    category: "info",
    options: ["category (optional)", "page (optional)"],
  },
  {
    name: "moderation",
    description:
      "Staff moderation — timeout (≤28 days), remove timeout, ban, kick, and unban by user ID (requires ModerateMembers / BanMembers)",
    category: "moderation",
    subcommands: ["timeout", "untimeout", "ban", "kick", "unban"],
  },
  // Manga
  {
    name: "nhentai",
    description: "Manga and doujinshi reader from nhentai.net",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "3hentai",
    description: "Manga and doujinshi from 3hentai",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "asmhentai",
    description: "Random doujinshi from asmhentai",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "hentaifox",
    description: "Random doujinshi from hentaifox",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "nhentai-lite",
    description: "Manga and doujinshi reader — nhentai lite version",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "pururin",
    description: "Random doujinshi from pururin",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "hentai2read",
    description: "Read doujinshi from hentai2read — search and read only",
    category: "manga",
    subcommands: ["read"],
  },
  {
    name: "simply-hentai",
    description: "Read doujinshi from simply-hentai — search and read only",
    category: "manga",
    subcommands: ["read"],
  },
  // Utility
  {
    name: "trans",
    description: "Translate all languages to Vietnamese",
    category: "utility",
    options: ["word (required)"],
  },
  {
    name: "weather",
    description: "Get weather information for any location",
    category: "utility",
    options: ["location (required)"],
  },
  {
    name: "ping",
    description: "Replies with Pong! Shows bot latency",
    category: "utility",
  },
  // Info
  {
    name: "help",
    description: "Get the help commands list",
    category: "info",
  },
  {
    name: "info",
    description: "Information about bot — version, stats, tech stack",
    category: "info",
    subcommands: ["bot"],
  },
  {
    name: "avatar",
    description: "Get the avatar URL of the selected user, or your own avatar",
    category: "info",
    options: ["target (optional)"],
  },
  // Settings
  {
    name: "settings",
    description: "Configure personal or server language preference (15 languages supported)",
    category: "settings",
    subcommands: ["language", "server-language"],
  },
  // Confession
  {
    name: "confession",
    description:
      "Anonymous confessions with VIP embeds, voting, reply threads, keyword filter, ban system, and category tags",
    category: "confession",
    subcommands: ["setup", "submit", "ban", "unban", "filter-add", "filter-remove", "filter-list"],
    options: ["vip", "skip_cooldown", "tag"],
  },
];
