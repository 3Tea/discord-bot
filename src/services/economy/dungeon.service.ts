import CharacterService from "../rpg/character.service";
import EquipmentService from "../rpg/equipment.service";
import {
    DUNGEON_REWARDS,
    ENCOUNTERS_PER_RUN,
    CRATE_DROP_RATES,
    type ClassType,
    type CrateType,
} from "../rpg/rpg.config";
import { tryStarDrop } from "../../util/economy/starDrop";
import { randomInRange } from "../../util/math/random";
import { isPrime } from "../../util/math/prime";
import type { Buff } from "./merchant.service";

// --- Types ---

export type EncounterType = "monster" | "treasure" | "trap" | "npc";

export interface CombatResolveResult {
    goldReward: number;
    expReward: number;
    starReward: boolean;
    equipDrop: { name: string; rarity: string; slot: string; id: string } | null;
    materialDrops: { key: string; qty: number }[];
    crateDrops: { type: CrateType; qty: number }[];
    floorAdvanced: boolean;
    newFloor: number;
    checkpoint: number;
    checkpointReached: boolean;
    isBoss: boolean;
    leveled: boolean;
    oldLevel: number;
    newLevel: number;
}

export interface CombatLossResult {
    goldLost: number;
    newFloor: number;
    checkpoint: number;
}

export interface TreasureResult {
    goldReward: number;
    expReward: number;
    starReward: boolean;
    equipDrop: { name: string; rarity: string; slot: string; id: string } | null;
    materialDrops: { key: string; qty: number }[];
    crateDrops: { type: CrateType; qty: number }[];
    newFloor: number;
    checkpoint: number;
    checkpointReached: boolean;
    leveled: boolean;
    oldLevel: number;
    newLevel: number;
}

export interface TrapResult {
    hpLost: number;
    goldLost: number;
    collapsed: boolean;
    collapseResult?: CombatLossResult;
}

export interface DungeonRunState {
    userId: string;
    locale: string;
    classType: ClassType;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    floor: number;
    checkpoint: number;
    encountersLeft: number;
    activeBuff: Buff | null;
    accumulatedGold: number;
    accumulatedExp: number;
    drops: string[];
    messageId: string;
}

// --- Monster tables ---

interface MonsterTemplate {
    name: string;
    emoji: string;
    image?: string;
}

const TIER_1: MonsterTemplate[] = [
    { name: "Rat", emoji: "🐀", image: "https://i.imgur.com/NzMOgu1.png" },
    { name: "Bat", emoji: "🦇", image: "https://i.imgur.com/FapVGQ3.png" },
    { name: "Slime", emoji: "🟢", image: "https://i.imgur.com/Pk7kG7B.png" },
    { name: "Goblin", emoji: "👺", image: "https://i.imgur.com/XzDeSE1.png" },
    { name: "Spider", emoji: "🕷️", image: "https://i.imgur.com/877ZusE.png" },
];

const TIER_2: MonsterTemplate[] = [
    { name: "Skeleton", emoji: "💀", image: "https://i.imgur.com/NjhaZG3.png" },
    { name: "Zombie", emoji: "🧟", image: "https://i.imgur.com/y3oJ6u5.png" },
    { name: "Wolf", emoji: "🐺", image: "https://i.imgur.com/687vN4p.png" },
    { name: "Orc", emoji: "👹", image: "https://i.imgur.com/18vPNVT.png" },
    { name: "Ghost", emoji: "👻", image: "https://i.imgur.com/ia1BLcW.png" },
];

const TIER_3: MonsterTemplate[] = [
    { name: "Dragon", emoji: "🐉", image: "https://i.imgur.com/cB5r41R.png" },
    { name: "Demon", emoji: "😈", image: "https://i.imgur.com/f2OgS2p.png" },
    { name: "Lich", emoji: "🧙", image: "https://i.imgur.com/Kx8s1d1.png" },
    { name: "Hydra", emoji: "🐍", image: "https://i.imgur.com/5rl7jru.png" },
    { name: "Titan", emoji: "⚡", image: "https://i.imgur.com/MQ6jt7H.png" },
];

// Variant prefix by floor — purely cosmetic, floor-based stat scaling already handles difficulty
const MONSTER_VARIANTS: { minFloor: number; prefix: string }[] = [
    { minFloor: 76, prefix: "Primordial" },
    { minFloor: 51, prefix: "Legendary" },
    { minFloor: 31, prefix: "Ancient" },
    { minFloor: 16, prefix: "Elite" },
];

function getMonsterVariantPrefix(floor: number): string | null {
    for (const v of MONSTER_VARIANTS) {
        if (floor >= v.minFloor) return v.prefix;
    }
    return null;
}

// --- Helpers ---

function rollMonster(floor: number): { name: string; emoji: string; image?: string } {
    let template: MonsterTemplate;
    if (floor <= 5) template = TIER_1[randomInRange(0, TIER_1.length - 1)];
    else if (floor <= 10) template = TIER_2[randomInRange(0, TIER_2.length - 1)];
    else template = TIER_3[randomInRange(0, TIER_3.length - 1)];

    const prefix = getMonsterVariantPrefix(floor);
    return {
        name: prefix ? `${prefix} ${template.name}` : template.name,
        emoji: template.emoji,
        image: template.image,
    };
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

function isBossFloor(floor: number): boolean {
    return floor % 5 === 0;
}

// --- Core functions ---

async function startRun(userId: string, locale: string): Promise<DungeonRunState> {
    const char = await CharacterService.requireCharacter(userId);
    const stats = await CharacterService.getEffectiveStats(userId);
    const maxMp = CharacterService.getMaxMp(char.level);

    return {
        userId,
        locale,
        classType: char.class,
        hp: stats.hp,
        maxHp: stats.hp,
        mp: maxMp,
        maxMp,
        floor: char.dungeonDepth,
        checkpoint: char.dungeonCheckpoint,
        encountersLeft: ENCOUNTERS_PER_RUN,
        activeBuff: null,
        accumulatedGold: 0,
        accumulatedExp: 0,
        drops: [],
        messageId: "",
    };
}

async function resolveCombatWin(
    userId: string,
    floor: number,
    isBoss: boolean,
    classType: ClassType
): Promise<CombatResolveResult> {
    const rewards = DUNGEON_REWARDS.monster;
    const multiplier = isBoss ? DUNGEON_REWARDS.boss.rewardMultiplier : 1;
    const source = isBoss ? "boss" : ("monster" as const);

    const goldReward = Math.floor((rewards.goldBase + floor * rewards.goldPerFloor) * multiplier);
    const expReward = Math.floor((rewards.expBase + floor * rewards.expPerFloor) * multiplier);
    const starReward = await tryStarDrop(userId, 0.03, "dungeon");

    // Gold + EXP added to character (global)
    await CharacterService.addGold(userId, goldReward);
    const levelResult = await CharacterService.addExp(userId, expReward);

    // Material drops
    const materialDrops = EquipmentService.rollMaterialDrops(floor, source);
    if (materialDrops.length > 0) {
        await CharacterService.addMaterials(userId, materialDrops);
    }

    // Equipment drop check
    const equipChance = isBoss ? DUNGEON_REWARDS.boss.equipChance : rewards.equipChance;
    let equipDrop: CombatResolveResult["equipDrop"] = null;
    if (Math.random() < equipChance) {
        const item = await EquipmentService.createEquipmentDrop(userId, floor, classType, source);
        equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot, id: item._id.toString() };
    }

    // Crate drops
    const crateDrops: { type: CrateType; qty: number }[] = [];
    const dropRates = isBoss ? CRATE_DROP_RATES.boss : CRATE_DROP_RATES.monster;
    for (const [type, chance] of Object.entries(dropRates)) {
        if (Math.random() < chance) {
            crateDrops.push({ type: type as CrateType, qty: 1 });
            await CharacterService.addCrate(userId, type as CrateType);
        }
    }

    // Floor advancement
    const newFloor = floor + 1;
    const checkpointReached = isPrime(newFloor);
    const char = await CharacterService.getCharacter(userId);
    const currentCheckpoint = char?.dungeonCheckpoint ?? 1;
    const newCheckpoint = checkpointReached ? newFloor : currentCheckpoint;

    await CharacterService.updateDungeonProgress(userId, newFloor, newCheckpoint);

    return {
        goldReward,
        expReward,
        starReward,
        equipDrop,
        materialDrops,
        crateDrops,
        floorAdvanced: true,
        newFloor,
        checkpoint: newCheckpoint,
        checkpointReached,
        isBoss,
        leveled: levelResult.leveled,
        oldLevel: levelResult.oldLevel,
        newLevel: levelResult.newLevel,
    };
}

async function resolveCombatLoss(userId: string): Promise<CombatLossResult> {
    const char = await CharacterService.requireCharacter(userId);
    const checkpoint = char.dungeonCheckpoint;
    const goldLost = Math.min(
        char.gold,
        randomInRange(DUNGEON_REWARDS.collapse.goldLossBase, DUNGEON_REWARDS.collapse.goldLossMax)
    );

    if (goldLost > 0) {
        await CharacterService.deductGold(userId, goldLost).catch(() => {});
    }
    await CharacterService.updateDungeonProgress(userId, checkpoint, checkpoint);

    return { goldLost, newFloor: checkpoint, checkpoint };
}

async function resolveTreasure(userId: string, floor: number, classType: ClassType): Promise<TreasureResult> {
    const rewards = DUNGEON_REWARDS.treasure;
    const goldReward = rewards.goldBase + floor * rewards.goldPerFloor;
    const expReward = rewards.expBase + floor * rewards.expPerFloor;
    const starReward = await tryStarDrop(userId, 0.03, "dungeon");

    await CharacterService.addGold(userId, goldReward);
    const levelResult = await CharacterService.addExp(userId, expReward);

    // Material drops
    const materialDrops = EquipmentService.rollMaterialDrops(floor, "treasure");
    if (materialDrops.length > 0) {
        await CharacterService.addMaterials(userId, materialDrops);
    }

    let equipDrop: TreasureResult["equipDrop"] = null;
    if (Math.random() < rewards.equipChance) {
        const item = await EquipmentService.createEquipmentDrop(userId, floor, classType, "treasure");
        equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot, id: item._id.toString() };
    }

    // Crate drops
    const crateDrops: { type: CrateType; qty: number }[] = [];
    for (const [type, chance] of Object.entries(CRATE_DROP_RATES.treasure)) {
        if (Math.random() < chance) {
            crateDrops.push({ type: type as CrateType, qty: 1 });
            await CharacterService.addCrate(userId, type as CrateType);
        }
    }

    const newFloor = floor + 1;
    const checkpointReached = isPrime(newFloor);
    const char = await CharacterService.getCharacter(userId);
    const currentCheckpoint = char?.dungeonCheckpoint ?? 1;
    const newCheckpoint = checkpointReached ? newFloor : currentCheckpoint;
    await CharacterService.updateDungeonProgress(userId, newFloor, newCheckpoint);

    return {
        goldReward,
        expReward,
        starReward,
        equipDrop,
        materialDrops,
        crateDrops,
        newFloor,
        checkpoint: newCheckpoint,
        checkpointReached,
        leveled: levelResult.leveled,
        oldLevel: levelResult.oldLevel,
        newLevel: levelResult.newLevel,
    };
}

async function resolveTrap(userId: string, floor: number, currentHp: number): Promise<TrapResult> {
    const hpLost = randomInRange(10, 20);
    const goldLoss = DUNGEON_REWARDS.trap.goldLossBase + floor * DUNGEON_REWARDS.trap.goldLossPerFloor;

    const char = await CharacterService.requireCharacter(userId);
    const actualGoldLost = Math.min(char.gold, goldLoss);
    if (actualGoldLost > 0) {
        await CharacterService.deductGold(userId, actualGoldLost).catch(() => {});
    }

    const collapsed = currentHp - hpLost <= 0;
    let collapseResult: CombatLossResult | undefined;
    if (collapsed) {
        collapseResult = await resolveCombatLoss(userId);
    }

    return { hpLost, goldLost: actualGoldLost, collapsed, collapseResult };
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
    startRun,
    resolveCombatWin,
    resolveCombatLoss,
    resolveTreasure,
    resolveTrap,
    isBossFloor,
    isPrime,
    rollEncounterForRun,
    rollEncounterType,
    tickBuff,
    rollMonster,
    randomInRange,
};
export default DungeonService;
