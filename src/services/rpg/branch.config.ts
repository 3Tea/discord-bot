// src/services/rpg/branch.config.ts
import type { QuestAction } from "./guild.config";

// Weekly quest actions (subset of guild quest actions - collective-friendly only)
export const WEEKLY_QUEST_ACTIONS: QuestAction[] = [
    "kill_monsters", "defeat_boss", "earn_gold",
    "collect_materials", "complete_quests", "craft_equipment",
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
