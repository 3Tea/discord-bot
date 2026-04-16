// src/services/rpg/branch.config.ts
import type { QuestAction } from "./guild.config";
import type { CrateType } from "./rpg.config";

// Weekly quest actions (subset of guild quest actions - collective-friendly only)
export const WEEKLY_QUEST_ACTIONS: QuestAction[] = [
    "kill_monsters",
    "defeat_boss",
    "earn_gold",
    "collect_materials",
    "complete_quests",
    "craft_equipment",
];

export interface WeeklyQuestTemplate {
    action: QuestAction;
    baseTarget: number;
}

export const WEEKLY_QUEST_TEMPLATES: WeeklyQuestTemplate[] = [
    { action: "kill_monsters", baseTarget: 100 },
    { action: "defeat_boss", baseTarget: 15 },
    { action: "earn_gold", baseTarget: 10000 },
    { action: "collect_materials", baseTarget: 50 },
    { action: "complete_quests", baseTarget: 30 },
    { action: "craft_equipment", baseTarget: 10 },
];

export interface WeeklyRewardTier {
    minCompleted: number;
    gold: number;
    exp: number;
    gp: number;
    crate: "silver" | null;
}

export const WEEKLY_REWARD_TIERS: WeeklyRewardTier[] = [
    { minCompleted: 3, gold: 50, exp: 30, gp: 15, crate: "silver" },
    { minCompleted: 2, gold: 30, exp: 20, gp: 10, crate: null },
    { minCompleted: 1, gold: 15, exp: 10, gp: 5, crate: null },
];

export const WEEKLY_QUESTS_COUNT = 3;
export const BRANCH_QUEST_TTL = 691200; // 8 days in seconds

export function scaleTarget(baseTarget: number, memberCount: number): number {
    const scale = Math.max(1, Math.ceil(memberCount / 5));
    return baseTarget * Math.min(scale, 20);
}

export function getWeekKey(): string {
    const d = new Date();
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((d.getTime() - yearStart.getTime()) / 86400000);
    const weekNum = Math.ceil((dayOfYear + yearStart.getUTCDay() + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// --- Monthly Competitive Events ---

export interface EventTheme {
    key: string;
    label: string;
    action: QuestAction;
    emoji: string;
}

export const EVENT_THEMES: EventTheme[] = [
    { key: "boss_slayer", label: "Boss Slayer", action: "defeat_boss", emoji: "⚔️" },
    { key: "gold_rush", label: "Gold Rush", action: "earn_gold", emoji: "🪙" },
    { key: "monster_hunter", label: "Monster Hunter", action: "kill_monsters", emoji: "🐉" },
    { key: "master_crafter", label: "Master Crafter", action: "craft_equipment", emoji: "🔨" },
    { key: "quest_champion", label: "Quest Champion", action: "complete_quests", emoji: "📜" },
    { key: "material_collector", label: "Material Collector", action: "collect_materials", emoji: "💎" },
];

export interface EventRewardTier {
    maxRank: number;
    gold: number;
    exp: number;
    gp: number;
    crate: CrateType | null;
}

export const EVENT_REWARD_TIERS: EventRewardTier[] = [
    { maxRank: 1, gold: 200, exp: 100, gp: 50, crate: "gold" },
    { maxRank: 2, gold: 100, exp: 50, gp: 25, crate: "silver" },
    { maxRank: 3, gold: 50, exp: 25, gp: 10, crate: "bronze" },
    { maxRank: 10, gold: 25, exp: 15, gp: 5, crate: null },
];

export const EVENT_SCORE_TTL = 2764800; // 32 days

export function getMonthKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentEventTheme(): EventTheme {
    const month = new Date().getUTCMonth(); // 0-11
    return EVENT_THEMES[month % EVENT_THEMES.length];
}

export function getDaysRemainingInMonth(): number {
    const now = new Date();
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return lastDay.getUTCDate() - now.getUTCDate();
}
