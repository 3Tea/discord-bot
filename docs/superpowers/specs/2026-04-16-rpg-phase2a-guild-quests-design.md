# RPG Phase 2A: Adventurer Guild + Quest System Design

**Date:** 2026-04-16
**Status:** Approved

## Overview

Phase 2A adds the Adventurer Guild — a global system where users register, accept quests, earn Guild Points (GP), and rank up from F to Legendary. Quests come from a shared daily board (3 quests) and personal daily quests (2 quests). Ranking and leaderboard are deferred to Phase 2B.

## 1. Guild Registration

Users must `/guild register` to join the Adventurer Guild. Requires an existing character (`/adventure create`).

### Registration Flow

```
/guild register
→ Check: character exists? (if not → "Create character first")
→ Check: already registered? (if yes → "Already a guild member")
→ Create GuildMember record (rank: F, gp: 0)
→ Welcome embed with rank badge
```

## 2. Adventurer Rank System

### 10 Ranks

| Rank | Key | Label | GP | Min Level | Min Boss Kills | Emoji |
|------|-----|-------|----|-----------|----------------|-------|
| F | `f` | Novice | 0 | 1 | 0 | 🟤 |
| E | `e` | Beginner | 100 | 5 | 1 | ⚪ |
| D | `d` | Apprentice | 300 | 10 | 3 | 🟢 |
| C | `c` | Intermediate | 700 | 15 | 8 | 🔵 |
| B | `b` | Advanced | 1,500 | 20 | 15 | 🟣 |
| A | `a` | Expert | 3,000 | 25 | 25 | 🟡 |
| S | `s` | Elite | 6,000 | 30 | 40 | 🟠 |
| SS | `ss` | Master | 12,000 | 35 | 60 | 🔴 |
| SSS | `sss` | Grandmaster | 25,000 | 40 | 100 | ⭐ |
| Legendary | `legendary` | Legend | 50,000 | 50 | 200 | 👑 |

### Rank Up

Automatic after quest completion. System checks:
1. GP >= requirement
2. Character level >= requirement
3. Boss kills >= requirement

All 3 must be met. Rank up → notification embed inline after quest claim.

### Boss Kill Tracking

Add `bossKills: number` field to `CharacterModel`. Increment in dungeon when boss is defeated. Used for rank requirements.

## 3. Quest System

### Quest Structure

```typescript
interface GuildQuest {
    id: string;                    // "board_2026-04-16_1" or "personal_{userId}_2026-04-16_1"
    type: "board" | "personal";
    objective: {
        action: QuestAction;
        target: number;
    };
    rewards: {
        gold: number;
        exp: number;
        gp: number;
        materials: { key: string; qty: number }[];  // may be empty
        crate: CrateType | null;                     // may be null
    };
    rankRequirement: AdventurerRank;
    expiresAt: Date;               // UTC midnight
}
```

### 12 Quest Actions

| Action | Description | Where tracked |
|--------|------------|---------------|
| `kill_monsters` | Kill N monsters in dungeon | `dungeonAttack.button.ts` (on win) |
| `reach_floor` | Reach floor N | `dungeon.service.ts` (resolveCombatWin) |
| `defeat_boss` | Defeat N bosses | `dungeonAttack.button.ts` (on boss win) |
| `earn_gold` | Earn N gold total | `CharacterService.addGold` |
| `craft_equipment` | Craft N items | `adventure.ts` handleCraft |
| `open_crates` | Open N crates | `adventure.ts` handleCrate/handleShop |
| `collect_materials` | Collect N materials | `CharacterService.addMaterials` |
| `use_work` | Use /work N times | `work.ts` |
| `use_fish` | Use /fish N times | `fish.ts` |
| `send_messages` | Send N messages | `messageCreate.ts` |
| `use_pray` | Use /pray N times | Pray command |
| `complete_quests` | Complete N guild quests | Guild quest claim handler |

### Daily Board Quests (3, shared globally)

- Generated deterministically from UTC date seed
- Same for all users
- Rank requirements: quest 1 = F, quest 2 = D, quest 3 = B
- Higher-numbered quests → harder objectives + better rewards

### Personal Quests (2, per user)

- Generated deterministically from `userId + date` seed
- Rank/level-aware: higher rank → harder objectives + better rewards
- Quest actions weighted by class (Mage gets more dungeon quests, Healer gets more craft/social quests — optional flavor)

### Quest Generation — Deterministic Seeding

```typescript
function generateDailyBoardQuests(date: string): GuildQuest[] {
    const seed = hashCode(`board_${date}`);
    const rng = seededRandom(seed);
    // Use rng to pick 3 actions + targets from quest template pools
}

function generatePersonalQuests(userId: string, date: string, rank: AdventurerRank): GuildQuest[] {
    const seed = hashCode(`personal_${userId}_${date}`);
    const rng = seededRandom(seed);
    // Use rng to pick 2 actions + targets, scaled by rank
}
```

Uses a simple seeded PRNG (e.g., mulberry32) for deterministic generation — no DB storage needed for quest definitions.

### Quest Template Pools

Each `QuestAction` has a template with min/max target scaling by rank:

```typescript
interface QuestTemplate {
    action: QuestAction;
    targetByRank: Record<AdventurerRank, { min: number; max: number }>;
    baseGold: number;
    baseExp: number;
}
```

Example:
```
kill_monsters: F = {3,5}, E = {5,8}, D = {8,12}, ..., Legendary = {30,50}
defeat_boss: F = {1,1}, E = {1,2}, ..., S = {3,5}, Legendary = {5,8}
```

### Reward Scaling by Rank

| Rank | GP/quest | Gold mult | EXP mult | Material % | Crate % |
|------|---------|-----------|----------|------------|---------|
| F | 10 | ×1.0 | ×1.0 | 20% | 0% |
| E | 15 | ×1.2 | ×1.2 | 30% | 5% |
| D | 20 | ×1.4 | ×1.4 | 40% | 10% |
| C | 30 | ×1.6 | ×1.6 | 50% | 15% |
| B | 45 | ×1.8 | ×1.8 | 60% | 20% |
| A | 65 | ×2.0 | ×2.0 | 70% | 25% |
| S | 90 | ×2.5 | ×2.5 | 80% | 35% |
| SS | 120 | ×3.0 | ×3.0 | 90% | 45% |
| SSS | 160 | ×3.5 | ×3.5 | 95% | 55% |
| Legendary | 200 | ×4.0 | ×4.0 | 100% | 70% |

Material rewards: random tier based on rank (F = Common only, S+ = up to Epic, Legendary = up to Mythic).
Crate rewards: Bronze for F-C, Silver for B-S, Gold for SS+.

### Quest Progress Tracking

**Redis** — per-user per-quest:
```
guild_quest_progress:{userId}:{questId} → number (progress count)
TTL: 86400 (24 hours)
```

**Tracking pattern** — fire-and-forget at each integration point:
```typescript
GuildQuestService.trackProgress(userId, "kill_monsters", 1).catch(() => {});
```

The service checks user's active quests, increments matching ones.

### Quest Limits

- Max **3 active quests** simultaneously (board + personal combined)
- Must claim completed quest before accepting new one
- Uncompleted quests expire at UTC midnight (progress lost)
- Completed but unclaimed quests also expire (rewards lost)

## 4. `/guild` Command

### Subcommands

| Subcommand | Description |
|------------|-------------|
| `/guild register` | Join the Adventurer Guild |
| `/guild profile` | View rank, GP, stats, active quests |
| `/guild board` | View daily board quests (3) with accept buttons |
| `/guild quests` | View personal quests (2) + active quests with progress + claim buttons |

### `/guild register`

```
→ Check character + not registered
→ Create GuildMember
→ Welcome embed: rank F badge, "Visit /guild board for your first quest!"
```

### `/guild profile`

```
📋 Adventurer Profile — Username
🟤 Rank F — Novice
GP: 45/100 (next: E)
Quests Completed: 7
Boss Kills: 2

Active Quests:
1. Kill 5 Monsters [███░░] 3/5
2. Use /work 3 times [█████] 3/3 ✅
```

### `/guild board`

```
📋 Daily Quest Board — April 16, 2026

1. 🟤 [F] Kill 5 Monsters → 100G + 50 EXP + 10 GP
2. 🟢 [D] Reach Floor 10 → 200G + 100 EXP + 20 GP + 🟩 ×2
3. 🟣 [B] Defeat 2 Bosses → 400G + 200 EXP + 45 GP + 🥈 ×1

[Accept #1]  [Accept #2 🔒]  [Accept #3 🔒]
```

Buttons disabled if: rank too low, already accepted, quest limit reached (3).

### `/guild quests`

```
📜 Your Quests

Active (2/3):
1. Kill 5 Monsters [███░░] 3/5
2. Use /work 3 times [█████] 3/3 ✅ [Claim]

Personal (available today):
3. Craft 1 Equipment → 150G + 75 EXP + 15 GP
   [Accept]

4. Send 50 Messages → 80G + 40 EXP + 10 GP
   [Accept]
```

Claim button → award rewards + check rank up + remove from active.
Accept button → add to active quests.

## 5. Integration Points (Quest Tracking Hooks)

All hooks are fire-and-forget (`GuildQuestService.trackProgress(userId, action, amount).catch(() => {})`).

| File | Hook | Action tracked |
|------|------|---------------|
| `src/buttons/dungeonAttack.button.ts` | On monster win | `kill_monsters` +1 |
| `src/buttons/dungeonAttack.button.ts` | On boss win | `defeat_boss` +1, increment `bossKills` |
| `src/services/economy/dungeon.service.ts` | resolveCombatWin | `reach_floor` (check) |
| `src/services/rpg/character.service.ts` | addGold | `earn_gold` +amount |
| `src/services/rpg/character.service.ts` | addMaterials | `collect_materials` +total qty |
| `src/commands/slash/adventure.ts` | handleCraft success | `craft_equipment` +1 |
| `src/commands/slash/adventure.ts` | handleCrate/handleShop | `open_crates` +1 |
| `src/commands/slash/work.ts` | work success | `use_work` +1 |
| `src/commands/slash/fish.ts` | fish success | `use_fish` +1 |
| `src/events/messageCreate.ts` | after XP grant | `send_messages` +1 |
| Pray command | pray success | `use_pray` +1 |

## 6. Data Models

### `GuildMemberModel` (new collection: `GuildMembers`)

```typescript
interface IGuildMember extends Document {
    userId: string;                    // unique
    rank: AdventurerRank;              // "f" | "e" | ... | "legendary"
    gp: number;                        // Guild Points
    questsCompleted: number;           // lifetime total
    activeQuests: string[];            // quest IDs (max 3)
    lastBoardDate: string;             // ISO date "2026-04-16" — tracks daily refresh
    lastPersonalDate: string;          // ISO date — tracks personal refresh
    createdAt: Date;
    updatedAt: Date;
}
```

Index: `{ userId: 1 }` unique.

### `CharacterModel` — add field

```typescript
bossKills: number;  // default 0, increment on boss defeat
```

## 7. New Files

| File | Purpose |
|------|---------|
| `src/models/guildMember.model.ts` | GuildMember schema |
| `src/services/rpg/guild.config.ts` | Rank definitions, quest templates, reward scaling, seeded PRNG |
| `src/services/rpg/guild.service.ts` | Registration, rank check/up, GP management |
| `src/services/rpg/guildQuest.service.ts` | Quest generation, accept, track progress, claim, daily reset |
| `src/commands/slash/guild.ts` | `/guild` command (register, profile, board, quests) |

## 8. Modified Files

| File | Changes |
|------|---------|
| `src/models/character.model.ts` | Add `bossKills: number` |
| `src/buttons/dungeonAttack.button.ts` | Track kill_monsters, defeat_boss, increment bossKills |
| `src/services/economy/dungeon.service.ts` | Track reach_floor |
| `src/services/rpg/character.service.ts` | Track earn_gold, collect_materials in existing functions |
| `src/commands/slash/adventure.ts` | Track craft_equipment, open_crates |
| `src/commands/slash/work.ts` | Track use_work |
| `src/commands/slash/fish.ts` | Track use_fish |
| `src/events/messageCreate.ts` | Track send_messages |
| `src/locales/*.json` (15 files) | ~40 new i18n keys |

## 9. i18n Keys (new, ~40)

Key groups:
- `guild.register.*` — registration messages
- `guild.profile.*` — profile display
- `guild.board.*` — daily board display
- `guild.quests.*` — personal/active quest display
- `guild.quest.action.*` — quest action descriptions (kill_monsters, reach_floor, etc.)
- `guild.rank.*` — rank names (Novice, Beginner, ..., Legend)
- `guild.rankup` — rank up notification
- `guild.require_member` — "Register first" gate
- `cmd.guild.*` — command descriptions

## 10. Relation to Existing Quest System

The bot already has `src/services/quest/quest.service.ts` with 18 daily quest templates. This is a **per-guild** system for the economy (earn coins/gems). The new guild quest system is **global** and RPG-focused. They coexist:

| System | Scope | Currency | Tracked via |
|--------|-------|----------|-------------|
| Existing `/quest` | Per-guild | Coin | `QuestService.trackProgress` |
| New `/guild quests` | Global | Gold + GP | `GuildQuestService.trackProgress` |

Both use fire-and-forget hooks at the same integration points. No conflict.

## 11. Edge Cases

| Scenario | Handling |
|----------|----------|
| User not registered, runs `/guild board` | "Register first with `/guild register`" |
| User not registered, but has character | Registration allowed. Character required first. |
| Accept quest when at limit (3) | Button disabled, ephemeral "Complete or drop a quest first" |
| Quest expires mid-progress | Progress lost at UTC midnight. Redis TTL handles cleanup. |
| Completed quest not claimed by midnight | Rewards lost. Active quest cleared on next interaction. |
| Rank up notification while claiming | Shown inline after reward embed |
| Boss kill but not guild member | No tracking (guild quest hooks check membership first) |
| Multiple quest actions in one dungeon run | Each action tracked independently (kill 3 monsters = 3 progress on kill_monsters quest) |
