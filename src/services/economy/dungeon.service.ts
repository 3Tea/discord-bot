import UserEconomyModel from "../../models/userEconomy.model";
import CurrencyService from "./currency.service";
import { tryStarDrop } from "../../util/economy/starDrop";
import type { Buff } from "./merchant.service";

// --- Types ---

export type EncounterType = "monster" | "treasure" | "trap" | "npc";

export interface CombatState {
    encounterId: string;
    userId: string;
    monsterHp: number;
    userHp: number;
    floor: number;
    checkpoint: number;
    turnsLeft: number;
    guildId: string;
    locale: string;
    monsterName: string;
    monsterEmoji: string;
}

export interface CombatActionResult {
    userDmg: number;
    monsterDmg: number;
    userHp: number;
    monsterHp: number;
    turnsLeft: number;
    won: boolean;
    lost: boolean;
    fled: boolean;
    timedOut: boolean;
    turnsUp: boolean;
}

export interface CombatResolveResult {
    coinReward: number;
    gemReward: number;
    starReward: boolean;
    floorAdvanced: boolean;
    newFloor: number;
    checkpoint: number;
    checkpointReached: boolean;
}

export interface CombatLossResult {
    coinLost: number;
    newFloor: number;
    checkpoint: number;
}

export interface DungeonRunState {
    userId: string;
    guildId: string;
    locale: string;
    hp: number;
    floor: number;
    checkpoint: number;
    encountersLeft: number;
    activeBuff: Buff | null;
    messageId: string;
}

// --- Monster tables ---

const TIER_1 = [
    { name: "Rat", emoji: "🐀" },
    { name: "Bat", emoji: "🦇" },
    { name: "Slime", emoji: "🟢" },
    { name: "Goblin", emoji: "👺" },
    { name: "Spider", emoji: "🕷️" },
];

const TIER_2 = [
    { name: "Skeleton", emoji: "💀" },
    { name: "Zombie", emoji: "🧟" },
    { name: "Wolf", emoji: "🐺" },
    { name: "Orc", emoji: "👹" },
    { name: "Ghost", emoji: "👻" },
];

const TIER_3 = [
    { name: "Dragon", emoji: "🐉" },
    { name: "Demon", emoji: "😈" },
    { name: "Lich", emoji: "🧙" },
    { name: "Hydra", emoji: "🐍" },
    { name: "Titan", emoji: "⚡" },
];

// --- Helpers ---

function randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
    }
    return true;
}

function rollMonster(floor: number): { name: string; emoji: string } {
    if (floor <= 5) return TIER_1[randomInRange(0, TIER_1.length - 1)];
    if (floor <= 10) return TIER_2[randomInRange(0, TIER_2.length - 1)];
    return TIER_3[randomInRange(0, TIER_3.length - 1)];
}

function rollEncounterType(hasLuckBuff = false): EncounterType {
    const roll = Math.random();
    if (hasLuckBuff) {
        if (roll < 0.5) return "monster";
        if (roll < 0.85) return "treasure";
        if (roll < 0.9) return "trap";
        return "npc";
    }
    if (roll < 0.5) return "monster";
    if (roll < 0.75) return "treasure";
    if (roll < 0.9) return "trap";
    return "npc";
}

// --- Core functions ---

function processCombatAction(
    state: CombatState,
    action: "attack" | "defend" | "run" | "timeout",
    buff?: Buff | null
): CombatActionResult {
    if (action === "run") {
        return {
            userDmg: 0,
            monsterDmg: 0,
            userHp: state.userHp,
            monsterHp: state.monsterHp,
            turnsLeft: state.turnsLeft,
            won: false,
            lost: false,
            fled: true,
            timedOut: false,
            turnsUp: false,
        };
    }

    if (action === "timeout") {
        return {
            userDmg: 0,
            monsterDmg: 0,
            userHp: state.userHp,
            monsterHp: state.monsterHp,
            turnsLeft: state.turnsLeft,
            won: false,
            lost: false,
            fled: false,
            timedOut: true,
            turnsUp: false,
        };
    }

    const baseUserDmg = randomInRange(15, 25) + state.floor * 2;
    const baseMonsterDmg = randomInRange(10, 20) + state.floor * 3;

    let userDmg: number;
    let monsterDmg: number;

    if (action === "attack") {
        userDmg = baseUserDmg;
        monsterDmg = baseMonsterDmg;
    } else {
        // defend: 70% user damage, 50% monster damage
        userDmg = Math.floor(baseUserDmg * 0.7);
        monsterDmg = Math.floor(baseMonsterDmg * 0.5);
    }

    // Apply buff effects
    if (buff?.type === "attack") {
        userDmg = Math.floor(userDmg * 1.3);
    }
    if (buff?.type === "defense") {
        monsterDmg = Math.floor(monsterDmg * 0.7);
    }

    const newMonsterHp = state.monsterHp - userDmg;
    const newUserHp = state.userHp - monsterDmg;
    const newTurnsLeft = state.turnsLeft - 1;

    const won = newMonsterHp <= 0;
    const lost = newUserHp <= 0 && !won;
    const turnsUp = newTurnsLeft <= 0 && !won && !lost;

    return {
        userDmg,
        monsterDmg,
        userHp: newUserHp,
        monsterHp: newMonsterHp,
        turnsLeft: newTurnsLeft,
        won,
        lost,
        fled: false,
        timedOut: false,
        turnsUp,
    };
}

async function resolveCombatWin(userId: string, guildId: string, floor: number): Promise<CombatResolveResult> {
    const coinReward = randomInRange(50, 150) + floor * 10;
    const gemReward = Math.random() < 0.1 ? 1 : 0;
    const starReward = await tryStarDrop(userId, 0.03, "dungeon");

    await CurrencyService.addCoin(userId, guildId, coinReward, "dungeon", { encounter: "monster_win", floor });
    if (gemReward > 0) {
        await CurrencyService.addGem(userId, guildId, gemReward, "dungeon", { encounter: "monster_win", floor });
    }

    const newFloor = floor + 1;
    const checkpointReached = isPrime(newFloor);
    const economy = await UserEconomyModel.findOne({ userId, guildId });
    const currentCheckpoint = economy?.dungeonCheckpoint ?? 1;
    const newCheckpoint = checkpointReached ? newFloor : currentCheckpoint;

    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $set: { dungeonDepth: newFloor, dungeonCheckpoint: newCheckpoint } }
    );

    return {
        coinReward,
        gemReward,
        starReward,
        floorAdvanced: true,
        newFloor,
        checkpoint: newCheckpoint,
        checkpointReached,
    };
}

async function resolveCombatLoss(userId: string, guildId: string): Promise<CombatLossResult> {
    const economy = await UserEconomyModel.findOne({ userId, guildId });
    const userCoin = economy?.coin ?? 0;
    const checkpoint = economy?.dungeonCheckpoint ?? 1;

    const coinLost = Math.min(randomInRange(100, 200), userCoin);

    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $inc: { coin: -coinLost }, $set: { dungeonDepth: checkpoint } }
    );

    return {
        coinLost,
        newFloor: checkpoint,
        checkpoint,
    };
}

async function startRun(userId: string, guildId: string, locale: string): Promise<DungeonRunState> {
    const economy = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        {
            $setOnInsert: {
                userId,
                guildId,
                coin: 0,
                gem: 0,
                prayStreak: 0,
                mineDepth: 1,
                mineCheckpoint: 1,
                dungeonDepth: 1,
                dungeonCheckpoint: 1,
            },
        },
        { upsert: true, new: true }
    );

    return {
        userId,
        guildId,
        locale,
        hp: 100,
        floor: economy.dungeonDepth ?? 1,
        checkpoint: economy.dungeonCheckpoint ?? 1,
        encountersLeft: 5,
        activeBuff: null,
        messageId: "",
    };
}

function rollEncounterForRun(runState: DungeonRunState): EncounterType {
    const hasLuck = runState.activeBuff?.type === "luck";
    return rollEncounterType(hasLuck);
}

function tickBuff(runState: DungeonRunState): void {
    if (runState.activeBuff) {
        runState.activeBuff.encountersLeft -= 1;
        if (runState.activeBuff.encountersLeft <= 0) {
            runState.activeBuff = null;
        }
    }
}

const DungeonService = {
    processCombatAction,
    resolveCombatWin,
    resolveCombatLoss,
    isPrime,
    startRun,
    rollEncounterForRun,
    rollEncounterType,
    tickBuff,
    rollMonster,
    randomInRange,
};
export default DungeonService;
