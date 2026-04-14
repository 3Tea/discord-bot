# Daily Quest Integrations — Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `QuestService.trackProgress()` into 14 command files so quests auto-complete when users use bot commands. Add inline notifications. Run post-feature audit.

**Architecture:** Each command imports `QuestService` and calls `trackProgress(userId, guildId, trigger)` after successful execution. The returned `TrackResult` drives inline notification text appended to the command's response embed.

**Tech Stack:** TypeScript, Discord.js v14

**Spec:** `docs/superpowers/specs/2026-04-14-daily-quest-design.md`
**Depends on:** Plan 1 (Quest Core) — completed

---

## File Structure

| Action | File | Trigger(s) |
|--------|------|-----------|
| Modify | `src/commands/slash/pray.ts` | `"pray"` / `"pray_target"` |
| Modify | `src/commands/slash/curse.ts` | `"curse"` / `"curse_target"` |
| Modify | `src/commands/slash/rank.ts` | `"rank"` |
| Modify | `src/commands/slash/balance.ts` | `"balance"` |
| Modify | `src/commands/slash/wallet.ts` | `"wallet_view"` / `"wallet_daily"` |
| Modify | `src/commands/slash/work.ts` | `"work"` |
| Modify | `src/commands/slash/fish.ts` | `"fish"` |
| Modify | `src/commands/slash/mine.ts` | `"mine"` (not on collapse) |
| Modify | `src/commands/slash/gift.ts` | `"gift"` |
| Modify | `src/commands/slash/confession.ts` | `"confession"` |
| Modify | `src/commands/slash/shop.ts` | `"shop_view"` |
| Modify | `src/commands/slash/dungeon.ts` | `"dungeon"` (run end only) |
| Modify | `src/commands/slash/gamble.ts` | `"gamble_win"` (win only) |
| Modify | `src/commands/slash/rob.ts` | `"rob_success"` (success only) |
| Modify | `src/util/help/commandCategories.ts` | Add quest → economy |
| Post-feature audit via `/post-feature` skill |

---

### Integration Pattern

Every command follows this pattern:

```typescript
// 1. Import at top
import QuestService from "../../services/quest/quest.service";
import { t } from "../../util/i18n/t"; // already imported in most files

// 2. After successful command execution, before or after the reply:
const questResult = await QuestService.trackProgress(userId, guildId, "trigger_name");

// 3. If quest completed, append notification to embed description:
if (questResult?.questCompleted) {
    const questName = t(locale, questResult.questCompleted.name);
    embed.setDescription(
        (embed.data.description ?? "") + 
        "\n\n" + t(locale, "quest.notify.complete", { name: questName, reward: String(questResult.questCompleted.reward) })
    );
}
if (questResult?.allComplete) {
    embed.setDescription(
        (embed.data.description ?? "") + 
        "\n" + t(locale, "quest.notify.all_done")
    );
}
```

**Important:** `trackProgress` calls should be wrapped in `.catch(() => {})` to prevent quest failures from breaking the main command flow.

---

### Task 1: Integrate pray + curse

**Files:**
- Modify: `src/commands/slash/pray.ts`
- Modify: `src/commands/slash/curse.ts`

- [ ] **Step 1: Add trackProgress to pray.ts**

Add import: `import QuestService from "../../services/quest/quest.service";`

After the successful pray reply (after `Reply.embedEdit`), add:

```typescript
const trigger = targetUser ? "pray_target" : "pray";
await QuestService.trackProgress(userId, guildId, trigger).catch(() => {});
```

- [ ] **Step 2: Add trackProgress to curse.ts**

Same pattern:

```typescript
const trigger = targetUser ? "curse_target" : "curse";
await QuestService.trackProgress(userId, guildId, trigger).catch(() => {});
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/pray.ts src/commands/slash/curse.ts
git commit -m "feat(quest): integrate pray and curse with quest tracking"
```

---

### Task 2: Integrate rank + balance + wallet + shop (read-only commands)

**Files:**
- Modify: `src/commands/slash/rank.ts`
- Modify: `src/commands/slash/balance.ts`
- Modify: `src/commands/slash/wallet.ts`
- Modify: `src/commands/slash/shop.ts`

- [ ] **Step 1: Add trackProgress to rank.ts**

Add import. After the reply (both canvas and embed fallback paths), add:

```typescript
await QuestService.trackProgress(interaction.user.id, guildId, "rank").catch(() => {});
```

- [ ] **Step 2: Add trackProgress to balance.ts**

After the reply:

```typescript
await QuestService.trackProgress(interaction.user.id, interaction.guildId!, "balance").catch(() => {});
```

- [ ] **Step 3: Add trackProgress to wallet.ts**

In `handleView`, after the reply:
```typescript
await QuestService.trackProgress(userId, interaction.guildId!, "wallet_view").catch(() => {});
```

In `handleDaily`, after the successful claim reply:
```typescript
await QuestService.trackProgress(userId, interaction.guildId!, "wallet_daily").catch(() => {});
```

- [ ] **Step 4: Add trackProgress to shop.ts**

In the view subcommand handler, after the reply:
```typescript
await QuestService.trackProgress(interaction.user.id, guildId, "shop_view").catch(() => {});
```

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/rank.ts src/commands/slash/balance.ts src/commands/slash/wallet.ts src/commands/slash/shop.ts
git commit -m "feat(quest): integrate read-only commands with quest tracking"
```

---

### Task 3: Integrate work + fish + mine (economy commands with cooldowns)

**Files:**
- Modify: `src/commands/slash/work.ts`
- Modify: `src/commands/slash/fish.ts`
- Modify: `src/commands/slash/mine.ts`

- [ ] **Step 1: Add trackProgress to work.ts**

Add import. Before the final reply, add:

```typescript
await QuestService.trackProgress(userId, guildId, "work").catch(() => {});
```

- [ ] **Step 2: Add trackProgress to fish.ts**

Same pattern:

```typescript
await QuestService.trackProgress(userId, guildId, "fish").catch(() => {});
```

- [ ] **Step 3: Add trackProgress to mine.ts**

Only on successful mine (NOT on collapse). Find the success path (after the collapse check), add:

```typescript
await QuestService.trackProgress(userId, guildId, "mine").catch(() => {});
```

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/work.ts src/commands/slash/fish.ts src/commands/slash/mine.ts
git commit -m "feat(quest): integrate work, fish, mine with quest tracking"
```

---

### Task 4: Integrate gift + confession (social commands)

**Files:**
- Modify: `src/commands/slash/gift.ts`
- Modify: `src/commands/slash/confession.ts`

- [ ] **Step 1: Add trackProgress to gift.ts**

Add import. After successful gift (before the reply), add:

```typescript
await QuestService.trackProgress(giverId, guildId, "gift").catch(() => {});
```

Note: use `giverId` (the gift sender), not `targetUser.id`.

- [ ] **Step 2: Add trackProgress to confession.ts**

Add import. After both instant mode success (after `confession.submit_success_instant` reply) and review mode success (after `confession.submit_success_review` reply), add:

```typescript
await QuestService.trackProgress(userId, guildId, "confession").catch(() => {});
```

Two insertion points — one for instant mode, one for review mode.

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/gift.ts src/commands/slash/confession.ts
git commit -m "feat(quest): integrate gift and confession with quest tracking"
```

---

### Task 5: Integrate dungeon + gamble + rob (conditional commands)

**Files:**
- Modify: `src/commands/slash/dungeon.ts`
- Modify: `src/commands/slash/gamble.ts`
- Modify: `src/commands/slash/rob.ts`

- [ ] **Step 1: Add trackProgress to dungeon.ts**

Add import. Inside the `if (runEnded)` block, after setting the cooldown:

```typescript
await QuestService.trackProgress(userId, guildId, "dungeon").catch(() => {});
```

- [ ] **Step 2: Add trackProgress to gamble.ts**

Add import. Only on wins (payout > 0). There are 3 game types (coinflip, slots, dice). In each win path, add:

```typescript
await QuestService.trackProgress(userId, guildId, "gamble_win").catch(() => {});
```

- [ ] **Step 3: Add trackProgress to rob.ts**

Add import. Only on successful rob. Inside the `if (result.success)` block:

```typescript
await QuestService.trackProgress(robberId, guildId, "rob_success").catch(() => {});
```

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/dungeon.ts src/commands/slash/gamble.ts src/commands/slash/rob.ts
git commit -m "feat(quest): integrate dungeon, gamble, rob with quest tracking"
```

---

### Task 6: Add quest to help categories

**Files:**
- Modify: `src/util/help/commandCategories.ts`

- [ ] **Step 1: Add quest to economy category**

Add after the `premium` entry:

```typescript
    quest: "economy",
```

- [ ] **Step 2: Commit**

```bash
git add src/util/help/commandCategories.ts
git commit -m "feat(quest): add quest to help categories"
```

---

### Task 7: Verify build

- [ ] **Step 1: Run TypeScript build**

```bash
npm run build
```

Expected: Build succeeds.

---

### Task 8: Post-feature audit

Run `/post-feature` skill to check:
- Steering docs
- CLAUDE.md
- Landing pages (quest command page + guide)
- Changelog
- i18n completeness
