// src/services/rpg/equipment.service.ts
import type { Document } from "mongoose";
import EquipmentModel, { IEquipment } from "../../models/equipment.model";
import CharacterModel from "../../models/character.model";
import redis from "../../connector/redis";
import {
    RARITY_CONFIG,
    RARITIES,
    CLASS_WEAPON_TYPES,
    CLASS_SHIELD_TYPES,
    EQUIPMENT_SLOTS,
    type ClassType,
    type EquipmentSlot,
    type Rarity,
    type StatBlock,
} from "./rpg.config";

// --- Errors ---

export class EquipmentNotFoundError extends Error {
    constructor() {
        super("Equipment not found");
        this.name = "EquipmentNotFoundError";
    }
}

export class ClassRestrictionError extends Error {
    constructor(itemName: string, requiredClasses: string[]) {
        super(`${itemName} requires class: ${requiredClasses.join(", ")}`);
        this.name = "ClassRestrictionError";
    }
}

export class LevelRequirementError extends Error {
    constructor(itemName: string, requiredLevel: number) {
        super(`${itemName} requires level ${requiredLevel}`);
        this.name = "LevelRequirementError";
    }
}

// --- Equipment Generation ---

function rollRarity(floorBonus: number = 0): Rarity {
    // floorBonus shifts distribution: floor/5 tiers up
    const shift = Math.floor(floorBonus / 5);
    const weights = RARITIES.map((r, i) => {
        const shiftedIndex = Math.max(0, i - shift);
        return RARITY_CONFIG[RARITIES[shiftedIndex]].dropWeight;
    });
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < RARITIES.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return RARITIES[i];
    }
    return "common";
}

// Equipment name pools by slot
const WEAPON_NAMES: Record<string, string[]> = {
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
    scepter: ["Wooden Scepter", "Silver Scepter", "Holy Scepter", "Divine Scepter", "Celestial Scepter", "Scepter of Light"],
};

const SHIELD_NAMES: Record<string, string[]> = {
    shield: ["Wooden Shield", "Iron Shield", "Steel Shield", "Tower Shield", "Dragon Shield", "Aegis"],
    heavy_shield: ["Buckler", "Iron Wall", "Fortress Shield", "Titan Guard", "Divine Barrier", "Odin's Guard"],
    magic_tome: ["Old Tome", "Spell Book", "Grimoire", "Arcane Codex", "Elder Grimoire", "Tome of Infinity"],
    quiver: ["Leather Quiver", "Hunter's Quiver", "Elven Quiver", "Enchanted Quiver", "Celestial Quiver", "Quiver of Stars"],
    holy_tome: ["Prayer Book", "Holy Script", "Sacred Tome", "Divine Codex", "Celestial Script", "Book of Miracles"],
};

const ARMOR_NAMES: Record<EquipmentSlot, string[]> = {
    weapon: [], // handled separately
    shield: [], // handled separately
    helmet: ["Leather Cap", "Iron Helm", "Steel Helm", "Knight Helm", "Dragon Helm", "Crown of Stars"],
    armor: ["Leather Vest", "Chain Mail", "Plate Armor", "Knight Armor", "Dragon Armor", "Celestial Armor"],
    boots: ["Sandals", "Leather Boots", "Iron Boots", "Swift Boots", "Dragon Boots", "Boots of Wind"],
    accessory: ["Copper Ring", "Silver Ring", "Gold Amulet", "Crystal Pendant", "Dragon Heart", "Star Fragment"],
};

// Stat distribution by slot
const SLOT_STAT_WEIGHTS: Record<EquipmentSlot, Partial<StatBlock>> = {
    weapon: { str: 5, mag: 5 },
    shield: { def: 4, magDef: 3 },
    helmet: { hp: 8, magDef: 2 },
    armor: { def: 4, hp: 10 },
    boots: { spd: 4, def: 2 },
    accessory: { hp: 3, str: 2, mag: 2, spd: 1 },
};

function generateEquipmentStats(slot: EquipmentSlot, rarity: Rarity, floor: number): StatBlock {
    const multiplier = RARITY_CONFIG[rarity].statMultiplier;
    const weights = SLOT_STAT_WEIGHTS[slot];
    const floorScale = 1 + floor * 0.1;

    const stats: StatBlock = { hp: 0, str: 0, def: 0, mag: 0, magDef: 0, spd: 0 };
    for (const [stat, weight] of Object.entries(weights) as [keyof StatBlock, number][]) {
        const base = weight + Math.floor(Math.random() * 3);
        stats[stat] = Math.floor(base * multiplier * floorScale);
    }
    return stats;
}

function getNameByRarity(names: string[], rarity: Rarity): string {
    const rarityIndex = RARITIES.indexOf(rarity);
    const nameIndex = Math.min(rarityIndex, names.length - 1);
    return names[nameIndex];
}

function generateEquipment(
    ownerId: string,
    slot: EquipmentSlot,
    floor: number,
    classType?: ClassType
): Omit<IEquipment, keyof Document> {
    const rarity = rollRarity(floor);

    let name: string;
    let type: string;
    let classRestriction: ClassType[] = [];
    const requiredLevel = Math.max(1, Math.floor(floor / 2));

    if (slot === "weapon" && classType) {
        const allowedTypes = CLASS_WEAPON_TYPES[classType];
        type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        const names = WEAPON_NAMES[type] ?? ["Unknown Weapon"];
        name = getNameByRarity(names, rarity);
        classRestriction = [classType];
    } else if (slot === "shield" && classType) {
        const allowedTypes = CLASS_SHIELD_TYPES[classType];
        if (allowedTypes.length === 0) {
            // Assassin has no shield — fall back to accessory
            return generateEquipment(ownerId, "accessory", floor, classType);
        }
        type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        const names = SHIELD_NAMES[type] ?? ["Unknown Shield"];
        name = getNameByRarity(names, rarity);
        classRestriction = [classType];
    } else {
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
    } as Omit<IEquipment, keyof Document>;
}

async function createEquipmentDrop(ownerId: string, floor: number, classType: ClassType): Promise<IEquipment> {
    const slot = EQUIPMENT_SLOTS[Math.floor(Math.random() * EQUIPMENT_SLOTS.length)];
    const data = generateEquipment(ownerId, slot, floor, classType);
    return EquipmentModel.create(data);
}

// --- Equip / Unequip ---

async function equipItem(userId: string, equipmentId: string, characterClass: ClassType, characterLevel: number): Promise<IEquipment> {
    const item = await EquipmentModel.findOne({ _id: equipmentId, ownerId: userId });
    if (!item) throw new EquipmentNotFoundError();

    if (item.classRestriction.length > 0 && !item.classRestriction.includes(characterClass)) {
        throw new ClassRestrictionError(item.name, item.classRestriction);
    }

    if (characterLevel < item.requiredLevel) {
        throw new LevelRequirementError(item.name, item.requiredLevel);
    }

    // Unequip current item in same slot
    const char = await CharacterModel.findOne({ userId });
    if (!char) throw new Error("Character not found");

    const currentEquipId = char.equipment[item.slot as keyof typeof char.equipment];
    if (currentEquipId) {
        await EquipmentModel.updateOne({ _id: currentEquipId }, { $set: { equipped: false } });
    }

    // Equip new item
    item.equipped = true;
    await item.save();

    // Update character equipment slot
    char.equipment[item.slot as keyof typeof char.equipment] = item._id;
    await char.save();

    await redis.deleteKey(`rpg_char:${userId}`);

    return item;
}

async function unequipSlot(userId: string, slot: EquipmentSlot): Promise<void> {
    const char = await CharacterModel.findOne({ userId });
    if (!char) throw new Error("Character not found");

    const equipId = char.equipment[slot as keyof typeof char.equipment];
    if (!equipId) return; // Already empty

    await EquipmentModel.updateOne({ _id: equipId }, { $set: { equipped: false } });
    char.equipment[slot as keyof typeof char.equipment] = null;
    await char.save();

    await redis.deleteKey(`rpg_char:${userId}`);
}

// --- Inventory ---

async function getInventory(userId: string): Promise<IEquipment[]> {
    return EquipmentModel.find({ ownerId: userId }).sort({ rarity: -1, createdAt: -1 });
}

async function getEquippedItems(userId: string): Promise<IEquipment[]> {
    return EquipmentModel.find({ ownerId: userId, equipped: true });
}

// --- Export ---

const EquipmentService = {
    rollRarity,
    generateEquipment,
    createEquipmentDrop,
    equipItem,
    unequipSlot,
    getInventory,
    getEquippedItems,
    EquipmentNotFoundError,
    ClassRestrictionError,
    LevelRequirementError,
};

export default EquipmentService;
