export interface GuideMeta {
  slug: string;
  label: string;
  color: string;
  bg: string;
  order: number;
}

export const guideMeta: Record<string, GuideMeta> = {
  "getting-started": { slug: "getting-started", label: "Getting Started", color: "#57F287", bg: "rgba(87,242,135,0.15)", order: 0 },
  "admin-setup": { slug: "admin-setup", label: "Admin Setup", color: "#5865F2", bg: "rgba(88,101,242,0.15)", order: 0.5 },
  info: { slug: "info", label: "Info & Help", color: "#FAA61A", bg: "rgba(250,166,26,0.15)", order: 1 },
  settings: { slug: "settings", label: "Settings", color: "#7289DA", bg: "rgba(114,137,218,0.15)", order: 2 },
  economy: { slug: "economy", label: "Economy", color: "#F1C40F", bg: "rgba(241,196,15,0.15)", order: 3 },
  quest: { slug: "quest", label: "Daily Quests", color: "#1ABC9C", bg: "rgba(26,188,156,0.15)", order: 4 },
  star: { slug: "star", label: "Star Currency", color: "#F39C12", bg: "rgba(243,156,18,0.15)", order: 5 },
  premium: { slug: "premium", label: "Premium", color: "#F39C12", bg: "rgba(243,156,18,0.15)", order: 6 },
  "global-shop": { slug: "global-shop", label: "Global Shop", color: "#FFEB3B", bg: "rgba(255,235,59,0.15)", order: 7 },
  xp: { slug: "xp", label: "XP & Leveling", color: "#9B59B6", bg: "rgba(155,89,182,0.15)", order: 8 },
  mine: { slug: "mine", label: "Mining", color: "#95A5A6", bg: "rgba(149,165,166,0.15)", order: 9 },
  dungeon: { slug: "dungeon", label: "Dungeon", color: "#E91E63", bg: "rgba(233,30,99,0.15)", order: 10 },
  voice: { slug: "voice", label: "Voice Channels", color: "#5865F2", bg: "rgba(88,101,242,0.15)", order: 11 },
  utility: { slug: "utility", label: "Utility", color: "#3BA55C", bg: "rgba(59,165,92,0.15)", order: 12 },
  moderation: { slug: "moderation", label: "Moderation", color: "#C0392B", bg: "rgba(192,57,43,0.15)", order: 13 },
  confessions: { slug: "confessions", label: "Confessions", color: "#E67E22", bg: "rgba(230,126,34,0.15)", order: 14 },
  manga: { slug: "manga", label: "Manga & NSFW", color: "#ED4245", bg: "rgba(237,66,69,0.15)", order: 15 },
  "rpg-getting-started": { slug: "rpg-getting-started", label: "RPG Getting Started", color: "#e67e22", bg: "rgba(230, 126, 34, 0.1)", order: 18 },
  "rpg-classes": { slug: "rpg-classes", label: "RPG Classes", color: "#e74c3c", bg: "rgba(231, 76, 60, 0.1)", order: 19 },
  "rpg-equipment": { slug: "rpg-equipment", label: "Equipment & Crafting", color: "#3498db", bg: "rgba(52, 152, 219, 0.1)", order: 20 },
  "adventurer-guild": { slug: "adventurer-guild", label: "Adventurer Guild", color: "#f39c12", bg: "rgba(243, 156, 18, 0.1)", order: 21 },
  pvp: { slug: "pvp", label: "PvP Battles", color: "#9b59b6", bg: "rgba(155, 89, 182, 0.1)", order: 22 },
};
