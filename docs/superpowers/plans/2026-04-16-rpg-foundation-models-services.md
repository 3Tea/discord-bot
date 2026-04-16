# RPG Foundation: Models + Config + Services (Plan 1A-i)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data layer and service layer for the RPG system — character model, equipment model, RPG config (classes, stats, skills, rarities), character service (CRUD, leveling, gold), equipment service (generation, equip/unequip, drops), and combat service (stat-based damage, skills, status effects).

**Architecture:** Config-driven design with all class stats, growth rates, skill definitions, and equipment templates in a single `rpg.config.ts` file. Three services (`character`, `equipment`, `combat`) with clear boundaries. Models use Mongoose with the same patterns as existing models (timestamps, typed interfaces, indexes).

**Tech Stack:** Mongoose v8, ioredis, TypeScript strict mode

**Prerequisite:** Plan 1A-ii (commands, button handlers, dungeon rework, i18n) builds on top of this.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/services/rpg/rpg.config.ts` | **Create** | All RPG constants: class definitions, stat growth, skill definitions, equipment templates, rarity config |
| `src/models/character.model.ts` | **Create** | Character Mongoose schema + ICharacter interface |
| `src/models/equipment.model.ts` | **Create** | Equipment Mongoose schema + IEquipment interface |
| `src/services/rpg/character.service.ts` | **Create** | Character CRUD, stat calculation, leveling, Gold operations |
| `src/services/rpg/equipment.service.ts` | **Create** | Equipment generation, equip/unequip, inventory queries, drop tables |
| `src/services/rpg/combat.service.ts` | **Create** | Stat-based combat engine: damage formulas, skill execution, status effects, turn resolution |

---

## Task 1: RPG Config

**Files:**
- Create: `src/services/rpg/rpg.config.ts`

- [ ] **Step 1: Create the RPG config file**

```typescript
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
    value: number;     // percentage (0.2 = 20%)
    turns: number;
}

export interface SkillDef {
    key: string;       // i18n key suffix: rpg.skill.{key}
    emoji: string;
    damageType: SkillDamageType;
    multiplier: number;
    critChance?: number;     // 0-1, only for crit-based skills
    critMultiplier?: number; // damage multiplier on crit
    ignoreDefPercent?: number; // 0-1, bypass % of monster DEF
    hits?: number;           // multi-hit (default 1)
    healPercent?: number;    // 0-1, heal % of max HP
    statusEffect?: StatusEffectDef; // applied to monster or self
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
        { key: "fireball", emoji: "🔥", damageType: "magical", multiplier: 2.0 },
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
        { key: "backstab", emoji: "🗡️", damageType: "physical", multiplier: 2.2, critChance: 0.3, critMultiplier: 3.0 },
        {
            key: "poison_blade", emoji: "💀", damageType: "physical", multiplier: 1.0,
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
    common:    { color: 0x95a5a6, emoji: "⬜", statMultiplier: 1.0, dropWeight: 45 },
    uncommon:  { color: 0x2ecc71, emoji: "🟩", statMultiplier: 1.3, dropWeight: 25 },
    rare:      { color: 0x3498db, emoji: "🟦", statMultiplier: 1.6, dropWeight: 15 },
    epic:      { color: 0x9b59b6, emoji: "🟪", statMultiplier: 2.0, dropWeight: 10 },
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
    boss: { rewardMultiplier: 3, materialChance: 1.0, equipChance: 0.5 },
    collapse: { goldLossBase: 100, goldLossMax: 200 },
} as const;

export const NORMAL_TURNS = 5;
export const BOSS_TURNS = 7;
export const ENCOUNTERS_PER_RUN = 5;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compile (file is pure types + constants, no imports from non-existing modules).

- [ ] **Step 3: Commit**

```bash
git add src/services/rpg/rpg.config.ts
git commit -m "feat(rpg): add RPG config with classes, stats, skills, equipment, and leveling constants"
```

---

## Task 2: Character Model

**Files:**
- Create: `src/models/character.model.ts`

- [ ] **Step 1: Create the Character model**

```typescript
// src/models/character.model.ts
import { model, Schema, Document, Types } from "mongoose";
import type { ClassType } from "../services/rpg/rpg.config";

export interface ICharacter extends Document {
    userId: string;
    class: ClassType;
    level: number;
    exp: number;
    gold: number;
    dungeonDepth: number;
    dungeonCheckpoint: number;
    equipment: {
        weapon: Types.ObjectId | null;
        shield: Types.ObjectId | null;
        helmet: Types.ObjectId | null;
        armor: Types.ObjectId | null;
        boots: Types.ObjectId | null;
        accessory: Types.ObjectId | null;
    };
    materials: Map<string, number>;
    createdAt: Date;
    updatedAt: Date;
}

const characterSchema = new Schema(
    {
        userId: { type: String, required: true },
        class: {
            type: String,
            required: true,
            enum: ["swordsman", "tank", "mage", "archer", "assassin", "healer"],
        },
        level: { type: Number, default: 1, min: 1 },
        exp: { type: Number, default: 0, min: 0 },
        gold: { type: Number, default: 0, min: 0 },
        dungeonDepth: { type: Number, default: 1, min: 1 },
        dungeonCheckpoint: { type: Number, default: 1, min: 1 },
        equipment: {
            weapon: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            shield: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            helmet: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            armor: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            boots: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
            accessory: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
        },
        materials: { type: Map, of: Number, default: new Map() },
    },
    {
        timestamps: true,
        collection: "Characters",
    }
);

characterSchema.index({ userId: 1 }, { unique: true });

const CharacterModel = model<ICharacter>("Character", characterSchema);

export default CharacterModel;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/models/character.model.ts
git commit -m "feat(rpg): add Character model with class, stats, equipment, and gold"
```

---

## Task 3: Equipment Model

**Files:**
- Create: `src/models/equipment.model.ts`

- [ ] **Step 1: Create the Equipment model**

```typescript
// src/models/equipment.model.ts
import { model, Schema, Document } from "mongoose";
import type { ClassType, EquipmentSlot, Rarity } from "../services/rpg/rpg.config";

export interface IEquipment extends Document {
    ownerId: string;
    name: string;
    slot: EquipmentSlot;
    type: string;
    rarity: Rarity;
    stats: {
        hp: number;
        str: number;
        def: number;
        mag: number;
        magDef: number;
        spd: number;
    };
    classRestriction: ClassType[];
    requiredLevel: number;
    equipped: boolean;
    createdAt: Date;
}

const equipmentSchema = new Schema(
    {
        ownerId: { type: String, required: true },
        name: { type: String, required: true },
        slot: {
            type: String,
            required: true,
            enum: ["weapon", "shield", "helmet", "armor", "boots", "accessory"],
        },
        type: { type: String, required: true },
        rarity: {
            type: String,
            required: true,
            enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"],
        },
        stats: {
            hp: { type: Number, default: 0 },
            str: { type: Number, default: 0 },
            def: { type: Number, default: 0 },
            mag: { type: Number, default: 0 },
            magDef: { type: Number, default: 0 },
            spd: { type: Number, default: 0 },
        },
        classRestriction: [{ type: String }],
        requiredLevel: { type: Number, default: 1, min: 1 },
        equipped: { type: Boolean, default: false },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        collection: "Equipment",
    }
);

equipmentSchema.index({ ownerId: 1 });
equipmentSchema.index({ ownerId: 1, equipped: true });

const EquipmentModel = model<IEquipment>("Equipment", equipmentSchema);

export default EquipmentModel;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/models/equipment.model.ts
git commit -m "feat(rpg): add Equipment model with stats, rarity, and class restrictions"
```

---

## Task 4: Character Service

**Files:**
- Create: `src/services/rpg/character.service.ts`

- [ ] **Step 1: Create the Character service**

```typescript
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
    RARITY_CONFIG,
    type ClassType,
    type StatBlock,
} from "./rpg.config";

const CHARACTER_CACHE_TTL = 300; // 5 min

// --- Errors ---

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

// --- CRUD ---

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

    // Create character
    const character = await CharacterModel.create({ userId, class: classType });

    // Create starter weapon
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

    // Create starter armor
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

    // Equip starter gear
    character.equipment.weapon = weapon._id;
    character.equipment.armor = armor._id;
    await character.save();

    // Clear cache
    await redis.deleteKey(`rpg_char:${userId}`);

    return character;
}

// --- Stat Calculation ---

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

    // Add equipment bonuses
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

// --- Leveling ---

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

// --- Gold ---

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

// --- Dungeon Progress ---

async function updateDungeonProgress(userId: string, floor: number, checkpoint: number): Promise<void> {
    await CharacterModel.updateOne(
        { userId },
        { $set: { dungeonDepth: floor, dungeonCheckpoint: checkpoint } }
    );
    await redis.deleteKey(`rpg_char:${userId}`);
}

// --- Export ---

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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/services/rpg/character.service.ts
git commit -m "feat(rpg): add CharacterService with CRUD, stats, leveling, and gold operations"
```

---

## Task 5: Equipment Service

**Files:**
- Create: `src/services/rpg/equipment.service.ts`

- [ ] **Step 1: Create the Equipment service**

```typescript
// src/services/rpg/equipment.service.ts
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
    type EquipmentTemplate,
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/services/rpg/equipment.service.ts
git commit -m "feat(rpg): add EquipmentService with generation, equip/unequip, inventory, and drop tables"
```

---

## Task 6: Combat Service

**Files:**
- Create: `src/services/rpg/combat.service.ts`

- [ ] **Step 1: Create the Combat service**

```typescript
// src/services/rpg/combat.service.ts
import {
    CLASS_CONFIG,
    CLASS_SKILLS,
    NORMAL_TURNS,
    BOSS_TURNS,
    type ClassType,
    type StatBlock,
    type SkillDef,
    type MonsterStats,
} from "./rpg.config";

// --- Combat State Types ---

export interface StatusEffect {
    type: "def_buff" | "spd_debuff" | "poison";
    value: number;
    turnsLeft: number;
}

export interface CombatantState {
    hp: number;
    maxHp: number;
    stats: StatBlock;
    statusEffects: StatusEffect[];
}

export interface RpgCombatState {
    userId: string;
    classType: ClassType;
    isBoss: boolean;
    monsterName: string;
    monsterEmoji: string;
    user: CombatantState;
    monster: CombatantState;
    turnsLeft: number;
    turnOrder: "user_first" | "monster_first";
}

export interface CombatActionResult {
    userDamage: number;        // damage dealt to monster
    monsterDamage: number;     // damage dealt to user
    userHp: number;
    monsterHp: number;
    turnsLeft: number;
    won: boolean;              // monster dead
    lost: boolean;             // user dead
    fled: boolean;
    turnsUp: boolean;          // turns exhausted
    healAmount?: number;       // for heal skills
    statusApplied?: string;    // status effect name applied
    critHit?: boolean;         // critical hit triggered
    poisonDamage?: number;     // poison tick damage this turn
}

// --- Combat Initialization ---

function initCombat(
    userId: string,
    classType: ClassType,
    userStats: StatBlock,
    userHp: number,
    maxHp: number,
    monster: { name: string; emoji: string; stats: MonsterStats },
    isBoss: boolean
): RpgCombatState {
    const maxTurns = isBoss ? BOSS_TURNS : NORMAL_TURNS;
    const turnOrder = userStats.spd >= monster.stats.spd ? "user_first" : "monster_first";

    return {
        userId,
        classType,
        isBoss,
        monsterName: monster.name,
        monsterEmoji: monster.emoji,
        user: {
            hp: userHp,
            maxHp,
            stats: { ...userStats },
            statusEffects: [],
        },
        monster: {
            hp: monster.stats.hp,
            maxHp: monster.stats.hp,
            stats: {
                hp: monster.stats.hp,
                str: monster.stats.str,
                def: monster.stats.def,
                mag: monster.stats.mag,
                magDef: monster.stats.magDef,
                spd: monster.stats.spd,
            },
            statusEffects: [],
        },
        turnsLeft: maxTurns,
        turnOrder,
    };
}

// --- Damage Calculation ---

function calcPhysicalDamage(
    attackerStr: number,
    defenderDef: number,
    multiplier: number,
    ignoreDefPercent: number = 0
): number {
    const effectiveDef = defenderDef * (1 - ignoreDefPercent);
    const raw = (attackerStr * 1.5) * multiplier - (effectiveDef * 0.5);
    return Math.max(1, Math.floor(raw));
}

function calcMagicalDamage(
    attackerMag: number,
    defenderMagDef: number,
    multiplier: number,
    ignoreDefPercent: number = 0
): number {
    const effectiveMagDef = defenderMagDef * (1 - ignoreDefPercent);
    const raw = (attackerMag * 1.5) * multiplier - (effectiveMagDef * 0.5);
    return Math.max(1, Math.floor(raw));
}

function getEffectiveStat(base: number, effects: StatusEffect[], statType: string): number {
    let value = base;
    for (const effect of effects) {
        if (effect.type === "def_buff" && (statType === "def" || statType === "magDef")) {
            value = Math.floor(value * (1 + effect.value));
        }
        if (effect.type === "spd_debuff" && statType === "spd") {
            value = Math.floor(value * (1 - effect.value));
        }
    }
    return value;
}

// --- Monster Attack ---

function monsterAttack(state: RpgCombatState): number {
    const monsterStr = state.monster.stats.str;
    const userDef = getEffectiveStat(state.user.stats.def, state.user.statusEffects, "def");
    const raw = (monsterStr * 1.5) - (userDef * 0.5);
    return Math.max(1, Math.floor(raw));
}

// --- Tick Status Effects ---

function tickStatusEffects(combatant: CombatantState): number {
    let poisonDmg = 0;
    for (const effect of combatant.statusEffects) {
        if (effect.type === "poison") {
            poisonDmg = Math.floor(combatant.maxHp * effect.value);
            combatant.hp = Math.max(0, combatant.hp - poisonDmg);
        }
        effect.turnsLeft--;
    }
    combatant.statusEffects = combatant.statusEffects.filter((e) => e.turnsLeft > 0);
    return poisonDmg;
}

// --- Execute Action ---

function executeAction(state: RpgCombatState, action: "attack" | "skill1" | "skill2" | "defend" | "run"): CombatActionResult {
    // --- Run ---
    if (action === "run") {
        return {
            userDamage: 0,
            monsterDamage: 0,
            userHp: state.user.hp,
            monsterHp: state.monster.hp,
            turnsLeft: state.turnsLeft,
            won: false,
            lost: false,
            fled: true,
            turnsUp: false,
        };
    }

    const classConfig = CLASS_CONFIG[state.classType];
    let userDamage = 0;
    let healAmount = 0;
    let statusApplied: string | undefined;
    let critHit = false;

    // --- Defend ---
    if (action === "defend") {
        // Heal 5% max HP
        healAmount = Math.floor(state.user.maxHp * 0.05);
        state.user.hp = Math.min(state.user.maxHp, state.user.hp + healAmount);

        // Monster attacks at 50% damage
        const rawMonsterDmg = monsterAttack(state);
        const monsterDmg = Math.max(1, Math.floor(rawMonsterDmg * 0.5));
        state.user.hp = Math.max(0, state.user.hp - monsterDmg);

        state.turnsLeft--;
        const monsterPoisonDmg = tickStatusEffects(state.monster);
        const userPoisonDmg = tickStatusEffects(state.user);

        return {
            userDamage: 0,
            monsterDamage: monsterDmg,
            userHp: state.user.hp,
            monsterHp: state.monster.hp,
            turnsLeft: state.turnsLeft,
            won: state.monster.hp <= 0,
            lost: state.user.hp <= 0,
            fled: false,
            turnsUp: state.turnsLeft <= 0 && state.monster.hp > 0 && state.user.hp > 0,
            healAmount,
            poisonDamage: monsterPoisonDmg + userPoisonDmg,
        };
    }

    // --- Attack / Skill ---
    let skill: SkillDef | null = null;
    if (action === "skill1") skill = CLASS_SKILLS[state.classType][0];
    if (action === "skill2") skill = CLASS_SKILLS[state.classType][1];

    const multiplier = skill?.multiplier ?? 1.0;
    const ignoreDefPercent = skill?.ignoreDefPercent ?? 0;
    const hits = skill?.hits ?? 1;

    // Handle heal-type skills
    if (skill?.damageType === "heal") {
        if (skill.healPercent) {
            healAmount = Math.floor(state.user.maxHp * skill.healPercent);
            state.user.hp = Math.min(state.user.maxHp, state.user.hp + healAmount);
        }
        // Apply status effect if any (e.g., Tank Fortify gives DEF buff + heal)
        if (skill.statusEffect && skill.statusTarget === "self") {
            state.user.statusEffects.push({
                type: skill.statusEffect.type,
                value: skill.statusEffect.value,
                turnsLeft: skill.statusEffect.turns,
            });
            statusApplied = skill.statusEffect.type;
        }

        // Monster still attacks
        const monsterDmg = monsterAttack(state);
        state.user.hp = Math.max(0, state.user.hp - monsterDmg);

        state.turnsLeft--;
        tickStatusEffects(state.monster);
        tickStatusEffects(state.user);

        return {
            userDamage: 0,
            monsterDamage: monsterDmg,
            userHp: state.user.hp,
            monsterHp: state.monster.hp,
            turnsLeft: state.turnsLeft,
            won: state.monster.hp <= 0,
            lost: state.user.hp <= 0,
            fled: false,
            turnsUp: state.turnsLeft <= 0 && state.monster.hp > 0 && state.user.hp > 0,
            healAmount,
            statusApplied,
        };
    }

    // Damage-dealing actions
    const monsterDef = getEffectiveStat(state.monster.stats.def, state.monster.statusEffects, "def");
    const monsterMagDef = getEffectiveStat(state.monster.stats.magDef, state.monster.statusEffects, "magDef");

    for (let h = 0; h < hits; h++) {
        let dmg: number;
        if (skill?.damageType === "magical" || (!skill && classConfig.primaryDamage === "mag")) {
            dmg = calcMagicalDamage(state.user.stats.mag, monsterMagDef, multiplier, ignoreDefPercent);
        } else {
            dmg = calcPhysicalDamage(state.user.stats.str, monsterDef, multiplier, ignoreDefPercent);
        }

        // Crit check
        if (skill?.critChance && Math.random() < skill.critChance) {
            dmg = Math.floor(dmg * (skill.critMultiplier ?? 2.0));
            critHit = true;
        }

        userDamage += dmg;
        state.monster.hp = Math.max(0, state.monster.hp - dmg);
    }

    // Apply skill status effect
    if (skill?.statusEffect) {
        const target = skill.statusTarget === "self" ? state.user : state.monster;
        target.statusEffects.push({
            type: skill.statusEffect.type,
            value: skill.statusEffect.value,
            turnsLeft: skill.statusEffect.turns,
        });
        statusApplied = skill.statusEffect.type;
    }

    // Monster attacks back (if alive)
    let monsterDmg = 0;
    if (state.monster.hp > 0) {
        monsterDmg = monsterAttack(state);
        state.user.hp = Math.max(0, state.user.hp - monsterDmg);
    }

    state.turnsLeft--;
    const monsterPoisonDmg = tickStatusEffects(state.monster);
    tickStatusEffects(state.user);

    return {
        userDamage,
        monsterDamage: monsterDmg,
        userHp: state.user.hp,
        monsterHp: state.monster.hp,
        turnsLeft: state.turnsLeft,
        won: state.monster.hp <= 0,
        lost: state.user.hp <= 0,
        fled: false,
        turnsUp: state.turnsLeft <= 0 && state.monster.hp > 0 && state.user.hp > 0,
        critHit,
        statusApplied,
        poisonDamage: monsterPoisonDmg,
    };
}

// --- Get available actions ---

function getSkillLabels(classType: ClassType): [{ key: string; emoji: string }, { key: string; emoji: string }] {
    const [s1, s2] = CLASS_SKILLS[classType];
    return [
        { key: s1.key, emoji: s1.emoji },
        { key: s2.key, emoji: s2.emoji },
    ];
}

// --- Export ---

const CombatService = {
    initCombat,
    executeAction,
    getSkillLabels,
    calcPhysicalDamage,
    calcMagicalDamage,
};

export default CombatService;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/services/rpg/combat.service.ts
git commit -m "feat(rpg): add CombatService with stat-based damage, skills, and status effects"
```

---

## Task 7: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Verify full build**

Run: `npm run build`
Expected: Clean compile with zero errors.

- [ ] **Step 2: Verify all exports work together**

Check that the three services can import from each other and from config/models without circular dependencies:

Run: `node -e "require('./dist/services/rpg/rpg.config'); require('./dist/models/character.model'); require('./dist/models/equipment.model'); require('./dist/services/rpg/character.service'); require('./dist/services/rpg/equipment.service'); require('./dist/services/rpg/combat.service'); console.log('All RPG modules loaded OK')"`

Expected: "All RPG modules loaded OK" (or Mongoose connection warning which is fine — no runtime errors).

- [ ] **Step 3: Verify no existing code is broken**

Run: `npm run build`
Expected: Same clean compile — no existing files were modified, so no regressions possible.
