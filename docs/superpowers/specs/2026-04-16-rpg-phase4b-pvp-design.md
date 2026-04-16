# RPG Phase 4B: PvP System Design

**Date:** 2026-04-16
**Status:** Approved

## Overview

Phase 4B adds player-vs-player battles with simultaneous turn selection. Players challenge each other, both choose actions privately (ephemeral), then results reveal simultaneously. Elo-style rating tracks PvP performance.

## PvP Challenge Flow

```
/pvp @user
→ Check: both have characters + guild membership
→ Check: cooldown (5min between matches)
→ Challenge embed in channel: "@user challenged by @challenger!"
→ Accept/Decline buttons (60s timeout)
→ Decline/timeout → "Challenge declined"
→ Accept → Combat begins
```

## Combat Mechanics

### Simultaneous Turn System

Each turn:
1. Both players receive **ephemeral** action selection (5 buttons, 30s timeout)
2. If a player doesn't choose in 30s → auto-"Defend"
3. Once both choose → **reveal embed** in channel showing both actions + results
4. Repeat until HP ≤ 0 or 10 turns max

### Actions Available

Same as dungeon combat — based on class + advanced class:
- ⚔️ Attack (basic, 0 MP)
- ✨ Skill 1 (20 MP)
- 🔥 Skill 2 (30 MP)
- 🛡️ Defend (50% dmg reduction + 5% heal + 15 MP regen)
- 💥 Ultimate (50 MP, 1 per match — advanced classes only)

### Damage Formula (PvP-adjusted)

Same base formula as PvE but with **PvP damage reduction (0.6x)** to make fights last longer:

```
Physical: floor((attackerSTR * 1.5 + weaponSTR) * skillMultiplier * 0.6 - defenderDEF * 0.5)
Magical:  floor((attackerMAG * 1.5 + weaponMAG) * skillMultiplier * 0.6 - defenderMAG_DEF * 0.5)
Minimum: 1
```

### Turn Resolution Order

Both actions resolve simultaneously — both deal damage. However, speed determines **who hits first** (matters for kills):
- Higher SPD player's action resolves first
- If SPD equal, both resolve truly simultaneously

### Special Cases

| Scenario | Resolution |
|----------|-----------|
| Both attack | Both take damage |
| Both defend | Both heal 5% + regen MP, no damage |
| Attack vs Defend | Attacker deals 50% damage, defender heals |
| Skill vs Skill | Both skills execute, both take damage |
| Both die same turn | Higher SPD player wins (they hit first) |
| 10 turns, both alive | Player with higher HP% wins |

### Status Effects in PvP

Same as PvE — poison, DEF buff, SPD debuff all work. Applied to the opponent.

## Turn Display

### Ephemeral Action Selection (per player)

```
⚔️ PvP — Turn 3/10
Your HP: 85/120 | MP: 45/100
Opponent HP: 72/95

Choose your action:
[⚔️ Attack] [✨ Skill1] [🔥 Skill2] [🛡️ Defend] [💥 Ultimate]
```

Buttons disabled when: MP insufficient, ultimate already used.

### Reveal Embed (in channel)

```
⚔️ PvP — Turn 3 Result

@challenger (Berserker ⚔️): Used Power Strike → dealt 42 damage
@defender (Archmage 🔮): Used Ice Shard → dealt 38 damage + SPD -30%

@challenger HP: 47/120 | MP: 35/100
@defender HP: 30/95 | MP: 25/80
```

### Match End Embed

```
⚔️ PvP Result — @challenger WINS!

@challenger (Berserker ⚔️): HP 23/120
@defender (Archmage 🔮): HP 0/95

Duration: 5 turns
Rewards: @challenger +20 GP, +100 Gold
```

## Rewards & Rating

### Win Rewards

| Reward | Amount |
|--------|--------|
| GP | +20 |
| Gold | +100 |
| PvP Rating | +25 |

### Loss

| Reward | Amount |
|--------|--------|
| GP | +5 (participation) |
| Gold | 0 |
| PvP Rating | -10 |

PvP Rating minimum = 0 (can't go negative).

### PvP Rating

Added to `GuildMemberModel`:
```typescript
pvpRating: number;  // default 1000 (starting Elo)
pvpWins: number;    // default 0
pvpLosses: number;  // default 0
```

## PvP Service

### `src/services/rpg/pvp.service.ts`

Key functions:

```typescript
// Create a PvP match state in Redis
async function createMatch(challengerId: string, defenderId: string): Promise<PvPMatchState>

// Get match state
async function getMatch(matchId: string): Promise<PvPMatchState | null>

// Submit action for a player
async function submitAction(matchId: string, userId: string, action: string): Promise<boolean>

// Check if both players have submitted
async function bothSubmitted(matchId: string): Promise<boolean>

// Resolve turn — apply both actions simultaneously
async function resolveTurn(matchId: string): Promise<TurnResult>

// End match — distribute rewards
async function endMatch(matchId: string, winnerId: string, loserId: string): Promise<void>
```

### PvP Match State (Redis)

```typescript
interface PvPMatchState {
    matchId: string;
    challengerId: string;
    defenderId: string;
    challengerHp: number;
    challengerMaxHp: number;
    challengerMp: number;
    challengerMaxMp: number;
    challengerStats: StatBlock;
    challengerClass: string;
    challengerAdvanced: string | null;
    defenderHp: number;
    defenderMaxHp: number;
    defenderMp: number;
    defenderMaxMp: number;
    defenderStats: StatBlock;
    defenderClass: string;
    defenderAdvanced: string | null;
    turn: number;
    maxTurns: number;            // 10
    challengerAction: string | null;
    defenderAction: string | null;
    challengerUltimateUsed: boolean;
    defenderUltimateUsed: boolean;
    challengerEffects: StatusEffect[];
    defenderEffects: StatusEffect[];
    messageId: string;
    channelId: string;
}
```

Redis key: `pvp_match:{matchId}`, TTL: 600 (10 min max match duration).

### Turn Result

```typescript
interface TurnResult {
    challengerAction: string;
    defenderAction: string;
    challengerDamageDealt: number;
    defenderDamageDealt: number;
    challengerHp: number;
    defenderHp: number;
    challengerMp: number;
    defenderMp: number;
    challengerHealed: number;
    defenderHealed: number;
    statusEffects: string[];     // descriptions of effects applied
    matchOver: boolean;
    winnerId: string | null;
}
```

## `/pvp` Command

### Subcommands

| Command | Description |
|---------|-------------|
| `/pvp challenge @user` | Challenge another player |
| `/pvp stats` | View your PvP record (wins/losses/rating) |

### Challenge Flow Implementation

1. Defer reply
2. Validate both players (character, guild member, not self, cooldown)
3. Send challenge embed with Accept/Decline buttons
4. On accept: create match via `PvPService.createMatch()`
5. Start turn loop:
   a. Send ephemeral action select to both players
   b. Await both submissions (30s timeout each, auto-defend on timeout)
   c. Resolve turn via `PvPService.resolveTurn()`
   d. Edit channel message with reveal embed
   e. Check win/loss/max turns
6. End match: distribute rewards, show result embed

### Cooldown

Redis key: `pvp_cd:{userId}`, TTL: 300 (5 minutes).

## Files

### New Files

| File | Purpose |
|------|---------|
| `src/services/rpg/pvp.service.ts` | PvP match state, action submission, turn resolution, rewards |
| `src/commands/slash/pvp.ts` | `/pvp challenge` and `/pvp stats` commands |

### Modified Files

| File | Changes |
|------|---------|
| `src/models/guildMember.model.ts` | Add `pvpRating`, `pvpWins`, `pvpLosses` fields |
| `src/locales/*.json` (15 files) | ~30 new i18n keys |

## i18n Keys (~30)

| Key | EN |
|-----|-----|
| `pvp.challenge.title` | `⚔️ PvP Challenge!` |
| `pvp.challenge.desc` | `<@{{defender}}>, you've been challenged by <@{{challenger}}>!` |
| `pvp.challenge.accept` | `Accept` |
| `pvp.challenge.decline` | `Decline` |
| `pvp.challenge.declined` | `Challenge declined.` |
| `pvp.challenge.timeout` | `Challenge expired.` |
| `pvp.challenge.self` | `You can't challenge yourself!` |
| `pvp.challenge.cooldown` | `PvP cooldown: wait **{{time}}**.` |
| `pvp.challenge.no_character` | `Both players need a character to PvP.` |
| `pvp.challenge.no_guild` | `Both players need guild membership to PvP.` |
| `pvp.turn.title` | `⚔️ PvP — Turn {{turn}}/{{max}}` |
| `pvp.turn.select` | `Choose your action:` |
| `pvp.turn.your_stats` | `Your HP: **{{hp}}**/{{maxHp}} \| MP: **{{mp}}**/{{maxMp}}` |
| `pvp.turn.opponent_stats` | `Opponent HP: **{{hp}}**/{{maxHp}}` |
| `pvp.turn.waiting` | `Waiting for opponent...` |
| `pvp.turn.timeout_defend` | `Time's up — auto-Defend.` |
| `pvp.reveal.title` | `⚔️ PvP — Turn {{turn}} Result` |
| `pvp.reveal.action` | `<@{{user}}> ({{class}}): Used **{{skill}}** → dealt **{{damage}}** damage` |
| `pvp.reveal.defend` | `<@{{user}}> ({{class}}): **Defended** — healed **{{heal}}** HP` |
| `pvp.reveal.status` | `<@{{user}}> HP: **{{hp}}**/{{maxHp}} \| MP: **{{mp}}**/{{maxMp}}` |
| `pvp.result.title` | `⚔️ PvP Result` |
| `pvp.result.winner` | `<@{{winner}}> WINS!` |
| `pvp.result.draw` | `Draw! Both survived {{turns}} turns.` |
| `pvp.result.reward_win` | `Winner: +{{gp}} GP, +{{gold}} Gold` |
| `pvp.result.reward_lose` | `Loser: +{{gp}} GP (participation)` |
| `pvp.stats.title` | `⚔️ PvP Stats — {{username}}` |
| `pvp.stats.rating` | `Rating: **{{rating}}**` |
| `pvp.stats.record` | `Record: **{{wins}}**W / **{{losses}}**L` |
| `cmd.pvp.desc` | `Player vs Player battles` |
| `cmd.pvp.challenge.desc` | `Challenge another player to a PvP battle` |
| `cmd.pvp.stats.desc` | `View your PvP record and rating` |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Challenged user offline | Challenge expires after 60s |
| Player disconnects mid-match | 30s timeout → auto-defend. After 3 auto-defends → forfeit. |
| Both players die same turn | Higher SPD wins |
| 10 turns, same HP% | Draw — both get participation GP |
| Challenge in DM | Not allowed — needs guild context for tracking |
| Player already in a match | "You're already in a PvP match" |
