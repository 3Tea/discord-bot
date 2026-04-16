// src/services/rpg/rpg.config.ts

// --- Class Types ---

export const CLASS_TYPES = ["swordsman", "tank", "mage", "archer", "assassin", "healer"] as const;
export type ClassType = (typeof CLASS_TYPES)[number];

// --- Stat Types ---

export interface StatBlock {
    hp: number;
    str: number;
    def: number;
    mag: number;
    magDef: number;
    spd: number;
}

// --- Class Config ---

export interface ClassConfig {
    emoji: string;
    role: string;
    baseStats: StatBlock;
    growth: StatBlock;
    primaryDamage: "str" | "mag";
}

export const CLASS_CONFIG: Record<ClassType, ClassConfig> = {
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

// --- Skill Definitions ---

export type SkillDamageType = "physical" | "magical" | "heal" | "buff";

export interface StatusEffectDef {
    type: "def_buff" | "spd_debuff" | "poison";
    value: number;
    turns: number;
}

export interface SkillDef {
    key: string;
    emoji: string;
    damageType: SkillDamageType;
    multiplier: number;
    critChance?: number;
    critMultiplier?: number;
    ignoreDefPercent?: number;
    hits?: number;
    healPercent?: number;
    statusEffect?: StatusEffectDef;
    statusTarget?: "monster" | "self";
}

export const CLASS_SKILLS: Record<ClassType, [SkillDef, SkillDef]> = {
    swordsman: [
        { key: "power_strike", emoji: "⚡", damageType: "physical", multiplier: 1.8 },
        { key: "whirlwind", emoji: "🌀", damageType: "physical", multiplier: 1.3, ignoreDefPercent: 0.3 },
    ],
    tank: [
        {
            key: "shield_bash", emoji: "🔨", damageType: "physical", multiplier: 1.4,
            statusEffect: { type: "def_buff", value: 0.2, turns: 2 }, statusTarget: "self",
        },
        {
            key: "fortify", emoji: "🏰", damageType: "heal", multiplier: 0, healPercent: 0.2,
            statusEffect: { type: "def_buff", value: 0.4, turns: 1 }, statusTarget: "self",
        },
    ],
    mage: [
        { key: "fireball", emoji: "🔥", damageType: "magical", multiplier: 2 },
        {
            key: "ice_shard", emoji: "❄️", damageType: "magical", multiplier: 1.5,
            statusEffect: { type: "spd_debuff", value: 0.3, turns: 2 }, statusTarget: "monster",
        },
    ],
    archer: [
        { key: "precision_shot", emoji: "🎯", damageType: "physical", multiplier: 1.8, ignoreDefPercent: 0.5 },
        { key: "quick_shot", emoji: "💨", damageType: "physical", multiplier: 1.2, hits: 2 },
    ],
    assassin: [
        { key: "backstab", emoji: "🗡️", damageType: "physical", multiplier: 2.2, critChance: 0.3, critMultiplier: 3 },
        {
            key: "poison_blade", emoji: "💀", damageType: "physical", multiplier: 1,
            statusEffect: { type: "poison", value: 0.1, turns: 3 }, statusTarget: "monster",
        },
    ],
    healer: [
        { key: "holy_light", emoji: "✨", damageType: "magical", multiplier: 1.6 },
        { key: "heal", emoji: "💚", damageType: "heal", multiplier: 0, healPercent: 0.3 },
    ],
};

// --- Equipment Config ---

export const EQUIPMENT_SLOTS = ["weapon", "shield", "helmet", "armor", "boots", "accessory"] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_CONFIG: Record<Rarity, { color: number; emoji: string; statMultiplier: number; dropWeight: number }> = {
    common:    { color: 0x95a5a6, emoji: "⬜", statMultiplier: 1, dropWeight: 45 },
    uncommon:  { color: 0x2ecc71, emoji: "🟩", statMultiplier: 1.3, dropWeight: 25 },
    rare:      { color: 0x3498db, emoji: "🟦", statMultiplier: 1.6, dropWeight: 15 },
    epic:      { color: 0x9b59b6, emoji: "🟪", statMultiplier: 2, dropWeight: 10 },
    legendary: { color: 0xf1c40f, emoji: "🟨", statMultiplier: 2.5, dropWeight: 4 },
    mythic:    { color: 0xe74c3c, emoji: "🟥", statMultiplier: 3.2, dropWeight: 1 },
};

export const CLASS_WEAPON_TYPES: Record<ClassType, string[]> = {
    swordsman: ["sword", "greatsword"],
    tank: ["mace", "hammer"],
    mage: ["staff", "wand"],
    archer: ["bow", "crossbow"],
    assassin: ["dagger", "katana"],
    healer: ["staff", "scepter"],
};

export const CLASS_SHIELD_TYPES: Record<ClassType, string[]> = {
    swordsman: ["shield"],
    tank: ["heavy_shield"],
    mage: ["magic_tome"],
    archer: ["quiver"],
    assassin: [],
    healer: ["holy_tome"],
};

// --- Equipment Base Stats Templates ---

export interface EquipmentTemplate {
    name: string;
    slot: EquipmentSlot;
    type: string;
    baseStats: Partial<StatBlock>;
    classRestriction: ClassType[];
    requiredLevel: number;
}

export const STARTER_WEAPONS: Record<ClassType, EquipmentTemplate> = {
    swordsman: { name: "Iron Sword", slot: "weapon", type: "sword", baseStats: { str: 5 }, classRestriction: ["swordsman"], requiredLevel: 1 },
    tank: { name: "Iron Mace", slot: "weapon", type: "mace", baseStats: { str: 3, def: 2 }, classRestriction: ["tank"], requiredLevel: 1 },
    mage: { name: "Wooden Staff", slot: "weapon", type: "staff", baseStats: { mag: 5 }, classRestriction: ["mage", "healer"], requiredLevel: 1 },
    archer: { name: "Short Bow", slot: "weapon", type: "bow", baseStats: { str: 4, spd: 1 }, classRestriction: ["archer"], requiredLevel: 1 },
    assassin: { name: "Iron Dagger", slot: "weapon", type: "dagger", baseStats: { str: 4, spd: 2 }, classRestriction: ["assassin"], requiredLevel: 1 },
    healer: { name: "Wooden Scepter", slot: "weapon", type: "scepter", baseStats: { mag: 4, hp: 5 }, classRestriction: ["healer"], requiredLevel: 1 },
};

export const STARTER_ARMOR: EquipmentTemplate = {
    name: "Leather Vest", slot: "armor", type: "light_armor", baseStats: { def: 3, hp: 10 }, classRestriction: [], requiredLevel: 1,
};

// --- Leveling Config ---

export const MAX_LEVEL = 50;
export const MESSAGE_XP_TO_EXP_RATE = 0.1;

export function expForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
}

export function levelFromExp(totalExp: number): number {
    let level = 1;
    let accumulated = 0;
    while (level < MAX_LEVEL) {
        const needed = expForLevel(level + 1);
        if (accumulated + needed > totalExp) break;
        accumulated += needed;
        level++;
    }
    return level;
}

// --- Monster Scaling ---

export interface MonsterStats {
    hp: number;
    str: number;
    def: number;
    mag: number;
    magDef: number;
    spd: number;
}

export function getMonsterStats(floor: number, playerLevel: number): MonsterStats {
    return {
        hp: 80 + (floor * 15) + (playerLevel * 5),
        str: 10 + (floor * 4),
        def: 5 + (floor * 2),
        mag: 8 + (floor * 3),
        magDef: 5 + (floor * 2),
        spd: 8 + (floor * 2),
    };
}

export function getBossStats(floor: number, playerLevel: number): MonsterStats {
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

// --- Reward Config ---

export const DUNGEON_REWARDS = {
    monster: { goldBase: 50, goldPerFloor: 15, expBase: 20, expPerFloor: 8, materialChance: 0.3, equipChance: 0.1 },
    treasure: { goldBase: 30, goldPerFloor: 10, expBase: 10, expPerFloor: 5, materialChance: 0.5, equipChance: 0.15 },
    trap: { goldLossBase: 20, goldLossPerFloor: 5 },
    boss: { rewardMultiplier: 3, materialChance: 1, equipChance: 0.5 },
    collapse: { goldLossBase: 100, goldLossMax: 200 },
} as const;

export const NORMAL_TURNS = 5;
export const BOSS_TURNS = 7;
export const ENCOUNTERS_PER_RUN = 5;
