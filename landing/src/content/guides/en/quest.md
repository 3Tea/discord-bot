---
title: Daily Quests
description: Complete three rotating daily quests for coins, stars, and streak milestone bonuses.
icon: "📜"
order: 12
relatedCommands: ["quest", "pray", "curse", "work", "fish", "mine", "dungeon", "gamble", "rob", "wallet", "gift", "shop"]
---

## Overview

The Quest system gives you **3 daily objectives**:

- **1 Easy quest**
- **1 Medium quest**
- **1 Hard quest**

You complete them by using normal bot commands in your server activity. Quests are designed to reward regular gameplay with:

- **Coins** (server economy) for each quest you finish
- **Stars** (global wallet) when all 3 are completed and claimed
- **Extra stars** from streak milestones

## Quick Start (2 minutes)

1. Run `/quest view` to check your 3 quests for today.
2. Complete each quest by doing normal commands shown in the quest text.
3. Run `/quest view` again anytime to track progress.
4. When all 3 are complete, run `/quest claim`.
5. Repeat daily to build your quest streak.

## Daily Reset and Rotation

- Quests reset at **00:00 UTC** every day.
- Your quest set is deterministic per user per UTC date, so your list is stable for the whole day.
- If you skip a day, your streak resets.

> **Tip:** If you are in Vietnam (UTC+7), reset is at **07:00 AM** local time.

## Quest Difficulty and Base Rewards

Each day includes one quest from each difficulty:

| Difficulty | Typical Actions | Base Coin Reward (Free) |
|-----------|------------------|-------------------------|
| Easy | Pray for someone, check rank/balance/wallet | 10 coin |
| Medium | Work, fish, mine, gift, confession, shop view | 20 coin |
| Hard | Dungeon clear, mine/fish twice, gamble win, successful rob | 35 coin |

Coin rewards are paid automatically when each quest completes.

## Premium Reward Scaling

Premium increases coin rewards per quest and star rewards for complete + streak bonuses.

### Per-quest Coin Rewards

| Difficulty | Free | Star Tier | Galaxy Tier |
|-----------|------|-----------|-------------|
| Easy | 10 | 15 | 20 |
| Medium | 20 | 30 | 40 |
| Hard | 35 | 50 | 70 |

### All-Complete Star Bonus (`/quest claim`)

| Tier | Bonus |
|------|-------|
| Free | +1 star |
| Star | +2 star |
| Galaxy | +3 star |

## Streak Milestones

Your quest streak grows when you complete and claim all 3 quests on consecutive UTC days.

| Milestone | Free | Star Tier | Galaxy Tier |
|-----------|------|-----------|-------------|
| 3 days | +1 star | +2 star | +3 star |
| 7 days | +3 star | +5 star | +8 star |
| 14 days | +5 star | +8 star | +12 star |
| 30 days | +10 star | +15 star | +20 star |

Missing one day resets the streak to 0.

## How Progress Is Counted

Progress updates only when the relevant command action succeeds. Example:

- `Win a gamble` only counts on a winning outcome.
- `Rob successfully` only counts on successful theft.
- `Mine 2 times` requires two successful mine actions.

If a command fails, times out, or gets canceled, it usually does not advance quest progress.

## Claim Logic (Important)

- Finishing all 3 quests does **not** auto-grant star completion reward.
- You must run `/quest claim` to receive:
  - All-complete star reward
  - Any eligible streak milestone bonus
- Claim once per day after all 3 are done.

## Efficient Daily Routine

Use this order to clear quests quickly:

1. Start with Easy quest for fast momentum.
2. Complete Medium quest while doing normal economy activity (`/work`, `/fish`, `/mine`, etc.).
3. Save Hard quest for focused play session (`/dungeon`, `gamble win`, or multi-attempt tasks).
4. Run `/quest claim` immediately after all 3 are done.
5. Check `/wallet view` to verify star gains.

## Common Mistakes

| Mistake | What Happens | Fix |
|--------|---------------|-----|
| Forgetting `/quest claim` | No all-complete star reward | Claim before UTC reset |
| Waiting until last minute | Risk losing streak at reset | Finish early in your day |
| Assuming all actions count | Some quests require success events | Read quest wording carefully |
| Skipping one day | Streak resets to 0 | Keep a daily reminder |

## Command Reference

| Command | Purpose |
|---------|---------|
| `/quest view` | Show today's quests and progress |
| `/quest claim` | Claim all-complete and streak rewards |
| `/wallet view` | Check total global stars |

For quest details in command form, see the [`/quest` command page](/en/commands/quest).
