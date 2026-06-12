"use strict";
// src/services/rpg/rpg.config.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE_TO_ADVANCED = exports.ADVANCEMENT_REQUIREMENTS = exports.ADVANCED_CLASS_CONFIG = exports.ULTIMATE_MP_COST = exports.ADVANCED_CLASSES = exports.CRATE_DROP_RATES = exports.CRATES = exports.CRATE_TYPES = exports.CRAFT_RECIPES = exports.ENCOUNTERS_PER_RUN = exports.BOSS_TURNS = exports.NORMAL_TURNS = exports.DUNGEON_REWARDS = exports.CLASS_MATCH_CHANCE = exports.CLASS_PRIORITY_WEIGHTS = exports.CLASS_PRIORITY_SLOTS = exports.MATERIALS = exports.SKILL2_MP_COST = exports.SKILL1_MP_COST = exports.MP_REGEN_ON_DEFEND = exports.MP_REGEN_PER_TURN = exports.MP_PER_LEVEL = exports.MP_BASE = exports.MESSAGE_XP_TO_EXP_RATE = exports.MAX_LEVEL = exports.STARTER_ARMOR = exports.STARTER_WEAPONS = exports.CLASS_SHIELD_TYPES = exports.CLASS_WEAPON_TYPES = exports.RARITY_CONFIG = exports.RARITIES = exports.EQUIPMENT_SLOTS = exports.CLASS_SKILLS = exports.CLASS_CONFIG = exports.CLASS_TYPES = void 0;
exports.expForLevel = expForLevel;
exports.levelFromExp = levelFromExp;
exports.getMonsterStats = getMonsterStats;
exports.getBossStats = getBossStats;
// --- Class Types ---
exports.CLASS_TYPES = ["swordsman", "tank", "mage", "archer", "assassin", "healer"];
exports.CLASS_CONFIG = {
    swordsman: {
        emoji: "⚔️",
        role: "balanced_melee",
        baseStats: { hp: 120, str: 25, def: 20, mag: 5, magDef: 10, spd: 12 },
        growth: { hp: 12, str: 4, def: 3, mag: 1, magDef: 1, spd: 2 },
        primaryDamage: "str",
    },
    tank: {
        emoji: "🛡️",
        role: "defender",
        baseStats: { hp: 180, str: 15, def: 30, mag: 5, magDef: 15, spd: 8 },
        growth: { hp: 18, str: 2, def: 5, mag: 1, magDef: 2, spd: 1 },
        primaryDamage: "str",
    },
    mage: {
        emoji: "🔮",
        role: "burst_magic",
        baseStats: { hp: 80, str: 5, def: 8, mag: 30, magDef: 20, spd: 10 },
        growth: { hp: 8, str: 1, def: 1, mag: 5, magDef: 3, spd: 1 },
        primaryDamage: "mag",
    },
    archer: {
        emoji: "🏹",
        role: "fast_ranged",
        baseStats: { hp: 90, str: 20, def: 12, mag: 5, magDef: 10, spd: 18 },
        growth: { hp: 9, str: 3, def: 2, mag: 1, magDef: 1, spd: 3 },
        primaryDamage: "str",
    },
    assassin: {
        emoji: "🗡️",
        role: "crit_speed",
        baseStats: { hp: 85, str: 22, def: 10, mag: 8, magDef: 12, spd: 25 },
        growth: { hp: 8, str: 4, def: 1, mag: 1, magDef: 2, spd: 4 },
        primaryDamage: "str",
    },
    healer: {
        emoji: "💚",
        role: "support",
        baseStats: { hp: 100, str: 8, def: 15, mag: 25, magDef: 22, spd: 10 },
        growth: { hp: 10, str: 1, def: 2, mag: 4, magDef: 3, spd: 1 },
        primaryDamage: "mag",
    },
};
exports.CLASS_SKILLS = {
    swordsman: [
        { key: "power_strike", emoji: "⚡", damageType: "physical", multiplier: 1.8 },
        { key: "whirlwind", emoji: "🌀", damageType: "physical", multiplier: 1.3, ignoreDefPercent: 0.3 },
    ],
    tank: [
        {
            key: "shield_bash",
            emoji: "🔨",
            damageType: "physical",
            multiplier: 1.4,
            statusEffect: { type: "def_buff", value: 0.2, turns: 2 },
            statusTarget: "self",
        },
        {
            key: "fortify",
            emoji: "🏰",
            damageType: "heal",
            multiplier: 0,
            healPercent: 0.2,
            statusEffect: { type: "def_buff", value: 0.4, turns: 1 },
            statusTarget: "self",
        },
    ],
    mage: [
        { key: "fireball", emoji: "🔥", damageType: "magical", multiplier: 2 },
        {
            key: "ice_shard",
            emoji: "❄️",
            damageType: "magical",
            multiplier: 1.5,
            statusEffect: { type: "spd_debuff", value: 0.3, turns: 2 },
            statusTarget: "monster",
        },
    ],
    archer: [
        { key: "precision_shot", emoji: "🎯", damageType: "physical", multiplier: 1.8, ignoreDefPercent: 0.5 },
        { key: "quick_shot", emoji: "💨", damageType: "physical", multiplier: 1.2, hits: 2 },
    ],
    assassin: [
        { key: "backstab", emoji: "🗡️", damageType: "physical", multiplier: 2.2, critChance: 0.3, critMultiplier: 3 },
        {
            key: "poison_blade",
            emoji: "💀",
            damageType: "physical",
            multiplier: 1,
            statusEffect: { type: "poison", value: 0.1, turns: 3 },
            statusTarget: "monster",
        },
    ],
    healer: [
        { key: "holy_light", emoji: "✨", damageType: "magical", multiplier: 1.6 },
        { key: "heal", emoji: "💚", damageType: "heal", multiplier: 0, healPercent: 0.3 },
    ],
};
// --- Equipment Config ---
exports.EQUIPMENT_SLOTS = ["weapon", "shield", "helmet", "armor", "boots", "accessory"];
exports.RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
exports.RARITY_CONFIG = {
    common: { color: 0x95a5a6, emoji: "⬜", statMultiplier: 1, dropWeight: 45 },
    uncommon: { color: 0x2ecc71, emoji: "🟩", statMultiplier: 1.3, dropWeight: 25 },
    rare: { color: 0x3498db, emoji: "🟦", statMultiplier: 1.6, dropWeight: 15 },
    epic: { color: 0x9b59b6, emoji: "🟪", statMultiplier: 2, dropWeight: 10 },
    legendary: { color: 0xf1c40f, emoji: "🟨", statMultiplier: 2.5, dropWeight: 4 },
    mythic: { color: 0xe74c3c, emoji: "🟥", statMultiplier: 3.2, dropWeight: 1 },
};
exports.CLASS_WEAPON_TYPES = {
    swordsman: ["sword", "greatsword"],
    tank: ["mace", "hammer"],
    mage: ["staff", "wand"],
    archer: ["bow", "crossbow"],
    assassin: ["dagger", "katana"],
    healer: ["staff", "scepter"],
};
exports.CLASS_SHIELD_TYPES = {
    swordsman: ["shield"],
    tank: ["heavy_shield"],
    mage: ["magic_tome"],
    archer: ["quiver"],
    assassin: [],
    healer: ["holy_tome"],
};
exports.STARTER_WEAPONS = {
    swordsman: {
        name: "Iron Sword",
        slot: "weapon",
        type: "sword",
        baseStats: { str: 5 },
        classRestriction: ["swordsman"],
        requiredLevel: 1,
    },
    tank: {
        name: "Iron Mace",
        slot: "weapon",
        type: "mace",
        baseStats: { str: 3, def: 2 },
        classRestriction: ["tank"],
        requiredLevel: 1,
    },
    mage: {
        name: "Wooden Staff",
        slot: "weapon",
        type: "staff",
        baseStats: { mag: 5 },
        classRestriction: ["mage", "healer"],
        requiredLevel: 1,
    },
    archer: {
        name: "Short Bow",
        slot: "weapon",
        type: "bow",
        baseStats: { str: 4, spd: 1 },
        classRestriction: ["archer"],
        requiredLevel: 1,
    },
    assassin: {
        name: "Iron Dagger",
        slot: "weapon",
        type: "dagger",
        baseStats: { str: 4, spd: 2 },
        classRestriction: ["assassin"],
        requiredLevel: 1,
    },
    healer: {
        name: "Wooden Scepter",
        slot: "weapon",
        type: "scepter",
        baseStats: { mag: 4, hp: 5 },
        classRestriction: ["healer"],
        requiredLevel: 1,
    },
};
exports.STARTER_ARMOR = {
    name: "Leather Vest",
    slot: "armor",
    type: "light_armor",
    baseStats: { def: 3, hp: 10 },
    classRestriction: [],
    requiredLevel: 1,
};
// --- Leveling Config ---
exports.MAX_LEVEL = 50;
exports.MESSAGE_XP_TO_EXP_RATE = 0.1;
function expForLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
}
function levelFromExp(totalExp) {
    let level = 1;
    let accumulated = 0;
    while (level < exports.MAX_LEVEL) {
        const needed = expForLevel(level + 1);
        if (accumulated + needed > totalExp)
            break;
        accumulated += needed;
        level++;
    }
    return level;
}
function getMonsterStats(floor, playerLevel) {
    return {
        hp: 80 + floor * 15 + playerLevel * 5,
        str: 10 + floor * 4,
        def: 5 + floor * 2,
        mag: 8 + floor * 3,
        magDef: 5 + floor * 2,
        spd: 8 + floor * 2,
    };
}
function getBossStats(floor, playerLevel) {
    const base = getMonsterStats(floor, playerLevel);
    return {
        hp: base.hp * 2,
        str: base.str * 2,
        def: base.def * 2,
        mag: base.mag * 2,
        magDef: base.magDef * 2,
        spd: base.spd * 2,
    };
}
// --- Mana/MP Config ---
exports.MP_BASE = 50;
exports.MP_PER_LEVEL = 5;
exports.MP_REGEN_PER_TURN = 5;
exports.MP_REGEN_ON_DEFEND = 15;
exports.SKILL1_MP_COST = 20;
exports.SKILL2_MP_COST = 30;
exports.MATERIALS = [
    { key: "mythic_heart", emoji: "🟥", minFloor: 20, dropChance: 0.02, minQty: 1, maxQty: 1 },
    { key: "legendary_soul", emoji: "🟨", minFloor: 15, dropChance: 0.05, minQty: 1, maxQty: 1 },
    { key: "epic_core", emoji: "🟪", minFloor: 10, dropChance: 0.1, minQty: 1, maxQty: 1 },
    { key: "rare_essence", emoji: "🟦", minFloor: 6, dropChance: 0.2, minQty: 1, maxQty: 2 },
    { key: "uncommon_fragment", emoji: "🟩", minFloor: 3, dropChance: 0.35, minQty: 1, maxQty: 3 },
    { key: "common_shard", emoji: "⬜", minFloor: 1, dropChance: 0.6, minQty: 2, maxQty: 4 },
];
// --- Class-Weighted Drop Config ---
exports.CLASS_PRIORITY_SLOTS = {
    swordsman: ["weapon", "armor", "shield"],
    tank: ["shield", "armor", "helmet"],
    mage: ["weapon", "accessory", "shield"],
    archer: ["weapon", "boots", "accessory"],
    assassin: ["weapon", "boots", "accessory"],
    healer: ["weapon", "shield", "helmet"],
};
exports.CLASS_PRIORITY_WEIGHTS = [0.4, 0.35, 0.25];
exports.CLASS_MATCH_CHANCE = 0.7;
// --- Reward Config ---
exports.DUNGEON_REWARDS = {
    monster: { goldBase: 50, goldPerFloor: 15, expBase: 20, expPerFloor: 8, materialChance: 0.3, equipChance: 0.1 },
    treasure: { goldBase: 30, goldPerFloor: 10, expBase: 10, expPerFloor: 5, materialChance: 0.5, equipChance: 0.15 },
    trap: { goldLossBase: 20, goldLossPerFloor: 5 },
    boss: { rewardMultiplier: 3, materialChance: 1, equipChance: 0.5 },
    collapse: { goldLossBase: 100, goldLossMax: 200 },
};
exports.NORMAL_TURNS = 5;
exports.BOSS_TURNS = 7;
exports.ENCOUNTERS_PER_RUN = 5;
exports.CRAFT_RECIPES = [
    { rarity: "common", materials: [{ key: "common_shard", qty: 5 }], goldCost: 50 },
    {
        rarity: "uncommon",
        materials: [
            { key: "uncommon_fragment", qty: 3 },
            { key: "common_shard", qty: 5 },
        ],
        goldCost: 150,
    },
    {
        rarity: "rare",
        materials: [
            { key: "rare_essence", qty: 3 },
            { key: "uncommon_fragment", qty: 5 },
        ],
        goldCost: 500,
    },
    {
        rarity: "epic",
        materials: [
            { key: "epic_core", qty: 3 },
            { key: "rare_essence", qty: 5 },
        ],
        goldCost: 1500,
    },
    {
        rarity: "legendary",
        materials: [
            { key: "legendary_soul", qty: 3 },
            { key: "epic_core", qty: 5 },
        ],
        goldCost: 5000,
    },
    {
        rarity: "mythic",
        materials: [
            { key: "mythic_heart", qty: 3 },
            { key: "legendary_soul", qty: 5 },
        ],
        goldCost: 15000,
    },
];
exports.CRATE_TYPES = ["bronze", "silver", "gold"];
exports.CRATES = {
    bronze: { key: "bronze", emoji: "🟫", shopCost: 200, rarityWeights: { common: 50, uncommon: 35, rare: 15 } },
    silver: { key: "silver", emoji: "🥈", shopCost: 800, rarityWeights: { uncommon: 40, rare: 35, epic: 25 } },
    gold: {
        key: "gold",
        emoji: "🥇",
        shopCost: 2500,
        rarityWeights: { rare: 35, epic: 30, legendary: 25, mythic: 10 },
    },
};
exports.CRATE_DROP_RATES = {
    monster: { bronze: 0.05 },
    treasure: { bronze: 0.15, silver: 0.05 },
    boss: { silver: 0.5, gold: 0.15 },
};
// --- Advanced Class Types ---
exports.ADVANCED_CLASSES = [
    "berserker",
    "knight",
    "fortress",
    "paladin",
    "warlock",
    "archmage",
    "sniper",
    "ranger",
    "phantom",
    "shadow",
    "druid",
    "priest",
];
exports.ULTIMATE_MP_COST = 50;
exports.ADVANCED_CLASS_CONFIG = {
    // --- Offensive Path ---
    berserker: {
        key: "berserker",
        emoji: "⚔️",
        baseClass: "swordsman",
        path: "offensive",
        statBonus: { str: 0.2, hp: -0.1 },
        ultimate: {
            key: "blood_frenzy",
            emoji: "🩸",
            damageType: "physical",
            multiplier: 3,
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    fortress: {
        key: "fortress",
        emoji: "🏰",
        baseClass: "tank",
        path: "offensive",
        statBonus: { def: 0.25, spd: -0.15 },
        ultimate: {
            key: "stone_wall",
            emoji: "🪨",
            damageType: "buff",
            multiplier: 0,
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    warlock: {
        key: "warlock",
        emoji: "😈",
        baseClass: "mage",
        path: "offensive",
        statBonus: { mag: 0.25, hp: -0.15 },
        ultimate: {
            key: "soul_burn",
            emoji: "💀",
            damageType: "magical",
            multiplier: 4,
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    sniper: {
        key: "sniper",
        emoji: "🎯",
        baseClass: "archer",
        path: "offensive",
        statBonus: { str: 0.15, spd: 0.1, def: -0.15 },
        ultimate: {
            key: "headshot",
            emoji: "💥",
            damageType: "physical",
            multiplier: 5,
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    phantom: {
        key: "phantom",
        emoji: "👻",
        baseClass: "assassin",
        path: "offensive",
        statBonus: { str: 0.2, spd: 0.1, hp: -0.2 },
        ultimate: {
            key: "shadow_strike",
            emoji: "🌀",
            damageType: "physical",
            multiplier: 3.5,
            ignoreDefPercent: 1,
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    druid: {
        key: "druid",
        emoji: "🌱",
        baseClass: "healer",
        path: "offensive",
        statBonus: { mag: 0.15, hp: 0.1 },
        ultimate: {
            key: "natures_wrath",
            emoji: "🌿",
            damageType: "magical",
            multiplier: 2.5,
            healPercent: 0.25,
            statusEffect: { type: "poison", value: 0.1, turns: 3 },
            statusTarget: "monster",
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    // --- Defensive Path ---
    knight: {
        key: "knight",
        emoji: "🛡️",
        baseClass: "swordsman",
        path: "defensive",
        statBonus: { def: 0.15, str: 0.05 },
        ultimate: {
            key: "guardians_oath",
            emoji: "⚔️",
            damageType: "physical",
            multiplier: 1.5,
            statusEffect: { type: "def_buff", value: 1, turns: 3 },
            statusTarget: "self",
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    paladin: {
        key: "paladin",
        emoji: "✨",
        baseClass: "tank",
        path: "defensive",
        statBonus: { hp: 0.2, magDef: 0.15 },
        ultimate: {
            key: "divine_shield",
            emoji: "✨",
            damageType: "heal",
            multiplier: 0,
            healPercent: 0.5,
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    archmage: {
        key: "archmage",
        emoji: "🔮",
        baseClass: "mage",
        path: "defensive",
        statBonus: { mag: 0.1, magDef: 0.2 },
        ultimate: {
            key: "arcane_barrier",
            emoji: "🌟",
            damageType: "magical",
            multiplier: 2.5,
            statusEffect: { type: "def_buff", value: 1, turns: 2 },
            statusTarget: "self",
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    ranger: {
        key: "ranger",
        emoji: "🌿",
        baseClass: "archer",
        path: "defensive",
        statBonus: { spd: 0.2, def: 0.1 },
        ultimate: {
            key: "arrow_rain",
            emoji: "🏹",
            damageType: "physical",
            multiplier: 1,
            hits: 5,
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    shadow: {
        key: "shadow",
        emoji: "🌑",
        baseClass: "assassin",
        path: "defensive",
        statBonus: { spd: 0.15, mag: 0.1 },
        ultimate: {
            key: "toxic_cloud",
            emoji: "☠️",
            damageType: "physical",
            multiplier: 0,
            statusEffect: { type: "poison", value: 0.2, turns: 4 },
            statusTarget: "monster",
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
    priest: {
        key: "priest",
        emoji: "🙏",
        baseClass: "healer",
        path: "defensive",
        statBonus: { hp: 0.15, mag: 0.1, magDef: 0.15 },
        ultimate: {
            key: "resurrection",
            emoji: "💫",
            damageType: "buff",
            multiplier: 0,
            mpCost: exports.ULTIMATE_MP_COST,
        },
    },
};
// --- Advancement Requirements ---
exports.ADVANCEMENT_REQUIREMENTS = {
    level: 20,
    materials: [
        { key: "epic_core", qty: 5 },
        { key: "rare_essence", qty: 10 },
    ],
    goldCost: 3000,
};
// --- Base Class → Advanced Class Mapping ---
exports.BASE_TO_ADVANCED = {
    swordsman: ["berserker", "knight"],
    tank: ["fortress", "paladin"],
    mage: ["warlock", "archmage"],
    archer: ["sniper", "ranger"],
    assassin: ["phantom", "shadow"],
    healer: ["druid", "priest"],
};
