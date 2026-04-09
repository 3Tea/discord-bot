export interface FishRollResult {
    name: string;
    rarity: string;
    emoji: string;
    minCoin: number;
    maxCoin: number;
}

// --- Random helpers ---

function randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCooldown(seconds: number): string {
    if (seconds <= 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0) parts.push(`${s}s`);
    return parts.join(" ");
}

// --- Work ---

function rollWorkReward(min: number, max: number): number {
    return randomInRange(min, max);
}

function rollWorkText(): number {
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

function rollFish(): FishRollResult {
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

function rollFishReward(minCoin: number, maxCoin: number, multiplier: number): number {
    return Math.floor(randomInRange(minCoin, maxCoin) * multiplier);
}

// Rarity → embed color
const RARITY_COLORS: Record<string, number> = {
    common: 0x95a5a6,
    uncommon: 0x3498db,
    rare: 0x9b59b6,
    legendary: 0xf1c40f,
};

function getRarityColor(rarity: string): number {
    return RARITY_COLORS[rarity] ?? 0x95a5a6;
}

const WorkService = {
    randomInRange,
    formatCooldown,
    rollWorkReward,
    rollWorkText,
    rollFish,
    rollFishReward,
    getRarityColor,
};

export default WorkService;
