"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const userEconomy_model_1 = __importDefault(require("../../models/userEconomy.model"));
const currency_service_1 = __importDefault(require("./currency.service"));
const random_1 = require("../../util/math/random");
const prime_1 = require("../../util/math/prime");
// --- Mineral table ---
const MINERAL_TABLE = [
    { threshold: 0.45, name: "stone", rarity: "common", emoji: "🪨", minCoin: 10, maxCoin: 30, depthMultiplier: 2 },
    { threshold: 0.73, name: "iron", rarity: "uncommon", emoji: "⛓️", minCoin: 40, maxCoin: 80, depthMultiplier: 3 },
    { threshold: 0.88, name: "gold", rarity: "rare", emoji: "🥇", minCoin: 100, maxCoin: 200, depthMultiplier: 5 },
    { threshold: 0.96, name: "diamond", rarity: "epic", emoji: "💎", minCoin: 300, maxCoin: 500, depthMultiplier: 8 },
    {
        threshold: 1.0,
        name: "emerald",
        rarity: "legendary",
        emoji: "🟢",
        minCoin: 500,
        maxCoin: 800,
        depthMultiplier: 12,
    },
];
const COLLAPSE_PENALTY_MIN = 50;
const COLLAPSE_PENALTY_MAX = 100;
// --- Helpers ---
function getCollapseRate(depth) {
    if (depth <= 5)
        return 0.05;
    if (depth <= 10)
        return 0.1;
    return 0.15;
}
function rollMineral(depth) {
    const roll = Math.random();
    for (const entry of MINERAL_TABLE) {
        if (roll < entry.threshold) {
            const baseCoin = (0, random_1.randomInRange)(entry.minCoin, entry.maxCoin);
            const depthBonus = depth * entry.depthMultiplier;
            return {
                name: entry.name,
                rarity: entry.rarity,
                emoji: entry.emoji,
                baseCoin,
                depthBonus,
                totalReward: baseCoin + depthBonus,
            };
        }
    }
    const baseCoin = (0, random_1.randomInRange)(10, 30);
    return {
        name: "stone",
        rarity: "common",
        emoji: "🪨",
        baseCoin,
        depthBonus: depth * 2,
        totalReward: baseCoin + depth * 2,
    };
}
// --- Rarity colors ---
const RARITY_COLORS = {
    common: 0x95a5a6,
    uncommon: 0x3498db,
    rare: 0x9b59b6,
    epic: 0xe91e63,
    legendary: 0xf1c40f,
};
function getRarityColor(rarity) {
    return RARITY_COLORS[rarity] ?? 0x95a5a6;
}
// --- Main mine logic ---
async function mine(userId, guildId) {
    const economy = await userEconomy_model_1.default.findOneAndUpdate({ userId, guildId }, { $setOnInsert: { userId, guildId, coin: 0, gem: 0, prayStreak: 0, mineDepth: 1, mineCheckpoint: 1 } }, { upsert: true, new: true });
    const currentDepth = economy.mineDepth ?? 1;
    const currentCheckpoint = economy.mineCheckpoint ?? 1;
    // Roll collapse
    const collapseRate = getCollapseRate(currentDepth);
    if (Math.random() < collapseRate) {
        const penalty = (0, random_1.randomInRange)(COLLAPSE_PENALTY_MIN, COLLAPSE_PENALTY_MAX);
        await userEconomy_model_1.default.updateOne({ userId, guildId }, [
            { $set: { coin: { $max: [{ $subtract: ["$coin", penalty] }, 0] }, mineDepth: currentCheckpoint } },
        ]);
        return {
            collapsed: true,
            mineral: null,
            penalty,
            newDepth: currentCheckpoint,
            checkpoint: currentCheckpoint,
            checkpointReached: false,
        };
    }
    // Success: roll mineral
    const mineral = rollMineral(currentDepth);
    const newDepth = currentDepth + 1;
    const checkpointReached = (0, prime_1.isPrime)(newDepth);
    const newCheckpoint = checkpointReached ? newDepth : currentCheckpoint;
    await currency_service_1.default.addCoin(userId, guildId, mineral.totalReward, "mine", {
        mineral: mineral.name,
        rarity: mineral.rarity,
        depth: currentDepth,
        reward: mineral.totalReward,
    });
    await userEconomy_model_1.default.updateOne({ userId, guildId }, { $set: { mineDepth: newDepth, mineCheckpoint: newCheckpoint } });
    return {
        collapsed: false,
        mineral,
        penalty: 0,
        newDepth,
        checkpoint: newCheckpoint,
        checkpointReached,
    };
}
const MineService = { mine, getRarityColor, isPrime: prime_1.isPrime };
exports.default = MineService;
