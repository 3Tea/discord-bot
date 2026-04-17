# RPG Adventure System

> Steering doc for AI assistants and contributors. Covers the RPG adventure system -- characters, classes, combat, dungeons, equipment, guilds, PvP, and team dungeons.

## Overview

The RPG system is a global (cross-server) game layer built on top of the existing economy. Each user has one `Character` with a class, level, stats, equipment, gold, and materials. The dungeon system was reworked from simple random encounters to stat-based combat using the character's stats and class skills. An Adventurer Guild provides quests and ranking. PvP allows player-vs-player combat.

**Relationship to existing economy:** Gold is the RPG currency (separate from per-guild coins/gems). Dungeon still awards per-guild coins via `CurrencyService` for backward compatibility, but the primary rewards are Gold, EXP, materials, and equipment. Star drops still use the global wallet system.

## Character Model

**Collection:** `Characters` (unique index on `userId`)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | String | Discord user ID (globally unique) |
| `class` | Enum | One of 6 base classes |
| `advancedClass` | String/null | Advanced class after level 20 |
| `level` | Number | 1-50, derived from `exp` |
| `exp` | Number | Total experience points |
| `gold` | Number | Global RPG currency |
| `dungeonDepth` | Number | Current dungeon floor |
| `dungeonCheckpoint` | Number | Last checkpoint floor |
| `bossKills` | Number | Total boss kills |
| `monstersKilled` | Number | Total monsters killed |
| `goldEarned` | Number | Lifetime gold earned |
| `itemsCrafted` | Number | Total items crafted |
| `equipment` | Object | 6 slots, each an ObjectId ref to Equipment |
| `materials` | Map<String,Number> | Material inventory |
| `crates` | Object | bronze/silver/gold crate counts |

### Classes

6 base classes, each with base stats and per-level growth:

| Class | Emoji | Role | Primary | Key Stat |
|-------|-------|------|---------|----------|
| Swordsman | `⚔️` | Balanced melee | STR | STR 25, SPD 12 |
| Tank | `🛡️` | Defender | STR | HP 180, DEF 30 |
| Mage | `🔮` | Burst magic | MAG | MAG 30, MAG_DEF 20 |
| Archer | `🏹` | Fast ranged | STR | SPD 18, STR 20 |
| Assassin | `🗡️` | Crit speed | STR | SPD 25, STR 22 |
| Healer | `💚` | Support | MAG | MAG 25, MAG_DEF 22 |

### Stats

6 stats: `hp`, `str`, `def`, `mag`, `magDef`, `spd`. Computed as: `baseStat + (growth * (level - 1)) + equipmentBonus`. Advanced classes apply percentage bonuses on top.

### Leveling

- Formula: `expForLevel(level) = floor(100 * level^1.5)`
- Max level: 50
- EXP sources: dungeon combat (base 20 + 8/floor), message XP conversion (`XP * 0.1`)

### Gold

Global currency. Earned from dungeon combat, quest rewards, PvP wins. Spent on crafting, crate shop, advancement. Not exchangeable with per-guild coins/gems.

## Advanced Classes

At level 20, players can advance to one of 2 paths per base class (12 total):

| Base | Offensive Path | Defensive Path |
|------|---------------|----------------|
| Swordsman | Berserker `⚔️` | Knight `🛡️` |
| Tank | Fortress `🏰` | Paladin `✨` |
| Mage | Warlock `😈` | Archmage `🔮` |
| Archer | Sniper `🎯` | Ranger `🌿` |
| Assassin | Phantom `👻` | Shadow `🌑` |
| Healer | Druid `🌱` | Priest `🙏` |

**Requirements:** Level 20, 5 epic_core, 10 rare_essence, 3000 gold.

**Benefits:** Percentage stat bonuses, one ultimate skill per combat (costs 50 MP).

## Combat System

### Damage Formulas

- **Physical:** `max(1, floor(attackerSTR * 1.5 * multiplier - effectiveDEF * 0.5))`
- **Magical:** `max(1, floor(attackerMAG * 1.5 * multiplier - effectiveMAG_DEF * 0.5))`
- `effectiveDEF = DEF * (1 - ignoreDefPercent)`

### Actions (5 + 1)

| Action | MP Cost | Effect |
|--------|---------|--------|
| Attack | 0 | Basic attack (1x multiplier) |
| Skill 1 | 20 | Class-specific offensive skill |
| Skill 2 | 30 | Class-specific utility/secondary skill |
| Defend | 0 | 50% damage reduction, +5% HP heal, +15 MP regen |
| Run | 0 | Escape combat (no reward/penalty) |
| Ultimate | 50 | Advanced class only, once per combat |

### MP System

- Max MP: `50 + (level * 5)`
- Regen per turn: 5 (base) + 15 (if defending)
- Skills cost 20/30 MP. Ultimate costs 50 MP.

### Status Effects

| Effect | Mechanic |
|--------|----------|
| `def_buff` | Increases DEF/MAG_DEF by `value` percentage for N turns |
| `spd_debuff` | Reduces SPD by `value` percentage for N turns |
| `poison` | Deals `maxHP * value` damage per turn for N turns |

### Turn Order

Determined by SPD comparison: higher SPD goes first. User attacks first if tied.

### Class Skills (2 per class)

| Class | Skill 1 | Skill 2 |
|-------|---------|---------|
| Swordsman | Power Strike (1.8x) | Whirlwind (1.3x, 30% armor pen) |
| Tank | Shield Bash (1.4x, +DEF buff) | Fortify (20% heal, +40% DEF 1 turn) |
| Mage | Fireball (2x magic) | Ice Shard (1.5x, SPD debuff) |
| Archer | Precision Shot (1.8x, 50% pen) | Quick Shot (1.2x, 2 hits) |
| Assassin | Backstab (2.2x, 30% crit, 3x crit mult) | Poison Blade (1x, poison 10%/3 turns) |
| Healer | Holy Light (1.6x magic) | Heal (30% HP heal) |

### Special Ultimate Mechanics

- **Berserker (Blood Frenzy):** 3x damage, heals 30% of damage dealt
- **Warlock (Soul Burn):** 4x magic damage, costs 20% current HP
- **Sniper (Headshot):** 5x damage, 50% instant kill if monster below 30% HP
- **Fortress (Stone Wall):** Reflects next monster attack back
- **Paladin (Divine Shield):** 50% HP heal, blocks next attack completely
- **Priest (Resurrection):** Passive -- auto-revives at 50% HP on death (once per combat)

## Dungeon System

### Monster Scaling

- **Normal:** HP=80+floor*15+level*5, STR=10+floor*4, DEF=5+floor*2, MAG=8+floor*3
- **Boss (every 5 floors):** All stats doubled

### Encounters per Run

5 encounters per run. Same encounter type distribution as before (50% monster, 25% treasure, 15% trap, 10% merchant).

### Combat Turns

- Normal monsters: 5 turns max
- Boss: 7 turns max

### Rewards

| Source | Gold | EXP | Materials | Equipment | Crates |
|--------|------|-----|-----------|-----------|--------|
| Monster | 50 + floor*15 | 20 + floor*8 | 30% chance | 10% chance | 5% bronze |
| Treasure | 30 + floor*10 | 10 + floor*5 | 50% chance | 15% chance | 15% bronze, 5% silver |
| Boss | 3x monster | 3x monster | 100% chance | 50% chance | 50% silver, 15% gold |
| Trap | Lose 20+floor*5 gold | -- | -- | -- | -- |

### Team Dungeon (2-4 players)

- Party leader creates with `/dungeon team`
- Members join via buttons (max 4)
- Simultaneous turn submission: all members choose actions, resolve when all submitted
- Monster stats scaled by party size
- Rewards split equally
- 30-minute TTL, 10-minute cooldown

## Equipment System

**Collection:** `Equipment` (indexed on `ownerId`, `ownerId+equipped`)

### 6 Slots

`weapon`, `shield`, `helmet`, `armor`, `boots`, `accessory`

### 6 Rarities

| Rarity | Stat Mult | Drop Weight | Color |
|--------|-----------|-------------|-------|
| Common | 1.0x | 45 | Gray |
| Uncommon | 1.3x | 25 | Green |
| Rare | 1.6x | 15 | Blue |
| Epic | 2.0x | 10 | Purple |
| Legendary | 2.5x | 4 | Gold |
| Mythic | 3.2x | 1 | Red |

### Class-Weighted Drops

Equipment drops are weighted toward the player's class. 70% chance the drop matches the player's class. Priority slots per class (e.g., Swordsman: weapon > armor > shield).

### Crafting (`/adventure craft`)

Recipes require materials + gold:

| Target Rarity | Materials | Gold |
|---------------|-----------|------|
| Common | 5 common_shard | 50 |
| Uncommon | 3 uncommon_fragment + 5 common_shard | 150 |
| Rare | 3 rare_essence + 5 uncommon_fragment | 500 |
| Epic | 3 epic_core + 5 rare_essence | 1500 |
| Legendary | 3 legendary_soul + 5 epic_core | 5000 |
| Mythic | 3 mythic_heart + 5 legendary_soul | 15000 |

### Gacha Crates (`/adventure crate`)

| Crate | Shop Cost | Rarity Pool |
|-------|-----------|-------------|
| Bronze | 200 gold | Common 50%, Uncommon 35%, Rare 15% |
| Silver | 800 gold | Uncommon 40%, Rare 35%, Epic 25% |
| Gold | 2500 gold | Rare 35%, Epic 30%, Legendary 25%, Mythic 10% |

Crates drop from dungeon encounters (monster: 5% bronze; treasure: 15% bronze + 5% silver; boss: 50% silver + 15% gold).

## Material System

6 tiers of materials, dropping from dungeons based on floor depth:

| Material | Min Floor | Drop Chance | Qty Range |
|----------|-----------|-------------|-----------|
| Mythic Heart `🟥` | 20 | 2% | 1 |
| Legendary Soul `🟨` | 15 | 5% | 1 |
| Epic Core `🟪` | 10 | 10% | 1 |
| Rare Essence `🟦` | 6 | 20% | 1-2 |
| Uncommon Fragment `🟩` | 3 | 35% | 1-3 |
| Common Shard `⬜` | 1 | 60% | 2-4 |

## Adventurer Guild System

### GuildMember Model

**Collection:** `GuildMembers` (unique index on `userId`)

Tracks: rank, GP (guild points), quests completed, active quests, PvP rating/wins/losses.

### 10 Ranks

| Rank | Label | GP Required | Min Level | Min Boss Kills |
|------|-------|-------------|-----------|----------------|
| F | Novice | 0 | 1 | 0 |
| E | Beginner | 100 | 5 | 1 |
| D | Apprentice | 300 | 10 | 3 |
| C | Intermediate | 700 | 15 | 8 |
| B | Advanced | 1500 | 20 | 15 |
| A | Expert | 3000 | 25 | 25 |
| S | Elite | 6000 | 30 | 40 |
| SS | Master | 12000 | 35 | 60 |
| SSS | Grandmaster | 25000 | 40 | 100 |
| Legendary | Legend | 50000 | 50 | 200 |

### Quests

- **Board quests:** 3 per day, shared across all members (seeded by date). Rank-gated at F, D, B.
- **Personal quests:** 2 per day, unique per user (seeded by userId + date).
- **12 quest action types:** kill_monsters, reach_floor, defeat_boss, earn_gold, craft_equipment, open_crates, collect_materials, use_work, use_fish, send_messages, use_pray, complete_quests.
- Targets scale by rank. Rewards scale by rank (GP, gold multiplier, exp multiplier, material/crate chance).
- Fire-and-forget tracking via `GuildQuestService.trackProgress()`.

### Branch Guilds

**Collection:** `BranchGuilds` (unique index on `guildId`)

Per-server branches created via `/guild-admin setup`. Config: name, quest channel.

**Weekly quests:** 3 cooperative quests per week. Targets scaled by `ceil(memberCount / 5)`, capped at 20x. Progress tracked in Redis (`branch_quest:{guildId}:{weekKey}`, TTL 8 days). Reward tiers based on quests completed (3/2/1).

**Monthly events:** 6 rotating themes (Boss Slayer, Gold Rush, Monster Hunter, Master Crafter, Quest Champion, Material Collector). Per-capita scoring. Top 3 servers get crate rewards. Scores stored in Redis (`event_score:{monthKey}:{guildId}`, TTL 32 days).

## PvP System

- `/pvp challenge @user` initiates a match
- Both players choose actions simultaneously (private buttons)
- Actions revealed and resolved together each turn
- Max 10 turns. PvP damage modifier: 0.6x
- Cooldown: 5 minutes between matches
- Rewards: Winner gets 100 gold, 20 GP, +25 rating. Loser gets 5 GP, -10 rating
- Starting rating: 1000 (Elo-style)

### PvP Match State

Stored in Redis (`pvp_match:{matchId}`, TTL 600s). Tracks both players' HP/MP/stats/actions/effects. Auto-defend after timeout (max 2 auto-defends before forfeit).

## Key Redis Keys

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `dungeon_run:{userId}` | 900s | Active dungeon run state |
| `dungeon_combat:{userId}` | 120s | Active combat encounter |
| `dungeon_cd:{userId}` | 600s | Dungeon cooldown |
| `pvp_match:{matchId}` | 600s | PvP match state |
| `pvp_cd:{userId}` | 300s | PvP cooldown |
| `team_party:{partyId}` | 1800s | Team dungeon party state |
| `team_cd:{userId}` | 600s | Team dungeon cooldown |
| `branch_quest:{guildId}:{weekKey}` | 691200s | Weekly branch quest progress |
| `event_score:{monthKey}:{guildId}` | 2764800s | Monthly event score |

## Key MongoDB Collections

| Collection | Model | Index |
|------------|-------|-------|
| `Characters` | `character.model.ts` | `userId` (unique) |
| `Equipment` | `equipment.model.ts` | `ownerId`, `ownerId+equipped` |
| `GuildMembers` | `guildMember.model.ts` | `userId` (unique), `gp DESC`, `pvpRating DESC` |
| `BranchGuilds` | `branchGuild.model.ts` | `guildId` (unique) |

## Config Files

| File | Contents |
|------|----------|
| `rpg.config.ts` | Classes, base stats, growth rates, skills, equipment slots/rarities, monster scaling, MP config, materials, craft recipes, crates, advanced classes, advancement requirements |
| `guild.config.ts` | 10 adventurer ranks, 12 quest templates with rank-scaled targets, reward scaling, seeded PRNG |
| `branch.config.ts` | Weekly quest actions/templates/rewards, monthly event themes/rewards, week/month key helpers |

## Commands

| Command | File | Subcommands |
|---------|------|-------------|
| `/adventure` | `adventure.ts` | create, profile, equip, inventory, unequip, craft, crate, shop, advance |
| `/guild` | `guild.ts` | register, profile, board, quests, ranking, branch, event |
| `/guild-admin` | `guild-admin.ts` | setup, config, disband |
| `/pvp` | `pvp.ts` | challenge, stats |

## Button Handlers

| Button | File | Context |
|--------|------|---------|
| `dungeon_skill1` | `dungeonSkill1.button.ts` | Class skill 1 in dungeon combat |
| `dungeon_skill2` | `dungeonSkill2.button.ts` | Class skill 2 in dungeon combat |
| `dungeon_ultimate` | `dungeonUltimate.button.ts` | Ultimate skill (advanced classes only) |

Existing dungeon buttons (attack, defend, run, continue, leave, merchant actions) remain unchanged.

## Cross-References

- **Economy system:** [economy-system.md](economy-system.md) -- dungeon still awards per-guild coins
- **Global wallet:** [global-wallet.md](global-wallet.md) -- star drops from dungeon
- **Quest system:** [quest-system.md](quest-system.md) -- daily quests (separate from guild quests)
- **Achievement system:** [achievement-system.md](achievement-system.md) -- dungeon/combat achievements
- **Premium system:** [premium-system.md](premium-system.md) -- dungeon cooldown tiers
