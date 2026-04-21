// src/services/rpg/character.service.ts
import CharacterModel, { ICharacter } from "../../models/character.model";
import EquipmentModel from "../../models/equipment.model";
import redis from "../../connector/redis";
import {
    CLASS_CONFIG,
    ADVANCED_CLASS_CONFIG,
    expForLevel,
    levelFromExp,
    MAX_LEVEL,
    MP_BASE,
    MP_PER_LEVEL,
    STARTER_WEAPONS,
    STARTER_ARMOR,
    type ClassType,
    type CrateType,
    type StatBlock,
    type AdvancedClassType,
} from "./rpg.config";

const CHARACTER_CACHE_TTL = 300;

export class CharacterNotFoundError extends Error {
    constructor(userId: string) {
        super(`Character not found for userId: ${userId}`);
        this.name = "CharacterNotFoundError";
    }
}

export class CharacterAlreadyExistsError extends Error {
    constructor(userId: string) {
        super(`Character already exists for userId: ${userId}`);
        this.name = "CharacterAlreadyExistsError";
    }
}

export class InsufficientGoldError extends Error {
    constructor(available: number, required: number) {
        super(`Insufficient gold: need ${required}, have ${available}`);
        this.name = "InsufficientGoldError";
    }
}

export class InsufficientMaterialsError extends Error {
    constructor(key: string, available: number, required: number) {
        super(`Insufficient ${key}: need ${required}, have ${available}`);
        this.name = "InsufficientMaterialsError";
    }
}

/** Safely read a material count from either a Map (Mongoose doc) or plain object (Redis cache). */
function getMaterialCount(materials: Map<string, number> | Record<string, number>, key: string): number {
    if (materials instanceof Map) return materials.get(key) ?? 0;
    return (materials as Record<string, number>)[key] ?? 0;
}

async function getCharacter(userId: string): Promise<ICharacter | null> {
    const cacheKey = `rpg_char:${userId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as ICharacter;

    const doc = await CharacterModel.findOne({ userId });
    if (doc) {
        await redis.setJson(cacheKey, doc.toObject(), CHARACTER_CACHE_TTL);
    }
    return doc;
}

async function requireCharacter(userId: string): Promise<ICharacter> {
    const char = await getCharacter(userId);
    if (!char) throw new CharacterNotFoundError(userId);
    return char;
}

async function createCharacter(userId: string, classType: ClassType): Promise<ICharacter> {
    const existing = await CharacterModel.findOne({ userId });
    if (existing) throw new CharacterAlreadyExistsError(userId);

    const character = await CharacterModel.create({ userId, class: classType });

    const weaponTemplate = STARTER_WEAPONS[classType];
    const weapon = await EquipmentModel.create({
        ownerId: userId,
        name: weaponTemplate.name,
        slot: weaponTemplate.slot,
        type: weaponTemplate.type,
        rarity: "common",
        stats: {
            hp: weaponTemplate.baseStats.hp ?? 0,
            str: weaponTemplate.baseStats.str ?? 0,
            def: weaponTemplate.baseStats.def ?? 0,
            mag: weaponTemplate.baseStats.mag ?? 0,
            magDef: weaponTemplate.baseStats.magDef ?? 0,
            spd: weaponTemplate.baseStats.spd ?? 0,
        },
        classRestriction: weaponTemplate.classRestriction,
        requiredLevel: 1,
        equipped: true,
    });

    const armor = await EquipmentModel.create({
        ownerId: userId,
        name: STARTER_ARMOR.name,
        slot: STARTER_ARMOR.slot,
        type: STARTER_ARMOR.type,
        rarity: "common",
        stats: {
            hp: STARTER_ARMOR.baseStats.hp ?? 0,
            str: STARTER_ARMOR.baseStats.str ?? 0,
            def: STARTER_ARMOR.baseStats.def ?? 0,
            mag: STARTER_ARMOR.baseStats.mag ?? 0,
            magDef: STARTER_ARMOR.baseStats.magDef ?? 0,
            spd: STARTER_ARMOR.baseStats.spd ?? 0,
        },
        classRestriction: [],
        requiredLevel: 1,
        equipped: true,
    });

    character.equipment.weapon = weapon._id;
    character.equipment.armor = armor._id;
    await character.save();

    await redis.deleteKey(`rpg_char:${userId}`);
    return character;
}

function getBaseStats(classType: ClassType, level: number): StatBlock {
    const config = CLASS_CONFIG[classType];
    return {
        hp: config.baseStats.hp + config.growth.hp * (level - 1),
        str: config.baseStats.str + config.growth.str * (level - 1),
        def: config.baseStats.def + config.growth.def * (level - 1),
        mag: config.baseStats.mag + config.growth.mag * (level - 1),
        magDef: config.baseStats.magDef + config.growth.magDef * (level - 1),
        spd: config.baseStats.spd + config.growth.spd * (level - 1),
    };
}

async function getEffectiveStats(userId: string): Promise<StatBlock> {
    const char = await requireCharacter(userId);
    const base = getBaseStats(char.class as ClassType, char.level);

    const equippedItems = await EquipmentModel.find({ ownerId: userId, equipped: true });
    for (const item of equippedItems) {
        base.hp += item.stats.hp;
        base.str += item.stats.str;
        base.def += item.stats.def;
        base.mag += item.stats.mag;
        base.magDef += item.stats.magDef;
        base.spd += item.stats.spd;
    }

    if (char.advancedClass) {
        const advConfig = ADVANCED_CLASS_CONFIG[char.advancedClass as AdvancedClassType];
        if (advConfig) {
            for (const [stat, bonus] of Object.entries(advConfig.statBonus)) {
                const key = stat as keyof StatBlock;
                base[key] = Math.floor(base[key] * (1 + (bonus as number)));
            }
        }
    }

    return base;
}

interface LevelUpResult {
    leveled: boolean;
    oldLevel: number;
    newLevel: number;
    expRemaining: number;
}

async function addExp(userId: string, amount: number): Promise<LevelUpResult> {
    const char = await requireCharacter(userId);
    const oldLevel = char.level;

    const newExp = char.exp + amount;
    const newLevel = Math.min(levelFromExp(newExp), MAX_LEVEL);

    await CharacterModel.updateOne({ userId }, { $set: { exp: newExp, level: newLevel } });
    await redis.deleteKey(`rpg_char:${userId}`);

    return {
        leveled: newLevel > oldLevel,
        oldLevel,
        newLevel,
        expRemaining: newExp,
    };
}

function getExpProgress(exp: number, level: number): { current: number; needed: number } {
    let accumulated = 0;
    for (let l = 2; l <= level; l++) {
        accumulated += expForLevel(l);
    }
    const current = exp - accumulated;
    const needed = level >= MAX_LEVEL ? 0 : expForLevel(level + 1);
    return { current, needed };
}

async function addGold(userId: string, amount: number): Promise<number> {
    const inc: Record<string, number> = { gold: amount };
    if (amount > 0) inc.goldEarned = amount;

    const result = await CharacterModel.findOneAndUpdate({ userId }, { $inc: inc }, { returnDocument: "after" });
    if (!result) throw new CharacterNotFoundError(userId);
    await redis.deleteKey(`rpg_char:${userId}`);
    import("./guildQuest.service")
        .then(({ default: GQS }) => GQS.trackProgress(userId, "earn_gold", amount))
        .catch(() => {});
    return result.gold;
}

async function deductGold(userId: string, amount: number): Promise<number> {
    const char = await requireCharacter(userId);
    if (char.gold < amount) throw new InsufficientGoldError(char.gold, amount);

    const result = await CharacterModel.findOneAndUpdate(
        { userId, gold: { $gte: amount } },
        { $inc: { gold: -amount } },
        { returnDocument: "after" }
    );
    if (!result) throw new InsufficientGoldError(char.gold, amount);
    await redis.deleteKey(`rpg_char:${userId}`);
    return result.gold;
}

async function updateDungeonProgress(userId: string, floor: number, checkpoint: number): Promise<void> {
    await CharacterModel.updateOne({ userId }, { $set: { dungeonDepth: floor, dungeonCheckpoint: checkpoint } });
    await redis.deleteKey(`rpg_char:${userId}`);
}

async function addMaterials(userId: string, materials: { key: string; qty: number }[]): Promise<void> {
    if (materials.length === 0) return;
    const inc: Record<string, number> = {};
    for (const { key, qty } of materials) {
        inc[`materials.${key}`] = qty;
    }
    await CharacterModel.updateOne({ userId }, { $inc: inc });
    await redis.deleteKey(`rpg_char:${userId}`);
    const totalQty = materials.reduce((sum, m) => sum + m.qty, 0);
    if (totalQty > 0) {
        import("./guildQuest.service")
            .then(({ default: GQS }) => GQS.trackProgress(userId, "collect_materials", totalQty))
            .catch(() => {});
    }
}

function getMaxMp(level: number): number {
    return MP_BASE + level * MP_PER_LEVEL;
}

async function hasEnoughMaterials(userId: string, materials: { key: string; qty: number }[]): Promise<boolean> {
    const char = await requireCharacter(userId);
    for (const { key, qty } of materials) {
        if (getMaterialCount(char.materials, key) < qty) return false;
    }
    return true;
}

async function deductMaterials(userId: string, materials: { key: string; qty: number }[]): Promise<void> {
    const char = await requireCharacter(userId);
    for (const { key, qty } of materials) {
        const available = getMaterialCount(char.materials, key);
        if (available < qty) {
            throw new InsufficientMaterialsError(key, available, qty);
        }
    }
    const inc: Record<string, number> = {};
    for (const { key, qty } of materials) {
        inc[`materials.${key}`] = -qty;
    }
    await CharacterModel.updateOne({ userId }, { $inc: inc });
    await redis.deleteKey(`rpg_char:${userId}`);
}

async function addCrate(userId: string, crateType: CrateType, qty: number = 1): Promise<void> {
    await CharacterModel.updateOne({ userId }, { $inc: { [`crates.${crateType}`]: qty } });
    await redis.deleteKey(`rpg_char:${userId}`);
}

async function deductCrate(userId: string, crateType: CrateType): Promise<boolean> {
    const result = await CharacterModel.updateOne(
        { userId, [`crates.${crateType}`]: { $gte: 1 } },
        { $inc: { [`crates.${crateType}`]: -1 } }
    );
    if (result.modifiedCount === 0) return false;
    await redis.deleteKey(`rpg_char:${userId}`);
    return true;
}

async function advanceClass(userId: string, advancedClass: AdvancedClassType): Promise<void> {
    await CharacterModel.updateOne({ userId }, { $set: { advancedClass } });
    await redis.deleteKey(`rpg_char:${userId}`);
}

async function incrementMonstersKilled(userId: string, qty: number = 1): Promise<void> {
    await CharacterModel.updateOne({ userId }, { $inc: { monstersKilled: qty } });
    await redis.deleteKey(`rpg_char:${userId}`);
}

async function incrementItemsCrafted(userId: string, qty: number = 1): Promise<void> {
    await CharacterModel.updateOne({ userId }, { $inc: { itemsCrafted: qty } });
    await redis.deleteKey(`rpg_char:${userId}`);
}

async function deleteCharacter(userId: string): Promise<void> {
    await CharacterModel.deleteOne({ userId });
    await redis.deleteKey(`rpg_char:${userId}`);
}

const CharacterService = {
    getCharacter,
    requireCharacter,
    createCharacter,
    deleteCharacter,
    getBaseStats,
    getEffectiveStats,
    addExp,
    getExpProgress,
    addGold,
    deductGold,
    updateDungeonProgress,
    addMaterials,
    getMaxMp,
    hasEnoughMaterials,
    deductMaterials,
    addCrate,
    deductCrate,
    advanceClass,
    incrementMonstersKilled,
    incrementItemsCrafted,
    CharacterNotFoundError,
    CharacterAlreadyExistsError,
    InsufficientGoldError,
    InsufficientMaterialsError,
};

export default CharacterService;
