# Codebase Review Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 57 issues found across 5 review domains (security, Discord interactions, economy, i18n, code quality), ordered Critical → Low.

**Architecture:** Fix-in-place — patch each file individually following existing patterns. No new abstractions except 4 shared utility files for deduplication. Each severity tier committed separately.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose 8, ioredis, i18next

---

## Task 1: C1 — Verify `handleConfig` switch (false positive)

**Files:**
- Review only: `src/commands/slash/economy.ts:107-378`

- [x] **Step 1: Verify no fall-through exists**

After careful code review: every `case` block in `handleConfig` ends with `return new EmbedBuilder()...` which spans multiple lines via method chaining. The `return` at line 123 (reward-view), line 164 (reward-toggle), line 179 (reward-set), etc. always executes, preventing fall-through. The review agent flagged this incorrectly — the `return` statements are present on every code path.

**No code change needed.** This is a confirmed false positive.

---

## Task 2: C2 — Fix pray/curse cooldown race condition

**Files:**
- Modify: `src/services/economy/pray.service.ts`

- [ ] **Step 1: Rewrite `pray()` with atomic cooldown claim**

Replace the read-then-check-then-write pattern with an atomic `findOneAndUpdate` that claims the cooldown slot:

```typescript
async function pray(userId: string, guildId: string, targetId?: string): Promise<PrayResult> {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Atomic cooldown claim — returns pre-update doc (null if already prayed today)
    const eco = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId, $or: [{ lastPray: null }, { lastPray: { $lt: startOfToday } }] },
        { $set: { lastPray: now }, $setOnInsert: { userId, guildId } },
        { upsert: true, new: false }
    );

    // If upsert created a new doc, eco is null but that's OK — it means first pray ever
    // If eco exists but lastPray >= startOfToday, the filter won't match and findOneAndUpdate returns null
    // We need to distinguish: "new user" vs "already prayed". Check if doc exists without the cooldown filter:
    if (eco === null) {
        // Could be new user (upsert) or cooldown active. Check by reading:
        const existing = await UserEconomyModel.findOne({ userId, guildId });
        if (existing && existing.lastPray && existing.lastPray >= startOfToday) {
            throw new Error("PRAY_COOLDOWN");
        }
        // else: new user, upsert worked — eco is null but we have defaults
    }

    // Use eco (pre-update) for streak calculation, or defaults for new user
    const prevStreak = eco?.prayStreak ?? 0;
    const prevStreakDate = eco?.lastStreakDate ?? null;

    const isTargeted = targetId !== undefined;

    // Calculate rewards
    const userCoin = isTargeted ? randomInRange(100, 200) : randomInRange(50, 150);
    const userReward: Reward = { coin: userCoin, gem: 0 };

    let targetReward: Reward | null = null;
    if (isTargeted) {
        targetReward = { coin: randomInRange(80, 150), gem: 0 };
        if (Math.random() < 0.05) {
            userReward.gem = 1;
        }
    }

    // Calculate streak
    let newStreak = 1;
    if (prevStreakDate && isConsecutiveUTCDay(prevStreakDate, now)) {
        newStreak = prevStreak + 1;
    }

    // Check milestone
    let milestoneHit: StreakInfo["milestoneHit"] = null;
    for (const milestone of STREAK_MILESTONES) {
        if (newStreak === milestone.days) {
            milestoneHit = { days: milestone.days, bonusCoin: milestone.bonusCoin, bonusGem: milestone.bonusGem };
            userReward.coin += milestone.bonusCoin;
            userReward.gem += milestone.bonusGem;
            break;
        }
    }

    // Check global wallet pray streak milestones
    const prayStreakMilestones = [7, 14, 30] as const;
    for (const threshold of prayStreakMilestones) {
        if (newStreak >= threshold) {
            await WalletService.checkAndAwardMilestone(userId, `pray_streak_${threshold}`);
        }
    }

    // Apply rewards
    await CurrencyService.addCoin(userId, guildId, userReward.coin, "pray", { targetId });
    if (userReward.gem > 0) {
        await CurrencyService.addGem(userId, guildId, userReward.gem, "pray", { targetId });
    }

    if (targetReward && targetId) {
        await CurrencyService.addCoin(targetId, guildId, targetReward.coin, "pray", { fromUserId: userId });
    }

    // Update streak (lastPray already set by the atomic op above)
    await UserEconomyModel.updateOne(
        { userId, guildId },
        { $set: { prayStreak: newStreak, lastStreakDate: now } }
    );

    return {
        userReward,
        targetReward,
        streakInfo: { streak: newStreak, milestoneHit },
        targetId,
    };
}
```

- [ ] **Step 2: Rewrite `curse()` with atomic cooldown claim**

Same pattern but simpler (no streak):

```typescript
async function curse(userId: string, guildId: string, targetId?: string): Promise<CurseResult> {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Atomic cooldown claim
    const eco = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId, $or: [{ lastCurse: null }, { lastCurse: { $lt: startOfToday } }] },
        { $set: { lastCurse: now }, $setOnInsert: { userId, guildId } },
        { upsert: true, new: false }
    );

    if (eco === null) {
        const existing = await UserEconomyModel.findOne({ userId, guildId });
        if (existing && existing.lastCurse && existing.lastCurse >= startOfToday) {
            throw new Error("CURSE_COOLDOWN");
        }
    }

    const isTargeted = targetId !== undefined;

    const userReward: Reward = {
        coin: isTargeted ? randomInRange(40, 100) : randomInRange(20, 80),
        gem: 0,
    };

    let targetReward: Reward | null = null;
    if (isTargeted) {
        targetReward = { coin: randomInRange(30, 70), gem: 0 };
    }

    await CurrencyService.addCoin(userId, guildId, userReward.coin, "curse", { targetId });

    if (targetReward && targetId) {
        await CurrencyService.addCoin(targetId, guildId, targetReward.coin, "curse", { fromUserId: userId });
    }

    return { userReward, targetReward, targetId };
}
```

- [ ] **Step 3: Remove dead helper functions**

Remove `checkCooldown()` and `isSameUTCDay()` from `pray.service.ts` — they are no longer called. Keep `isConsecutiveUTCDay()` and `randomInRange()` (used by pray).

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: Clean compilation, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/economy/pray.service.ts
git commit -m "fix(economy): atomic cooldown claim for pray/curse to prevent race condition"
```

---

## Task 3: C3 — Fix shop stock race condition

**Files:**
- Modify: `src/services/economy/shop.service.ts`

- [ ] **Step 1: Reorder buyItem to decrement stock first atomically**

Replace the entire `buyItem` function:

```typescript
async function buyItem(userId: string, guildId: string, itemId: string, guild: Guild): Promise<PurchaseResult> {
    const item = await ShopItemModel.findOne({ guildId, itemId, enabled: true });
    if (!item) {
        throw new Error("ITEM_NOT_FOUND");
    }

    // Step 1: Atomically decrement stock FIRST (if limited)
    let stockDecremented = false;
    if (item.stock !== null) {
        const updated = await ShopItemModel.findOneAndUpdate(
            { _id: item._id, stock: { $gte: 1 } },
            { $inc: { stock: -1 } },
            { new: true }
        );
        if (!updated) {
            throw new Error("OUT_OF_STOCK");
        }
        stockDecremented = true;
    }

    // Step 2: Deduct currency (rollback stock on failure)
    const coinCost = item.currencyType === "coin" ? item.price : 0;
    const gemCost = item.currencyType === "gem" ? item.price : 0;

    try {
        await CurrencyService.deduct(userId, guildId, coinCost, gemCost, "purchase", { itemId });
    } catch (error) {
        // Rollback stock if currency deduction failed
        if (stockDecremented) {
            await ShopItemModel.updateOne({ _id: item._id }, { $inc: { stock: 1 } });
        }
        throw error;
    }

    // Step 3: Apply effect (rollback currency + stock on failure)
    try {
        if (item.type === "role" && item.roleId) {
            const member = await guild.members.fetch(userId);
            if (member.roles.cache.has(item.roleId)) {
                // Rollback
                if (coinCost > 0)
                    await CurrencyService.addCoin(userId, guildId, coinCost, "purchase", { itemId, refund: true });
                if (gemCost > 0)
                    await CurrencyService.addGem(userId, guildId, gemCost, "purchase", { itemId, refund: true });
                if (stockDecremented) {
                    await ShopItemModel.updateOne({ _id: item._id }, { $inc: { stock: 1 } });
                }
                throw new Error("ALREADY_HAS_ROLE");
            }
            await member.roles.add(item.roleId);
        }
    } catch (error) {
        if (error instanceof Error && error.message === "ALREADY_HAS_ROLE") {
            throw error;
        }
        // Rollback on unexpected failure
        if (coinCost > 0)
            await CurrencyService.addCoin(userId, guildId, coinCost, "purchase", { itemId, refund: true });
        if (gemCost > 0)
            await CurrencyService.addGem(userId, guildId, gemCost, "purchase", { itemId, refund: true });
        if (stockDecremented) {
            await ShopItemModel.updateOne({ _id: item._id }, { $inc: { stock: 1 } });
        }
        throw new Error("EFFECT_FAILED");
    }

    return { item, coinSpent: coinCost, gemSpent: gemCost };
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/services/economy/shop.service.ts
git commit -m "fix(economy): atomic stock decrement in shop to prevent overselling"
```

---

## Task 4: C4 — Fix rob stale balance (InsufficientFundsError handling)

**Files:**
- Modify: `src/commands/slash/rob.ts:121-135`

- [ ] **Step 1: Add InsufficientFundsError import and wrap deduct in try/catch**

At the top of `rob.ts`, add the import:
```typescript
import { InsufficientFundsError } from "../../services/economy/currency.service";
```

Then in the success block (lines 121-135), wrap the target deduct:

```typescript
if (result.success) {
    if (result.amount > 0) {
        try {
            // Deduct from target
            await CurrencyService.deduct(target.id, guildId, result.amount, 0, "rob", {
                robberId,
                stealPct: result.percentage,
                stealAmount: result.amount,
            });
            // Add to robber
            await CurrencyService.addCoin(robberId, guildId, result.amount, "rob", {
                targetId: target.id,
                stealPct: result.percentage,
                stealAmount: result.amount,
            });
        } catch (error) {
            if (error instanceof InsufficientFundsError) {
                // Target balance changed since we checked — treat as failed rob
                await redis.setJson(cdKey, 1, ROB_COOLDOWN);
                const embed = new EmbedBuilder()
                    .setTitle(`🚔 ${t(locale, "rob.title.fail")}`)
                    .setDescription(t(locale, "rob.fail_escaped", { target: target.username }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            throw error;
        }
    }
```

Also add `rob.fail_escaped` to all 15 locale files (e.g., EN: `"{{target}} managed to escape!"`, VI: `"{{target}} đã trốn thoát!"`).

- [ ] **Step 2: Check if InsufficientFundsError is exported from currency.service.ts**

Read `src/services/economy/currency.service.ts` to confirm the class is exported. If not, add `export` to the class definition.

- [ ] **Step 3: Build to verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/rob.ts src/services/economy/currency.service.ts src/locales/*.json
git commit -m "fix(economy): handle InsufficientFundsError in rob to prevent stale balance exploit"
```

---

## Task 5: C5 — Fix mine collapse and dungeon negative balance

**Files:**
- Modify: `src/services/economy/mine.service.ts:124-127`
- Modify: `src/services/economy/dungeon.service.ts:246-252`
- Modify: `src/commands/slash/dungeon.ts:300-304`

- [ ] **Step 1: Fix mine collapse with pipeline `$max` clamping**

In `mine.service.ts`, replace lines 125-128:

```typescript
// Old:
await UserEconomyModel.updateOne(
    { userId, guildId },
    { $inc: { coin: -penalty }, $set: { mineDepth: currentCheckpoint } }
);

// New:
await UserEconomyModel.updateOne(
    { userId, guildId },
    [{ $set: { coin: { $max: [{ $subtract: ["$coin", penalty] }, 0] }, mineDepth: currentCheckpoint } }]
);
```

- [ ] **Step 2: Fix dungeon combat loss with pipeline `$max` clamping**

In `dungeon.service.ts` `resolveCombatLoss()`, replace lines 248-251:

```typescript
// Old:
await UserEconomyModel.updateOne(
    { userId, guildId },
    { $inc: { coin: -coinLost }, $set: { dungeonDepth: checkpoint } }
);

// New:
await UserEconomyModel.updateOne(
    { userId, guildId },
    [{ $set: { coin: { $max: [{ $subtract: ["$coin", coinLost] }, 0] }, dungeonDepth: checkpoint } }]
);
```

- [ ] **Step 3: Fix dungeon trap with pipeline `$max` clamping**

In `dungeon.ts`, find the trap coin loss `$inc` and replace with the same pipeline pattern. Read the exact lines first, then apply:

```typescript
// Old pattern:
{ $inc: { coin: -totalLoss } }

// New:
[{ $set: { coin: { $max: [{ $subtract: ["$coin", totalLoss] }, 0] } } }]
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/services/economy/mine.service.ts src/services/economy/dungeon.service.ts src/commands/slash/dungeon.ts
git commit -m "fix(economy): use pipeline $max clamping to prevent negative balances in mine/dungeon"
```

---

## Task 6: C6 — Fix moderation 3-second violation

**Files:**
- Modify: `src/commands/slash/moderation.ts`

- [ ] **Step 1: Add deferReply at top of execute**

In `moderation.ts`, after the guild check (line 233) and before the subcommand handling (line 235), add:

```typescript
await interaction.deferReply({ flags: MessageFlags.Ephemeral });
```

- [ ] **Step 2: Replace all `Reply.embed(interaction, embed)` with `Reply.embedEdit(interaction, embed)`**

Search for `Reply.embed(interaction` in the file and replace each with `Reply.embedEdit(interaction`. This includes the timeout success (line 295), untimeout success, ban success, kick success, and unban success lines.

- [ ] **Step 3: Replace `ephemeralError` calls to use editReply**

The `ephemeralError` helper function at the bottom of the file currently calls `interaction.reply({ flags: MessageFlags.Ephemeral })`. Since we now always defer, change it to use `interaction.editReply()`:

```typescript
async function ephemeralError(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale,
    key: string
): Promise<unknown> {
    return interaction.editReply({ content: t(locale, key) });
}
```

- [ ] **Step 4: Fix the catch block error handling**

The catch block at line 457-460 checks `interaction.replied || interaction.deferred` — since we always defer now, simplify to always use `editReply` or `followUp`:

```typescript
} catch (error: unknown) {
    const code =
        error && typeof error === "object" && "code" in error
            ? Number((error as { code: unknown }).code)
            : Number.NaN;
    if (code === 10026) {
        return interaction.editReply({ content: t(locale, "moderation.unban_not_banned") });
    }
    return interaction.editReply({ content: t(locale, "moderation.api_error") });
}
```

- [ ] **Step 5: Build to verify**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/moderation.ts
git commit -m "fix(discord): add deferReply to moderation command to prevent 3-second timeout"
```

---

## Task 7: C7 — Add try/catch to voice command

**Files:**
- Modify: `src/commands/slash/voice.ts`

- [ ] **Step 1: Wrap switch block in try/catch**

In `voice.ts`, wrap the entire switch block (lines 157-355) in a try/catch:

```typescript
        try {
            switch (subcommand) {
                // ... all existing cases unchanged ...
            }
        } catch (error) {
            console.error("Voice command error:", error);
            const errorMsg = t(locale, "common.error");
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMsg, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
            }
        }
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/voice.ts
git commit -m "fix(discord): add try/catch error handling to voice command"
```

---

## Task 8: C8 — Replace `require()` with dynamic `import()` in loaders

**Files:**
- Modify: `src/loaders/commands.ts`
- Modify: `src/loaders/events.ts`
- Modify: `src/loaders/buttons.ts`
- Modify: `src/loaders/selectMenus.ts`
- Modify: `src/client.ts`

- [ ] **Step 1: Update `commands.ts`**

```typescript
import { Client, Collection } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export async function loadCommands(client: Client): Promise<object[]> {
    client.commands = new Collection();
    const commandsJson: object[] = [];

    const commandsPath = path.join(__dirname, "../commands/slash/");
    const files = fs.readdirSync(commandsPath);

    for (const file of files) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath);

        if ("data" in command.default && "execute" in command.default) {
            client.commands.set(command.default.data.name, command.default);
            commandsJson.push(command.default.data.toJSON());
        } else {
            console.warn(`[WARNING] Command at ${filePath} is missing "data" or "execute".`);
        }
    }

    console.log(`Loaded ${client.commands.size} commands.`);
    return commandsJson;
}
```

- [ ] **Step 2: Update `events.ts`**

```typescript
import { Client } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export async function loadEvents(client: Client): Promise<void> {
    const eventsPath = path.join(__dirname, "../events");
    const files = fs.readdirSync(eventsPath);

    for (const file of files) {
        const filePath = path.join(eventsPath, file);
        const event = await import(filePath);

        if (event.default.once) {
            client.once(event.default.name, (...args: unknown[]) => event.default.execute(...args));
        } else {
            client.on(event.default.name, (...args: unknown[]) => event.default.execute(...args));
        }
    }

    console.log(`Loaded ${files.length} events.`);
}
```

- [ ] **Step 3: Update `buttons.ts`**

```typescript
import { Client, Collection } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export async function loadButtons(client: Client): Promise<void> {
    client.buttons = new Collection();

    const buttonsPath = path.join(__dirname, "../buttons");
    const files = fs.readdirSync(buttonsPath);

    for (const file of files) {
        const filePath = path.join(buttonsPath, file);
        const button = await import(filePath);

        if ("id" in button.default && "execute" in button.default) {
            client.buttons.set(button.default.id, button.default);
        } else {
            console.warn(`[WARNING] Button at ${filePath} is missing "id" or "execute".`);
        }
    }

    console.log(`Loaded ${client.buttons.size} buttons.`);
}
```

- [ ] **Step 4: Update `selectMenus.ts`**

```typescript
import { Client, Collection } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export async function loadSelectMenus(client: Client): Promise<void> {
    client.selectMenus = new Collection();

    const buttonsPath = path.join(__dirname, "../buttons");
    const files = fs.readdirSync(buttonsPath);

    for (const file of files) {
        const filePath = path.join(buttonsPath, file);
        const handler = await import(filePath);

        if ("id" in handler.default && "execute" in handler.default) {
            const id: string = handler.default.id;
            if (id.startsWith("voice_select_")) {
                client.selectMenus.set(id, handler.default);
            }
        }
    }

    console.log(`Loaded ${client.selectMenus.size} select menus.`);
}
```

- [ ] **Step 5: Update `client.ts` to use async IIFE**

Since `client.ts` is a module-level file that exports the client, we need to handle the async loaders. Convert to async initialization:

```typescript
/// <reference path="./types/common/discord.d.ts" />
import { Client, GatewayIntentBits } from "discord.js";

import { loadCommands } from "./loaders/commands";
import { loadEvents } from "./loaders/events";
import { loadButtons } from "./loaders/buttons";
import { loadSelectMenus } from "./loaders/selectMenus";
import { deployCommands } from "./loaders/deploy";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

export async function initializeClient(): Promise<void> {
    const commands = await loadCommands(client);
    await loadEvents(client);
    await loadButtons(client);
    await loadSelectMenus(client);

    deployCommands(commands).catch(console.error);
}

export default client;
```

Then in `src/bin/www.ts`, call `initializeClient()` before bot login:

```typescript
import { initializeClient } from "../client";
// ... in main():
await initializeClient();
```

- [ ] **Step 6: Build to verify**

Run: `npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/loaders/commands.ts src/loaders/events.ts src/loaders/buttons.ts src/loaders/selectMenus.ts src/client.ts src/bin/www.ts
git commit -m "refactor: replace require() with dynamic import() in all loaders"
```

---

## Task 9: C9 — Fix Redis `any` types

**Files:**
- Modify: `src/connector/redis/index.ts`

- [ ] **Step 1: Update `setJson` and `getJson` signatures**

In `redis/index.ts`, change:

```typescript
// Line 69: change
async setJson(key: string, value: any, time?: number): Promise<string | null> {
// to:
async setJson(key: string, value: unknown, time?: number): Promise<string | null> {

// Line 85: change
async getJson(key: string): Promise<any> {
// to:
async getJson<T = unknown>(key: string): Promise<T | null> {
```

- [ ] **Step 2: Build to verify — fix any type errors in callers**

Run: `npm run build`

Some callers may need to specify the generic type or add type assertions. Fix any compilation errors (e.g., `await redis.getJson<string[]>(key)` where arrays are expected).

- [ ] **Step 3: Commit**

```bash
git add src/connector/redis/index.ts
git commit -m "refactor: replace any with unknown/generics in RedisService setJson/getJson"
```

---

## Task 10: C10 — Add missing `cmd.*.desc` i18n keys

**Files:**
- Modify: All 15 files in `src/locales/`

- [ ] **Step 1: Add 5 missing keys to all 15 locale files**

Add these keys to each locale file. The keys are: `cmd.fish.desc`, `cmd.work.desc`, `cmd.gamble.desc`, `cmd.gift.desc`, `cmd.rob.desc`.

**en.json:**
```json
"cmd.fish.desc": "Go fishing for coins",
"cmd.work.desc": "Work to earn coins",
"cmd.gamble.desc": "Gamble your coins in mini-games",
"cmd.gift.desc": "Gift coins to another user",
"cmd.rob.desc": "Attempt to rob coins from another user"
```

**vi.json:**
```json
"cmd.fish.desc": "Đi câu cá để kiếm xu",
"cmd.work.desc": "Làm việc để kiếm xu",
"cmd.gamble.desc": "Đánh bạc xu trong các trò chơi nhỏ",
"cmd.gift.desc": "Tặng xu cho người dùng khác",
"cmd.rob.desc": "Cố gắng cướp xu từ người dùng khác"
```

**ja.json:**
```json
"cmd.fish.desc": "釣りをしてコインを獲得",
"cmd.work.desc": "働いてコインを稼ぐ",
"cmd.gamble.desc": "ミニゲームでコインを賭ける",
"cmd.gift.desc": "他のユーザーにコインを贈る",
"cmd.rob.desc": "他のユーザーからコインを奪う"
```

**zh.json:**
```json
"cmd.fish.desc": "钓鱼赚取金币",
"cmd.work.desc": "工作赚取金币",
"cmd.gamble.desc": "在小游戏中赌金币",
"cmd.gift.desc": "赠送金币给其他用户",
"cmd.rob.desc": "尝试抢劫其他用户的金币"
```

**ko.json:**
```json
"cmd.fish.desc": "낚시로 코인 획득",
"cmd.work.desc": "일해서 코인 벌기",
"cmd.gamble.desc": "미니게임으로 코인 도박",
"cmd.gift.desc": "다른 사용자에게 코인 선물",
"cmd.rob.desc": "다른 사용자의 코인을 강탈 시도"
```

**es.json:**
```json
"cmd.fish.desc": "Pesca para ganar monedas",
"cmd.work.desc": "Trabaja para ganar monedas",
"cmd.gamble.desc": "Apuesta tus monedas en minijuegos",
"cmd.gift.desc": "Regala monedas a otro usuario",
"cmd.rob.desc": "Intenta robar monedas de otro usuario"
```

**id.json:**
```json
"cmd.fish.desc": "Memancing untuk mendapatkan koin",
"cmd.work.desc": "Bekerja untuk mendapatkan koin",
"cmd.gamble.desc": "Bertaruh koin di mini-game",
"cmd.gift.desc": "Hadiahkan koin ke pengguna lain",
"cmd.rob.desc": "Coba merampok koin dari pengguna lain"
```

**pt-BR.json:**
```json
"cmd.fish.desc": "Pesque para ganhar moedas",
"cmd.work.desc": "Trabalhe para ganhar moedas",
"cmd.gamble.desc": "Aposte suas moedas em minijogos",
"cmd.gift.desc": "Presenteie moedas a outro usuário",
"cmd.rob.desc": "Tente roubar moedas de outro usuário"
```

**fr.json:**
```json
"cmd.fish.desc": "Pêchez pour gagner des pièces",
"cmd.work.desc": "Travaillez pour gagner des pièces",
"cmd.gamble.desc": "Pariez vos pièces dans des mini-jeux",
"cmd.gift.desc": "Offrez des pièces à un autre utilisateur",
"cmd.rob.desc": "Tentez de voler des pièces à un autre utilisateur"
```

**de.json:**
```json
"cmd.fish.desc": "Angeln, um Münzen zu verdienen",
"cmd.work.desc": "Arbeiten, um Münzen zu verdienen",
"cmd.gamble.desc": "Setze deine Münzen in Minispielen",
"cmd.gift.desc": "Schenke einem anderen Benutzer Münzen",
"cmd.rob.desc": "Versuche, einem anderen Benutzer Münzen zu stehlen"
```

**ru.json:**
```json
"cmd.fish.desc": "Рыбачить ради монет",
"cmd.work.desc": "Работать ради монет",
"cmd.gamble.desc": "Играть на монеты в мини-играх",
"cmd.gift.desc": "Подарить монеты другому пользователю",
"cmd.rob.desc": "Попытаться ограбить другого пользователя"
```

**tr.json:**
```json
"cmd.fish.desc": "Balık tutarak jeton kazan",
"cmd.work.desc": "Çalışarak jeton kazan",
"cmd.gamble.desc": "Mini oyunlarda jetonlarını bahse koy",
"cmd.gift.desc": "Başka bir kullanıcıya jeton hediye et",
"cmd.rob.desc": "Başka bir kullanıcıdan jeton çalmayı dene"
```

**it.json:**
```json
"cmd.fish.desc": "Pesca per guadagnare monete",
"cmd.work.desc": "Lavora per guadagnare monete",
"cmd.gamble.desc": "Scommetti le tue monete nei minigiochi",
"cmd.gift.desc": "Regala monete a un altro utente",
"cmd.rob.desc": "Tenta di rubare monete a un altro utente"
```

**pl.json:**
```json
"cmd.fish.desc": "Łów ryby, aby zdobyć monety",
"cmd.work.desc": "Pracuj, aby zarobić monety",
"cmd.gamble.desc": "Postaw monety w mini-grach",
"cmd.gift.desc": "Podaruj monety innemu użytkownikowi",
"cmd.rob.desc": "Spróbuj okraść innego użytkownika"
```

**nl.json:**
```json
"cmd.fish.desc": "Vis om munten te verdienen",
"cmd.work.desc": "Werk om munten te verdienen",
"cmd.gamble.desc": "Gok met je munten in minispellen",
"cmd.gift.desc": "Geef munten cadeau aan een andere gebruiker",
"cmd.rob.desc": "Probeer munten te stelen van een andere gebruiker"
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/locales/*.json
git commit -m "fix(i18n): add missing cmd.fish/work/gamble/gift/rob.desc keys to all 15 locales"
```

---

## Task 11: H1-H15 — High severity fixes

> **Note:** This task bundles all 15 High fixes. Each step is one fix. The worker should read the target file before making changes and verify the exact line numbers match.

**Files:**
- Modify: `src/services/economy/dungeon.service.ts` (H1)
- Modify: `src/commands/slash/dungeon.ts` (H1)
- Modify: `src/services/economy/currency.service.ts` (H2)
- Modify: `src/services/economy/wallet.service.ts` (H3)
- Modify: `src/commands/slash/economy.ts` (H4, H12)
- Modify: `src/models/guild.model.ts` (H5, H6)
- Modify: `src/models/user.model.ts` (H6)
- Modify: `src/commands/slash/avatar.ts` (H7)
- Modify: `src/util/manga/handler.ts` (H8)
- Modify: `src/util/manga/reader.ts` (H9)
- Modify: `src/commands/slash/wallet.ts` (H10)
- Modify: `src/commands/slash/gamble.ts` (H12)
- Modify: `src/commands/slash/voice.ts` (H14)
- Modify: `src/loaders/selectMenus.ts` (H15)
- Modify: `src/client.ts` (H15)
- Modify: All 15 locale files (H7, H11, H12, H13)

- [ ] **Step 1 (H1): Dungeon trap/combat `$max` clamping**

Same pattern as Task 5. In `dungeon.service.ts` `resolveCombatLoss()` and in `dungeon.ts` trap handler, replace `{ $inc: { coin: -X } }` with `[{ $set: { coin: { $max: [{ $subtract: ["$coin", X] }, 0] } } }]`.

- [ ] **Step 2 (H2): Fix setCoin/setGem delta logging**

In `currency.service.ts`, change `setCoin` and `setGem` to use `{ new: false }` in `findOneAndUpdate` to get the previous value:

```typescript
async function setCoin(userId: string, guildId: string, amount: number): Promise<IUserEconomy> {
    const prev = await UserEconomyModel.findOneAndUpdate(
        { userId, guildId },
        { $set: { coin: amount }, $setOnInsert: { userId, guildId } },
        { upsert: true, new: false }
    );
    const delta = amount - (prev?.coin ?? 0);
    await logTransaction(userId, guildId, "admin", delta, 0, { action: "set-coin" });
    const updated = await UserEconomyModel.findOne({ userId, guildId });
    return updated!;
}
```

Same for `setGem`.

- [ ] **Step 3 (H3): Fix daily claim to log totalReward**

In `wallet.service.ts`, replace the two `logTransaction` calls (lines 213-216) with one:

```typescript
await logTransaction(userId, "global_daily", totalReward, {
    streak: newStreak,
    base: baseReward,
    streakBonus,
    premiumBonus,
});
```

Remove the separate `if (streakBonus > 0)` log.

- [ ] **Step 4 (H4): Add setMinValue(0) to set-coin/set-gem options**

In `economy.ts`, find the `set-coin` and `set-gem` integer option builders and add `.setMinValue(0)`.

- [ ] **Step 5 (H5): Add unique index to guild model**

In `guild.model.ts`, after the schema definition (before the `post("save")` hook), add:
```typescript
guildSchema.index({ guildID: 1 }, { unique: true });
```
Change `guildID` field from `default: null` to `required: true`.

- [ ] **Step 6 (H6): Fix `any` types in guild/user model hooks**

In `guild.model.ts` and `user.model.ts`, replace `any` with proper types:
```typescript
import type { CallbackError } from "mongoose";

// post save hook:
guildSchema.post("save", (error: CallbackError, doc: IGuild, next: (err?: CallbackError) => void) => {

// toJSON/toObject transform:
guildSchema.set("toJSON", {
    transform: (_doc: Record<string, unknown>, ret: Record<string, unknown>) => {
        delete ret.__v;
    },
});
```

- [ ] **Step 7 (H7): Fix avatar null URL crash**

In `avatar.ts`, add `resolveLocale` import and null check:
```typescript
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

async execute(interaction: ChatInputCommandInteraction) {
    const locale = await resolveLocale(interaction);
    const user = interaction.options.getUser("target") ?? interaction.user;
    const url = user.avatarURL({ extension: "png", size: 2048, forceStatic: true });

    if (!url) {
        const embed = new EmbedBuilder().setColor("Random").setDescription(t(locale, "avatar.no_avatar")).setTimestamp();
        return Reply.embed(interaction, embed);
    }

    const embed = new EmbedBuilder().setColor("Random").setImage(url).setTimestamp();
    return Reply.embed(interaction, embed);
},
```

Add `avatar.no_avatar` key to all 15 locale files (EN: `"This user has no avatar."`, etc.).

- [ ] **Step 8 (H8): Move deferReply after star charge gate in manga handler**

In `handler.ts`, the `deferReply()` at line 178 should move to right after the star charge try/catch (after line 172):

```typescript
// After star charge gate (line 172):
await interaction.deferReply();

const tierConfig = await PremiumService.getConfig(interaction.user.id);
```

Remove the `deferReply()` that's currently at line 178.

- [ ] **Step 9 (H9): Add deferUpdate to manga reader**

In `reader.ts`, add `deferUpdate` and try/catch:

```typescript
export async function mangaRead(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();

    try {
        const channel = interaction.channel as TextChannel;
        const title = interaction.message.embeds[0]?.title ?? "Thread";

        const thread = await channel.threads.create({
            name: title.length < 99 ? title : title.substring(0, 50),
            startMessage: interaction.message,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
            reason: FOOTER.text,
        });

        if (thread.joinable) await thread.join();
        await thread.members.add(interaction.user.id);

        await interaction.editReply({ components: [] });

        // ... rest of function unchanged ...
    } catch (error) {
        console.error("mangaRead error:", error);
    }
}
```

- [ ] **Step 10 (H10): Guard wallet guildId assertions**

In `wallet.ts`, replace all `interaction.guildId!` in `QuestService.trackProgress` calls with:

```typescript
if (interaction.guildId) {
    await QuestService.trackProgress(userId, interaction.guildId, "wallet_view").catch(() => {});
}
```

- [ ] **Step 11 (H11): Translate English placeholders in non-EN locales**

Add native translations for these 11 keys in all 13 non-EN locale files (except vi.json which already has them):
- `help.category.general`, `help.category.xp`, `help.category.economy`, `help.category.voice`, `help.category.moderation`, `help.category.manga`, `help.category.other`, `help.category_truncated`
- `info.guilds`, `info.users`, `info.uptime`

- [ ] **Step 12 (H12): Add localization to /economy config and /gamble descriptions**

Add `cmd.economy.config.*` and `cmd.gamble.*` description keys to all 15 locale files. Add `.setDescriptionLocalizations()` calls in the command builders.

- [ ] **Step 13 (H13): Rename `{{count}}` to `{{total}}` in all locales**

For all 15 keys using `{{count}}`, rename to `{{total}}` in all 15 locale files. Update the corresponding `t()` calls in: `balance.ts`, `shop.ts`, `wallet.ts`, `moderation.ts`, `economy.ts`, `global-shop.ts`.

- [ ] **Step 14 (H14): Defer reply for voice name subcommand**

In `voice.ts`, for the `"name"` case, add `await interaction.deferReply({ flags: MessageFlags.Ephemeral })` before `voiceChannel.setName()`, then change `interaction.reply()` to `interaction.editReply()`.

- [ ] **Step 15 (H15): Fix selectMenus double-loading**

Refactor `selectMenus.ts` to accept loaded button handlers. Update `client.ts`.

- [ ] **Step 16: Build to verify**

Run: `npm run build`

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "fix: high severity fixes — guards, logging, indexes, error handling, i18n gaps"
```

---

## Task 12: M1-M18 — Medium severity fixes

> **Note:** Each step is one fix. Read target files before editing.

**Files:**
- Modify: `src/services/economy/currency.service.ts` (M1)
- Modify: `src/services/economy/globalShop.service.ts` (M2)
- Modify: `src/models/userEconomy.model.ts` (M3)
- Modify: `src/util/manga/handler.ts` (M4)
- Modify: `src/connector/redis/index.ts` (M4, M17)
- Modify: `src/services/economy/economyBulk.service.ts` (M5)
- Modify: `src/commands/slash/trans.ts` (M6)
- Modify: `src/connector/mongo/index.ts` (M7)
- Modify: `src/services/economy/economyAdmin.service.ts` (M8, M16)
- Modify: `src/commands/slash/economy.ts` (M9)
- Create: `src/util/math/random.ts` (M10)
- Create: `src/util/date/utc.ts` (M10)
- Create: `src/util/math/prime.ts` (M10)
- Create: `src/util/date/format.ts` (M10)
- Modify: 6 service files to use shared utilities (M10)
- Modify: `src/events/interactionCreate.ts` (M11)
- Modify: `src/events/interactionCreateButton.ts` (M11)
- Modify: `src/events/interactionCreateSelectMenu.ts` (M11)
- Modify: `src/commands/slash/settings.ts` (M12)
- Modify: `src/commands/slash/confession.ts` (M13)
- Modify: `src/models/guildGamblingConfig.model.ts` (M14)
- Modify: `src/models/guildWorkConfig.model.ts` (M14)
- Modify: `src/bin/www.ts` (M18)
- Modify: Locale files for M6

- [ ] **Step 1 (M1): Add rollback to exchange()**

In `currency.service.ts` `exchange()`:
```typescript
async function exchange(userId: string, guildId: string, gemAmount: number, ratePerGem: number): Promise<IUserEconomy> {
    const coinCost = gemAmount * ratePerGem;
    await deduct(userId, guildId, coinCost, 0, "exchange", { gemAmount, ratePerGem });
    try {
        return await addGem(userId, guildId, gemAmount, "exchange", { coinCost, ratePerGem });
    } catch (error) {
        await addCoin(userId, guildId, coinCost, "exchange_refund", { gemAmount, ratePerGem });
        throw error;
    }
}
```

- [ ] **Step 2 (M2): Clean up idempotency keys on stock exhaustion**

In `globalShop.service.ts`, before the `throw new Error("OUT_OF_STOCK")` after failed stock decrement, add:
```typescript
await redis.deleteKey(idemKey);
await redis.deleteKey(cdKey);
```

- [ ] **Step 3 (M3): Add min: 0 to coin/gem schema**

In `userEconomy.model.ts`:
```typescript
coin: { type: Number, default: 0, min: 0 },
gem: { type: Number, default: 0, min: 0 },
```

- [ ] **Step 4 (M4): Add incrKey to RedisService and use in manga handler**

In `redis/index.ts`, add after `getKey`:
```typescript
async incrKey(key: string, ttl?: number): Promise<number> {
    if (this.connected) {
        try {
            const val = await this.client.incr(key);
            if (ttl && val === 1) {
                await this.client.expire(key, ttl);
            }
            return val;
        } catch {
            // fall through to in-memory
        }
    }

    const current = (this.fallback.get<number>(key) ?? 0) + 1;
    this.fallback.set(key, current, ttl ?? this.ttl);
    return current;
}
```

Then in `handler.ts` `applyStarCharge`, replace the read-then-increment with:
```typescript
const count = await redis.incrKey(counterKey, secondsUntilUTCMidnight());
if (count > freeUses) { /* deduct star */ }
```

- [ ] **Step 5 (M5): Add comment to bulk tax**

In `economyBulk.service.ts`, add comment above the pre-balance read:
```typescript
// NOTE: Pre-balances are read before the bulk update. Under concurrency, transaction log
// deltas may be approximate. The actual balance update uses $max clamping for safety.
```

- [ ] **Step 6 (M6): Fix trans.ts error leak**

In `trans.ts`, add `resolveLocale` and replace error display:
```typescript
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
// In catch block:
const locale = await resolveLocale(interaction).catch(() => "en" as const);
embed.setDescription(t(locale, "trans.error"));
```
Add `trans.error` to all 15 locale files (EN: `"Translation failed. Please try again later."`).

- [ ] **Step 7 (M7): Mask MongoDB connection string**

In `mongo/index.ts`, replace the log line:
```typescript
const masked = DB_URL.replace(/:\/\/[^@]+@/, "://*****@");
logger.info(`MongoDB connected: ${masked}`);
```

- [ ] **Step 8 (M8): Add length limit to reverseTransaction shortId**

In `economyAdmin.service.ts`, add after the hex validation:
```typescript
if (shortId.length > 24) throw new Error("INVALID_ID");
```

- [ ] **Step 9 (M9): Add WARNING comment to bulk fetch**

In `economy.ts` near the `guild.members.fetch()` call:
```typescript
// WARNING: This fetches ALL cached members. If GuildMembers privileged intent
// is ever enabled, this could cause OOM on large guilds. Add chunking if needed.
```

- [ ] **Step 10 (M10): Extract shared utility functions**

Create 4 new files:

**`src/util/math/random.ts`:**
```typescript
export function randomInRange(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}
```

**`src/util/math/prime.ts`:**
```typescript
export function isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}
```

**`src/util/date/utc.ts`:**
```typescript
export function isSameUTCDay(d1: Date, d2: Date): boolean {
    return (
        d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate()
    );
}

export function isConsecutiveUTCDay(prev: Date, now: Date): boolean {
    const prevDay = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate()));
    const nowDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const diffMs = nowDay.getTime() - prevDay.getTime();
    return diffMs === 24 * 60 * 60 * 1000;
}

export function secondsUntilUTCMidnight(): number {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
}
```

**`src/util/date/format.ts`:**
```typescript
export function formatCooldown(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(" ");
}
```

Then update imports in: `pray.service.ts`, `wallet.service.ts`, `work.service.ts`, `social.service.ts`, `mine.service.ts`, `dungeon.service.ts`, `merchant.service.ts`, `quest.service.ts`, `confession.service.ts`, `handler.ts`. Remove the local duplicate functions from each.

- [ ] **Step 11 (M11): Localize global error handlers**

In `interactionCreate.ts`, `interactionCreateButton.ts`, `interactionCreateSelectMenu.ts`, add locale resolution to error handlers:
```typescript
const locale = await resolveLocale(interaction).catch(() => "en" as const);
const errorMsg = t(locale, "common.error");
```

- [ ] **Step 12 (M12): Add deferReply to settings notification view**

In `settings.ts`, for the notification `view` subcommand, add `await interaction.deferReply({ flags: MessageFlags.Ephemeral })` before the `Promise.all` queries.

- [ ] **Step 13 (M13): Add try/catch to confession refundAll**

In `confession.ts`, wrap refund operations in try/catch that logs errors but doesn't re-throw.

- [ ] **Step 14 (M14): Add field validation to config models**

In `guildGamblingConfig.model.ts`, add `min`/`max` validators to `robSuccessRate` (min: 0, max: 1), `minBet` (min: 0), `maxBet` (min: 0).
In `guildWorkConfig.model.ts`, similar bounds for reward fields.

- [ ] **Step 15 (M16): Extract helpers from resetEconomy**

In `economyAdmin.service.ts`, extract `buildSnapshotData()` and `pruneOldSnapshots()` from `resetEconomy()`.

- [ ] **Step 16 (M17): Gate Redis monitor by NODE_ENV**

In `redis/index.ts` line 231:
```typescript
export default new RedisService({ monitor: process.env.NODE_ENV === "development" });
```

- [ ] **Step 17 (M18): Add graceful shutdown for MongoDB/Redis/Discord**

In `www.ts` `shutdown()`:
```typescript
async function shutdown(): Promise<void> {
    const { CommandLogService } = await import("../services/commandLog.service");
    await CommandLogService.flush();

    const mongoose = await import("mongoose");
    await mongoose.default.disconnect().catch(() => {});

    const redis = (await import("../connector/redis")).default;
    // RedisService doesn't expose quit directly, so access via the class if needed
    // For now, process.exit will handle cleanup

    const { default: client } = await import("../client");
    client.destroy();

    process.exit(0);
}
```

- [ ] **Step 18: Build to verify**

Run: `npm run build`

- [ ] **Step 19: Commit**

```bash
git add -A
git commit -m "fix: medium severity fixes — atomicity, schema validation, dedup, error handling, i18n"
```

---

## Task 13: L1-L14 — Low severity fixes

> **Note:** Each step is one fix. Several are comment-only or no-op.

**Files:**
- Modify: `src/services/economy/economyAdmin.service.ts` (L1, L2)
- Modify: `src/commands/slash/gift.ts` (L3)
- Modify: `src/util/config/index.ts` (L4)
- Modify: `src/commands/slash/help.ts` (L4)
- Modify: `src/commands/slash/info.ts` (L4)
- Modify: `src/bot.ts` (L4, L11)
- Modify: `src/loaders/deploy.ts` (L4)
- Modify: `src/models/guild.model.ts` (L5)
- Modify: `src/models/user.model.ts` (L5)
- Modify: Dungeon button files (L6)
- Modify: `src/util/manga/handler.ts` (L6)
- Modify: `src/events/interactionCreateModal.ts` (L7)
- Modify: `src/buttons/voiceLimit.button.ts` (L8)
- Modify: All 15 locale files (L8, L9)
- Modify: `src/services/economy/gambling.service.ts` (L10)
- Modify: `src/bin/www.ts` (L11)
- Modify: `src/loaders/deploy.ts` (L12)
- Modify: `src/client.ts` (L12)
- Modify: `src/models/confession.model.ts` (L13)
- Modify: `src/events/interactionCreate.ts` (L14)

- [ ] **Step 1 (L1): Add $max clamp to reverseTransaction**

In `economyAdmin.service.ts`, replace the coin reversal `$inc` with pipeline `$max` clamping.

- [ ] **Step 2 (L2): Add comment to rollback logging**

Add comment: `// NOTE: coinDelta records the restored absolute value, not the actual delta from current balance. By design.`

- [ ] **Step 3 (L3): Add comment to gift display**

Add comment: `// NOTE: Displayed before/after values may be slightly stale under concurrency. The actual transfer is atomic.`

- [ ] **Step 4 (L4): Move process.env to config module**

In `config/index.ts`, add:
```typescript
export const URL_HOMEPAGE = process.env.URL_HOMEPAGE ?? "";
export const URL_DISCUSSIONS = process.env.URL_DISCUSSIONS ?? "";
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? "";
```

Update `help.ts`, `info.ts`, `bot.ts`, `deploy.ts` to import from config.

- [ ] **Step 5 (L5): Add legacy naming comments**

In `guild.model.ts` and `user.model.ts`, add: `// Legacy naming: uses guildID/userID (uppercase) — newer models use guildId/userId`

- [ ] **Step 6 (L6): Replace `ephemeral: true` with `flags: MessageFlags.Ephemeral`**

In all dungeon button files and manga handler, find `{ ephemeral: true }` or `, ephemeral: true` and replace with `{ flags: MessageFlags.Ephemeral }` or `, flags: MessageFlags.Ephemeral`. Add `MessageFlags` import where missing.

- [ ] **Step 7 (L7): Make voice modal replies ephemeral**

In `interactionCreateModal.ts`, add `flags: MessageFlags.Ephemeral` to the rename and limit modal success replies.

- [ ] **Step 8 (L8): Localize voice limit modal**

In `voiceLimit.button.ts`, add `resolveLocale` and use `t(locale, "voice.modal.limit_title")` / `t(locale, "voice.modal.limit_label")`. Add keys to all 15 locale files.

- [ ] **Step 9 (L9): Remove 5 orphaned locale keys**

Remove from all 15 locale files: `gambling_config.cooldown`, `work_config.work_cooldown`, `work_config.fish_cooldown`, `social_config.rob_cooldown`, `social_config.rob_immunity`.

- [ ] **Step 10 (L10): Add comment about Math.random**

In `gambling.service.ts`, add at top: `// Uses Math.random() — acceptable for Discord bot context. For cryptographic randomness, use node:crypto.`

- [ ] **Step 11 (L11): Refactor bot.ts to export login function**

```typescript
// src/bot.ts
import client from "./client";
import { DISCORD_TOKEN } from "./util/config";

export async function login(): Promise<void> {
    await client.login(DISCORD_TOKEN);
}
```

Update `www.ts` to call `login()` instead of `import("../bot")`.

- [ ] **Step 12 (L12): Add deploy hash comparison**

In `deploy.ts`, hash the commands JSON and compare to a stored hash. Skip deploy if unchanged. Use `node:crypto` `createHash("sha256")`.

- [ ] **Step 13 (L13): Remove redundant index**

In `confession.model.ts`, remove `index: true` from the `status` field since the compound index `(guildId, status)` covers it.

- [ ] **Step 14 (L14): Use ephemeral followUp for public-defer errors**

In `interactionCreate.ts` error handler, when `interaction.deferred` is true, use `followUp` with ephemeral flag instead of `editReply`:
```typescript
if (interaction.deferred) {
    await interaction.followUp({ content: errorMsg, flags: MessageFlags.Ephemeral });
} else if (interaction.replied) {
    await interaction.followUp({ content: errorMsg, flags: MessageFlags.Ephemeral });
} else {
    await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
}
```

- [ ] **Step 15: Build to verify**

Run: `npm run build`

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "fix: low severity fixes — conventions, cleanup, comments, ephemeral flags"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full clean build**

```bash
npm run build
```

Expected: Clean compilation, no errors.

- [ ] **Step 2: Verify git status**

```bash
git status
git log --oneline -5
```

Expected: 4 severity-tier commits + any per-fix commits, all clean.
