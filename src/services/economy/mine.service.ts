import UserEconomyModel from "../../models/userEconomy.model";
import CurrencyService from "./currency.service";
import { randomInRange } from "../../util/math/random";
import { isPrime } from "../../util/math/prime";

// --- Types ---

export interface MineralRollResult {
    name: string;
    rarity: string;
    emoji: string;
    baseCoin: number;
    depthBonus: number;
    totalReward: number;
}

export interface MineResult {
    collapsed: boolean;
    mineral: MineralRollResult | null;
    penalty: number;
    newDepth: number;
    checkpoint: number;
    checkpointReached: boolean;
}

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
] as const;

const COLLAPSE_PENALTY_MIN = 50;
const COLLAPSE_PENALTY_MAX = 100;

// --- Helpers ---

function getCollapseRate(depth: number): number {
    if (depth <= 5) return 0.05;
    if (depth <= 10) return 0.1;
    return 0.15;
}

function rollMineral(depth: number): MineralRollResult {
    const roll = Math.random();
    for (const entry of MINERAL_TABLE) {
        if (roll < entry.threshold) {
            const baseCoin = randomInRange(entry.minCoin, entry.maxCoin);
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
    const baseCoin = randomInRange(10, 30);
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

const RARITY_COLORS: Record<string, number> = {
    common: 0x95a5a6,
    uncommon: 0x3498db,
    rare: 0x9b59b6,
    epic: 0xe91e63,
    legendary: 0xf1c40f,
};

function getRarityColor(rarity: string): number {
    return RARITY_COLORS[rarity] ?? 0x95a5a6;
}

// --- Main mine logic ---

async function mine(userId: string, guildId: string): Promise<MineResult> {
    const economy = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId, coin: 0, gem: 0, prayStreak: 0, mineDepth: 1, mineCheckpoint: 1 } },
        { upsert: true, new: true }
    );

    const currentDepth = economy.mineDepth ?? 1;
    const currentCheckpoint = economy.mineCheckpoint ?? 1;

    // Roll collapse
    const collapseRate = getCollapseRate(currentDepth);
    if (Math.random() < collapseRate) {
        const penalty = randomInRange(COLLAPSE_PENALTY_MIN, COLLAPSE_PENALTY_MAX);

        await UserEconomyModel.updateOne({ userId, guildId }, [
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
    const checkpointReached = isPrime(newDepth);
    const newCheckpoint = checkpointReached ? newDepth : currentCheckpoint;

    await CurrencyService.addCoin(userId, guildId, mineral.totalReward, "mine", {
        mineral: mineral.name,
        rarity: mineral.rarity,
        depth: currentDepth,
        reward: mineral.totalReward,
    });

    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $set: { mineDepth: newDepth, mineCheckpoint: newCheckpoint } }
    );

    return {
        collapsed: false,
        mineral,
        penalty: 0,
        newDepth,
        checkpoint: newCheckpoint,
        checkpointReached,
    };
}

const MineService = { mine, getRarityColor, isPrime };
export default MineService;
