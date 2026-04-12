# Dungeon Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dungeon` slash command with random encounters (monsters, treasure, traps, NPC stub), turn-based combat via buttons, and a floor/checkpoint system reusing the mine depth pattern.

**Architecture:** Create `dungeon.service.ts` for encounter rolling, combat math, reward/penalty calculation, and floor management. Create `dungeon.ts` slash command that handles cooldown, initiates encounters, and manages 30s combat timeout via `setTimeout`. Create 3 button handlers (`dungeonAttack`, `dungeonDefend`, `dungeonRun`) that read/write combat state from Redis. Add `dungeonDepth` and `dungeonCheckpoint` to `UserEconomy` model. Add `"dungeon"` transaction type.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose, ioredis, i18next

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/models/userEconomy.model.ts` | Modify | Add `dungeonDepth`, `dungeonCheckpoint` fields |
| `src/models/transaction.model.ts` | Modify | Add `"dungeon"` to TransactionType union + schema enum |
| `src/services/economy/dungeon.service.ts` | Create | Encounter roll, combat math, reward calc, floor/checkpoint |
| `src/commands/slash/dungeon.ts` | Create | Slash command — cooldown, encounter init, embeds, combat timeout |
| `src/buttons/dungeonAttack.button.ts` | Create | Attack button — full damage exchange |
| `src/buttons/dungeonDefend.button.ts` | Create | Defend button — 70%/50% damage exchange |
| `src/buttons/dungeonRun.button.ts` | Create | Run button — escape combat |
| `src/util/config/button.ts` | Modify | Add 3 dungeon button IDs |
| `src/util/help/commandCategories.ts` | Modify | Add `dungeon: "economy"` |
| `src/locales/*.json` (15 files) | Modify | Add `dungeon.*` and `cmd.dungeon.desc` keys |

---

### Task 1: Add dungeon fields to UserEconomy model

**Files:**
- Modify: `src/models/userEconomy.model.ts`

- [ ] **Step 1: Add fields to IUserEconomy interface**

In `src/models/userEconomy.model.ts`, add two fields after `mineCheckpoint: number;`:

```typescript
    dungeonDepth: number;
    dungeonCheckpoint: number;
```

- [ ] **Step 2: Add fields to schema**

In the same file, add to the schema definition object after the `mineCheckpoint` line:

```typescript
        dungeonDepth: { type: Number, default: 1 },
        dungeonCheckpoint: { type: Number, default: 1 },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/userEconomy.model.ts
git commit -m "feat(economy): add dungeonDepth and dungeonCheckpoint to UserEconomy model"
```

---

### Task 2: Add "dungeon" transaction type

**Files:**
- Modify: `src/models/transaction.model.ts`

- [ ] **Step 1: Add to TypeScript union**

In `src/models/transaction.model.ts`, add `| "dungeon"` after `| "mine";` in the `TransactionType` union (around line 30):

```typescript
    | "mine"
    | "dungeon";
```

- [ ] **Step 2: Add to schema enum array**

In the same file, add `"dungeon"` after `"mine"` in the schema `enum` array (around line 76):

```typescript
                "mine",
                "dungeon",
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(economy): add dungeon transaction type"
```

---

### Task 3: Add dungeon button IDs

**Files:**
- Modify: `src/util/config/button.ts`

- [ ] **Step 1: Add button IDs**

In `src/util/config/button.ts`, add before the closing `};`:

```typescript
    // Dungeon combat buttons
    DUNGEON_ATTACK: "dungeon_attack",
    DUNGEON_DEFEND: "dungeon_defend",
    DUNGEON_RUN: "dungeon_run",
```

- [ ] **Step 2: Commit**

```bash
git add src/util/config/button.ts
git commit -m "feat(economy): add dungeon button IDs"
```

---

### Task 4: Add dungeon to command categories

**Files:**
- Modify: `src/util/help/commandCategories.ts`

- [ ] **Step 1: Add dungeon entry**

In `src/util/help/commandCategories.ts`, add `dungeon: "economy",` after the `mine: "economy",` line:

```typescript
    mine: "economy",
    dungeon: "economy",
```

- [ ] **Step 2: Commit**

```bash
git add src/util/help/commandCategories.ts
git commit -m "feat(economy): add dungeon to help categories"
```

---

### Task 5: Create dungeon service

**Files:**
- Create: `src/services/economy/dungeon.service.ts`

- [ ] **Step 1: Create the service file**

Create `src/services/economy/dungeon.service.ts` with the following content:

```typescript
import UserEconomyModel from "../../models/userEconomy.model";
import CurrencyService from "./currency.service";
import WalletService from "../../services/economy/wallet.service";
import { tryStarDrop } from "../../util/economy/starDrop";

// --- Types ---

export type EncounterType = "monster" | "treasure" | "trap" | "npc";

export interface CombatState {
    monsterHp: number;
    userHp: number;
    floor: number;
    turnsLeft: number;
    guildId: string;
    locale: string;
    monsterName: string;
    monsterEmoji: string;
}

export interface CombatActionResult {
    userDmg: number;
    monsterDmg: number;
    userHp: number;
    monsterHp: number;
    turnsLeft: number;
    won: boolean;
    lost: boolean;
    fled: boolean;
    timedOut: boolean;
    turnsUp: boolean;
}

export interface EncounterResult {
    type: EncounterType;
    floor: number;
    checkpoint: number;
    // Monster encounter — combat state to store in Redis
    combatState?: CombatState;
    monsterName?: string;
    monsterEmoji?: string;
    // Treasure encounter
    coinReward?: number;
    gemReward?: number;
    starReward?: boolean;
    floorAdvanced?: boolean;
    checkpointReached?: boolean;
    // Trap encounter
    hpLost?: number;
    coinLost?: number;
    collapsed?: boolean;
    newFloor?: number;
    // NPC — flavor only
}

export interface CombatResolveResult {
    coinReward: number;
    gemReward: number;
    starReward: boolean;
    floorAdvanced: boolean;
    newFloor: number;
    checkpoint: number;
    checkpointReached: boolean;
}

export interface CombatLossResult {
    coinLost: number;
    newFloor: number;
    checkpoint: number;
}

// --- Monster names by floor tier ---

const MONSTERS_TIER_1 = [
    { name: "Rat", emoji: "🐀" },
    { name: "Bat", emoji: "🦇" },
    { name: "Slime", emoji: "🟢" },
    { name: "Goblin", emoji: "👺" },
    { name: "Spider", emoji: "🕷️" },
];

const MONSTERS_TIER_2 = [
    { name: "Skeleton", emoji: "💀" },
    { name: "Zombie", emoji: "🧟" },
    { name: "Wolf", emoji: "🐺" },
    { name: "Orc", emoji: "👹" },
    { name: "Ghost", emoji: "👻" },
];

const MONSTERS_TIER_3 = [
    { name: "Dragon", emoji: "🐉" },
    { name: "Demon", emoji: "😈" },
    { name: "Lich", emoji: "🧙" },
    { name: "Hydra", emoji: "🐍" },
    { name: "Titan", emoji: "⚡" },
];

// --- Helpers ---

function randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
    }
    return true;
}

function rollMonster(floor: number): { name: string; emoji: string } {
    const tier = floor <= 5 ? MONSTERS_TIER_1 : floor <= 10 ? MONSTERS_TIER_2 : MONSTERS_TIER_3;
    return tier[Math.floor(Math.random() * tier.length)]!;
}

function rollEncounterType(): EncounterType {
    const roll = Math.random();
    if (roll < 0.50) return "monster";
    if (roll < 0.75) return "treasure";
    if (roll < 0.90) return "trap";
    return "npc";
}

// --- Combat math (per spec) ---

function getMonsterHp(floor: number): number {
    return 30 + floor * 5;
}

function getUserAttack(floor: number): number {
    return randomInRange(15, 25) + floor * 2;
}

function getMonsterAttack(floor: number): number {
    return randomInRange(10, 20) + floor * 3;
}

// --- Core functions ---

async function rollEncounter(
    userId: string,
    guildId: string,
    locale: string
): Promise<EncounterResult> {
    const economy = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId, coin: 0, gem: 0, prayStreak: 0, dungeonDepth: 1, dungeonCheckpoint: 1 } },
        { upsert: true, new: true }
    );

    const floor = economy.dungeonDepth ?? 1;
    const checkpoint = economy.dungeonCheckpoint ?? 1;
    const type = rollEncounterType();

    if (type === "monster") {
        const monster = rollMonster(floor);
        const combatState: CombatState = {
            monsterHp: getMonsterHp(floor),
            userHp: 100,
            floor,
            turnsLeft: 3,
            guildId,
            locale,
            monsterName: monster.name,
            monsterEmoji: monster.emoji,
        };
        return { type, floor, checkpoint, combatState, monsterName: monster.name, monsterEmoji: monster.emoji };
    }

    if (type === "treasure") {
        const coinReward = randomInRange(30, 100) + floor * 8;
        const gemReward = Math.random() < 0.15 ? 1 : 0;
        const starReward = Math.random() < 0.03;

        const newFloor = floor + 1;
        const checkpointReached = isPrime(newFloor);
        const newCheckpoint = checkpointReached ? newFloor : checkpoint;

        await CurrencyService.addCoin(userId, guildId, coinReward, "dungeon", { encounter: "treasure", floor });
        if (gemReward > 0) {
            await CurrencyService.addGem(userId, guildId, gemReward, "dungeon", { encounter: "treasure", floor });
        }
        if (starReward) {
            await WalletService.addStar(userId, 1, "star_drop", { source: "dungeon_treasure" });
        }

        await UserEconomyModel.updateOne(
            { userId, guildId },
            { $set: { dungeonDepth: newFloor, dungeonCheckpoint: newCheckpoint } }
        );

        return {
            type,
            floor,
            checkpoint: newCheckpoint,
            coinReward,
            gemReward,
            starReward,
            floorAdvanced: true,
            checkpointReached,
            newFloor,
        };
    }

    if (type === "trap") {
        const hpLost = randomInRange(10, 20);
        const coinLost = Math.min(randomInRange(30, 60), economy.coin);
        // Trap always uses a "virtual" 100 HP run — if hpLost >= 100 impossible (max 20), so collapse only
        // happens if we track cumulative HP. Per spec, HP = 100 per run and trap checks HP ≤ 0.
        // Since first trap max loss is 20 HP, collapse only on repeated traps in same run.
        // For simplicity (each /dungeon is one encounter), trap never collapses from HP alone.
        // But the spec says "If HP ≤ 0 from trap: collapse to checkpoint" — since HP starts at 100
        // and max trap damage is 20, this can't happen in a single encounter. We handle it anyway.
        const remainingHp = 100 - hpLost;
        const collapsed = remainingHp <= 0;

        if (collapsed) {
            const additionalLoss = Math.min(randomInRange(100, 200), Math.max(0, economy.coin - coinLost));
            const totalCoinLost = coinLost + additionalLoss;
            await UserEconomyModel.updateOne(
                { userId, guildId },
                { $inc: { coin: -totalCoinLost }, $set: { dungeonDepth: checkpoint } }
            );
            return { type, floor, checkpoint, hpLost, coinLost: totalCoinLost, collapsed, newFloor: checkpoint };
        }

        if (coinLost > 0) {
            await UserEconomyModel.updateOne({ userId, guildId }, { $inc: { coin: -coinLost } });
        }
        // Stay on same floor
        return { type, floor, checkpoint, hpLost, coinLost, collapsed: false, newFloor: floor };
    }

    // NPC — flavor text only, stay on same floor
    return { type, floor, checkpoint };
}

function processCombatAction(
    state: CombatState,
    action: "attack" | "defend" | "run" | "timeout"
): CombatActionResult {
    if (action === "run") {
        return { userDmg: 0, monsterDmg: 0, userHp: state.userHp, monsterHp: state.monsterHp, turnsLeft: state.turnsLeft, won: false, lost: false, fled: true, timedOut: false, turnsUp: false };
    }

    if (action === "timeout") {
        return { userDmg: 0, monsterDmg: 0, userHp: state.userHp, monsterHp: state.monsterHp, turnsLeft: state.turnsLeft, won: false, lost: false, fled: false, timedOut: true, turnsUp: false };
    }

    const rawUserDmg = getUserAttack(state.floor);
    const rawMonsterDmg = getMonsterAttack(state.floor);

    let userDmg: number;
    let monsterDmg: number;

    if (action === "attack") {
        userDmg = rawUserDmg;
        monsterDmg = rawMonsterDmg;
    } else {
        // defend: 70% user damage, 50% monster damage
        userDmg = Math.floor(rawUserDmg * 0.7);
        monsterDmg = Math.floor(rawMonsterDmg * 0.5);
    }

    const newMonsterHp = Math.max(0, state.monsterHp - userDmg);
    const newUserHp = Math.max(0, state.userHp - monsterDmg);
    const newTurnsLeft = state.turnsLeft - 1;

    const won = newMonsterHp <= 0;
    const lost = newUserHp <= 0 && !won;
    const turnsUp = !won && !lost && newTurnsLeft <= 0;

    return { userDmg, monsterDmg, userHp: newUserHp, monsterHp: newMonsterHp, turnsLeft: newTurnsLeft, won, lost, fled: false, timedOut: false, turnsUp };
}

async function resolveCombatWin(
    userId: string,
    guildId: string,
    floor: number
): Promise<CombatResolveResult> {
    const economy = await UserEconomyModel.findOne({ userId, guildId });
    const checkpoint = economy?.dungeonCheckpoint ?? 1;

    const coinReward = randomInRange(50, 150) + floor * 10;
    const gemReward = Math.random() < 0.10 ? 1 : 0;
    const starReward = await tryStarDrop(userId, 0.03, "dungeon");

    const newFloor = floor + 1;
    const checkpointReached = isPrime(newFloor);
    const newCheckpoint = checkpointReached ? newFloor : checkpoint;

    await CurrencyService.addCoin(userId, guildId, coinReward, "dungeon", { encounter: "monster", floor, result: "win" });
    if (gemReward > 0) {
        await CurrencyService.addGem(userId, guildId, gemReward, "dungeon", { encounter: "monster", floor });
    }

    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $set: { dungeonDepth: newFloor, dungeonCheckpoint: newCheckpoint } }
    );

    return { coinReward, gemReward, starReward, floorAdvanced: true, newFloor, checkpoint: newCheckpoint, checkpointReached };
}

async function resolveCombatLoss(
    userId: string,
    guildId: string
): Promise<CombatLossResult> {
    const economy = await UserEconomyModel.findOne({ userId, guildId });
    const checkpoint = economy?.dungeonCheckpoint ?? 1;
    const currentCoin = economy?.coin ?? 0;

    const coinLost = Math.min(randomInRange(100, 200), currentCoin);

    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $inc: { coin: -coinLost }, $set: { dungeonDepth: checkpoint } }
    );

    return { coinLost, newFloor: checkpoint, checkpoint };
}

const DungeonService = {
    rollEncounter,
    processCombatAction,
    resolveCombatWin,
    resolveCombatLoss,
    isPrime,
};

export default DungeonService;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/dungeon.service.ts
git commit -m "feat(economy): add dungeon service with encounters, combat, and floor system"
```

---

### Task 6: Create dungeon button handlers

**Files:**
- Create: `src/buttons/dungeonAttack.button.ts`
- Create: `src/buttons/dungeonDefend.button.ts`
- Create: `src/buttons/dungeonRun.button.ts`

- [ ] **Step 1: Create attack button handler**

Create `src/buttons/dungeonAttack.button.ts`:

```typescript
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import DungeonService, { CombatState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import { t } from "../util/i18n/t";
import type { SupportedLocale } from "../util/i18n/index";

async function handleCombatAction(interaction: ButtonInteraction, action: "attack" | "defend"): Promise<void> {
    const userId = interaction.user.id;
    const stateKey = `dungeon_combat:${userId}`;
    const state = (await redis.getJson(stateKey)) as CombatState | null;

    if (!state) {
        await interaction.reply({ content: t("en", "dungeon.combat.timeout"), ephemeral: true });
        return;
    }

    if (interaction.user.id !== userId) {
        return;
    }

    await interaction.deferUpdate();

    const result = DungeonService.processCombatAction(state, action);
    const locale = state.locale as SupportedLocale;

    if (result.won) {
        await redis.deleteKey(stateKey);
        const resolve = await DungeonService.resolveCombatWin(userId, state.guildId, state.floor);

        const descLines = [
            action === "attack"
                ? t(locale, "dungeon.combat.attack", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) })
                : t(locale, "dungeon.combat.defend", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) }),
            "",
            t(locale, "dungeon.combat.win", { monster: state.monsterName }),
            t(locale, "dungeon.reward.coin", { amount: String(resolve.coinReward) }),
        ];
        if (resolve.gemReward > 0) descLines.push(t(locale, "dungeon.reward.gem", { amount: String(resolve.gemReward) }));
        descLines.push("", t(locale, "dungeon.floor", { floor: String(resolve.newFloor), checkpoint: String(resolve.checkpoint) }));
        if (resolve.checkpointReached) descLines.push("🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(resolve.newFloor) }));
        if (resolve.starReward) descLines.push("\n⭐ " + t(locale, "star_drop.found"));

        const embed = new EmbedBuilder()
            .setTitle(`⚔️ ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0x2ecc71);
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    if (result.lost) {
        await redis.deleteKey(stateKey);
        const loss = await DungeonService.resolveCombatLoss(userId, state.guildId);

        const descLines = [
            action === "attack"
                ? t(locale, "dungeon.combat.attack", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) })
                : t(locale, "dungeon.combat.defend", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) }),
            "",
            t(locale, "dungeon.combat.lose", { checkpoint: String(loss.checkpoint) }),
            t(locale, "dungeon.penalty", { amount: String(loss.coinLost) }),
        ];

        const embed = new EmbedBuilder()
            .setTitle(`💀 ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0xed4245);
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    if (result.turnsUp) {
        await redis.deleteKey(stateKey);

        const embed = new EmbedBuilder()
            .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
            .setDescription(
                [
                    action === "attack"
                        ? t(locale, "dungeon.combat.attack", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) })
                        : t(locale, "dungeon.combat.defend", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) }),
                    "",
                    t(locale, "dungeon.combat.turns_up"),
                ].join("\n")
            )
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    // Combat continues — update Redis state, refresh TTL
    const updatedState: CombatState = {
        ...state,
        monsterHp: result.monsterHp,
        userHp: result.userHp,
        turnsLeft: result.turnsLeft,
    };
    await redis.setJson(stateKey, updatedState, 60);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_ATTACK).setLabel(t(locale, "dungeon.btn.attack")).setEmoji("⚔️").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_DEFEND).setLabel(t(locale, "dungeon.btn.defend")).setEmoji("🛡️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_RUN).setLabel(t(locale, "dungeon.btn.run")).setEmoji("🏃").setStyle(ButtonStyle.Secondary),
    );

    const embed = new EmbedBuilder()
        .setTitle(`${state.monsterEmoji} ${t(locale, "dungeon.encounter.monster", { monster: state.monsterName, floor: String(state.floor) })}`)
        .setDescription(
            [
                action === "attack"
                    ? t(locale, "dungeon.combat.attack", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) })
                    : t(locale, "dungeon.combat.defend", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) }),
                "",
                t(locale, "dungeon.combat.hp", { userHp: String(result.userHp), monster: state.monsterName, monsterHp: String(result.monsterHp) }),
                t(locale, "dungeon.floor", { floor: String(state.floor), checkpoint: String((await redis.getJson(stateKey) as CombatState)?.floor ?? state.floor) }),
            ].join("\n")
        )
        .setColor(0xe67e22);
    await interaction.editReply({ embeds: [embed], components: [row] });
}

export default {
    id: BUTTON_ID.DUNGEON_ATTACK,
    async execute(interaction: ButtonInteraction) {
        await handleCombatAction(interaction, "attack");
    },
};

export { handleCombatAction };
```

- [ ] **Step 2: Create defend button handler**

Create `src/buttons/dungeonDefend.button.ts`:

```typescript
import { ButtonInteraction } from "discord.js";
import { BUTTON_ID } from "../util/config/button";
import { handleCombatAction } from "./dungeonAttack.button";

export default {
    id: BUTTON_ID.DUNGEON_DEFEND,
    async execute(interaction: ButtonInteraction) {
        await handleCombatAction(interaction, "defend");
    },
};
```

- [ ] **Step 3: Create run button handler**

Create `src/buttons/dungeonRun.button.ts`:

```typescript
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import redis from "../connector/redis";
import type { CombatState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import { t } from "../util/i18n/t";
import type { SupportedLocale } from "../util/i18n/index";

export default {
    id: BUTTON_ID.DUNGEON_RUN,
    async execute(interaction: ButtonInteraction) {
        const userId = interaction.user.id;
        const stateKey = `dungeon_combat:${userId}`;
        const state = (await redis.getJson(stateKey)) as CombatState | null;

        if (!state) {
            await interaction.reply({ content: t("en", "dungeon.combat.timeout"), ephemeral: true });
            return;
        }

        await interaction.deferUpdate();
        await redis.deleteKey(stateKey);

        const locale = state.locale as SupportedLocale;

        const embed = new EmbedBuilder()
            .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
            .setDescription(t(locale, "dungeon.combat.run"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [embed], components: [] });
    },
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/buttons/dungeonAttack.button.ts src/buttons/dungeonDefend.button.ts src/buttons/dungeonRun.button.ts
git commit -m "feat(economy): add dungeon combat button handlers"
```

---

### Task 7: Create dungeon slash command

**Files:**
- Create: `src/commands/slash/dungeon.ts`

- [ ] **Step 1: Create the command file**

Create `src/commands/slash/dungeon.ts`:

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import DungeonService from "../../services/economy/dungeon.service";
import WorkService from "../../services/economy/work.service";
import Reply from "../../util/decorator/reply";
import { BUTTON_ID } from "../../util/config/button";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const DUNGEON_COOLDOWN = 3600; // 1 hour

export default {
    data: new SlashCommandBuilder()
        .setName("dungeon")
        .setDescription("Explore the dungeon — fight monsters, find treasure")
        .setDescriptionLocalizations(descriptionLocales("cmd.dungeon.desc")),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;

        try {
            // Check cooldown
            const cdKey = `dungeon_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check for existing combat state (prevent concurrent runs)
            const combatKey = `dungeon_combat:${userId}`;
            const existingCombat = await redis.getJson(combatKey);
            if (existingCombat) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.cooldown", { time: "30s" }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Roll encounter
            const result = await DungeonService.rollEncounter(userId, guildId, locale);

            // Set cooldown
            await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);

            // --- Monster encounter: show combat UI ---
            if (result.type === "monster" && result.combatState) {
                await redis.setJson(combatKey, result.combatState, 60);

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_ATTACK).setLabel(t(locale, "dungeon.btn.attack")).setEmoji("⚔️").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_DEFEND).setLabel(t(locale, "dungeon.btn.defend")).setEmoji("🛡️").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_RUN).setLabel(t(locale, "dungeon.btn.run")).setEmoji("🏃").setStyle(ButtonStyle.Secondary),
                );

                const embed = new EmbedBuilder()
                    .setTitle(`${result.monsterEmoji} ${t(locale, "dungeon.encounter.monster", { monster: result.monsterName!, floor: String(result.floor) })}`)
                    .setDescription(
                        [
                            t(locale, "dungeon.combat.hp", {
                                userHp: String(result.combatState.userHp),
                                monster: result.monsterName!,
                                monsterHp: String(result.combatState.monsterHp),
                            }),
                            "",
                            t(locale, "dungeon.floor", { floor: String(result.floor), checkpoint: String(result.checkpoint) }),
                        ].join("\n")
                    )
                    .setColor(0xe67e22);

                await interaction.editReply({ embeds: [embed], components: [row] });

                // 30-second timeout: auto-run if no button click
                setTimeout(async () => {
                    try {
                        const state = await redis.getJson(combatKey);
                        if (state) {
                            await redis.deleteKey(combatKey);
                            const timeoutEmbed = new EmbedBuilder()
                                .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
                                .setDescription(t(locale, "dungeon.combat.timeout"))
                                .setColor(0x95a5a6);
                            await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                        }
                    } catch {
                        // Interaction may have expired — silently ignore
                    }
                }, 30_000);

                return;
            }

            // --- Treasure encounter ---
            if (result.type === "treasure") {
                const descLines = [
                    t(locale, "dungeon.encounter.treasure", { floor: String(result.floor) }),
                    t(locale, "dungeon.reward.coin", { amount: String(result.coinReward!) }),
                ];
                if (result.gemReward && result.gemReward > 0) {
                    descLines.push(t(locale, "dungeon.reward.gem", { amount: String(result.gemReward) }));
                }
                descLines.push("", t(locale, "dungeon.floor", { floor: String(result.newFloor!), checkpoint: String(result.checkpoint) }));
                if (result.checkpointReached) {
                    descLines.push("🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(result.newFloor!) }));
                }
                if (result.starReward) {
                    descLines.push("\n⭐ " + t(locale, "star_drop.found"));
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🎁 ${t(locale, "dungeon.title")}`)
                    .setDescription(descLines.join("\n"))
                    .setColor(0xf1c40f);
                return Reply.embedEdit(interaction, embed);
            }

            // --- Trap encounter ---
            if (result.type === "trap") {
                const descLines = [
                    t(locale, "dungeon.encounter.trap", { floor: String(result.floor) }),
                    t(locale, "dungeon.trap.damage", { hp: String(result.hpLost!), coin: String(result.coinLost!) }),
                ];

                if (result.collapsed) {
                    descLines.push("", t(locale, "dungeon.collapse", { checkpoint: String(result.checkpoint) }));
                }

                descLines.push("", t(locale, "dungeon.floor", { floor: String(result.newFloor!), checkpoint: String(result.checkpoint) }));

                const embed = new EmbedBuilder()
                    .setTitle(`🪤 ${t(locale, "dungeon.title")}`)
                    .setDescription(descLines.join("\n"))
                    .setColor(result.collapsed ? 0xed4245 : 0xe67e22);
                return Reply.embedEdit(interaction, embed);
            }

            // --- NPC encounter (Phase 2 stub) ---
            const embed = new EmbedBuilder()
                .setTitle(`🧙 ${t(locale, "dungeon.title")}`)
                .setDescription(
                    [
                        t(locale, "dungeon.encounter.npc"),
                        "",
                        t(locale, "dungeon.floor", { floor: String(result.floor), checkpoint: String(result.checkpoint) }),
                    ].join("\n")
                )
                .setColor(0x9b59b6);
            return Reply.embedEdit(interaction, embed);
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/dungeon.ts
git commit -m "feat(economy): add /dungeon slash command with encounters and combat"
```

---

### Task 8: Add i18n keys to all 15 locale files

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/id.json`
- Modify: `src/locales/es.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`
- Modify: `src/locales/ko.json`
- Modify: `src/locales/pt-BR.json`
- Modify: `src/locales/fr.json`
- Modify: `src/locales/de.json`
- Modify: `src/locales/ru.json`
- Modify: `src/locales/tr.json`
- Modify: `src/locales/it.json`
- Modify: `src/locales/pl.json`
- Modify: `src/locales/nl.json`

- [ ] **Step 1: Add English keys**

Add the following keys to `src/locales/en.json` (insert after the last `mine.*` key block, before the next section):

```json
    "cmd.dungeon.desc": "Explore the dungeon — fight monsters, find treasure",
    "dungeon.title": "Dungeon",
    "dungeon.cooldown": "You're recovering. Try again in {{time}}.",
    "dungeon.encounter.monster": "A **{{monster}}** appears on floor **{{floor}}**!",
    "dungeon.encounter.treasure": "You found a treasure chest on floor **{{floor}}**!",
    "dungeon.encounter.trap": "You triggered a trap on floor **{{floor}}**!",
    "dungeon.encounter.npc": "A mysterious merchant waves at you...",
    "dungeon.combat.hp": "Your HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "You dealt **{{userDmg}}** damage and took **{{monsterDmg}}** damage.",
    "dungeon.combat.defend": "You blocked and countered for **{{userDmg}}** damage, taking **{{monsterDmg}}** damage.",
    "dungeon.combat.win": "You defeated the **{{monster}}**!",
    "dungeon.combat.lose": "You were defeated! Fell back to floor **{{checkpoint}}**.",
    "dungeon.combat.run": "You escaped safely.",
    "dungeon.combat.timeout": "No response — you fled the dungeon.",
    "dungeon.combat.turns_up": "The monster is too tough — you escaped after 3 turns.",
    "dungeon.reward.coin": "+**{{amount}}** coin",
    "dungeon.reward.gem": "+**{{amount}}** gem",
    "dungeon.penalty": "Lost **{{amount}}** coin.",
    "dungeon.trap.damage": "Lost **{{hp}}** HP and **{{coin}}** coin.",
    "dungeon.floor": "Floor: **{{floor}}** | Checkpoint: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Checkpoint saved at floor **{{floor}}**!",
    "dungeon.collapse": "You collapsed! Fell back to floor **{{checkpoint}}**.",
    "dungeon.btn.attack": "Attack",
    "dungeon.btn.defend": "Defend",
    "dungeon.btn.run": "Run",
```

- [ ] **Step 2: Add Vietnamese keys**

Add to `src/locales/vi.json`:

```json
    "cmd.dungeon.desc": "Khám phá hầm ngục — chiến đấu quái vật, tìm kho báu",
    "dungeon.title": "Hầm Ngục",
    "dungeon.cooldown": "Bạn đang hồi phục. Thử lại sau {{time}}.",
    "dungeon.encounter.monster": "Một con **{{monster}}** xuất hiện ở tầng **{{floor}}**!",
    "dungeon.encounter.treasure": "Bạn tìm thấy rương kho báu ở tầng **{{floor}}**!",
    "dungeon.encounter.trap": "Bạn kích hoạt bẫy ở tầng **{{floor}}**!",
    "dungeon.encounter.npc": "Một thương nhân bí ẩn vẫy tay chào bạn...",
    "dungeon.combat.hp": "HP của bạn: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "Bạn gây **{{userDmg}}** sát thương và chịu **{{monsterDmg}}** sát thương.",
    "dungeon.combat.defend": "Bạn đỡ và phản công gây **{{userDmg}}** sát thương, chịu **{{monsterDmg}}** sát thương.",
    "dungeon.combat.win": "Bạn đã đánh bại **{{monster}}**!",
    "dungeon.combat.lose": "Bạn đã bị đánh bại! Trở về tầng **{{checkpoint}}**.",
    "dungeon.combat.run": "Bạn đã trốn thoát an toàn.",
    "dungeon.combat.timeout": "Không có phản hồi — bạn đã rời khỏi hầm ngục.",
    "dungeon.combat.turns_up": "Quái vật quá mạnh — bạn trốn thoát sau 3 lượt.",
    "dungeon.reward.coin": "+**{{amount}}** xu",
    "dungeon.reward.gem": "+**{{amount}}** ngọc",
    "dungeon.penalty": "Mất **{{amount}}** xu.",
    "dungeon.trap.damage": "Mất **{{hp}}** HP và **{{coin}}** xu.",
    "dungeon.floor": "Tầng: **{{floor}}** | Điểm lưu: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Đã lưu điểm ở tầng **{{floor}}**!",
    "dungeon.collapse": "Bạn gục ngã! Trở về tầng **{{checkpoint}}**.",
    "dungeon.btn.attack": "Tấn công",
    "dungeon.btn.defend": "Phòng thủ",
    "dungeon.btn.run": "Chạy",
```

- [ ] **Step 3: Add Indonesian keys**

Add to `src/locales/id.json`:

```json
    "cmd.dungeon.desc": "Jelajahi dungeon — lawan monster, temukan harta karun",
    "dungeon.title": "Dungeon",
    "dungeon.cooldown": "Kamu sedang pulih. Coba lagi dalam {{time}}.",
    "dungeon.encounter.monster": "Seekor **{{monster}}** muncul di lantai **{{floor}}**!",
    "dungeon.encounter.treasure": "Kamu menemukan peti harta di lantai **{{floor}}**!",
    "dungeon.encounter.trap": "Kamu memicu jebakan di lantai **{{floor}}**!",
    "dungeon.encounter.npc": "Seorang pedagang misterius melambaikan tangan padamu...",
    "dungeon.combat.hp": "HP kamu: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "Kamu memberikan **{{userDmg}}** damage dan menerima **{{monsterDmg}}** damage.",
    "dungeon.combat.defend": "Kamu menahan dan menyerang balik **{{userDmg}}** damage, menerima **{{monsterDmg}}** damage.",
    "dungeon.combat.win": "Kamu mengalahkan **{{monster}}**!",
    "dungeon.combat.lose": "Kamu kalah! Kembali ke lantai **{{checkpoint}}**.",
    "dungeon.combat.run": "Kamu berhasil kabur dengan selamat.",
    "dungeon.combat.timeout": "Tidak ada respons — kamu melarikan diri dari dungeon.",
    "dungeon.combat.turns_up": "Monster terlalu kuat — kamu kabur setelah 3 giliran.",
    "dungeon.reward.coin": "+**{{amount}}** koin",
    "dungeon.reward.gem": "+**{{amount}}** permata",
    "dungeon.penalty": "Kehilangan **{{amount}}** koin.",
    "dungeon.trap.damage": "Kehilangan **{{hp}}** HP dan **{{coin}}** koin.",
    "dungeon.floor": "Lantai: **{{floor}}** | Checkpoint: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Checkpoint tersimpan di lantai **{{floor}}**!",
    "dungeon.collapse": "Kamu pingsan! Kembali ke lantai **{{checkpoint}}**.",
    "dungeon.btn.attack": "Serang",
    "dungeon.btn.defend": "Bertahan",
    "dungeon.btn.run": "Lari",
```

- [ ] **Step 4: Add Spanish keys**

Add to `src/locales/es.json`:

```json
    "cmd.dungeon.desc": "Explora la mazmorra — lucha contra monstruos, encuentra tesoros",
    "dungeon.title": "Mazmorra",
    "dungeon.cooldown": "Te estás recuperando. Inténtalo de nuevo en {{time}}.",
    "dungeon.encounter.monster": "¡Un **{{monster}}** aparece en el piso **{{floor}}**!",
    "dungeon.encounter.treasure": "¡Encontraste un cofre del tesoro en el piso **{{floor}}**!",
    "dungeon.encounter.trap": "¡Activaste una trampa en el piso **{{floor}}**!",
    "dungeon.encounter.npc": "Un misterioso mercader te saluda...",
    "dungeon.combat.hp": "Tu HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "Infligiste **{{userDmg}}** de daño y recibiste **{{monsterDmg}}** de daño.",
    "dungeon.combat.defend": "Bloqueaste y contraatacaste con **{{userDmg}}** de daño, recibiendo **{{monsterDmg}}** de daño.",
    "dungeon.combat.win": "¡Derrotaste al **{{monster}}**!",
    "dungeon.combat.lose": "¡Fuiste derrotado! Regresaste al piso **{{checkpoint}}**.",
    "dungeon.combat.run": "Escapaste a salvo.",
    "dungeon.combat.timeout": "Sin respuesta — huiste de la mazmorra.",
    "dungeon.combat.turns_up": "El monstruo es demasiado fuerte — escapaste después de 3 turnos.",
    "dungeon.reward.coin": "+**{{amount}}** moneda",
    "dungeon.reward.gem": "+**{{amount}}** gema",
    "dungeon.penalty": "Perdiste **{{amount}}** moneda.",
    "dungeon.trap.damage": "Perdiste **{{hp}}** HP y **{{coin}}** moneda.",
    "dungeon.floor": "Piso: **{{floor}}** | Checkpoint: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "¡Checkpoint guardado en el piso **{{floor}}**!",
    "dungeon.collapse": "¡Colapsaste! Regresaste al piso **{{checkpoint}}**.",
    "dungeon.btn.attack": "Atacar",
    "dungeon.btn.defend": "Defender",
    "dungeon.btn.run": "Huir",
```

- [ ] **Step 5: Add Japanese keys**

Add to `src/locales/ja.json`:

```json
    "cmd.dungeon.desc": "ダンジョンを探検 — モンスターと戦い、宝を見つけよう",
    "dungeon.title": "ダンジョン",
    "dungeon.cooldown": "回復中です。{{time}}後にもう一度お試しください。",
    "dungeon.encounter.monster": "**{{monster}}**がフロア**{{floor}}**に現れた！",
    "dungeon.encounter.treasure": "フロア**{{floor}}**で宝箱を見つけた！",
    "dungeon.encounter.trap": "フロア**{{floor}}**で罠を踏んだ！",
    "dungeon.encounter.npc": "謎の商人が手を振っている...",
    "dungeon.combat.hp": "あなたのHP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "**{{userDmg}}**のダメージを与え、**{{monsterDmg}}**のダメージを受けた。",
    "dungeon.combat.defend": "防御して**{{userDmg}}**のダメージで反撃、**{{monsterDmg}}**のダメージを受けた。",
    "dungeon.combat.win": "**{{monster}}**を倒した！",
    "dungeon.combat.lose": "倒された！フロア**{{checkpoint}}**に戻された。",
    "dungeon.combat.run": "無事に逃げた。",
    "dungeon.combat.timeout": "応答なし — ダンジョンから逃走した。",
    "dungeon.combat.turns_up": "モンスターが強すぎる — 3ターン後に逃走した。",
    "dungeon.reward.coin": "+**{{amount}}** コイン",
    "dungeon.reward.gem": "+**{{amount}}** ジェム",
    "dungeon.penalty": "**{{amount}}** コインを失った。",
    "dungeon.trap.damage": "**{{hp}}** HPと**{{coin}}** コインを失った。",
    "dungeon.floor": "フロア: **{{floor}}** | チェックポイント: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "フロア**{{floor}}**でチェックポイント保存！",
    "dungeon.collapse": "倒れた！フロア**{{checkpoint}}**に戻された。",
    "dungeon.btn.attack": "攻撃",
    "dungeon.btn.defend": "防御",
    "dungeon.btn.run": "逃げる",
```

- [ ] **Step 6: Add Chinese keys**

Add to `src/locales/zh.json`:

```json
    "cmd.dungeon.desc": "探索地牢 — 对抗怪物，寻找宝藏",
    "dungeon.title": "地牢",
    "dungeon.cooldown": "你正在恢复中。请在{{time}}后再试。",
    "dungeon.encounter.monster": "一只**{{monster}}**出现在第**{{floor}}**层！",
    "dungeon.encounter.treasure": "你在第**{{floor}}**层发现了一个宝箱！",
    "dungeon.encounter.trap": "你在第**{{floor}}**层触发了陷阱！",
    "dungeon.encounter.npc": "一个神秘的商人向你招手...",
    "dungeon.combat.hp": "你的HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "你造成了**{{userDmg}}**点伤害，受到了**{{monsterDmg}}**点伤害。",
    "dungeon.combat.defend": "你格挡并反击造成**{{userDmg}}**点伤害，受到**{{monsterDmg}}**点伤害。",
    "dungeon.combat.win": "你击败了**{{monster}}**！",
    "dungeon.combat.lose": "你被击败了！退回到第**{{checkpoint}}**层。",
    "dungeon.combat.run": "你安全逃脱了。",
    "dungeon.combat.timeout": "没有回应 — 你逃离了地牢。",
    "dungeon.combat.turns_up": "怪物太强了 — 3回合后你逃脱了。",
    "dungeon.reward.coin": "+**{{amount}}** 金币",
    "dungeon.reward.gem": "+**{{amount}}** 宝石",
    "dungeon.penalty": "失去了**{{amount}}**金币。",
    "dungeon.trap.damage": "失去了**{{hp}}** HP和**{{coin}}**金币。",
    "dungeon.floor": "层数: **{{floor}}** | 检查点: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "在第**{{floor}}**层保存了检查点！",
    "dungeon.collapse": "你倒下了！退回到第**{{checkpoint}}**层。",
    "dungeon.btn.attack": "攻击",
    "dungeon.btn.defend": "防御",
    "dungeon.btn.run": "逃跑",
```

- [ ] **Step 7: Add Korean keys**

Add to `src/locales/ko.json`:

```json
    "cmd.dungeon.desc": "던전 탐험 — 몬스터와 싸우고, 보물을 찾자",
    "dungeon.title": "던전",
    "dungeon.cooldown": "회복 중입니다. {{time}} 후에 다시 시도하세요.",
    "dungeon.encounter.monster": "**{{monster}}**이(가) **{{floor}}**층에 나타났다!",
    "dungeon.encounter.treasure": "**{{floor}}**층에서 보물 상자를 발견했다!",
    "dungeon.encounter.trap": "**{{floor}}**층에서 함정을 밟았다!",
    "dungeon.encounter.npc": "신비로운 상인이 손을 흔들고 있다...",
    "dungeon.combat.hp": "내 HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "**{{userDmg}}** 피해를 입히고 **{{monsterDmg}}** 피해를 받았다.",
    "dungeon.combat.defend": "방어 후 **{{userDmg}}** 피해로 반격, **{{monsterDmg}}** 피해를 받았다.",
    "dungeon.combat.win": "**{{monster}}**을(를) 물리쳤다!",
    "dungeon.combat.lose": "패배했다! **{{checkpoint}}**층으로 돌아갔다.",
    "dungeon.combat.run": "무사히 도망쳤다.",
    "dungeon.combat.timeout": "응답 없음 — 던전에서 도망쳤다.",
    "dungeon.combat.turns_up": "몬스터가 너무 강하다 — 3턴 후 도망쳤다.",
    "dungeon.reward.coin": "+**{{amount}}** 코인",
    "dungeon.reward.gem": "+**{{amount}}** 젬",
    "dungeon.penalty": "**{{amount}}** 코인을 잃었다.",
    "dungeon.trap.damage": "**{{hp}}** HP와 **{{coin}}** 코인을 잃었다.",
    "dungeon.floor": "층수: **{{floor}}** | 체크포인트: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "**{{floor}}**층에서 체크포인트 저장!",
    "dungeon.collapse": "쓰러졌다! **{{checkpoint}}**층으로 돌아갔다.",
    "dungeon.btn.attack": "공격",
    "dungeon.btn.defend": "방어",
    "dungeon.btn.run": "도망",
```

- [ ] **Step 8: Add Portuguese (Brazil) keys**

Add to `src/locales/pt-BR.json`:

```json
    "cmd.dungeon.desc": "Explore a masmorra — lute contra monstros, encontre tesouros",
    "dungeon.title": "Masmorra",
    "dungeon.cooldown": "Você está se recuperando. Tente novamente em {{time}}.",
    "dungeon.encounter.monster": "Um **{{monster}}** apareceu no andar **{{floor}}**!",
    "dungeon.encounter.treasure": "Você encontrou um baú de tesouro no andar **{{floor}}**!",
    "dungeon.encounter.trap": "Você ativou uma armadilha no andar **{{floor}}**!",
    "dungeon.encounter.npc": "Um mercador misterioso acena para você...",
    "dungeon.combat.hp": "Seu HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "Você causou **{{userDmg}}** de dano e recebeu **{{monsterDmg}}** de dano.",
    "dungeon.combat.defend": "Você bloqueou e contra-atacou com **{{userDmg}}** de dano, recebendo **{{monsterDmg}}** de dano.",
    "dungeon.combat.win": "Você derrotou o **{{monster}}**!",
    "dungeon.combat.lose": "Você foi derrotado! Voltou para o andar **{{checkpoint}}**.",
    "dungeon.combat.run": "Você escapou em segurança.",
    "dungeon.combat.timeout": "Sem resposta — você fugiu da masmorra.",
    "dungeon.combat.turns_up": "O monstro é forte demais — você escapou após 3 turnos.",
    "dungeon.reward.coin": "+**{{amount}}** moeda",
    "dungeon.reward.gem": "+**{{amount}}** gema",
    "dungeon.penalty": "Perdeu **{{amount}}** moeda.",
    "dungeon.trap.damage": "Perdeu **{{hp}}** HP e **{{coin}}** moeda.",
    "dungeon.floor": "Andar: **{{floor}}** | Checkpoint: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Checkpoint salvo no andar **{{floor}}**!",
    "dungeon.collapse": "Você desmaiou! Voltou para o andar **{{checkpoint}}**.",
    "dungeon.btn.attack": "Atacar",
    "dungeon.btn.defend": "Defender",
    "dungeon.btn.run": "Fugir",
```

- [ ] **Step 9: Add French keys**

Add to `src/locales/fr.json`:

```json
    "cmd.dungeon.desc": "Explorez le donjon — combattez des monstres, trouvez des trésors",
    "dungeon.title": "Donjon",
    "dungeon.cooldown": "Vous récupérez. Réessayez dans {{time}}.",
    "dungeon.encounter.monster": "Un **{{monster}}** apparaît à l'étage **{{floor}}** !",
    "dungeon.encounter.treasure": "Vous avez trouvé un coffre au trésor à l'étage **{{floor}}** !",
    "dungeon.encounter.trap": "Vous avez déclenché un piège à l'étage **{{floor}}** !",
    "dungeon.encounter.npc": "Un mystérieux marchand vous fait signe...",
    "dungeon.combat.hp": "Vos PV : **{{userHp}}**/100 | {{monster}} PV : **{{monsterHp}}**",
    "dungeon.combat.attack": "Vous avez infligé **{{userDmg}}** dégâts et subi **{{monsterDmg}}** dégâts.",
    "dungeon.combat.defend": "Vous avez paré et contre-attaqué pour **{{userDmg}}** dégâts, subissant **{{monsterDmg}}** dégâts.",
    "dungeon.combat.win": "Vous avez vaincu le **{{monster}}** !",
    "dungeon.combat.lose": "Vous avez été vaincu ! Retour à l'étage **{{checkpoint}}**.",
    "dungeon.combat.run": "Vous vous êtes échappé sain et sauf.",
    "dungeon.combat.timeout": "Pas de réponse — vous avez fui le donjon.",
    "dungeon.combat.turns_up": "Le monstre est trop puissant — vous avez fui après 3 tours.",
    "dungeon.reward.coin": "+**{{amount}}** pièce",
    "dungeon.reward.gem": "+**{{amount}}** gemme",
    "dungeon.penalty": "Perdu **{{amount}}** pièce.",
    "dungeon.trap.damage": "Perdu **{{hp}}** PV et **{{coin}}** pièce.",
    "dungeon.floor": "Étage : **{{floor}}** | Checkpoint : **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Checkpoint sauvegardé à l'étage **{{floor}}** !",
    "dungeon.collapse": "Vous vous êtes effondré ! Retour à l'étage **{{checkpoint}}**.",
    "dungeon.btn.attack": "Attaquer",
    "dungeon.btn.defend": "Défendre",
    "dungeon.btn.run": "Fuir",
```

- [ ] **Step 10: Add German keys**

Add to `src/locales/de.json`:

```json
    "cmd.dungeon.desc": "Erkunde den Kerker — kämpfe gegen Monster, finde Schätze",
    "dungeon.title": "Kerker",
    "dungeon.cooldown": "Du erholst dich. Versuche es in {{time}} erneut.",
    "dungeon.encounter.monster": "Ein **{{monster}}** erscheint auf Etage **{{floor}}**!",
    "dungeon.encounter.treasure": "Du hast eine Schatztruhe auf Etage **{{floor}}** gefunden!",
    "dungeon.encounter.trap": "Du hast eine Falle auf Etage **{{floor}}** ausgelöst!",
    "dungeon.encounter.npc": "Ein mysteriöser Händler winkt dir zu...",
    "dungeon.combat.hp": "Deine HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "Du hast **{{userDmg}}** Schaden verursacht und **{{monsterDmg}}** Schaden erhalten.",
    "dungeon.combat.defend": "Du hast geblockt und mit **{{userDmg}}** Schaden gekontert, **{{monsterDmg}}** Schaden erhalten.",
    "dungeon.combat.win": "Du hast **{{monster}}** besiegt!",
    "dungeon.combat.lose": "Du wurdest besiegt! Zurück auf Etage **{{checkpoint}}**.",
    "dungeon.combat.run": "Du bist sicher entkommen.",
    "dungeon.combat.timeout": "Keine Antwort — du bist aus dem Kerker geflohen.",
    "dungeon.combat.turns_up": "Das Monster ist zu stark — du bist nach 3 Runden geflohen.",
    "dungeon.reward.coin": "+**{{amount}}** Münze",
    "dungeon.reward.gem": "+**{{amount}}** Edelstein",
    "dungeon.penalty": "**{{amount}}** Münze verloren.",
    "dungeon.trap.damage": "**{{hp}}** HP und **{{coin}}** Münze verloren.",
    "dungeon.floor": "Etage: **{{floor}}** | Checkpoint: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Checkpoint auf Etage **{{floor}}** gespeichert!",
    "dungeon.collapse": "Du bist zusammengebrochen! Zurück auf Etage **{{checkpoint}}**.",
    "dungeon.btn.attack": "Angreifen",
    "dungeon.btn.defend": "Verteidigen",
    "dungeon.btn.run": "Fliehen",
```

- [ ] **Step 11: Add Russian keys**

Add to `src/locales/ru.json`:

```json
    "cmd.dungeon.desc": "Исследуй подземелье — сражайся с монстрами, ищи сокровища",
    "dungeon.title": "Подземелье",
    "dungeon.cooldown": "Вы восстанавливаетесь. Попробуйте снова через {{time}}.",
    "dungeon.encounter.monster": "**{{monster}}** появился на этаже **{{floor}}**!",
    "dungeon.encounter.treasure": "Вы нашли сундук с сокровищами на этаже **{{floor}}**!",
    "dungeon.encounter.trap": "Вы активировали ловушку на этаже **{{floor}}**!",
    "dungeon.encounter.npc": "Таинственный торговец машет вам рукой...",
    "dungeon.combat.hp": "Ваше HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "Вы нанесли **{{userDmg}}** урона и получили **{{monsterDmg}}** урона.",
    "dungeon.combat.defend": "Вы заблокировали и контратаковали на **{{userDmg}}** урона, получив **{{monsterDmg}}** урона.",
    "dungeon.combat.win": "Вы победили **{{monster}}**!",
    "dungeon.combat.lose": "Вы проиграли! Возврат на этаж **{{checkpoint}}**.",
    "dungeon.combat.run": "Вы безопасно сбежали.",
    "dungeon.combat.timeout": "Нет ответа — вы сбежали из подземелья.",
    "dungeon.combat.turns_up": "Монстр слишком силён — вы сбежали после 3 ходов.",
    "dungeon.reward.coin": "+**{{amount}}** монет",
    "dungeon.reward.gem": "+**{{amount}}** самоцвет",
    "dungeon.penalty": "Потеряно **{{amount}}** монет.",
    "dungeon.trap.damage": "Потеряно **{{hp}}** HP и **{{coin}}** монет.",
    "dungeon.floor": "Этаж: **{{floor}}** | Контрольная точка: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Контрольная точка сохранена на этаже **{{floor}}**!",
    "dungeon.collapse": "Вы рухнули! Возврат на этаж **{{checkpoint}}**.",
    "dungeon.btn.attack": "Атака",
    "dungeon.btn.defend": "Защита",
    "dungeon.btn.run": "Бежать",
```

- [ ] **Step 12: Add Turkish keys**

Add to `src/locales/tr.json`:

```json
    "cmd.dungeon.desc": "Zindanı keşfet — canavarlarla savaş, hazine bul",
    "dungeon.title": "Zindan",
    "dungeon.cooldown": "İyileşiyorsun. {{time}} sonra tekrar dene.",
    "dungeon.encounter.monster": "Kat **{{floor}}**'de bir **{{monster}}** belirdi!",
    "dungeon.encounter.treasure": "Kat **{{floor}}**'de bir hazine sandığı buldun!",
    "dungeon.encounter.trap": "Kat **{{floor}}**'de bir tuzağı tetikledin!",
    "dungeon.encounter.npc": "Gizemli bir tüccar sana el sallıyor...",
    "dungeon.combat.hp": "Senin HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "**{{userDmg}}** hasar verdin ve **{{monsterDmg}}** hasar aldın.",
    "dungeon.combat.defend": "Savunup **{{userDmg}}** hasarla karşı saldırdın, **{{monsterDmg}}** hasar aldın.",
    "dungeon.combat.win": "**{{monster}}** yenildi!",
    "dungeon.combat.lose": "Yenildin! Kat **{{checkpoint}}**'e geri döndün.",
    "dungeon.combat.run": "Güvenle kaçtın.",
    "dungeon.combat.timeout": "Yanıt yok — zindandan kaçtın.",
    "dungeon.combat.turns_up": "Canavar çok güçlü — 3 tur sonra kaçtın.",
    "dungeon.reward.coin": "+**{{amount}}** altın",
    "dungeon.reward.gem": "+**{{amount}}** mücevher",
    "dungeon.penalty": "**{{amount}}** altın kaybettin.",
    "dungeon.trap.damage": "**{{hp}}** HP ve **{{coin}}** altın kaybettin.",
    "dungeon.floor": "Kat: **{{floor}}** | Kontrol noktası: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Kat **{{floor}}**'de kontrol noktası kaydedildi!",
    "dungeon.collapse": "Yığıldın! Kat **{{checkpoint}}**'e geri döndün.",
    "dungeon.btn.attack": "Saldır",
    "dungeon.btn.defend": "Savun",
    "dungeon.btn.run": "Kaç",
```

- [ ] **Step 13: Add Italian keys**

Add to `src/locales/it.json`:

```json
    "cmd.dungeon.desc": "Esplora il dungeon — combatti mostri, trova tesori",
    "dungeon.title": "Dungeon",
    "dungeon.cooldown": "Ti stai riprendendo. Riprova tra {{time}}.",
    "dungeon.encounter.monster": "Un **{{monster}}** appare al piano **{{floor}}**!",
    "dungeon.encounter.treasure": "Hai trovato uno scrigno del tesoro al piano **{{floor}}**!",
    "dungeon.encounter.trap": "Hai attivato una trappola al piano **{{floor}}**!",
    "dungeon.encounter.npc": "Un misterioso mercante ti saluta...",
    "dungeon.combat.hp": "I tuoi HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "Hai inflitto **{{userDmg}}** danni e subito **{{monsterDmg}}** danni.",
    "dungeon.combat.defend": "Hai parato e contrattaccato con **{{userDmg}}** danni, subendo **{{monsterDmg}}** danni.",
    "dungeon.combat.win": "Hai sconfitto **{{monster}}**!",
    "dungeon.combat.lose": "Sei stato sconfitto! Ritorno al piano **{{checkpoint}}**.",
    "dungeon.combat.run": "Sei fuggito in sicurezza.",
    "dungeon.combat.timeout": "Nessuna risposta — sei fuggito dal dungeon.",
    "dungeon.combat.turns_up": "Il mostro è troppo forte — sei fuggito dopo 3 turni.",
    "dungeon.reward.coin": "+**{{amount}}** moneta",
    "dungeon.reward.gem": "+**{{amount}}** gemma",
    "dungeon.penalty": "Perso **{{amount}}** moneta.",
    "dungeon.trap.damage": "Perso **{{hp}}** HP e **{{coin}}** moneta.",
    "dungeon.floor": "Piano: **{{floor}}** | Checkpoint: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Checkpoint salvato al piano **{{floor}}**!",
    "dungeon.collapse": "Sei crollato! Ritorno al piano **{{checkpoint}}**.",
    "dungeon.btn.attack": "Attacca",
    "dungeon.btn.defend": "Difendi",
    "dungeon.btn.run": "Fuggi",
```

- [ ] **Step 14: Add Polish keys**

Add to `src/locales/pl.json`:

```json
    "cmd.dungeon.desc": "Eksploruj loch — walcz z potworami, szukaj skarbów",
    "dungeon.title": "Loch",
    "dungeon.cooldown": "Regenerujesz się. Spróbuj ponownie za {{time}}.",
    "dungeon.encounter.monster": "**{{monster}}** pojawił się na piętrze **{{floor}}**!",
    "dungeon.encounter.treasure": "Znalazłeś skrzynię ze skarbem na piętrze **{{floor}}**!",
    "dungeon.encounter.trap": "Uruchomiłeś pułapkę na piętrze **{{floor}}**!",
    "dungeon.encounter.npc": "Tajemniczy kupiec macha do ciebie...",
    "dungeon.combat.hp": "Twoje HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "Zadałeś **{{userDmg}}** obrażeń i otrzymałeś **{{monsterDmg}}** obrażeń.",
    "dungeon.combat.defend": "Zablokowałeś i kontratakujesz za **{{userDmg}}** obrażeń, otrzymując **{{monsterDmg}}** obrażeń.",
    "dungeon.combat.win": "Pokonałeś **{{monster}}**!",
    "dungeon.combat.lose": "Zostałeś pokonany! Powrót na piętro **{{checkpoint}}**.",
    "dungeon.combat.run": "Uciekłeś bezpiecznie.",
    "dungeon.combat.timeout": "Brak odpowiedzi — uciekłeś z lochu.",
    "dungeon.combat.turns_up": "Potwór jest za silny — uciekłeś po 3 turach.",
    "dungeon.reward.coin": "+**{{amount}}** monet",
    "dungeon.reward.gem": "+**{{amount}}** klejnot",
    "dungeon.penalty": "Stracono **{{amount}}** monet.",
    "dungeon.trap.damage": "Stracono **{{hp}}** HP i **{{coin}}** monet.",
    "dungeon.floor": "Piętro: **{{floor}}** | Punkt kontrolny: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Punkt kontrolny zapisany na piętrze **{{floor}}**!",
    "dungeon.collapse": "Zemdlałeś! Powrót na piętro **{{checkpoint}}**.",
    "dungeon.btn.attack": "Atak",
    "dungeon.btn.defend": "Obrona",
    "dungeon.btn.run": "Ucieczka",
```

- [ ] **Step 15: Add Dutch keys**

Add to `src/locales/nl.json`:

```json
    "cmd.dungeon.desc": "Verken de kerker — vecht tegen monsters, vind schatten",
    "dungeon.title": "Kerker",
    "dungeon.cooldown": "Je herstelt. Probeer het opnieuw over {{time}}.",
    "dungeon.encounter.monster": "Een **{{monster}}** verschijnt op verdieping **{{floor}}**!",
    "dungeon.encounter.treasure": "Je vond een schatkist op verdieping **{{floor}}**!",
    "dungeon.encounter.trap": "Je activeerde een val op verdieping **{{floor}}**!",
    "dungeon.encounter.npc": "Een mysterieuze handelaar zwaait naar je...",
    "dungeon.combat.hp": "Jouw HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**",
    "dungeon.combat.attack": "Je deelde **{{userDmg}}** schade uit en ontving **{{monsterDmg}}** schade.",
    "dungeon.combat.defend": "Je blokkeerde en counterde met **{{userDmg}}** schade, ontving **{{monsterDmg}}** schade.",
    "dungeon.combat.win": "Je hebt **{{monster}}** verslagen!",
    "dungeon.combat.lose": "Je bent verslagen! Terug naar verdieping **{{checkpoint}}**.",
    "dungeon.combat.run": "Je bent veilig ontsnapt.",
    "dungeon.combat.timeout": "Geen reactie — je bent de kerker ontvlucht.",
    "dungeon.combat.turns_up": "Het monster is te sterk — je ontsnapte na 3 beurten.",
    "dungeon.reward.coin": "+**{{amount}}** munt",
    "dungeon.reward.gem": "+**{{amount}}** edelsteen",
    "dungeon.penalty": "**{{amount}}** munt verloren.",
    "dungeon.trap.damage": "**{{hp}}** HP en **{{coin}}** munt verloren.",
    "dungeon.floor": "Verdieping: **{{floor}}** | Checkpoint: **{{checkpoint}}**",
    "dungeon.checkpoint_reached": "Checkpoint opgeslagen op verdieping **{{floor}}**!",
    "dungeon.collapse": "Je bent ingestort! Terug naar verdieping **{{checkpoint}}**.",
    "dungeon.btn.attack": "Aanvallen",
    "dungeon.btn.defend": "Verdedigen",
    "dungeon.btn.run": "Vluchten",
```

- [ ] **Step 16: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 17: Commit**

```bash
git add src/locales/
git commit -m "feat(i18n): add dungeon command translations for all 15 locales"
```

---

### Task 9: Build and verify

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Successful compilation with no errors

- [ ] **Step 2: Verify all button IDs are unique**

Run: `npx tsc --noEmit && node -e "const b = require('./dist/util/config/button').BUTTON_ID; const vals = Object.values(b); const unique = new Set(vals); console.log(vals.length === unique.size ? 'OK' : 'DUPLICATE')"`
Expected: `OK`

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(economy): address dungeon build issues"
```
