"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const character_service_1 = __importDefault(require("../rpg/character.service"));
const equipment_service_1 = __importDefault(require("../rpg/equipment.service"));
const rpg_config_1 = require("../rpg/rpg.config");
const starDrop_1 = require("../../util/economy/starDrop");
const random_1 = require("../../util/math/random");
const prime_1 = require("../../util/math/prime");
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
function rollMonster(floor) {
    if (floor <= 5)
        return TIER_1[(0, random_1.randomInRange)(0, TIER_1.length - 1)];
    if (floor <= 10)
        return TIER_2[(0, random_1.randomInRange)(0, TIER_2.length - 1)];
    return TIER_3[(0, random_1.randomInRange)(0, TIER_3.length - 1)];
}
function rollEncounterType(hasLuckBuff = false) {
    const roll = Math.random();
    if (hasLuckBuff) {
        if (roll < 0.5)
            return "monster";
        if (roll < 0.85)
            return "treasure";
        if (roll < 0.9)
            return "trap";
        return "npc";
    }
    if (roll < 0.5)
        return "monster";
    if (roll < 0.75)
        return "treasure";
    if (roll < 0.9)
        return "trap";
    return "npc";
}
function isBossFloor(floor) {
    return floor % 5 === 0;
}
// --- Core functions ---
async function startRun(userId, locale) {
    const char = await character_service_1.default.requireCharacter(userId);
    const stats = await character_service_1.default.getEffectiveStats(userId);
    const maxMp = character_service_1.default.getMaxMp(char.level);
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
        encountersLeft: rpg_config_1.ENCOUNTERS_PER_RUN,
        activeBuff: null,
        accumulatedGold: 0,
        accumulatedExp: 0,
        drops: [],
        messageId: "",
    };
}
async function resolveCombatWin(userId, floor, isBoss, classType) {
    const rewards = rpg_config_1.DUNGEON_REWARDS.monster;
    const multiplier = isBoss ? rpg_config_1.DUNGEON_REWARDS.boss.rewardMultiplier : 1;
    const source = isBoss ? "boss" : "monster";
    const goldReward = Math.floor((rewards.goldBase + floor * rewards.goldPerFloor) * multiplier);
    const expReward = Math.floor((rewards.expBase + floor * rewards.expPerFloor) * multiplier);
    const starReward = await (0, starDrop_1.tryStarDrop)(userId, 0.03, "dungeon");
    // Gold + EXP added to character (global)
    await character_service_1.default.addGold(userId, goldReward);
    const levelResult = await character_service_1.default.addExp(userId, expReward);
    // Material drops
    const materialDrops = equipment_service_1.default.rollMaterialDrops(floor, source);
    if (materialDrops.length > 0) {
        await character_service_1.default.addMaterials(userId, materialDrops);
    }
    // Equipment drop check
    const equipChance = isBoss ? rpg_config_1.DUNGEON_REWARDS.boss.equipChance : rewards.equipChance;
    let equipDrop = null;
    if (Math.random() < equipChance) {
        const item = await equipment_service_1.default.createEquipmentDrop(userId, floor, classType, source);
        equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot, id: item._id.toString() };
    }
    // Crate drops
    const crateDrops = [];
    const dropRates = isBoss ? rpg_config_1.CRATE_DROP_RATES.boss : rpg_config_1.CRATE_DROP_RATES.monster;
    for (const [type, chance] of Object.entries(dropRates)) {
        if (Math.random() < chance) {
            crateDrops.push({ type: type, qty: 1 });
            await character_service_1.default.addCrate(userId, type);
        }
    }
    // Floor advancement
    const newFloor = floor + 1;
    const checkpointReached = (0, prime_1.isPrime)(newFloor);
    const char = await character_service_1.default.getCharacter(userId);
    const currentCheckpoint = char?.dungeonCheckpoint ?? 1;
    const newCheckpoint = checkpointReached ? newFloor : currentCheckpoint;
    await character_service_1.default.updateDungeonProgress(userId, newFloor, newCheckpoint);
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
async function resolveCombatLoss(userId) {
    const char = await character_service_1.default.requireCharacter(userId);
    const checkpoint = char.dungeonCheckpoint;
    const goldLost = Math.min(char.gold, (0, random_1.randomInRange)(rpg_config_1.DUNGEON_REWARDS.collapse.goldLossBase, rpg_config_1.DUNGEON_REWARDS.collapse.goldLossMax));
    if (goldLost > 0) {
        await character_service_1.default.deductGold(userId, goldLost).catch(() => { });
    }
    await character_service_1.default.updateDungeonProgress(userId, checkpoint, checkpoint);
    return { goldLost, newFloor: checkpoint, checkpoint };
}
async function resolveTreasure(userId, floor, classType) {
    const rewards = rpg_config_1.DUNGEON_REWARDS.treasure;
    const goldReward = rewards.goldBase + floor * rewards.goldPerFloor;
    const expReward = rewards.expBase + floor * rewards.expPerFloor;
    const starReward = await (0, starDrop_1.tryStarDrop)(userId, 0.03, "dungeon");
    await character_service_1.default.addGold(userId, goldReward);
    const levelResult = await character_service_1.default.addExp(userId, expReward);
    // Material drops
    const materialDrops = equipment_service_1.default.rollMaterialDrops(floor, "treasure");
    if (materialDrops.length > 0) {
        await character_service_1.default.addMaterials(userId, materialDrops);
    }
    let equipDrop = null;
    if (Math.random() < rewards.equipChance) {
        const item = await equipment_service_1.default.createEquipmentDrop(userId, floor, classType, "treasure");
        equipDrop = { name: item.name, rarity: item.rarity, slot: item.slot, id: item._id.toString() };
    }
    // Crate drops
    const crateDrops = [];
    for (const [type, chance] of Object.entries(rpg_config_1.CRATE_DROP_RATES.treasure)) {
        if (Math.random() < chance) {
            crateDrops.push({ type: type, qty: 1 });
            await character_service_1.default.addCrate(userId, type);
        }
    }
    const newFloor = floor + 1;
    const checkpointReached = (0, prime_1.isPrime)(newFloor);
    const char = await character_service_1.default.getCharacter(userId);
    const currentCheckpoint = char?.dungeonCheckpoint ?? 1;
    const newCheckpoint = checkpointReached ? newFloor : currentCheckpoint;
    await character_service_1.default.updateDungeonProgress(userId, newFloor, newCheckpoint);
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
async function resolveTrap(userId, floor, currentHp) {
    const hpLost = (0, random_1.randomInRange)(10, 20);
    const goldLoss = rpg_config_1.DUNGEON_REWARDS.trap.goldLossBase + floor * rpg_config_1.DUNGEON_REWARDS.trap.goldLossPerFloor;
    const char = await character_service_1.default.requireCharacter(userId);
    const actualGoldLost = Math.min(char.gold, goldLoss);
    if (actualGoldLost > 0) {
        await character_service_1.default.deductGold(userId, actualGoldLost).catch(() => { });
    }
    const collapsed = currentHp - hpLost <= 0;
    let collapseResult;
    if (collapsed) {
        collapseResult = await resolveCombatLoss(userId);
    }
    return { hpLost, goldLost: actualGoldLost, collapsed, collapseResult };
}
function rollEncounterForRun(runState) {
    const hasLuck = runState.activeBuff?.type === "luck";
    return rollEncounterType(hasLuck);
}
function tickBuff(runState) {
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
    isPrime: prime_1.isPrime,
    rollEncounterForRun,
    rollEncounterType,
    tickBuff,
    rollMonster,
    randomInRange: random_1.randomInRange,
};
exports.default = DungeonService;
