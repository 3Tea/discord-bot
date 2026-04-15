export type AchievementCategory =
    | "economy"
    | "xp"
    | "mining"
    | "dungeon"
    | "social"
    | "gambling"
    | "voice"
    | "activity"
    | "quests"
    | "stars";

export interface AchievementReward {
    coin?: number;
    gem?: number;
    star?: number;
}

export interface UserStats {
    // From MemberXP
    level: number;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    // From UserEconomy
    coin: number;
    gem: number;
    prayStreak: number;
    mineDepth: number;
    mineCheckpoint: number;
    dungeonDepth: number;
    dungeonCheckpoint: number;
    // From UserWallet
    star: number;
    // From UserQuest
    questStreak: number;
    // From Transaction aggregation (counts)
    totalPrayCount: number;
    totalGambleCount: number;
    totalGiftCount: number;
    totalRobCount: number;
    totalWorkCount: number;
    totalFishCount: number;
}

export interface AchievementDef {
    id: string;
    category: AchievementCategory;
    nameKey: string;
    descKey: string;
    reward: AchievementReward;
    condition: (stats: UserStats) => boolean;
    progress?: (stats: UserStats) => { current: number; target: number };
}

export const CATEGORY_EMOJI: Record<AchievementCategory, string> = {
    economy: "📊",
    xp: "⚔️",
    mining: "⛏️",
    dungeon: "🏰",
    social: "🤝",
    gambling: "🎰",
    voice: "🎙️",
    activity: "💬",
    quests: "📜",
    stars: "⭐",
};

export const CATEGORY_ORDER: AchievementCategory[] = [
    "economy",
    "xp",
    "mining",
    "dungeon",
    "social",
    "gambling",
    "voice",
    "activity",
    "quests",
    "stars",
];

export const ACHIEVEMENTS: AchievementDef[] = [
    // ── Economy (8) ──────────────────────────────────────────────────────────

    {
        id: "eco_first_pray",
        category: "economy",
        nameKey: "achievement.eco_first_pray.name",
        descKey: "achievement.eco_first_pray.desc",
        reward: { coin: 50 },
        condition: (s) => s.totalPrayCount >= 1,
    },
    {
        id: "eco_pray_streak_3",
        category: "economy",
        nameKey: "achievement.eco_pray_streak_3.name",
        descKey: "achievement.eco_pray_streak_3.desc",
        reward: { coin: 100 },
        condition: (s) => s.prayStreak >= 3,
        progress: (s) => ({ current: s.prayStreak, target: 3 }),
    },
    {
        id: "eco_pray_streak_7",
        category: "economy",
        nameKey: "achievement.eco_pray_streak_7.name",
        descKey: "achievement.eco_pray_streak_7.desc",
        reward: { coin: 150, gem: 1 },
        condition: (s) => s.prayStreak >= 7,
        progress: (s) => ({ current: s.prayStreak, target: 7 }),
    },
    {
        id: "eco_pray_streak_14",
        category: "economy",
        nameKey: "achievement.eco_pray_streak_14.name",
        descKey: "achievement.eco_pray_streak_14.desc",
        reward: { coin: 300, gem: 2 },
        condition: (s) => s.prayStreak >= 14,
        progress: (s) => ({ current: s.prayStreak, target: 14 }),
    },
    {
        id: "eco_pray_streak_30",
        category: "economy",
        nameKey: "achievement.eco_pray_streak_30.name",
        descKey: "achievement.eco_pray_streak_30.desc",
        reward: { coin: 500, gem: 5, star: 1 },
        condition: (s) => s.prayStreak >= 30,
        progress: (s) => ({ current: s.prayStreak, target: 30 }),
    },
    {
        id: "eco_rich_1",
        category: "economy",
        nameKey: "achievement.eco_rich_1.name",
        descKey: "achievement.eco_rich_1.desc",
        reward: { coin: 100 },
        condition: (s) => s.coin >= 1000,
        progress: (s) => ({ current: s.coin, target: 1000 }),
    },
    {
        id: "eco_rich_2",
        category: "economy",
        nameKey: "achievement.eco_rich_2.name",
        descKey: "achievement.eco_rich_2.desc",
        reward: { coin: 300, gem: 2 },
        condition: (s) => s.coin >= 10000,
        progress: (s) => ({ current: s.coin, target: 10000 }),
    },
    {
        id: "eco_rich_3",
        category: "economy",
        nameKey: "achievement.eco_rich_3.name",
        descKey: "achievement.eco_rich_3.desc",
        reward: { coin: 1000, gem: 10, star: 3 },
        condition: (s) => s.coin >= 100000,
        progress: (s) => ({ current: s.coin, target: 100000 }),
    },

    // ── XP & Level (7) ───────────────────────────────────────────────────────

    {
        id: "xp_level_5",
        category: "xp",
        nameKey: "achievement.xp_level_5.name",
        descKey: "achievement.xp_level_5.desc",
        reward: { coin: 50 },
        condition: (s) => s.level >= 5,
        progress: (s) => ({ current: s.level, target: 5 }),
    },
    {
        id: "xp_level_10",
        category: "xp",
        nameKey: "achievement.xp_level_10.name",
        descKey: "achievement.xp_level_10.desc",
        reward: { coin: 100 },
        condition: (s) => s.level >= 10,
        progress: (s) => ({ current: s.level, target: 10 }),
    },
    {
        id: "xp_level_25",
        category: "xp",
        nameKey: "achievement.xp_level_25.name",
        descKey: "achievement.xp_level_25.desc",
        reward: { coin: 200, gem: 1 },
        condition: (s) => s.level >= 25,
        progress: (s) => ({ current: s.level, target: 25 }),
    },
    {
        id: "xp_level_50",
        category: "xp",
        nameKey: "achievement.xp_level_50.name",
        descKey: "achievement.xp_level_50.desc",
        reward: { coin: 400, gem: 3, star: 1 },
        condition: (s) => s.level >= 50,
        progress: (s) => ({ current: s.level, target: 50 }),
    },
    {
        id: "xp_level_75",
        category: "xp",
        nameKey: "achievement.xp_level_75.name",
        descKey: "achievement.xp_level_75.desc",
        reward: { coin: 600, gem: 5, star: 2 },
        condition: (s) => s.level >= 75,
        progress: (s) => ({ current: s.level, target: 75 }),
    },
    {
        id: "xp_level_100",
        category: "xp",
        nameKey: "achievement.xp_level_100.name",
        descKey: "achievement.xp_level_100.desc",
        reward: { coin: 1000, gem: 10, star: 3 },
        condition: (s) => s.level >= 100,
        progress: (s) => ({ current: s.level, target: 100 }),
    },
    {
        id: "xp_rookie",
        category: "xp",
        nameKey: "achievement.xp_rookie.name",
        descKey: "achievement.xp_rookie.desc",
        reward: { coin: 75 },
        condition: (s) => s.xp >= 1000,
        progress: (s) => ({ current: s.xp, target: 1000 }),
    },

    // ── Mining (5) ───────────────────────────────────────────────────────────

    {
        id: "mine_first",
        category: "mining",
        nameKey: "achievement.mine_first.name",
        descKey: "achievement.mine_first.desc",
        reward: { coin: 50 },
        condition: (s) => s.mineDepth >= 2,
        progress: (s) => ({ current: s.mineDepth, target: 2 }),
    },
    {
        id: "mine_depth_5",
        category: "mining",
        nameKey: "achievement.mine_depth_5.name",
        descKey: "achievement.mine_depth_5.desc",
        reward: { coin: 150, gem: 1 },
        condition: (s) => s.mineDepth >= 5,
        progress: (s) => ({ current: s.mineDepth, target: 5 }),
    },
    {
        id: "mine_depth_10",
        category: "mining",
        nameKey: "achievement.mine_depth_10.name",
        descKey: "achievement.mine_depth_10.desc",
        reward: { coin: 300, gem: 2 },
        condition: (s) => s.mineDepth >= 10,
        progress: (s) => ({ current: s.mineDepth, target: 10 }),
    },
    {
        id: "mine_depth_25",
        category: "mining",
        nameKey: "achievement.mine_depth_25.name",
        descKey: "achievement.mine_depth_25.desc",
        reward: { coin: 500, gem: 3, star: 1 },
        condition: (s) => s.mineDepth >= 25,
        progress: (s) => ({ current: s.mineDepth, target: 25 }),
    },
    {
        id: "mine_depth_50",
        category: "mining",
        nameKey: "achievement.mine_depth_50.name",
        descKey: "achievement.mine_depth_50.desc",
        reward: { coin: 800, gem: 5, star: 2 },
        condition: (s) => s.mineDepth >= 50,
        progress: (s) => ({ current: s.mineDepth, target: 50 }),
    },

    // ── Dungeon (5) ──────────────────────────────────────────────────────────

    {
        id: "dg_first",
        category: "dungeon",
        nameKey: "achievement.dg_first.name",
        descKey: "achievement.dg_first.desc",
        reward: { coin: 50 },
        condition: (s) => s.dungeonDepth >= 2,
        progress: (s) => ({ current: s.dungeonDepth, target: 2 }),
    },
    {
        id: "dg_depth_5",
        category: "dungeon",
        nameKey: "achievement.dg_depth_5.name",
        descKey: "achievement.dg_depth_5.desc",
        reward: { coin: 150, gem: 1 },
        condition: (s) => s.dungeonDepth >= 5,
        progress: (s) => ({ current: s.dungeonDepth, target: 5 }),
    },
    {
        id: "dg_depth_10",
        category: "dungeon",
        nameKey: "achievement.dg_depth_10.name",
        descKey: "achievement.dg_depth_10.desc",
        reward: { coin: 300, gem: 2 },
        condition: (s) => s.dungeonDepth >= 10,
        progress: (s) => ({ current: s.dungeonDepth, target: 10 }),
    },
    {
        id: "dg_depth_25",
        category: "dungeon",
        nameKey: "achievement.dg_depth_25.name",
        descKey: "achievement.dg_depth_25.desc",
        reward: { coin: 500, gem: 3, star: 1 },
        condition: (s) => s.dungeonDepth >= 25,
        progress: (s) => ({ current: s.dungeonDepth, target: 25 }),
    },
    {
        id: "dg_depth_50",
        category: "dungeon",
        nameKey: "achievement.dg_depth_50.name",
        descKey: "achievement.dg_depth_50.desc",
        reward: { coin: 800, gem: 5, star: 2 },
        condition: (s) => s.dungeonDepth >= 50,
        progress: (s) => ({ current: s.dungeonDepth, target: 50 }),
    },

    // ── Social (5) ───────────────────────────────────────────────────────────

    {
        id: "social_first_gift",
        category: "social",
        nameKey: "achievement.social_first_gift.name",
        descKey: "achievement.social_first_gift.desc",
        reward: { coin: 50 },
        condition: (s) => s.totalGiftCount >= 1,
    },
    {
        id: "social_generous",
        category: "social",
        nameKey: "achievement.social_generous.name",
        descKey: "achievement.social_generous.desc",
        reward: { coin: 200, gem: 1 },
        condition: (s) => s.totalGiftCount >= 10,
        progress: (s) => ({ current: s.totalGiftCount, target: 10 }),
    },
    {
        id: "social_philanthropist",
        category: "social",
        nameKey: "achievement.social_philanthropist.name",
        descKey: "achievement.social_philanthropist.desc",
        reward: { coin: 500, gem: 3, star: 1 },
        condition: (s) => s.totalGiftCount >= 50,
        progress: (s) => ({ current: s.totalGiftCount, target: 50 }),
    },
    {
        id: "social_first_rob",
        category: "social",
        nameKey: "achievement.social_first_rob.name",
        descKey: "achievement.social_first_rob.desc",
        reward: { coin: 50 },
        condition: (s) => s.totalRobCount >= 1,
    },
    {
        id: "social_master_thief",
        category: "social",
        nameKey: "achievement.social_master_thief.name",
        descKey: "achievement.social_master_thief.desc",
        reward: { coin: 300, gem: 2 },
        condition: (s) => s.totalRobCount >= 20,
        progress: (s) => ({ current: s.totalRobCount, target: 20 }),
    },

    // ── Gambling (4) ─────────────────────────────────────────────────────────

    {
        id: "gamble_first",
        category: "gambling",
        nameKey: "achievement.gamble_first.name",
        descKey: "achievement.gamble_first.desc",
        reward: { coin: 50 },
        condition: (s) => s.totalGambleCount >= 1,
    },
    {
        id: "gamble_50",
        category: "gambling",
        nameKey: "achievement.gamble_50.name",
        descKey: "achievement.gamble_50.desc",
        reward: { coin: 200, gem: 1 },
        condition: (s) => s.totalGambleCount >= 50,
        progress: (s) => ({ current: s.totalGambleCount, target: 50 }),
    },
    {
        id: "gamble_100",
        category: "gambling",
        nameKey: "achievement.gamble_100.name",
        descKey: "achievement.gamble_100.desc",
        reward: { coin: 400, gem: 2 },
        condition: (s) => s.totalGambleCount >= 100,
        progress: (s) => ({ current: s.totalGambleCount, target: 100 }),
    },
    {
        id: "gamble_500",
        category: "gambling",
        nameKey: "achievement.gamble_500.name",
        descKey: "achievement.gamble_500.desc",
        reward: { coin: 800, gem: 5, star: 2 },
        condition: (s) => s.totalGambleCount >= 500,
        progress: (s) => ({ current: s.totalGambleCount, target: 500 }),
    },

    // ── Voice (4) ────────────────────────────────────────────────────────────

    {
        id: "voice_1h",
        category: "voice",
        nameKey: "achievement.voice_1h.name",
        descKey: "achievement.voice_1h.desc",
        reward: { coin: 75 },
        condition: (s) => s.voiceMinutes >= 60,
        progress: (s) => ({ current: s.voiceMinutes, target: 60 }),
    },
    {
        id: "voice_10h",
        category: "voice",
        nameKey: "achievement.voice_10h.name",
        descKey: "achievement.voice_10h.desc",
        reward: { coin: 200, gem: 1 },
        condition: (s) => s.voiceMinutes >= 600,
        progress: (s) => ({ current: s.voiceMinutes, target: 600 }),
    },
    {
        id: "voice_50h",
        category: "voice",
        nameKey: "achievement.voice_50h.name",
        descKey: "achievement.voice_50h.desc",
        reward: { coin: 500, gem: 3, star: 1 },
        condition: (s) => s.voiceMinutes >= 3000,
        progress: (s) => ({ current: s.voiceMinutes, target: 3000 }),
    },
    {
        id: "voice_100h",
        category: "voice",
        nameKey: "achievement.voice_100h.name",
        descKey: "achievement.voice_100h.desc",
        reward: { coin: 1000, gem: 5, star: 2 },
        condition: (s) => s.voiceMinutes >= 6000,
        progress: (s) => ({ current: s.voiceMinutes, target: 6000 }),
    },

    // ── Activity (4) ─────────────────────────────────────────────────────────

    {
        id: "msg_100",
        category: "activity",
        nameKey: "achievement.msg_100.name",
        descKey: "achievement.msg_100.desc",
        reward: { coin: 75 },
        condition: (s) => s.messageCount >= 100,
        progress: (s) => ({ current: s.messageCount, target: 100 }),
    },
    {
        id: "msg_1k",
        category: "activity",
        nameKey: "achievement.msg_1k.name",
        descKey: "achievement.msg_1k.desc",
        reward: { coin: 200, gem: 1 },
        condition: (s) => s.messageCount >= 1000,
        progress: (s) => ({ current: s.messageCount, target: 1000 }),
    },
    {
        id: "msg_5k",
        category: "activity",
        nameKey: "achievement.msg_5k.name",
        descKey: "achievement.msg_5k.desc",
        reward: { coin: 500, gem: 3, star: 1 },
        condition: (s) => s.messageCount >= 5000,
        progress: (s) => ({ current: s.messageCount, target: 5000 }),
    },
    {
        id: "msg_10k",
        category: "activity",
        nameKey: "achievement.msg_10k.name",
        descKey: "achievement.msg_10k.desc",
        reward: { coin: 1000, gem: 5, star: 3 },
        condition: (s) => s.messageCount >= 10000,
        progress: (s) => ({ current: s.messageCount, target: 10000 }),
    },

    // ── Quests (4) ───────────────────────────────────────────────────────────

    {
        id: "quest_first",
        category: "quests",
        nameKey: "achievement.quest_first.name",
        descKey: "achievement.quest_first.desc",
        reward: { coin: 50 },
        condition: (s) => s.questStreak >= 1,
    },
    {
        id: "quest_streak_3",
        category: "quests",
        nameKey: "achievement.quest_streak_3.name",
        descKey: "achievement.quest_streak_3.desc",
        reward: { coin: 150, gem: 1 },
        condition: (s) => s.questStreak >= 3,
        progress: (s) => ({ current: s.questStreak, target: 3 }),
    },
    {
        id: "quest_streak_7",
        category: "quests",
        nameKey: "achievement.quest_streak_7.name",
        descKey: "achievement.quest_streak_7.desc",
        reward: { coin: 300, gem: 2 },
        condition: (s) => s.questStreak >= 7,
        progress: (s) => ({ current: s.questStreak, target: 7 }),
    },
    {
        id: "quest_streak_14",
        category: "quests",
        nameKey: "achievement.quest_streak_14.name",
        descKey: "achievement.quest_streak_14.desc",
        reward: { coin: 500, gem: 3, star: 1 },
        condition: (s) => s.questStreak >= 14,
        progress: (s) => ({ current: s.questStreak, target: 14 }),
    },

    // ── Stars (4) ────────────────────────────────────────────────────────────

    {
        id: "star_first",
        category: "stars",
        nameKey: "achievement.star_first.name",
        descKey: "achievement.star_first.desc",
        reward: { coin: 50 },
        condition: (s) => s.star >= 1,
    },
    {
        id: "star_10",
        category: "stars",
        nameKey: "achievement.star_10.name",
        descKey: "achievement.star_10.desc",
        reward: { coin: 200, gem: 1 },
        condition: (s) => s.star >= 10,
        progress: (s) => ({ current: s.star, target: 10 }),
    },
    {
        id: "star_50",
        category: "stars",
        nameKey: "achievement.star_50.name",
        descKey: "achievement.star_50.desc",
        reward: { coin: 400, gem: 3 },
        condition: (s) => s.star >= 50,
        progress: (s) => ({ current: s.star, target: 50 }),
    },
    {
        id: "star_100",
        category: "stars",
        nameKey: "achievement.star_100.name",
        descKey: "achievement.star_100.desc",
        reward: { coin: 800, gem: 5, star: 2 },
        condition: (s) => s.star >= 100,
        progress: (s) => ({ current: s.star, target: 100 }),
    },
];
