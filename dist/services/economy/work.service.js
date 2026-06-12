"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const random_1 = require("../../util/math/random");
const format_1 = require("../../util/date/format");
// --- Work ---
function rollWorkReward(min, max) {
    return (0, random_1.randomInRange)(min, max);
}
function rollWorkText() {
    return Math.floor(Math.random() * 10);
}
// --- Fish ---
const FISH_TABLE = [
    { threshold: 0.55, rarity: "common", emoji: "🐟", minCoin: 10, maxCoin: 30 },
    { threshold: 0.83, rarity: "uncommon", emoji: "🐠", minCoin: 40, maxCoin: 80 },
    { threshold: 0.96, rarity: "rare", emoji: "🐡", minCoin: 100, maxCoin: 200 },
    { threshold: 1.0, rarity: "legendary", emoji: "🦈", minCoin: 300, maxCoin: 600 },
];
const FISH_POOL_SIZE = 5; // 5 fish names per rarity
function rollFish() {
    const roll = Math.random();
    for (const entry of FISH_TABLE) {
        if (roll < entry.threshold) {
            const nameIndex = Math.floor(Math.random() * FISH_POOL_SIZE);
            return {
                name: `fish.${entry.rarity}.${nameIndex}`,
                rarity: entry.rarity,
                emoji: entry.emoji,
                minCoin: entry.minCoin,
                maxCoin: entry.maxCoin,
            };
        }
    }
    // Fallback
    return {
        name: "fish.common.0",
        rarity: "common",
        emoji: "🐟",
        minCoin: 10,
        maxCoin: 30,
    };
}
function rollFishReward(minCoin, maxCoin, multiplier) {
    return Math.floor((0, random_1.randomInRange)(minCoin, maxCoin) * multiplier);
}
// Rarity → embed color
const RARITY_COLORS = {
    common: 0x95a5a6,
    uncommon: 0x3498db,
    rare: 0x9b59b6,
    legendary: 0xf1c40f,
};
function getRarityColor(rarity) {
    return RARITY_COLORS[rarity] ?? 0x95a5a6;
}
const WorkService = {
    randomInRange: random_1.randomInRange,
    formatCooldown: format_1.formatCooldown,
    rollWorkReward,
    rollWorkText,
    rollFish,
    rollFishReward,
    getRarityColor,
};
exports.default = WorkService;
