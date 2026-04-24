"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelRequirementError = exports.ClassRestrictionError = exports.EquipmentNotFoundError = void 0;
// src/services/rpg/equipment.service.ts
const equipment_model_1 = __importDefault(require("../../models/equipment.model"));
const character_model_1 = __importDefault(require("../../models/character.model"));
const redis_1 = __importDefault(require("../../connector/redis"));
const rpg_config_1 = require("./rpg.config");
const random_1 = require("../../util/math/random");
// --- Errors ---
class EquipmentNotFoundError extends Error {
    constructor() {
        super("Equipment not found");
        this.name = "EquipmentNotFoundError";
    }
}
exports.EquipmentNotFoundError = EquipmentNotFoundError;
class ClassRestrictionError extends Error {
    constructor(itemName, requiredClasses) {
        super(`${itemName} requires class: ${requiredClasses.join(", ")}`);
        this.name = "ClassRestrictionError";
    }
}
exports.ClassRestrictionError = ClassRestrictionError;
class LevelRequirementError extends Error {
    constructor(itemName, requiredLevel) {
        super(`${itemName} requires level ${requiredLevel}`);
        this.name = "LevelRequirementError";
    }
}
exports.LevelRequirementError = LevelRequirementError;
// --- Equipment Generation ---
function rollRarity(floorBonus = 0) {
    // floorBonus shifts distribution: floor/5 tiers up
    const shift = Math.floor(floorBonus / 5);
    const weights = rpg_config_1.RARITIES.map((r, i) => {
        const shiftedIndex = Math.max(0, i - shift);
        return rpg_config_1.RARITY_CONFIG[rpg_config_1.RARITIES[shiftedIndex]].dropWeight;
    });
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < rpg_config_1.RARITIES.length; i++) {
        roll -= weights[i];
        if (roll <= 0)
            return rpg_config_1.RARITIES[i];
    }
    return "common";
}
// Equipment name pools by slot
const WEAPON_NAMES = {
    sword: ["Iron Sword", "Steel Blade", "Crystal Sword", "Shadow Blade", "Dragon Slayer", "Excalibur"],
    greatsword: ["Iron Greatsword", "War Claymore", "Titan Blade", "Doom Bringer", "Ragnarok", "Chaos Edge"],
    mace: ["Iron Mace", "Steel Mace", "War Hammer", "Skull Crusher", "Divine Mace", "Mjolnir"],
    hammer: ["Wooden Hammer", "Iron Hammer", "Battle Hammer", "Thunder Hammer", "World Ender", "Cosmic Hammer"],
    staff: ["Wooden Staff", "Oak Staff", "Crystal Staff", "Arcane Staff", "Elder Staff", "Staff of Eternity"],
    wand: ["Twig Wand", "Oak Wand", "Crystal Wand", "Shadow Wand", "Celestial Wand", "Wand of Ages"],
    bow: ["Short Bow", "Long Bow", "Composite Bow", "Elven Bow", "Phoenix Bow", "Bow of Artemis"],
    crossbow: ["Light Crossbow", "Heavy Crossbow", "Repeater", "Siege Crossbow", "Dragon Crossbow", "Void Crossbow"],
    dagger: ["Iron Dagger", "Steel Dagger", "Shadow Dagger", "Venom Fang", "Soul Reaper", "Godslayer"],
    katana: ["Wooden Katana", "Steel Katana", "Shadow Katana", "Demon Katana", "Divine Katana", "Muramasa"],
    scepter: [
        "Wooden Scepter",
        "Silver Scepter",
        "Holy Scepter",
        "Divine Scepter",
        "Celestial Scepter",
        "Scepter of Light",
    ],
};
const SHIELD_NAMES = {
    shield: ["Wooden Shield", "Iron Shield", "Steel Shield", "Tower Shield", "Dragon Shield", "Aegis"],
    heavy_shield: ["Buckler", "Iron Wall", "Fortress Shield", "Titan Guard", "Divine Barrier", "Odin's Guard"],
    magic_tome: ["Old Tome", "Spell Book", "Grimoire", "Arcane Codex", "Elder Grimoire", "Tome of Infinity"],
    quiver: [
        "Leather Quiver",
        "Hunter's Quiver",
        "Elven Quiver",
        "Enchanted Quiver",
        "Celestial Quiver",
        "Quiver of Stars",
    ],
    holy_tome: ["Prayer Book", "Holy Script", "Sacred Tome", "Divine Codex", "Celestial Script", "Book of Miracles"],
};
const ARMOR_NAMES = {
    weapon: [], // handled separately
    shield: [], // handled separately
    helmet: ["Leather Cap", "Iron Helm", "Steel Helm", "Knight Helm", "Dragon Helm", "Crown of Stars"],
    armor: ["Leather Vest", "Chain Mail", "Plate Armor", "Knight Armor", "Dragon Armor", "Celestial Armor"],
    boots: ["Sandals", "Leather Boots", "Iron Boots", "Swift Boots", "Dragon Boots", "Boots of Wind"],
    accessory: ["Copper Ring", "Silver Ring", "Gold Amulet", "Crystal Pendant", "Dragon Heart", "Star Fragment"],
};
// Stat distribution by slot
const SLOT_STAT_WEIGHTS = {
    weapon: { str: 5, mag: 5 },
    shield: { def: 4, magDef: 3 },
    helmet: { hp: 8, magDef: 2 },
    armor: { def: 4, hp: 10 },
    boots: { spd: 4, def: 2 },
    accessory: { hp: 3, str: 2, mag: 2, spd: 1 },
};
function generateEquipmentStats(slot, rarity, floor) {
    const multiplier = rpg_config_1.RARITY_CONFIG[rarity].statMultiplier;
    const weights = SLOT_STAT_WEIGHTS[slot];
    const floorScale = 1 + floor * 0.1;
    const stats = { hp: 0, str: 0, def: 0, mag: 0, magDef: 0, spd: 0 };
    for (const [stat, weight] of Object.entries(weights)) {
        const base = weight + Math.floor(Math.random() * 3);
        stats[stat] = Math.floor(base * multiplier * floorScale);
    }
    return stats;
}
function getNameByRarity(names, rarity) {
    const rarityIndex = rpg_config_1.RARITIES.indexOf(rarity);
    const nameIndex = Math.min(rarityIndex, names.length - 1);
    return names[nameIndex];
}
function generateEquipment(ownerId, slot, floor, classType) {
    const rarity = rollRarity(floor);
    let name;
    let type;
    let classRestriction = [];
    const requiredLevel = Math.max(1, Math.floor(floor / 2));
    if (slot === "weapon" && classType) {
        const allowedTypes = rpg_config_1.CLASS_WEAPON_TYPES[classType];
        type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        const names = WEAPON_NAMES[type] ?? ["Unknown Weapon"];
        name = getNameByRarity(names, rarity);
        classRestriction = [classType];
    }
    else if (slot === "shield" && classType) {
        const allowedTypes = rpg_config_1.CLASS_SHIELD_TYPES[classType];
        if (allowedTypes.length === 0) {
            // Assassin has no shield — fall back to accessory
            return generateEquipment(ownerId, "accessory", floor, classType);
        }
        type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        const names = SHIELD_NAMES[type] ?? ["Unknown Shield"];
        name = getNameByRarity(names, rarity);
        classRestriction = [classType];
    }
    else {
        type = slot;
        const names = ARMOR_NAMES[slot] ?? ["Unknown Item"];
        name = getNameByRarity(names, rarity);
    }
    const stats = generateEquipmentStats(slot, rarity, floor);
    return {
        ownerId,
        name,
        slot,
        type,
        rarity,
        stats,
        classRestriction,
        requiredLevel,
        equipped: false,
        createdAt: new Date(),
    };
}
function rollMaterialDrops(floor, source) {
    const drops = [];
    for (const mat of rpg_config_1.MATERIALS) {
        if (floor < mat.minFloor)
            continue;
        if (Math.random() < mat.dropChance) {
            drops.push({ key: mat.key, qty: (0, random_1.randomInRange)(mat.minQty, mat.maxQty) });
        }
    }
    // Treasure always drops at least 1 material
    if (source === "treasure" && drops.length === 0) {
        drops.push({ key: "common_shard", qty: (0, random_1.randomInRange)(2, 4) });
    }
    // Boss guaranteed 1 Rare+ material
    if (source === "boss") {
        const hasRarePlus = drops.some((d) => {
            const mat = rpg_config_1.MATERIALS.find((m) => m.key === d.key);
            return mat && mat.minFloor >= 6;
        });
        if (!hasRarePlus) {
            const rareOrAbove = rpg_config_1.MATERIALS.filter((m) => m.minFloor >= 6 && floor >= m.minFloor);
            const fallback = rareOrAbove.length > 0 ? rareOrAbove[rareOrAbove.length - 1] : rpg_config_1.MATERIALS[rpg_config_1.MATERIALS.length - 2]; // uncommon_fragment
            drops.push({ key: fallback.key, qty: 1 });
        }
    }
    return drops;
}
function rollSlotForClass(classType, source) {
    const useClassPriority = source === "boss" || Math.random() < rpg_config_1.CLASS_MATCH_CHANCE;
    if (useClassPriority) {
        const slots = rpg_config_1.CLASS_PRIORITY_SLOTS[classType];
        const roll = Math.random();
        if (roll < rpg_config_1.CLASS_PRIORITY_WEIGHTS[0])
            return slots[0];
        if (roll < rpg_config_1.CLASS_PRIORITY_WEIGHTS[0] + rpg_config_1.CLASS_PRIORITY_WEIGHTS[1])
            return slots[1];
        return slots[2];
    }
    return rpg_config_1.EQUIPMENT_SLOTS[Math.floor(Math.random() * rpg_config_1.EQUIPMENT_SLOTS.length)];
}
function rollRarityForSource(floor, source) {
    if (source === "boss") {
        const rareIndex = rpg_config_1.RARITIES.indexOf("rare");
        let rarity = rollRarity(floor);
        let attempts = 0;
        while (rpg_config_1.RARITIES.indexOf(rarity) < rareIndex && attempts < 20) {
            rarity = rollRarity(floor);
            attempts++;
        }
        return rpg_config_1.RARITIES.indexOf(rarity) < rareIndex ? "rare" : rarity;
    }
    if (source === "treasure") {
        return rollRarity(floor + 5);
    }
    return rollRarity(floor);
}
async function createEquipmentDrop(ownerId, floor, classType, source = "monster") {
    const slot = rollSlotForClass(classType, source);
    const rarity = rollRarityForSource(floor, source);
    const data = generateEquipment(ownerId, slot, floor, classType);
    data.rarity = rarity;
    data.stats = generateEquipmentStats(slot, rarity, floor);
    return equipment_model_1.default.create(data);
}
// --- Equip / Unequip ---
async function equipItem(userId, equipmentId, characterClass, characterLevel) {
    const item = await equipment_model_1.default.findOne({ _id: equipmentId, ownerId: userId });
    if (!item)
        throw new EquipmentNotFoundError();
    if (item.classRestriction.length > 0 && !item.classRestriction.includes(characterClass)) {
        throw new ClassRestrictionError(item.name, item.classRestriction);
    }
    if (characterLevel < item.requiredLevel) {
        throw new LevelRequirementError(item.name, item.requiredLevel);
    }
    // Unequip current item in same slot
    const char = await character_model_1.default.findOne({ userId });
    if (!char)
        throw new Error("Character not found");
    const currentEquipId = char.equipment[item.slot];
    if (currentEquipId) {
        await equipment_model_1.default.updateOne({ _id: currentEquipId }, { $set: { equipped: false } });
    }
    // Equip new item
    item.equipped = true;
    await item.save();
    // Update character equipment slot
    char.equipment[item.slot] = item._id;
    await char.save();
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
    return item;
}
async function unequipSlot(userId, slot) {
    const char = await character_model_1.default.findOne({ userId });
    if (!char)
        throw new Error("Character not found");
    const equipId = char.equipment[slot];
    if (!equipId)
        return; // Already empty
    await equipment_model_1.default.updateOne({ _id: equipId }, { $set: { equipped: false } });
    char.equipment[slot] = null;
    await char.save();
    await redis_1.default.deleteKey(`rpg_char:${userId}`);
}
// --- Inventory ---
async function getInventory(userId) {
    return equipment_model_1.default.find({ ownerId: userId }).sort({ rarity: -1, createdAt: -1 });
}
async function getEquippedItems(userId) {
    return equipment_model_1.default.find({ ownerId: userId, equipped: true });
}
// --- Crate & Craft ---
function getCrateRarity(crateType) {
    const weights = rpg_config_1.CRATES[crateType].rarityWeights;
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * totalWeight;
    for (const [rarity, weight] of entries) {
        roll -= weight;
        if (roll <= 0)
            return rarity;
    }
    return entries[0][0];
}
async function openCrate(ownerId, crateType, classType, level) {
    const rarity = getCrateRarity(crateType);
    const slot = rollSlotForClass(classType, "monster");
    const data = generateEquipment(ownerId, slot, level, classType);
    data.rarity = rarity;
    data.stats = generateEquipmentStats(slot, rarity, level);
    return equipment_model_1.default.create(data);
}
async function craftEquipment(ownerId, slot, rarity, classType, level) {
    const data = generateEquipment(ownerId, slot, level, classType);
    data.rarity = rarity;
    data.stats = generateEquipmentStats(slot, rarity, level);
    return equipment_model_1.default.create(data);
}
// --- Export ---
const EquipmentService = {
    rollRarity,
    generateEquipment,
    createEquipmentDrop,
    rollMaterialDrops,
    rollSlotForClass,
    rollRarityForSource,
    equipItem,
    unequipSlot,
    getInventory,
    getEquippedItems,
    getCrateRarity,
    openCrate,
    craftEquipment,
    EquipmentNotFoundError,
    ClassRestrictionError,
    LevelRequirementError,
};
exports.default = EquipmentService;
