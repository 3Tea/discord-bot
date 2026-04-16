// src/services/rpg/guild.config.ts
import type { CrateType, Rarity } from "./rpg.config";

// --- Adventurer Ranks ---

export const ADVENTURER_RANKS = ["f", "e", "d", "c", "b", "a", "s", "ss", "sss", "legendary"] as const;
export type AdventurerRank = (typeof ADVENTURER_RANKS)[number];

export interface RankDef {
    key: AdventurerRank;
    label: string;
    emoji: string;
    gpRequired: number;
    minLevel: number;
    minBossKills: number;
}

export const RANK_CONFIG: Record<AdventurerRank, RankDef> = {
    f: { key: "f", label: "Novice", emoji: "🟤", gpRequired: 0, minLevel: 1, minBossKills: 0 },
    e: { key: "e", label: "Beginner", emoji: "⚪", gpRequired: 100, minLevel: 5, minBossKills: 1 },
    d: { key: "d", label: "Apprentice", emoji: "🟢", gpRequired: 300, minLevel: 10, minBossKills: 3 },
    c: { key: "c", label: "Intermediate", emoji: "🔵", gpRequired: 700, minLevel: 15, minBossKills: 8 },
    b: { key: "b", label: "Advanced", emoji: "🟣", gpRequired: 1500, minLevel: 20, minBossKills: 15 },
    a: { key: "a", label: "Expert", emoji: "🟡", gpRequired: 3000, minLevel: 25, minBossKills: 25 },
    s: { key: "s", label: "Elite", emoji: "🟠", gpRequired: 6000, minLevel: 30, minBossKills: 40 },
    ss: { key: "ss", label: "Master", emoji: "🔴", gpRequired: 12000, minLevel: 35, minBossKills: 60 },
    sss: { key: "sss", label: "Grandmaster", emoji: "⭐", gpRequired: 25000, minLevel: 40, minBossKills: 100 },
    legendary: { key: "legendary", label: "Legend", emoji: "👑", gpRequired: 50000, minLevel: 50, minBossKills: 200 },
};

// --- Quest Actions ---

export const QUEST_ACTIONS = [
    "kill_monsters",
    "reach_floor",
    "defeat_boss",
    "earn_gold",
    "craft_equipment",
    "open_crates",
    "collect_materials",
    "use_work",
    "use_fish",
    "send_messages",
    "use_pray",
    "complete_quests",
] as const;
export type QuestAction = (typeof QUEST_ACTIONS)[number];

// --- Quest Templates ---

export interface QuestTemplate {
    action: QuestAction;
    targetByRank: Record<AdventurerRank, { min: number; max: number }>;
    baseGold: number;
    baseExp: number;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
    {
        action: "kill_monsters",
        targetByRank: {
            f: { min: 3, max: 5 },
            e: { min: 5, max: 8 },
            d: { min: 8, max: 12 },
            c: { min: 12, max: 18 },
            b: { min: 18, max: 25 },
            a: { min: 25, max: 35 },
            s: { min: 30, max: 40 },
            ss: { min: 35, max: 45 },
            sss: { min: 40, max: 50 },
            legendary: { min: 45, max: 60 },
        },
        baseGold: 100,
        baseExp: 50,
    },
    {
        action: "defeat_boss",
        targetByRank: {
            f: { min: 1, max: 1 },
            e: { min: 1, max: 2 },
            d: { min: 1, max: 2 },
            c: { min: 2, max: 3 },
            b: { min: 2, max: 3 },
            a: { min: 3, max: 4 },
            s: { min: 3, max: 5 },
            ss: { min: 4, max: 6 },
            sss: { min: 5, max: 7 },
            legendary: { min: 5, max: 8 },
        },
        baseGold: 200,
        baseExp: 100,
    },
    {
        action: "reach_floor",
        targetByRank: {
            f: { min: 3, max: 5 },
            e: { min: 5, max: 8 },
            d: { min: 8, max: 12 },
            c: { min: 12, max: 16 },
            b: { min: 16, max: 22 },
            a: { min: 22, max: 28 },
            s: { min: 28, max: 35 },
            ss: { min: 35, max: 42 },
            sss: { min: 42, max: 48 },
            legendary: { min: 48, max: 55 },
        },
        baseGold: 150,
        baseExp: 80,
    },
    {
        action: "earn_gold",
        targetByRank: {
            f: { min: 200, max: 400 },
            e: { min: 400, max: 700 },
            d: { min: 700, max: 1200 },
            c: { min: 1200, max: 2000 },
            b: { min: 2000, max: 3500 },
            a: { min: 3500, max: 5000 },
            s: { min: 5000, max: 8000 },
            ss: { min: 8000, max: 12000 },
            sss: { min: 12000, max: 18000 },
            legendary: { min: 18000, max: 25000 },
        },
        baseGold: 80,
        baseExp: 40,
    },
    {
        action: "craft_equipment",
        targetByRank: {
            f: { min: 1, max: 1 },
            e: { min: 1, max: 2 },
            d: { min: 1, max: 2 },
            c: { min: 2, max: 3 },
            b: { min: 2, max: 3 },
            a: { min: 3, max: 4 },
            s: { min: 3, max: 5 },
            ss: { min: 4, max: 5 },
            sss: { min: 5, max: 6 },
            legendary: { min: 5, max: 7 },
        },
        baseGold: 150,
        baseExp: 75,
    },
    {
        action: "open_crates",
        targetByRank: {
            f: { min: 1, max: 2 },
            e: { min: 2, max: 3 },
            d: { min: 2, max: 4 },
            c: { min: 3, max: 5 },
            b: { min: 4, max: 6 },
            a: { min: 5, max: 7 },
            s: { min: 6, max: 8 },
            ss: { min: 7, max: 9 },
            sss: { min: 8, max: 10 },
            legendary: { min: 9, max: 12 },
        },
        baseGold: 80,
        baseExp: 40,
    },
    {
        action: "collect_materials",
        targetByRank: {
            f: { min: 5, max: 10 },
            e: { min: 10, max: 15 },
            d: { min: 15, max: 25 },
            c: { min: 25, max: 35 },
            b: { min: 35, max: 50 },
            a: { min: 50, max: 70 },
            s: { min: 70, max: 90 },
            ss: { min: 90, max: 120 },
            sss: { min: 120, max: 150 },
            legendary: { min: 150, max: 200 },
        },
        baseGold: 80,
        baseExp: 40,
    },
    {
        action: "use_work",
        targetByRank: {
            f: { min: 2, max: 3 },
            e: { min: 3, max: 4 },
            d: { min: 3, max: 5 },
            c: { min: 4, max: 6 },
            b: { min: 5, max: 7 },
            a: { min: 5, max: 8 },
            s: { min: 6, max: 8 },
            ss: { min: 7, max: 9 },
            sss: { min: 8, max: 10 },
            legendary: { min: 9, max: 12 },
        },
        baseGold: 60,
        baseExp: 30,
    },
    {
        action: "use_fish",
        targetByRank: {
            f: { min: 2, max: 3 },
            e: { min: 3, max: 4 },
            d: { min: 3, max: 5 },
            c: { min: 4, max: 6 },
            b: { min: 5, max: 7 },
            a: { min: 5, max: 8 },
            s: { min: 6, max: 8 },
            ss: { min: 7, max: 9 },
            sss: { min: 8, max: 10 },
            legendary: { min: 9, max: 12 },
        },
        baseGold: 60,
        baseExp: 30,
    },
    {
        action: "send_messages",
        targetByRank: {
            f: { min: 20, max: 40 },
            e: { min: 40, max: 60 },
            d: { min: 60, max: 100 },
            c: { min: 100, max: 150 },
            b: { min: 150, max: 200 },
            a: { min: 200, max: 300 },
            s: { min: 300, max: 400 },
            ss: { min: 400, max: 500 },
            sss: { min: 500, max: 700 },
            legendary: { min: 700, max: 1000 },
        },
        baseGold: 50,
        baseExp: 25,
    },
    {
        action: "use_pray",
        targetByRank: {
            f: { min: 1, max: 2 },
            e: { min: 2, max: 3 },
            d: { min: 2, max: 3 },
            c: { min: 3, max: 4 },
            b: { min: 3, max: 5 },
            a: { min: 4, max: 5 },
            s: { min: 4, max: 6 },
            ss: { min: 5, max: 7 },
            sss: { min: 6, max: 8 },
            legendary: { min: 7, max: 10 },
        },
        baseGold: 60,
        baseExp: 30,
    },
    {
        action: "complete_quests",
        targetByRank: {
            f: { min: 2, max: 3 },
            e: { min: 2, max: 3 },
            d: { min: 3, max: 4 },
            c: { min: 3, max: 4 },
            b: { min: 3, max: 5 },
            a: { min: 4, max: 5 },
            s: { min: 4, max: 6 },
            ss: { min: 5, max: 6 },
            sss: { min: 5, max: 7 },
            legendary: { min: 6, max: 8 },
        },
        baseGold: 120,
        baseExp: 60,
    },
];

// --- Reward Scaling ---

export interface RewardScale {
    gpPerQuest: number;
    goldMultiplier: number;
    expMultiplier: number;
    materialChance: number;
    crateChance: number;
}

export const REWARD_SCALING: Record<AdventurerRank, RewardScale> = {
    f: { gpPerQuest: 10, goldMultiplier: 1, expMultiplier: 1, materialChance: 0.2, crateChance: 0 },
    e: { gpPerQuest: 15, goldMultiplier: 1.2, expMultiplier: 1.2, materialChance: 0.3, crateChance: 0.05 },
    d: { gpPerQuest: 20, goldMultiplier: 1.4, expMultiplier: 1.4, materialChance: 0.4, crateChance: 0.1 },
    c: { gpPerQuest: 30, goldMultiplier: 1.6, expMultiplier: 1.6, materialChance: 0.5, crateChance: 0.15 },
    b: { gpPerQuest: 45, goldMultiplier: 1.8, expMultiplier: 1.8, materialChance: 0.6, crateChance: 0.2 },
    a: { gpPerQuest: 65, goldMultiplier: 2, expMultiplier: 2, materialChance: 0.7, crateChance: 0.25 },
    s: { gpPerQuest: 90, goldMultiplier: 2.5, expMultiplier: 2.5, materialChance: 0.8, crateChance: 0.35 },
    ss: { gpPerQuest: 120, goldMultiplier: 3, expMultiplier: 3, materialChance: 0.9, crateChance: 0.45 },
    sss: { gpPerQuest: 160, goldMultiplier: 3.5, expMultiplier: 3.5, materialChance: 0.95, crateChance: 0.55 },
    legendary: { gpPerQuest: 200, goldMultiplier: 4, expMultiplier: 4, materialChance: 1, crateChance: 0.7 },
};

// --- Board Quest Rank Requirements ---

export const BOARD_QUEST_RANKS: [AdventurerRank, AdventurerRank, AdventurerRank] = ["f", "d", "b"];

// --- Quest Limits ---

export const MAX_ACTIVE_QUESTS = 3;
export const DAILY_BOARD_QUESTS = 3;
export const DAILY_PERSONAL_QUESTS = 2;

// --- Seeded PRNG (Mulberry32) ---

export function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

export function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
