# RPG Phase 3A: Branch Guilds + Weekly Co-op Quests Design

**Date:** 2026-04-16
**Status:** Approved

## Overview

Phase 3A adds branch guilds (per-Discord-server) to the global Adventurer Guild. Server admins set up their branch, and members collectively complete weekly co-op quests for shared rewards. Competitive server-vs-server events are deferred to Phase 3B.

## 1. Branch Guild Setup

### Admin Commands

| Command | Permission | Description |
|---------|-----------|-------------|
| `/guild-admin setup [name]` | ADMINISTRATOR | Create branch guild (default name = server name) |
| `/guild-admin config` | ADMINISTRATOR | Set quest notification channel |
| `/guild-admin disband` | ADMINISTRATOR | Delete branch guild (with confirmation) |

### Setup Flow

```
/guild-admin setup name:Dragon's Den
→ Check: server already has branch? (if yes → "Already exists")
→ Create BranchGuild record
→ Embed: "Branch Guild 'Dragon's Den' established! Use /guild-admin config to set quest channel."
```

### BranchGuild Model (new collection: `BranchGuilds`)

```typescript
interface IBranchGuild extends Document {
    guildId: string;               // Discord server ID, unique
    name: string;                  // Custom name
    questChannelId: string | null; // Channel for weekly quest notifications
    createdAt: Date;
    updatedAt: Date;
}
```

Index: `{ guildId: 1 }` unique.

Note: `membersCount` and `totalGP` are computed on-demand from `GuildMemberModel` queries, not cached on the model. This avoids stale counters.

## 2. Weekly Co-op Quests

### Generation

3 quests per week, shared across ALL branch guilds. Generated deterministically from ISO week key.

```typescript
function getWeekKey(): string {
    // Returns ISO week: "2026-W16"
    const d = new Date();
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function generateWeeklyQuests(weekKey: string): BranchQuest[]
// Uses seeded PRNG (mulberry32 from guild.config) for deterministic generation
```

### Quest Actions (subset of existing 12 actions)

Weekly quests use only collective-friendly actions:

| Action | Description | Example target (base) |
|--------|------------|----------------------|
| `kill_monsters` | Server members kill N monsters total | 100 |
| `defeat_boss` | Server members defeat N bosses total | 15 |
| `earn_gold` | Server members earn N gold total | 10,000 |
| `collect_materials` | Server members collect N materials total | 50 |
| `complete_quests` | Server members complete N guild quests total | 30 |
| `craft_equipment` | Server members craft N items total | 10 |

### Target Scaling by Branch Size

```typescript
function scaleTarget(baseTarget: number, memberCount: number): number {
    // Scale by member count, minimum 1x, max 20x
    const scale = Math.max(1, Math.ceil(memberCount / 5));
    return baseTarget * Math.min(scale, 20);
}
```

Member count = count of `GuildMemberModel` documents where `userId` is in the Discord server's member list. Computed at quest generation time and cached in Redis for the week.

### Quest Structure

```typescript
interface BranchQuest {
    index: number;           // 0, 1, 2
    action: QuestAction;
    baseTarget: number;
    weekKey: string;
}
```

The actual `target` is `scaleTarget(baseTarget, memberCount)` — computed per-branch.

### Progress Tracking

Redis key: `branch_quest:{guildId}:{weekKey}:{questIndex}` → number (progress).
TTL: 691200 (8 days — covers full week + 1 day buffer).

**Integration with existing tracking:**

In `GuildQuestService.trackProgress(userId, action, amount)`, after tracking personal/board quests, ALSO track branch quests:

```typescript
// After existing personal quest tracking:
// Check if user is in a server with a branch guild
// If yes, increment branch quest progress for matching actions
```

**Challenge:** `trackProgress` is called globally (not per-guild). Need to know which server(s) the user is in. Solution:

1. When a hook fires from a command (has `interaction.guildId`), pass `guildId` to `trackProgress`
2. When a hook fires from a service (no guildId context, e.g., `addGold`), skip branch tracking (only personal quests tracked)
3. Most actions come from commands with guild context: dungeon, work, fish, adventure commands

Update `trackProgress` signature:
```typescript
async function trackProgress(userId: string, action: QuestAction, amount?: number, guildId?: string): Promise<void>
```

When `guildId` is provided and the server has a branch guild, also increment branch quest progress.

### Weekly Reward Distribution

| Completion | Gold | EXP | GP | Crate |
|-----------|------|-----|-----|-------|
| 3/3 quests | 50 | 30 | 15 | Silver ×1 |
| 2/3 quests | 30 | 20 | 10 | — |
| 1/3 quests | 15 | 10 | 5 | — |
| 0/3 | — | — | — | — |

Rewards go to ALL registered adventurers (`GuildMemberModel`) whose `userId` is in the Discord server, regardless of individual contribution.

**Distribution timing:** Manual via `/guild branch` check — when a user views branch info and the week has ended, trigger reward distribution for that server (lazy evaluation). Alternatively, a cron job could run weekly, but lazy evaluation is simpler for Phase 3A.

**Reward claim tracking:** Redis key `branch_reward_claimed:{guildId}:{weekKey}:{userId}` → boolean, TTL 8 days. Prevents double-claim.

## 3. `/guild branch` Subcommand

Add to existing `/guild` command:

```
/guild branch
→ Check: server has branch guild? (if not → "This server doesn't have a branch guild")
→ Check: user is guild member? (if not → "Register first")
→ Show branch info + weekly quest progress
→ If week ended + rewards unclaimed → auto-claim and show rewards
```

### Embed Display

```
🏛️ Dragon's Den — Branch Guild
Members: 12 adventurers | Total GP: 4,250

📋 Weekly Quests (2026-W16):
1. Kill 200 monsters [████░░░░░░] 87/200
2. Defeat 15 bosses  [██████░░░░] 9/15
3. Complete 50 quests [███░░░░░░░] 18/50

Progress: 0/3 complete — Keep going!
```

When week ended + rewards available:
```
📋 Last Week (2026-W15): 2/3 Complete! ✅
Claimed: +30 Gold + 20 EXP + 10 GP
```

## 4. `/guild-admin` Command

New command file with ADMINISTRATOR permission check.

### `/guild-admin setup [name]`

```
→ Check: ADMINISTRATOR permission
→ Check: server not already have branch
→ Create BranchGuild(guildId, name)
→ Success embed
```

### `/guild-admin config`

```
→ Show current config (name, quest channel)
→ Select menu: choose quest notification channel from server's text channels
→ Update BranchGuild.questChannelId
```

### `/guild-admin disband`

```
→ Confirm button (30s timeout)
→ Delete BranchGuild
→ Clean up Redis keys
```

## 5. Files

### New Files

| File | Purpose |
|------|---------|
| `src/models/branchGuild.model.ts` | BranchGuild schema |
| `src/services/rpg/branch.config.ts` | Weekly quest templates, reward tiers, target scaling |
| `src/services/rpg/branch.service.ts` | Branch CRUD, weekly quest generation/progress/rewards |
| `src/commands/slash/guild-admin.ts` | `/guild-admin setup/config/disband` |

### Modified Files

| File | Changes |
|------|---------|
| `src/commands/slash/guild.ts` | Add `branch` subcommand |
| `src/services/rpg/guildQuest.service.ts` | Add `guildId` param to `trackProgress`, branch quest tracking |
| `src/buttons/dungeonAttack.button.ts` | Pass `guildId` to `trackProgress` calls |
| `src/commands/slash/adventure.ts` | Pass `guildId` to `trackProgress` calls |
| `src/commands/slash/work.ts` | Pass `guildId` to `trackProgress` calls |
| `src/commands/slash/fish.ts` | Pass `guildId` to `trackProgress` calls |
| `src/events/messageCreate.ts` | Pass `guildId` to `trackProgress` calls |
| `src/locales/*.json` (15 files) | ~25 new i18n keys |

## 6. i18n Keys (new, ~25)

| Key | EN |
|-----|-----|
| `branch.setup.title` | `Branch Guild Established!` |
| `branch.setup.desc` | `**{{name}}** is now a branch of the Adventurer Guild.\nUse \`/guild-admin config\` to set quest channel.` |
| `branch.setup.already_exists` | `This server already has a branch guild.` |
| `branch.setup.no_permission` | `You need Administrator permission.` |
| `branch.config.title` | `Branch Guild Config` |
| `branch.config.channel_set` | `Quest channel set to <#{{channel}}>.` |
| `branch.disband.confirm` | `Disband **{{name}}**? This cannot be undone.` |
| `branch.disband.success` | `Branch guild disbanded.` |
| `branch.disband.cancelled` | `Disband cancelled.` |
| `branch.info.title` | `🏛️ {{name}} — Branch Guild` |
| `branch.info.members` | `Members: **{{total}}** adventurers` |
| `branch.info.total_gp` | `Total GP: **{{gp}}**` |
| `branch.weekly.title` | `Weekly Quests ({{week}})` |
| `branch.weekly.quest` | `{{index}}. {{desc}} [{{bar}}] {{current}}/{{target}}` |
| `branch.weekly.progress` | `Progress: {{done}}/3 complete` |
| `branch.weekly.complete` | `All weekly quests complete! 🎉` |
| `branch.weekly.reward_claimed` | `Last week ({{week}}): {{done}}/3 Complete!\nClaimed: +{{gold}} Gold + {{exp}} EXP + {{gp}} GP` |
| `branch.weekly.reward_crate` | ` + 🥈 Silver Crate ×1` |
| `branch.weekly.no_reward` | `Last week: 0/3 — No rewards.` |
| `branch.not_setup` | `This server doesn't have a branch guild. Ask an admin to use \`/guild-admin setup\`.` |
| `cmd.guild_admin.desc` | `Manage branch guild settings (Admin only)` |
| `cmd.guild_admin.setup.desc` | `Set up a branch guild for this server` |
| `cmd.guild_admin.config.desc` | `Configure branch guild settings` |
| `cmd.guild_admin.disband.desc` | `Disband this server's branch guild` |
| `cmd.guild.branch.desc` | `View branch guild info and weekly quests` |

## 7. Edge Cases

| Scenario | Handling |
|----------|----------|
| Server has no branch, user runs `/guild branch` | "Not setup" message with instruction |
| Admin disbands mid-week | Weekly quest progress lost, no rewards |
| User in multiple servers with branches | Each server tracks independently |
| Server with 1 member | Target = baseTarget × 1 (minimum scale) |
| Weekly reset while user is viewing | Stale data shown; next view refreshes |
| Reward already claimed | Redis flag prevents double-claim |
| trackProgress without guildId (service-level) | Skip branch tracking, only personal quests |
