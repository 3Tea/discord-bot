# RPG Phase 2A: Adventurer Guild + Quest System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Adventurer Guild system — registration, 10-tier rank progression, daily board quests (3 shared), personal quests (2 per user), quest tracking across 10+ integration points, and the `/guild` command.

**Architecture:** Config-driven ranks and quest templates in `guild.config.ts`. GuildMember model for persistent state. GuildService for registration/rank management. GuildQuestService for deterministic quest generation, progress tracking (Redis), accept/claim flow. `/guild` command with 4 subcommands using inline collectors for button interactions.

**Tech Stack:** Discord.js v14, Mongoose, ioredis, seeded PRNG (mulberry32)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/services/rpg/guild.config.ts` | **Create** | Rank definitions, quest templates, reward scaling, seeded PRNG, quest action types |
| `src/models/guildMember.model.ts` | **Create** | GuildMember Mongoose schema (rank, GP, activeQuests) |
| `src/services/rpg/guild.service.ts` | **Create** | Registration, rank check/up, GP management, boss kill tracking |
| `src/services/rpg/guildQuest.service.ts` | **Create** | Quest generation, accept, progress tracking (Redis), claim, reward distribution |
| `src/models/character.model.ts` | Modify | Add `bossKills: number` field |
| `src/commands/slash/guild.ts` | **Create** | `/guild register/profile/board/quests` command |
| `src/locales/*.json` (15 files) | Modify | ~40 new i18n keys |
| `src/buttons/dungeonAttack.button.ts` | Modify | Track kill_monsters, defeat_boss, increment bossKills |
| `src/services/rpg/character.service.ts` | Modify | Track earn_gold, collect_materials hooks |
| `src/commands/slash/adventure.ts` | Modify | Track craft_equipment, open_crates |
| `src/commands/slash/work.ts` | Modify | Track use_work |
| `src/commands/slash/fish.ts` | Modify | Track use_fish |
| `src/events/messageCreate.ts` | Modify | Track send_messages |

---

## Task 1: Guild Config

**Files:**
- Create: `src/services/rpg/guild.config.ts`

- [ ] **Step 1: Create the guild config file**

Read the spec at `docs/superpowers/specs/2026-04-16-rpg-phase2a-guild-quests-design.md` for the full rank table and quest template definitions.

Create `src/services/rpg/guild.config.ts` with:

```typescript
// src/services/rpg/guild.config.ts
import type { CrateType, Rarity } from "./rpg.config";

// --- Adventurer Ranks ---

export const ADVENTURER_RANKS = ["f", "e", "d", "c", "b", "a", "s", "ss", "sss", "legendary"] as const;
export type AdventurerRank = (typeof ADVENTURER_RANKS)[number];

export interface RankDef {
    key: AdventurerRank;
    label: string;
    emoji: string;
    gpRequired: number;
    minLevel: number;
    minBossKills: number;
}

export const RANK_CONFIG: Record<AdventurerRank, RankDef> = {
    f: { key: "f", label: "Novice", emoji: "🟤", gpRequired: 0, minLevel: 1, minBossKills: 0 },
    e: { key: "e", label: "Beginner", emoji: "⚪", gpRequired: 100, minLevel: 5, minBossKills: 1 },
    d: { key: "d", label: "Apprentice", emoji: "🟢", gpRequired: 300, minLevel: 10, minBossKills: 3 },
    c: { key: "c", label: "Intermediate", emoji: "🔵", gpRequired: 700, minLevel: 15, minBossKills: 8 },
    b: { key: "b", label: "Advanced", emoji: "🟣", gpRequired: 1500, minLevel: 20, minBossKills: 15 },
    a: { key: "a", label: "Expert", emoji: "🟡", gpRequired: 3000, minLevel: 25, minBossKills: 25 },
    s: { key: "s", label: "Elite", emoji: "🟠", gpRequired: 6000, minLevel: 30, minBossKills: 40 },
    ss: { key: "ss", label: "Master", emoji: "🔴", gpRequired: 12000, minLevel: 35, minBossKills: 60 },
    sss: { key: "sss", label: "Grandmaster", emoji: "⭐", gpRequired: 25000, minLevel: 40, minBossKills: 100 },
    legendary: { key: "legendary", label: "Legend", emoji: "👑", gpRequired: 50000, minLevel: 50, minBossKills: 200 },
};

// --- Quest Actions ---

export const QUEST_ACTIONS = [
    "kill_monsters", "reach_floor", "defeat_boss", "earn_gold",
    "craft_equipment", "open_crates", "collect_materials",
    "use_work", "use_fish", "send_messages", "use_pray", "complete_quests",
] as const;
export type QuestAction = (typeof QUEST_ACTIONS)[number];

// --- Quest Templates ---

export interface QuestTemplate {
    action: QuestAction;
    targetByRank: Record<AdventurerRank, { min: number; max: number }>;
    baseGold: number;
    baseExp: number;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
    { action: "kill_monsters", targetByRank: { f: { min: 3, max: 5 }, e: { min: 5, max: 8 }, d: { min: 8, max: 12 }, c: { min: 12, max: 18 }, b: { min: 18, max: 25 }, a: { min: 25, max: 35 }, s: { min: 30, max: 40 }, ss: { min: 35, max: 45 }, sss: { min: 40, max: 50 }, legendary: { min: 45, max: 60 } }, baseGold: 100, baseExp: 50 },
    { action: "defeat_boss", targetByRank: { f: { min: 1, max: 1 }, e: { min: 1, max: 2 }, d: { min: 1, max: 2 }, c: { min: 2, max: 3 }, b: { min: 2, max: 3 }, a: { min: 3, max: 4 }, s: { min: 3, max: 5 }, ss: { min: 4, max: 6 }, sss: { min: 5, max: 7 }, legendary: { min: 5, max: 8 } }, baseGold: 200, baseExp: 100 },
    { action: "reach_floor", targetByRank: { f: { min: 3, max: 5 }, e: { min: 5, max: 8 }, d: { min: 8, max: 12 }, c: { min: 12, max: 16 }, b: { min: 16, max: 22 }, a: { min: 22, max: 28 }, s: { min: 28, max: 35 }, ss: { min: 35, max: 42 }, sss: { min: 42, max: 48 }, legendary: { min: 48, max: 55 } }, baseGold: 150, baseExp: 80 },
    { action: "earn_gold", targetByRank: { f: { min: 200, max: 400 }, e: { min: 400, max: 700 }, d: { min: 700, max: 1200 }, c: { min: 1200, max: 2000 }, b: { min: 2000, max: 3500 }, a: { min: 3500, max: 5000 }, s: { min: 5000, max: 8000 }, ss: { min: 8000, max: 12000 }, sss: { min: 12000, max: 18000 }, legendary: { min: 18000, max: 25000 } }, baseGold: 80, baseExp: 40 },
    { action: "craft_equipment", targetByRank: { f: { min: 1, max: 1 }, e: { min: 1, max: 2 }, d: { min: 1, max: 2 }, c: { min: 2, max: 3 }, b: { min: 2, max: 3 }, a: { min: 3, max: 4 }, s: { min: 3, max: 5 }, ss: { min: 4, max: 5 }, sss: { min: 5, max: 6 }, legendary: { min: 5, max: 7 } }, baseGold: 150, baseExp: 75 },
    { action: "open_crates", targetByRank: { f: { min: 1, max: 2 }, e: { min: 2, max: 3 }, d: { min: 2, max: 4 }, c: { min: 3, max: 5 }, b: { min: 4, max: 6 }, a: { min: 5, max: 7 }, s: { min: 6, max: 8 }, ss: { min: 7, max: 9 }, sss: { min: 8, max: 10 }, legendary: { min: 9, max: 12 } }, baseGold: 80, baseExp: 40 },
    { action: "collect_materials", targetByRank: { f: { min: 5, max: 10 }, e: { min: 10, max: 15 }, d: { min: 15, max: 25 }, c: { min: 25, max: 35 }, b: { min: 35, max: 50 }, a: { min: 50, max: 70 }, s: { min: 70, max: 90 }, ss: { min: 90, max: 120 }, sss: { min: 120, max: 150 }, legendary: { min: 150, max: 200 } }, baseGold: 80, baseExp: 40 },
    { action: "use_work", targetByRank: { f: { min: 2, max: 3 }, e: { min: 3, max: 4 }, d: { min: 3, max: 5 }, c: { min: 4, max: 6 }, b: { min: 5, max: 7 }, a: { min: 5, max: 8 }, s: { min: 6, max: 8 }, ss: { min: 7, max: 9 }, sss: { min: 8, max: 10 }, legendary: { min: 9, max: 12 } }, baseGold: 60, baseExp: 30 },
    { action: "use_fish", targetByRank: { f: { min: 2, max: 3 }, e: { min: 3, max: 4 }, d: { min: 3, max: 5 }, c: { min: 4, max: 6 }, b: { min: 5, max: 7 }, a: { min: 5, max: 8 }, s: { min: 6, max: 8 }, ss: { min: 7, max: 9 }, sss: { min: 8, max: 10 }, legendary: { min: 9, max: 12 } }, baseGold: 60, baseExp: 30 },
    { action: "send_messages", targetByRank: { f: { min: 20, max: 40 }, e: { min: 40, max: 60 }, d: { min: 60, max: 100 }, c: { min: 100, max: 150 }, b: { min: 150, max: 200 }, a: { min: 200, max: 300 }, s: { min: 300, max: 400 }, ss: { min: 400, max: 500 }, sss: { min: 500, max: 700 }, legendary: { min: 700, max: 1000 } }, baseGold: 50, baseExp: 25 },
    { action: "use_pray", targetByRank: { f: { min: 1, max: 2 }, e: { min: 2, max: 3 }, d: { min: 2, max: 3 }, c: { min: 3, max: 4 }, b: { min: 3, max: 5 }, a: { min: 4, max: 5 }, s: { min: 4, max: 6 }, ss: { min: 5, max: 7 }, sss: { min: 6, max: 8 }, legendary: { min: 7, max: 10 } }, baseGold: 60, baseExp: 30 },
    { action: "complete_quests", targetByRank: { f: { min: 2, max: 3 }, e: { min: 2, max: 3 }, d: { min: 3, max: 4 }, c: { min: 3, max: 4 }, b: { min: 3, max: 5 }, a: { min: 4, max: 5 }, s: { min: 4, max: 6 }, ss: { min: 5, max: 6 }, sss: { min: 5, max: 7 }, legendary: { min: 6, max: 8 } }, baseGold: 120, baseExp: 60 },
];

// --- Reward Scaling ---

export interface RewardScale {
    gpPerQuest: number;
    goldMultiplier: number;
    expMultiplier: number;
    materialChance: number;
    crateChance: number;
}

export const REWARD_SCALING: Record<AdventurerRank, RewardScale> = {
    f: { gpPerQuest: 10, goldMultiplier: 1, expMultiplier: 1, materialChance: 0.2, crateChance: 0 },
    e: { gpPerQuest: 15, goldMultiplier: 1.2, expMultiplier: 1.2, materialChance: 0.3, crateChance: 0.05 },
    d: { gpPerQuest: 20, goldMultiplier: 1.4, expMultiplier: 1.4, materialChance: 0.4, crateChance: 0.1 },
    c: { gpPerQuest: 30, goldMultiplier: 1.6, expMultiplier: 1.6, materialChance: 0.5, crateChance: 0.15 },
    b: { gpPerQuest: 45, goldMultiplier: 1.8, expMultiplier: 1.8, materialChance: 0.6, crateChance: 0.2 },
    a: { gpPerQuest: 65, goldMultiplier: 2, expMultiplier: 2, materialChance: 0.7, crateChance: 0.25 },
    s: { gpPerQuest: 90, goldMultiplier: 2.5, expMultiplier: 2.5, materialChance: 0.8, crateChance: 0.35 },
    ss: { gpPerQuest: 120, goldMultiplier: 3, expMultiplier: 3, materialChance: 0.9, crateChance: 0.45 },
    sss: { gpPerQuest: 160, goldMultiplier: 3.5, expMultiplier: 3.5, materialChance: 0.95, crateChance: 0.55 },
    legendary: { gpPerQuest: 200, goldMultiplier: 4, expMultiplier: 4, materialChance: 1, crateChance: 0.7 },
};

// --- Board Quest Rank Requirements ---

export const BOARD_QUEST_RANKS: [AdventurerRank, AdventurerRank, AdventurerRank] = ["f", "d", "b"];

// --- Quest Limits ---

export const MAX_ACTIVE_QUESTS = 3;
export const DAILY_BOARD_QUESTS = 3;
export const DAILY_PERSONAL_QUESTS = 2;

// --- Seeded PRNG (Mulberry32) ---

export function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

export function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/services/rpg/guild.config.ts
git commit -m "feat(guild): add guild config with ranks, quest templates, reward scaling, and seeded PRNG"
```

---

## Task 2: GuildMember Model + Character bossKills

**Files:**
- Create: `src/models/guildMember.model.ts`
- Modify: `src/models/character.model.ts`

- [ ] **Step 1: Create GuildMember model**

```typescript
// src/models/guildMember.model.ts
import { model, Schema, Document } from "mongoose";
import type { AdventurerRank } from "../services/rpg/guild.config";

export interface IGuildMember extends Document {
    userId: string;
    rank: AdventurerRank;
    gp: number;
    questsCompleted: number;
    activeQuests: string[];
    lastBoardDate: string;
    lastPersonalDate: string;
    createdAt: Date;
    updatedAt: Date;
}

const guildMemberSchema = new Schema(
    {
        userId: { type: String, required: true },
        rank: { type: String, default: "f", enum: ["f", "e", "d", "c", "b", "a", "s", "ss", "sss", "legendary"] },
        gp: { type: Number, default: 0, min: 0 },
        questsCompleted: { type: Number, default: 0, min: 0 },
        activeQuests: [{ type: String }],
        lastBoardDate: { type: String, default: "" },
        lastPersonalDate: { type: String, default: "" },
    },
    { timestamps: true, collection: "GuildMembers" }
);

guildMemberSchema.index({ userId: 1 }, { unique: true });

const GuildMemberModel = model<IGuildMember>("GuildMember", guildMemberSchema);
export default GuildMemberModel;
```

- [ ] **Step 2: Add `bossKills` to CharacterModel**

In `src/models/character.model.ts`, add to `ICharacter` interface:
```typescript
bossKills: number;
```

Add to schema (after `dungeonCheckpoint`):
```typescript
bossKills: { type: Number, default: 0, min: 0 },
```

- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/models/guildMember.model.ts src/models/character.model.ts
git commit -m "feat(guild): add GuildMember model and bossKills field to Character"
```

---

## Task 3: Guild Service

**Files:**
- Create: `src/services/rpg/guild.service.ts`

- [ ] **Step 1: Create guild service**

The service handles registration, rank management, and GP. Read the spec for full details. Key functions:

```typescript
// src/services/rpg/guild.service.ts
import GuildMemberModel, { IGuildMember } from "../../models/guildMember.model";
import CharacterModel from "../../models/character.model";
import CharacterService from "./character.service";
import redis from "../../connector/redis";
import { RANK_CONFIG, ADVENTURER_RANKS, type AdventurerRank } from "./guild.config";

const GUILD_CACHE_TTL = 300;

export class GuildMemberNotFoundError extends Error {
    constructor(userId: string) {
        super(`Guild member not found: ${userId}`);
        this.name = "GuildMemberNotFoundError";
    }
}

export class AlreadyRegisteredError extends Error {
    constructor() {
        super("Already registered");
        this.name = "AlreadyRegisteredError";
    }
}

async function getMember(userId: string): Promise<IGuildMember | null> {
    const cacheKey = `guild_member:${userId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildMember;
    const doc = await GuildMemberModel.findOne({ userId });
    if (doc) await redis.setJson(cacheKey, doc.toObject(), GUILD_CACHE_TTL);
    return doc;
}

async function requireMember(userId: string): Promise<IGuildMember> {
    const member = await getMember(userId);
    if (!member) throw new GuildMemberNotFoundError(userId);
    return member;
}

async function register(userId: string): Promise<IGuildMember> {
    await CharacterService.requireCharacter(userId); // must have character
    const existing = await GuildMemberModel.findOne({ userId });
    if (existing) throw new AlreadyRegisteredError();
    const member = await GuildMemberModel.create({ userId });
    await redis.deleteKey(`guild_member:${userId}`);
    return member;
}

async function addGP(userId: string, amount: number): Promise<{ gp: number; rankedUp: boolean; oldRank: AdventurerRank; newRank: AdventurerRank }> {
    const member = await requireMember(userId);
    const newGP = member.gp + amount;
    const oldRank = member.rank as AdventurerRank;

    // Check rank up
    const char = await CharacterService.requireCharacter(userId);
    const bossKills = char.bossKills ?? 0;
    let newRank = oldRank;

    const rankIndex = ADVENTURER_RANKS.indexOf(oldRank);
    for (let i = rankIndex + 1; i < ADVENTURER_RANKS.length; i++) {
        const nextRank = ADVENTURER_RANKS[i];
        const req = RANK_CONFIG[nextRank];
        if (newGP >= req.gpRequired && char.level >= req.minLevel && bossKills >= req.minBossKills) {
            newRank = nextRank;
        } else {
            break;
        }
    }

    await GuildMemberModel.updateOne({ userId }, { $set: { gp: newGP, rank: newRank } });
    await redis.deleteKey(`guild_member:${userId}`);

    return { gp: newGP, rankedUp: newRank !== oldRank, oldRank, newRank };
}

async function incrementBossKills(userId: string): Promise<void> {
    await CharacterModel.updateOne({ userId }, { $inc: { bossKills: 1 } });
    await redis.deleteKey(`rpg_char:${userId}`);
}

function getNextRank(currentRank: AdventurerRank): AdventurerRank | null {
    const idx = ADVENTURER_RANKS.indexOf(currentRank);
    if (idx >= ADVENTURER_RANKS.length - 1) return null;
    return ADVENTURER_RANKS[idx + 1];
}

const GuildService = {
    getMember,
    requireMember,
    register,
    addGP,
    incrementBossKills,
    getNextRank,
    GuildMemberNotFoundError,
    AlreadyRegisteredError,
};

export default GuildService;
```

- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/services/rpg/guild.service.ts
git commit -m "feat(guild): add GuildService with registration, rank up, and GP management"
```

---

## Task 4: Guild Quest Service

**Files:**
- Create: `src/services/rpg/guildQuest.service.ts`

This is the most complex service. Read the spec for full details. Key functions:

- [ ] **Step 1: Create the quest service**

```typescript
// src/services/rpg/guildQuest.service.ts
import redis from "../../connector/redis";
import GuildMemberModel from "../../models/guildMember.model";
import CharacterService from "./character.service";
import EquipmentService from "../rpg/equipment.service";
import GuildService from "./guild.service";
import {
    QUEST_TEMPLATES,
    REWARD_SCALING,
    BOARD_QUEST_RANKS,
    DAILY_BOARD_QUESTS,
    DAILY_PERSONAL_QUESTS,
    MAX_ACTIVE_QUESTS,
    ADVENTURER_RANKS,
    hashCode,
    mulberry32,
    type AdventurerRank,
    type QuestAction,
    type QuestTemplate,
} from "./guild.config";
import { MATERIALS, type ClassType, type CrateType } from "./rpg.config";

const QUEST_PROGRESS_TTL = 86400; // 24 hours

// --- Quest Types ---

export interface GuildQuest {
    id: string;
    type: "board" | "personal";
    action: QuestAction;
    target: number;
    rewards: {
        gold: number;
        exp: number;
        gp: number;
        materials: { key: string; qty: number }[];
        crate: CrateType | null;
    };
    rankRequirement: AdventurerRank;
}

// --- Deterministic Quest Generation ---

function getUTCDateString(): string {
    return new Date().toISOString().split("T")[0];
}

function pickFromArray<T>(arr: T[], rng: () => number): T {
    return arr[Math.floor(rng() * arr.length)];
}

function randomInRangeSeeded(min: number, max: number, rng: () => number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function generateRewards(template: QuestTemplate, rank: AdventurerRank, rng: () => number): GuildQuest["rewards"] {
    const scale = REWARD_SCALING[rank];
    const gold = Math.floor(template.baseGold * scale.goldMultiplier);
    const exp = Math.floor(template.baseExp * scale.expMultiplier);
    const gp = scale.gpPerQuest;

    const materials: { key: string; qty: number }[] = [];
    if (rng() < scale.materialChance) {
        // Pick a material tier based on rank
        const rankIdx = ADVENTURER_RANKS.indexOf(rank);
        const maxMatIdx = Math.min(rankIdx, MATERIALS.length - 1);
        const matIdx = Math.floor(rng() * (maxMatIdx + 1));
        const mat = MATERIALS[MATERIALS.length - 1 - matIdx]; // MATERIALS is ordered high→low, so reverse
        materials.push({ key: mat.key, qty: randomInRangeSeeded(1, 3, rng) });
    }

    let crate: CrateType | null = null;
    if (rng() < scale.crateChance) {
        const rankIdx = ADVENTURER_RANKS.indexOf(rank);
        if (rankIdx >= 7) crate = "gold";       // SS+
        else if (rankIdx >= 4) crate = "silver"; // B-S
        else crate = "bronze";                    // F-A
    }

    return { gold, exp, gp, materials, crate };
}

function generateBoardQuests(date: string): GuildQuest[] {
    const seed = hashCode(`board_${date}`);
    const rng = mulberry32(seed);
    const quests: GuildQuest[] = [];

    for (let i = 0; i < DAILY_BOARD_QUESTS; i++) {
        const rank = BOARD_QUEST_RANKS[i];
        const template = pickFromArray(QUEST_TEMPLATES, rng);
        const targetRange = template.targetByRank[rank];
        const target = randomInRangeSeeded(targetRange.min, targetRange.max, rng);
        const rewards = generateRewards(template, rank, rng);

        quests.push({
            id: `board_${date}_${i}`,
            type: "board",
            action: template.action,
            target,
            rewards,
            rankRequirement: rank,
        });
    }

    return quests;
}

function generatePersonalQuests(userId: string, date: string, rank: AdventurerRank): GuildQuest[] {
    const seed = hashCode(`personal_${userId}_${date}`);
    const rng = mulberry32(seed);
    const quests: GuildQuest[] = [];

    for (let i = 0; i < DAILY_PERSONAL_QUESTS; i++) {
        const template = pickFromArray(QUEST_TEMPLATES, rng);
        const targetRange = template.targetByRank[rank];
        const target = randomInRangeSeeded(targetRange.min, targetRange.max, rng);
        const rewards = generateRewards(template, rank, rng);

        quests.push({
            id: `personal_${userId}_${date}_${i}`,
            type: "personal",
            action: template.action,
            target,
            rewards,
            rankRequirement: rank,
        });
    }

    return quests;
}

// --- Quest Accept / Progress / Claim ---

async function acceptQuest(userId: string, questId: string): Promise<boolean> {
    const member = await GuildService.requireMember(userId);
    if (member.activeQuests.length >= MAX_ACTIVE_QUESTS) return false;
    if (member.activeQuests.includes(questId)) return false;

    await GuildMemberModel.updateOne({ userId }, { $addToSet: { activeQuests: questId } });
    await redis.setJson(`guild_quest_progress:${userId}:${questId}`, 0, QUEST_PROGRESS_TTL);
    await redis.deleteKey(`guild_member:${userId}`);
    return true;
}

async function getProgress(userId: string, questId: string): Promise<number> {
    const val = await redis.getJson(`guild_quest_progress:${userId}:${questId}`);
    return (val as number) ?? 0;
}

async function trackProgress(userId: string, action: QuestAction, amount: number = 1): Promise<void> {
    const member = await GuildService.getMember(userId);
    if (!member || member.activeQuests.length === 0) return;

    const date = getUTCDateString();
    const boardQuests = generateBoardQuests(date);
    const personalQuests = generatePersonalQuests(userId, date, member.rank as AdventurerRank);
    const allQuests = [...boardQuests, ...personalQuests];

    for (const questId of member.activeQuests) {
        const quest = allQuests.find((q) => q.id === questId);
        if (!quest || quest.action !== action) continue;

        const key = `guild_quest_progress:${userId}:${questId}`;
        const current = ((await redis.getJson(key)) as number) ?? 0;
        await redis.setJson(key, current + amount, QUEST_PROGRESS_TTL);
    }
}

async function claimQuest(userId: string, questId: string): Promise<{
    rewards: GuildQuest["rewards"];
    rankUp: { rankedUp: boolean; oldRank: AdventurerRank; newRank: AdventurerRank };
    levelUp: { leveled: boolean; oldLevel: number; newLevel: number };
} | null> {
    const member = await GuildService.requireMember(userId);
    if (!member.activeQuests.includes(questId)) return null;

    const date = getUTCDateString();
    const boardQuests = generateBoardQuests(date);
    const personalQuests = generatePersonalQuests(userId, date, member.rank as AdventurerRank);
    const quest = [...boardQuests, ...personalQuests].find((q) => q.id === questId);
    if (!quest) return null;

    const progress = await getProgress(userId, questId);
    if (progress < quest.target) return null;

    // Award rewards
    await CharacterService.addGold(userId, quest.rewards.gold);
    const levelUp = await CharacterService.addExp(userId, quest.rewards.exp);

    if (quest.rewards.materials.length > 0) {
        await CharacterService.addMaterials(userId, quest.rewards.materials);
    }
    if (quest.rewards.crate) {
        await CharacterService.addCrate(userId, quest.rewards.crate);
    }

    // Add GP and check rank up
    const rankUp = await GuildService.addGP(userId, quest.rewards.gp);

    // Update member: remove quest, increment completed
    await GuildMemberModel.updateOne(
        { userId },
        { $pull: { activeQuests: questId }, $inc: { questsCompleted: 1 } }
    );
    await redis.deleteKey(`guild_member:${userId}`);
    await redis.deleteKey(`guild_quest_progress:${userId}:${questId}`);

    // Track meta-quest "complete_quests"
    await trackProgress(userId, "complete_quests", 1);

    return { rewards: quest.rewards, rankUp, levelUp };
}

function isQuestComplete(progress: number, target: number): boolean {
    return progress >= target;
}

const GuildQuestService = {
    generateBoardQuests,
    generatePersonalQuests,
    acceptQuest,
    getProgress,
    trackProgress,
    claimQuest,
    isQuestComplete,
    getUTCDateString,
};

export default GuildQuestService;
```

- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/services/rpg/guildQuest.service.ts
git commit -m "feat(guild): add GuildQuestService with quest generation, progress tracking, and claim"
```

---

## Task 5: i18n keys + `/guild` command

**Files:**
- Modify: `src/locales/*.json` (15 files)
- Create: `src/commands/slash/guild.ts`

- [ ] **Step 1: Add i18n keys to all 15 locale files**

Add ~40 keys. See spec for full key list. Key groups:
- `guild.register.*`, `guild.profile.*`, `guild.board.*`, `guild.quests.*`
- `guild.quest.action.*` (12 action descriptions)
- `guild.rank.*` (10 rank names)
- `guild.rankup`, `guild.require_member`, `guild.already_registered`
- `cmd.guild.*` (4 command descriptions)

The implementer should read the spec and provide appropriate English + native translations for all 15 locales.

- [ ] **Step 2: Create `/guild` command**

Create `src/commands/slash/guild.ts` with 4 subcommands: `register`, `profile`, `board`, `quests`.

Read the spec's "Command UX" section for exact embed layouts and button patterns:
- `register`: character gate + guild member gate + create + welcome embed
- `profile`: rank badge, GP progress, active quests with progress bars
- `board`: 3 daily quests with Accept buttons (disabled if rank too low or already accepted or at limit)
- `quests`: personal quests with Accept buttons + active quests with Claim buttons

Use `awaitMessageComponent` for button interactions (60s timeout).

Import `GuildService`, `GuildQuestService`, `CharacterService`, guild config types.

- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/locales/*.json src/commands/slash/guild.ts
git commit -m "feat(guild): add /guild command with register, profile, board, quests subcommands"
```

---

## Task 6: Quest tracking hooks (integration)

**Files:**
- Modify: `src/buttons/dungeonAttack.button.ts`
- Modify: `src/services/rpg/character.service.ts`
- Modify: `src/commands/slash/adventure.ts`
- Modify: `src/commands/slash/work.ts`
- Modify: `src/commands/slash/fish.ts`
- Modify: `src/events/messageCreate.ts`

All hooks are fire-and-forget: `GuildQuestService.trackProgress(userId, action, amount).catch(() => {})`.

- [ ] **Step 1: Read all files that need hooks**

- [ ] **Step 2: Add import to each file**

```typescript
import GuildQuestService from "../../services/rpg/guildQuest.service"; // or "../services/rpg/guildQuest.service" for events
```

- [ ] **Step 3: Add hooks**

**`dungeonAttack.button.ts`** — on monster win:
```typescript
GuildQuestService.trackProgress(userId, "kill_monsters", 1).catch(() => {});
```

On boss win (in the same handler where `isBoss` is checked):
```typescript
GuildQuestService.trackProgress(userId, "defeat_boss", 1).catch(() => {});
GuildService.incrementBossKills(userId).catch(() => {});
```

**`character.service.ts`** — in `addGold` function, after gold is added:
```typescript
GuildQuestService.trackProgress(userId, "earn_gold", amount).catch(() => {});
```

In `addMaterials` function, after materials added:
```typescript
const totalQty = materials.reduce((sum, m) => sum + m.qty, 0);
GuildQuestService.trackProgress(userId, "collect_materials", totalQty).catch(() => {});
```

**`adventure.ts`** — in `handleCraft` after successful craft:
```typescript
GuildQuestService.trackProgress(interaction.user.id, "craft_equipment", 1).catch(() => {});
```

In `handleCrate` and `handleShop` after opening:
```typescript
GuildQuestService.trackProgress(interaction.user.id, "open_crates", 1).catch(() => {});
```

**`work.ts`** — after work success (coin reward):
```typescript
GuildQuestService.trackProgress(userId, "use_work", 1).catch(() => {});
```

**`fish.ts`** — after fish success:
```typescript
GuildQuestService.trackProgress(userId, "use_fish", 1).catch(() => {});
```

**`messageCreate.ts`** — after XP grant (near existing RPG EXP conversion):
```typescript
GuildQuestService.trackProgress(message.author.id, "send_messages", 1).catch(() => {});
```

- [ ] **Step 4: Verify build + commit**

```bash
npm run build
git add src/buttons/dungeonAttack.button.ts src/services/rpg/character.service.ts src/commands/slash/adventure.ts src/commands/slash/work.ts src/commands/slash/fish.ts src/events/messageCreate.ts
git commit -m "feat(guild): add quest tracking hooks across dungeon, economy, and message events"
```

---

## Task 7: Integration testing

**Files:** None

- [ ] **Step 1: Verify clean build**

Run: `npm run build`

- [ ] **Step 2: Test registration flow**

1. `/guild register` without character → error
2. `/adventure create` → pick class
3. `/guild register` → success, rank F
4. `/guild register` again → "already registered"

- [ ] **Step 3: Test quest board**

1. `/guild board` → 3 quests shown, quest 1 (F) accessible, quest 2 (D) + 3 (B) locked
2. Accept quest 1 → success
3. `/guild quests` → shows active quest with progress 0/N

- [ ] **Step 4: Test quest progress**

1. Play dungeon → kill monsters → `/guild quests` → progress updates
2. Use `/work` → progress updates for use_work quest
3. Complete quest → Claim button appears → claim → rewards shown

- [ ] **Step 5: Test rank up**

1. Complete enough quests to accumulate 100+ GP
2. Reach level 5 + 1 boss kill
3. Claim quest → rank up notification F → E

- [ ] **Step 6: Commit fixes**

```bash
git add -A && git commit -m "fix(guild): address Phase 2A integration issues"
```
