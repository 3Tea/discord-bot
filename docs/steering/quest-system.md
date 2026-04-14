# Quest System

> Steering doc for AI assistants and contributors. Covers the daily quest system — generation, tracking, rewards, streaks, and premium integration.

## Overview

Each user receives 3 random quests per day (1 easy + 1 medium + 1 hard), generated deterministically from `hash(userId + UTCDate)`. Quests are completed by using existing bot commands. Rewards are hybrid: coin (per-server) + star (global). Premium tiers get better rewards. Quest streaks give bonus stars.

## Commands

| Command | Description |
|---------|-------------|
| `/quest view` | View today's 3 quests with progress |
| `/quest claim` | Claim all-3-complete bonus (star + streak) |

## Quest Pool (18 templates)

### Easy (pick 1/day)

| ID | Quest | Trigger | Count |
|----|-------|---------|-------|
| `e_pray` | Pray for someone | `pray_target` | 1 |
| `e_curse` | Curse someone | `curse_target` | 1 |
| `e_rank` | Check your rank | `rank` | 1 |
| `e_balance` | Check your balance | `balance` | 1 |
| `e_wallet` | View wallet | `wallet_view` | 1 |
| `e_daily` | Claim daily stars | `wallet_daily` | 1 |

### Medium (pick 1/day)

| ID | Quest | Trigger | Count |
|----|-------|---------|-------|
| `m_work` | Work a job | `work` | 1 |
| `m_fish` | Catch a fish | `fish` | 1 |
| `m_mine` | Mine for minerals | `mine` | 1 |
| `m_gift` | Gift coins to someone | `gift` | 1 |
| `m_confess` | Submit a confession | `confession` | 1 |
| `m_shop` | Browse the shop | `shop_view` | 1 |

### Hard (pick 1/day)

| ID | Quest | Trigger | Count |
|----|-------|---------|-------|
| `h_dungeon` | Complete a dungeon run | `dungeon` | 1 |
| `h_mine2` | Mine 2 times | `mine` | 2 |
| `h_gamble_win` | Win a gamble | `gamble_win` | 1 |
| `h_pray_curse` | Pray + Curse same day | `pray` + `curse` | 2 |
| `h_fish2` | Fish 2 times | `fish` | 2 |
| `h_rob_success` | Rob successfully | `rob_success` | 1 |

## Generation

Deterministic via `SHA-256(userId:date:difficulty)`. Same user + same UTC day = same quests. No DB write needed for generation — quests are computed on demand.

## Rewards

### Per-quest (coin, paid to server where command used)

| Difficulty | Free | Star | Galaxy |
|-----------|------|------|--------|
| Easy | 10 | 15 | 20 |
| Medium | 20 | 30 | 40 |
| Hard | 35 | 50 | 70 |

### All-3-complete bonus (star, global wallet, requires `/quest claim`)

| | Free | Star | Galaxy |
|---|------|------|--------|
| Stars | 1 | 2 | 3 |

### Quest streak milestones

| Streak | Free | Star | Galaxy |
|--------|------|------|--------|
| 3 days | +1 | +2 | +3 |
| 7 days | +3 | +5 | +8 |
| 14 days | +5 | +8 | +12 |
| 30 days | +10 | +15 | +20 |

Missing a day resets streak to 0.

## Progress Tracking

Inline pattern — each command calls `QuestService.trackProgress(userId, guildId, trigger)` after successful execution. Returns `TrackResult` with optional quest completion notification.

14 commands integrated: pray, curse, rank, balance, wallet (view+daily), work, fish, mine, gift, confession, shop, dungeon, gamble, rob.

## Data Model

### UserQuest (Collection: `UserQuests`)

| Field | Type | Default |
|-------|------|---------|
| `userId` | String | required |
| `date` | String | required ("2026-04-14") |
| `quests` | Array of QuestProgress | [] |
| `claimed` | Boolean | false |
| `questStreak` | Number | 0 |
| `lastQuestDate` | String / null | null |

QuestProgress: `{ questId, progress, target, completed, rewardPaid }`

Index: `{ userId: 1, date: 1 }` (unique)

### Transaction Types

| Type | Context |
|------|---------|
| `quest_reward` | Per-quest coin reward |
| `quest_complete` | All-3 star bonus |
| `quest_streak` | Streak milestone star bonus |

## Redis

| Key | Value | TTL |
|-----|-------|-----|
| `quest:{userId}:{date}` | JSON quest progress | Until UTC midnight |

## File Map

| File | Purpose |
|------|---------|
| `src/models/userQuest.model.ts` | UserQuest schema |
| `src/services/quest/quest.config.ts` | Quest pool, rewards, generation |
| `src/services/quest/quest.service.ts` | trackProgress, claim, streak |
| `src/commands/slash/quest.ts` | /quest view + claim |
