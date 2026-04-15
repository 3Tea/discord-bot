import { createHash } from "node:crypto";
import type { PremiumTier } from "../../models/userWallet.model";

export type QuestDifficulty = "easy" | "medium" | "hard";

export interface QuestTemplate {
    id: string;
    difficulty: QuestDifficulty;
    triggers: string[];
    target: number;
    nameKey: string;
}

const EASY_QUESTS: QuestTemplate[] = [
    { id: "e_pray", difficulty: "easy", triggers: ["pray_target"], target: 1, nameKey: "quest.name.e_pray" },
    { id: "e_curse", difficulty: "easy", triggers: ["curse_target"], target: 1, nameKey: "quest.name.e_curse" },
    { id: "e_rank", difficulty: "easy", triggers: ["rank"], target: 1, nameKey: "quest.name.e_rank" },
    { id: "e_balance", difficulty: "easy", triggers: ["balance"], target: 1, nameKey: "quest.name.e_balance" },
    { id: "e_wallet", difficulty: "easy", triggers: ["wallet_view"], target: 1, nameKey: "quest.name.e_wallet" },
    { id: "e_daily", difficulty: "easy", triggers: ["wallet_daily"], target: 1, nameKey: "quest.name.e_daily" },
];

const MEDIUM_QUESTS: QuestTemplate[] = [
    { id: "m_work", difficulty: "medium", triggers: ["work"], target: 1, nameKey: "quest.name.m_work" },
    { id: "m_fish", difficulty: "medium", triggers: ["fish"], target: 1, nameKey: "quest.name.m_fish" },
    { id: "m_mine", difficulty: "medium", triggers: ["mine"], target: 1, nameKey: "quest.name.m_mine" },
    { id: "m_gift", difficulty: "medium", triggers: ["gift"], target: 1, nameKey: "quest.name.m_gift" },
    { id: "m_confess", difficulty: "medium", triggers: ["confession"], target: 1, nameKey: "quest.name.m_confess" },
    { id: "m_shop", difficulty: "medium", triggers: ["shop_view"], target: 1, nameKey: "quest.name.m_shop" },
];

const HARD_QUESTS: QuestTemplate[] = [
    { id: "h_dungeon", difficulty: "hard", triggers: ["dungeon"], target: 1, nameKey: "quest.name.h_dungeon" },
    { id: "h_mine2", difficulty: "hard", triggers: ["mine"], target: 2, nameKey: "quest.name.h_mine2" },
    { id: "h_gamble_win", difficulty: "hard", triggers: ["gamble_win"], target: 1, nameKey: "quest.name.h_gamble_win" },
    {
        id: "h_pray_curse",
        difficulty: "hard",
        triggers: ["pray", "pray_target", "curse", "curse_target"],
        target: 2,
        nameKey: "quest.name.h_pray_curse",
    },
    { id: "h_fish2", difficulty: "hard", triggers: ["fish"], target: 2, nameKey: "quest.name.h_fish2" },
    {
        id: "h_rob_success",
        difficulty: "hard",
        triggers: ["rob_success"],
        target: 1,
        nameKey: "quest.name.h_rob_success",
    },
];

interface QuestRewards {
    easy: number;
    medium: number;
    hard: number;
    allComplete: number;
}

export const QUEST_REWARDS: Record<"free" | PremiumTier, QuestRewards> = {
    free: { easy: 10, medium: 20, hard: 35, allComplete: 1 },
    star: { easy: 15, medium: 30, hard: 50, allComplete: 2 },
    galaxy: { easy: 20, medium: 40, hard: 70, allComplete: 3 },
};

interface StreakMilestone {
    days: number;
    rewards: Record<"free" | PremiumTier, number>;
}

export const QUEST_STREAK_MILESTONES: StreakMilestone[] = [
    { days: 3, rewards: { free: 1, star: 2, galaxy: 3 } },
    { days: 7, rewards: { free: 3, star: 5, galaxy: 8 } },
    { days: 14, rewards: { free: 5, star: 8, galaxy: 12 } },
    { days: 30, rewards: { free: 10, star: 15, galaxy: 20 } },
];

function seededIndex(seed: string, poolSize: number): number {
    const hash = createHash("sha256").update(seed).digest();
    const num = hash.readUInt32BE(0);
    return num % poolSize;
}

export function generateDailyQuests(userId: string, date: string): QuestTemplate[] {
    const easyIdx = seededIndex(`${userId}:${date}:easy`, EASY_QUESTS.length);
    const medIdx = seededIndex(`${userId}:${date}:medium`, MEDIUM_QUESTS.length);
    const hardIdx = seededIndex(`${userId}:${date}:hard`, HARD_QUESTS.length);
    return [EASY_QUESTS[easyIdx], MEDIUM_QUESTS[medIdx], HARD_QUESTS[hardIdx]];
}

export function getQuestCoinReward(difficulty: QuestDifficulty, tier: PremiumTier | null): number {
    return QUEST_REWARDS[tier ?? "free"][difficulty];
}

export function getQuestStarReward(tier: PremiumTier | null): number {
    return QUEST_REWARDS[tier ?? "free"].allComplete;
}

const QUEST_MAP = new Map<string, QuestTemplate>(
    [...EASY_QUESTS, ...MEDIUM_QUESTS, ...HARD_QUESTS].map((q) => [q.id, q])
);

export function getQuestTemplate(questId: string): QuestTemplate | undefined {
    return QUEST_MAP.get(questId);
}

export function getTodayDateKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}
