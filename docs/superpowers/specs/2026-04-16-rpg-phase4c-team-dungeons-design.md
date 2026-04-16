# RPG Phase 4C: Team Dungeons Design

**Date:** 2026-04-16
**Status:** Approved

## Overview

Phase 4C adds cooperative team dungeons where 2-4 players explore together. All party members choose actions simultaneously each turn. Monsters scale by party size. Rewards split among members. Reuses existing dungeon mechanics + PvP simultaneous turn pattern.

## Party System

### `/dungeon team` Subcommand

```
/dungeon team
→ Check: character exists, guild member, cooldown
→ Create party lobby embed with [Join] button
→ Others click Join (2-4 players total including leader)
→ Leader clicks [Start] when ≥ 2 members
→ Dungeon run begins
```

### Party Lobby

```
🏰 Team Dungeon — Party Lobby

Leader: @user1 (Berserker ⚔️ Lv.25)
Members: 1/4

[🎮 Join] [▶️ Start (need 2+)]
```

After joins:
```
🏰 Team Dungeon — Party Lobby

Party (3/4):
1. @user1 — Berserker ⚔️ Lv.25 (Leader)
2. @user2 — Archmage 🔮 Lv.22
3. @user3 — Priest 🙏 Lv.20

[🎮 Join] [▶️ Start]
```

Lobby timeout: 120s. Start button enabled when ≥ 2 members.

### Party State (Redis)

```typescript
interface TeamPartyState {
    partyId: string;
    leaderId: string;
    members: {
        userId: string;
        classType: string;
        advancedClass: string | null;
        level: number;
        hp: number;
        maxHp: number;
        mp: number;
        maxMp: number;
        stats: StatBlock;
        alive: boolean;          // false = downed
        ultimateUsed: boolean;
    }[];
    floor: number;
    checkpoint: number;
    encountersLeft: number;
    turn: number;
    actions: Record<string, string>;  // userId → action (collected per turn)
    messageId: string;
    channelId: string;
    locale: string;
}
```

Redis key: `team_dungeon:{partyId}`, TTL: 1800 (30 min max run).

## Monster Scaling

```typescript
function scaleMonsterStats(baseStats: MonsterStats, partySize: number): MonsterStats {
    const scale = 1 + 0.5 * (partySize - 1);
    return {
        hp: Math.floor(baseStats.hp * scale),
        str: Math.floor(baseStats.str * scale),
        def: Math.floor(baseStats.def * scale),
        mag: Math.floor(baseStats.mag * scale),
        magDef: Math.floor(baseStats.magDef * scale),
        spd: Math.floor(baseStats.spd * scale),
    };
}
```

| Party Size | Monster Scale | Example (floor 10 monster HP) |
|-----------|---------------|------------------------------|
| 2 | 1.5x | 345 |
| 3 | 2.0x | 460 |
| 4 | 2.5x | 575 |

Boss stats: scaled AFTER 2x boss multiplier. So 4-player boss = `base * 2 * 2.5 = 5x`.

## Team Combat

### Simultaneous Turn System

Same pattern as PvP — all players choose actions at the same time:

1. Channel message shows monster HP + all player HPs
2. All alive players click buttons to choose action (30s timeout, auto-defend)
3. Once all submitted → resolve turn
4. Monster attacks a random alive player (or splits damage among all)

### Monster Attack Distribution

Monster attacks **all alive players** but with reduced per-target damage:

```typescript
monsterDamagePerTarget = Math.floor(totalMonsterDamage / aliveCount)
```

This encourages keeping all members alive (more targets = less damage each).

### Action Resolution Order

1. Sort players by SPD (highest first)
2. Apply each player's action in order
3. Monster attacks all alive players
4. Tick status effects
5. MP regen (+5 passive, +15 if defended)

### Downed Players

When a player's HP ≤ 0:
- Status = "downed" (`alive: false`)
- Cannot act (buttons disabled)
- **Priest Resurrection ultimate** can revive downed allies
- If ALL players downed → team wipe → run ends

### Priest Revive Mechanic (team-specific)

In team dungeons, Priest's `resurrection` ultimate works differently:
- **Solo dungeon:** passive self-revive
- **Team dungeon:** active — targets a random downed ally, revives at 50% HP

### Turn Display

```
🏰 Team Dungeon — Floor 12 | Turn 2/5

🐉 Dragon HP: **345**/460

Party:
⚔️ @user1 (Berserker) — HP: 95/120 | MP: 55/100
🔮 @user2 (Archmage) — HP: 42/80 | MP: 35/80
🙏 @user3 (Priest) — HP: 78/100 | MP: 60/90

Choose your action! (30s)
[⚔️] [✨] [🔥] [🛡️] [💥]
```

After resolve:
```
🏰 Team Dungeon — Floor 12 | Turn 2 Result

@user1 used Power Strike → dealt 48 damage
@user2 used Fireball → dealt 62 damage
@user3 used Holy Light → dealt 35 damage
🐉 Dragon attacks → 15 damage to each

🐉 Dragon HP: **200**/460

Party:
⚔️ @user1 — HP: 80/120 | MP: 40/100
🔮 @user2 — HP: 27/80 | MP: 10/80
🙏 @user3 — HP: 63/100 | MP: 45/90
```

## Rewards

### Split Rules

| Reward type | Split method |
|------------|-------------|
| Gold | Total ÷ partySize (equal split) |
| EXP | Total ÷ partySize (equal split) |
| Materials | Each player rolls independently |
| Equipment | Each player rolls independently (lower chance: base ÷ 2) |
| Crates | Each player rolls independently (lower chance: base ÷ 2) |
| GP (guild quest) | Each player gets full amount (not split) |

Gold/EXP base rewards scale with party size:
```typescript
totalGold = soloGold * (1 + 0.3 * (partySize - 1))
// 2 players: 1.3x solo, split 2 = 0.65x each
// 4 players: 1.9x solo, split 4 = 0.475x each
// Slightly less per person but more total — incentivizes teamplay
```

### Floor Progression

Uses **leader's** `dungeonDepth` and `dungeonCheckpoint`. All party members gain the floor progression (their individual `dungeonDepth` updated to match leader's new floor after run).

## Service

### `src/services/rpg/teamDungeon.service.ts`

```typescript
// Party management
async function createParty(leaderId: string, locale: string): Promise<TeamPartyState>
async function joinParty(partyId: string, userId: string): Promise<boolean>
async function getParty(partyId: string): Promise<TeamPartyState | null>
async function startRun(partyId: string): Promise<void>

// Combat
async function submitAction(partyId: string, userId: string, action: string): Promise<boolean>
async function allSubmitted(partyId: string): Promise<boolean>
async function resolveTurn(partyId: string): Promise<TeamTurnResult>

// Encounter processing
async function processTeamEncounter(party: TeamPartyState): Promise<TeamEncounterResult>

// Rewards
async function distributeRewards(party: TeamPartyState, floor: number, source: string): Promise<void>
```

## `/dungeon team` Implementation

Add `team` subcommand to existing `/dungeon` command.

### Flow:

1. **Lobby phase:** collector on lobby message (120s). Join button adds member. Start button begins run.
2. **Encounter loop:** same structure as solo (5 encounters, monster/treasure/trap/merchant)
3. **Combat turns:** collector on combat message. All alive members submit actions. Auto-defend on timeout. Resolve. Edit message with reveal.
4. **Run end:** distribute rewards, update all members' floor progression, set cooldown for all.

## Files

### New Files

| File | Purpose |
|------|---------|
| `src/services/rpg/teamDungeon.service.ts` | Party management, scaled combat, team rewards |

### Modified Files

| File | Changes |
|------|---------|
| `src/commands/slash/dungeon.ts` | Add `team` subcommand + party lobby + team combat loop |
| `src/locales/*.json` (15 files) | ~25 new i18n keys |

## i18n Keys (~25)

| Key | EN |
|-----|-----|
| `dungeon.team.title` | `🏰 Team Dungeon` |
| `dungeon.team.lobby` | `Party Lobby` |
| `dungeon.team.leader` | `Leader: <@{{user}}> ({{class}} Lv.{{level}})` |
| `dungeon.team.members` | `Party ({{current}}/4):` |
| `dungeon.team.member` | `{{index}}. <@{{user}}> — {{class}} Lv.{{level}}` |
| `dungeon.team.join` | `Join` |
| `dungeon.team.start` | `Start` |
| `dungeon.team.need_more` | `Need at least 2 players to start.` |
| `dungeon.team.full` | `Party is full (4/4).` |
| `dungeon.team.joined` | `Joined the party!` |
| `dungeon.team.already_in` | `Already in the party.` |
| `dungeon.team.no_character` | `You need a character to join.` |
| `dungeon.team.started` | `Dungeon run started with {{size}} adventurers!` |
| `dungeon.team.turn` | `Turn {{turn}}/{{max}} — Choose your action! (30s)` |
| `dungeon.team.waiting` | `Waiting for party members...` |
| `dungeon.team.downed` | `<@{{user}}> is downed!` |
| `dungeon.team.revived` | `<@{{user}}> was revived by <@{{healer}}>!` |
| `dungeon.team.wipe` | `Team wiped! All members downed.` |
| `dungeon.team.monster_attack` | `{{monster}} attacks → {{damage}} damage to each` |
| `dungeon.team.result` | `Run complete! Floor {{floor}} reached.` |
| `dungeon.team.reward_split` | `Rewards (per member): +{{gold}} Gold + {{exp}} EXP` |
| `dungeon.team.lobby_timeout` | `Lobby expired.` |
| `dungeon.team.cooldown` | `You're on dungeon cooldown.` |
| `dungeon.team.in_party` | `You're already in a party.` |
| `cmd.dungeon.team.desc` | `Start a team dungeon run (2-4 players)` |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Leader leaves mid-run | Next member becomes leader, run continues |
| All but 1 downed | Remaining player fights alone (monster damage not split) |
| Player on cooldown tries to join | Rejected with cooldown message |
| Party of 2, one disconnects | 30s auto-defend × 3 → forfeit that player, other continues solo |
| Treasure encounter in team | Each player rolls independently for drops |
| Merchant in team | Leader makes purchase decision for party |
| Boss in team | Scaled: boss base × 2 × party scale. Much harder. |
| Mixed floors (different members) | Uses leader's floor. All members updated after run. |
