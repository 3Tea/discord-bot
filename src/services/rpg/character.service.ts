// src/services/rpg/character.service.ts
import CharacterModel, { ICharacter } from "../../models/character.model";
import EquipmentModel from "../../models/equipment.model";
import redis from "../../connector/redis";
import {
    CLASS_CONFIG,
    expForLevel,
    levelFromExp,
    MAX_LEVEL,
    STARTER_WEAPONS,
    STARTER_ARMOR,
    type ClassType,
    type StatBlock,
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

    await CharacterModel.updateOne(
        { userId },
        { $set: { exp: newExp, level: newLevel } }
    );
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
    const result = await CharacterModel.findOneAndUpdate(
        { userId },
        { $inc: { gold: amount } },
        { new: true }
    );
    if (!result) throw new CharacterNotFoundError(userId);
    await redis.deleteKey(`rpg_char:${userId}`);
    return result.gold;
}

async function deductGold(userId: string, amount: number): Promise<number> {
    const char = await requireCharacter(userId);
    if (char.gold < amount) throw new InsufficientGoldError(char.gold, amount);

    const result = await CharacterModel.findOneAndUpdate(
        { userId, gold: { $gte: amount } },
        { $inc: { gold: -amount } },
        { new: true }
    );
    if (!result) throw new InsufficientGoldError(char.gold, amount);
    await redis.deleteKey(`rpg_char:${userId}`);
    return result.gold;
}

async function updateDungeonProgress(userId: string, floor: number, checkpoint: number): Promise<void> {
    await CharacterModel.updateOne(
        { userId },
        { $set: { dungeonDepth: floor, dungeonCheckpoint: checkpoint } }
    );
    await redis.deleteKey(`rpg_char:${userId}`);
}

const CharacterService = {
    getCharacter,
    requireCharacter,
    createCharacter,
    getBaseStats,
    getEffectiveStats,
    addExp,
    getExpProgress,
    addGold,
    deductGold,
    updateDungeonProgress,
    CharacterNotFoundError,
    CharacterAlreadyExistsError,
    InsufficientGoldError,
};

export default CharacterService;
