"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsufficientMaterialsError = exports.InsufficientGoldError = exports.CharacterAlreadyExistsError = exports.CharacterNotFoundError = void 0;
// src/services/rpg/character.service.ts
const character_model_1 = __importDefault(require("../../models/character.model"));
const equipment_model_1 = __importDefault(require("../../models/equipment.model"));
const redis_1 = __importDefault(require("../../connector/redis"));
const rpg_config_1 = require("./rpg.config");
const CHARACTER_CACHE_TTL = 300;
class CharacterNotFoundError extends Error {
    constructor(userId) {
        super(`Character not found for userId: ${userId}`);
        this.name = "CharacterNotFoundError";
    }
}
exports.CharacterNotFoundError = CharacterNotFoundError;
class CharacterAlreadyExistsError extends Error {
    constructor(userId) {
        super(`Character already exists for userId: ${userId}`);
        this.name = "CharacterAlreadyExistsError";
    }
}
exports.CharacterAlreadyExistsError = CharacterAlreadyExistsError;
class InsufficientGoldError extends Error {
    constructor(available, required) {
        super(`Insufficient gold: need ${required}, have ${available}`);
        this.name = "InsufficientGoldError";
    }
}
exports.InsufficientGoldError = InsufficientGoldError;
class InsufficientMaterialsError extends Error {
    constructor(key, available, required) {
        super(`Insufficient ${key}: need ${required}, have ${available}`);
        this.name = "InsufficientMaterialsError";
    }
}
exports.InsufficientMaterialsError = InsufficientMaterialsError;
/** Safely read a material count from either a Map (Mongoose doc) or plain object (Redis cache). */
function getMaterialCount(materials, key) {
    if (materials instanceof Map)
        return materials.get(key) ?? 0;
    return materials[key] ?? 0;
}
async function getCharacter(userId) {
    const cacheKey = `rpg_char:${userId}`;
    const cached = await redis_1.default.getJson(cacheKey);
    if (cached)
        return cached;
    const doc = await character_model_1.default.findOne({ userId });
    if (doc) {
        await redis_1.default.setJson(cacheKey, doc.toObject(), CHARACTER_CACHE_TTL);
    }
    return doc;
}
async function requireCharacter(userId) {
    const char = await getCharacter(userId);
    if (!char)
        throw new CharacterNotFoundError(userId);
    return char;
}
async function createCharacter(userId, classType) {
    const existing = await character_model_1.default.findOne({ userId });
    if (existing)
        throw new CharacterAlreadyExistsError(userId);
    const character = await character_model_1.default.create({ userId, class: classType });
    const weaponTemplate = rpg_config_1.STARTER_WEAPONS[classType];
    const weapon = await equipment_model_1.default.create({
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
    const armor = await equipment_model_1.default.create({
        ownerId: userId,
        name: rpg_config_1.STARTER_ARMOR.name,
        slot: rpg_config_1.STARTER_ARMOR.slot,
        type: rpg_config_1.STARTER_ARMOR.type,
        rarity: "common",
        stats: {
            hp: rpg_config_1.STARTER_ARMOR.baseStats.hp ?? 0,
            str: rpg_config_1.STARTER_ARMOR.baseStats.str ?? 0,
            def: rpg_config_1.STARTER_ARMOR.baseStats.def ?? 0,
            mag: rpg_config_1.STARTER_ARMOR.baseStats.mag ?? 0,
            magDef: rpg_config_1.STARTER_ARMOR.baseStats.magDef ?? 0,
            spd: rpg_config_1.STARTER_ARMOR.baseStats.spd ?? 0,
        },
        classRestriction: [],
        requiredLevel: 1,
        equipped: true,
    });
    character.equipment.weapon = weapon._id;
    character.equipment.armor = armor._id;
    await character.save();
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
    return character;
}
function getBaseStats(classType, level) {
    const config = rpg_config_1.CLASS_CONFIG[classType];
    return {
        hp: config.baseStats.hp + config.growth.hp * (level - 1),
        str: config.baseStats.str + config.growth.str * (level - 1),
        def: config.baseStats.def + config.growth.def * (level - 1),
        mag: config.baseStats.mag + config.growth.mag * (level - 1),
        magDef: config.baseStats.magDef + config.growth.magDef * (level - 1),
        spd: config.baseStats.spd + config.growth.spd * (level - 1),
    };
}
async function getEffectiveStats(userId) {
    const char = await requireCharacter(userId);
    const base = getBaseStats(char.class, char.level);
    const equippedItems = await equipment_model_1.default.find({ ownerId: userId, equipped: true });
    for (const item of equippedItems) {
        base.hp += item.stats.hp;
        base.str += item.stats.str;
        base.def += item.stats.def;
        base.mag += item.stats.mag;
        base.magDef += item.stats.magDef;
        base.spd += item.stats.spd;
    }
    if (char.advancedClass) {
        const advConfig = rpg_config_1.ADVANCED_CLASS_CONFIG[char.advancedClass];
        if (advConfig) {
            for (const [stat, bonus] of Object.entries(advConfig.statBonus)) {
                const key = stat;
                base[key] = Math.floor(base[key] * (1 + bonus));
            }
        }
    }
    return base;
}
async function addExp(userId, amount) {
    const char = await requireCharacter(userId);
    const oldLevel = char.level;
    const newExp = char.exp + amount;
    const newLevel = Math.min((0, rpg_config_1.levelFromExp)(newExp), rpg_config_1.MAX_LEVEL);
    await character_model_1.default.updateOne({ userId }, { $set: { exp: newExp, level: newLevel } });
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
    return {
        leveled: newLevel > oldLevel,
        oldLevel,
        newLevel,
        expRemaining: newExp,
    };
}
function getExpProgress(exp, level) {
    let accumulated = 0;
    for (let l = 2; l <= level; l++) {
        accumulated += (0, rpg_config_1.expForLevel)(l);
    }
    const current = exp - accumulated;
    const needed = level >= rpg_config_1.MAX_LEVEL ? 0 : (0, rpg_config_1.expForLevel)(level + 1);
    return { current, needed };
}
async function addGold(userId, amount) {
    const inc = { gold: amount };
    if (amount > 0)
        inc.goldEarned = amount;
    const result = await character_model_1.default.findOneAndUpdate({ userId }, { $inc: inc }, { new: true });
    if (!result)
        throw new CharacterNotFoundError(userId);
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
    Promise.resolve().then(() => __importStar(require("./guildQuest.service"))).then(({ default: GQS }) => GQS.trackProgress(userId, "earn_gold", amount))
        .catch(() => { });
    return result.gold;
}
async function deductGold(userId, amount) {
    const char = await requireCharacter(userId);
    if (char.gold < amount)
        throw new InsufficientGoldError(char.gold, amount);
    const result = await character_model_1.default.findOneAndUpdate({ userId, gold: { $gte: amount } }, { $inc: { gold: -amount } }, { new: true });
    if (!result)
        throw new InsufficientGoldError(char.gold, amount);
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
    return result.gold;
}
async function updateDungeonProgress(userId, floor, checkpoint) {
    await character_model_1.default.updateOne({ userId }, { $set: { dungeonDepth: floor, dungeonCheckpoint: checkpoint } });
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
}
async function addMaterials(userId, materials) {
    if (materials.length === 0)
        return;
    const inc = {};
    for (const { key, qty } of materials) {
        inc[`materials.${key}`] = qty;
    }
    await character_model_1.default.updateOne({ userId }, { $inc: inc });
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
    const totalQty = materials.reduce((sum, m) => sum + m.qty, 0);
    if (totalQty > 0) {
        Promise.resolve().then(() => __importStar(require("./guildQuest.service"))).then(({ default: GQS }) => GQS.trackProgress(userId, "collect_materials", totalQty))
            .catch(() => { });
    }
}
function getMaxMp(level) {
    return rpg_config_1.MP_BASE + level * rpg_config_1.MP_PER_LEVEL;
}
async function hasEnoughMaterials(userId, materials) {
    const char = await requireCharacter(userId);
    for (const { key, qty } of materials) {
        if (getMaterialCount(char.materials, key) < qty)
            return false;
    }
    return true;
}
async function deductMaterials(userId, materials) {
    const char = await requireCharacter(userId);
    for (const { key, qty } of materials) {
        const available = getMaterialCount(char.materials, key);
        if (available < qty) {
            throw new InsufficientMaterialsError(key, available, qty);
        }
    }
    const inc = {};
    for (const { key, qty } of materials) {
        inc[`materials.${key}`] = -qty;
    }
    await character_model_1.default.updateOne({ userId }, { $inc: inc });
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
}
async function addCrate(userId, crateType, qty = 1) {
    await character_model_1.default.updateOne({ userId }, { $inc: { [`crates.${crateType}`]: qty } });
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
}
async function deductCrate(userId, crateType) {
    const result = await character_model_1.default.updateOne({ userId, [`crates.${crateType}`]: { $gte: 1 } }, { $inc: { [`crates.${crateType}`]: -1 } });
    if (result.modifiedCount === 0)
        return false;
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
    return true;
}
async function advanceClass(userId, advancedClass) {
    await character_model_1.default.updateOne({ userId }, { $set: { advancedClass } });
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
}
async function incrementMonstersKilled(userId, qty = 1) {
    await character_model_1.default.updateOne({ userId }, { $inc: { monstersKilled: qty } });
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
}
async function incrementItemsCrafted(userId, qty = 1) {
    await character_model_1.default.updateOne({ userId }, { $inc: { itemsCrafted: qty } });
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
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
exports.default = CharacterService;
