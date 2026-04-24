"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_SCORE_TTL = exports.EVENT_REWARD_TIERS = exports.EVENT_THEMES = exports.BRANCH_QUEST_TTL = exports.WEEKLY_QUESTS_COUNT = exports.WEEKLY_REWARD_TIERS = exports.WEEKLY_QUEST_TEMPLATES = exports.WEEKLY_QUEST_ACTIONS = void 0;
exports.scaleTarget = scaleTarget;
exports.getWeekKey = getWeekKey;
exports.getMonthKey = getMonthKey;
exports.getCurrentEventTheme = getCurrentEventTheme;
exports.getDaysRemainingInMonth = getDaysRemainingInMonth;
// Weekly quest actions (subset of guild quest actions - collective-friendly only)
exports.WEEKLY_QUEST_ACTIONS = [
    "kill_monsters",
    "defeat_boss",
    "earn_gold",
    "collect_materials",
    "complete_quests",
    "craft_equipment",
];
exports.WEEKLY_QUEST_TEMPLATES = [
    { action: "kill_monsters", baseTarget: 100 },
    { action: "defeat_boss", baseTarget: 15 },
    { action: "earn_gold", baseTarget: 10000 },
    { action: "collect_materials", baseTarget: 50 },
    { action: "complete_quests", baseTarget: 30 },
    { action: "craft_equipment", baseTarget: 10 },
];
exports.WEEKLY_REWARD_TIERS = [
    { minCompleted: 3, gold: 50, exp: 30, gp: 15, crate: "silver" },
    { minCompleted: 2, gold: 30, exp: 20, gp: 10, crate: null },
    { minCompleted: 1, gold: 15, exp: 10, gp: 5, crate: null },
];
exports.WEEKLY_QUESTS_COUNT = 3;
exports.BRANCH_QUEST_TTL = 691200; // 8 days in seconds
function scaleTarget(baseTarget, memberCount) {
    const scale = Math.max(1, Math.ceil(memberCount / 5));
    return baseTarget * Math.min(scale, 20);
}
function getWeekKey() {
    const d = new Date();
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((d.getTime() - yearStart.getTime()) / 86400000);
    const weekNum = Math.ceil((dayOfYear + yearStart.getUTCDay() + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
exports.EVENT_THEMES = [
    { key: "boss_slayer", label: "Boss Slayer", action: "defeat_boss", emoji: "⚔️" },
    { key: "gold_rush", label: "Gold Rush", action: "earn_gold", emoji: "🪙" },
    { key: "monster_hunter", label: "Monster Hunter", action: "kill_monsters", emoji: "🐉" },
    { key: "master_crafter", label: "Master Crafter", action: "craft_equipment", emoji: "🔨" },
    { key: "quest_champion", label: "Quest Champion", action: "complete_quests", emoji: "📜" },
    { key: "material_collector", label: "Material Collector", action: "collect_materials", emoji: "💎" },
];
exports.EVENT_REWARD_TIERS = [
    { maxRank: 1, gold: 200, exp: 100, gp: 50, crate: "gold" },
    { maxRank: 2, gold: 100, exp: 50, gp: 25, crate: "silver" },
    { maxRank: 3, gold: 50, exp: 25, gp: 10, crate: "bronze" },
    { maxRank: 10, gold: 25, exp: 15, gp: 5, crate: null },
];
exports.EVENT_SCORE_TTL = 2764800; // 32 days
function getMonthKey() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function getCurrentEventTheme() {
    const month = new Date().getUTCMonth(); // 0-11
    return exports.EVENT_THEMES[month % exports.EVENT_THEMES.length];
}
function getDaysRemainingInMonth() {
    const now = new Date();
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return lastDay.getUTCDate() - now.getUTCDate();
}
