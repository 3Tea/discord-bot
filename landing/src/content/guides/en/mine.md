---
title: Mining
description: Master the mining system — learn mineral rarities, depth strategy, checkpoints, and how to maximize coin income.
icon: "⛏️"
order: 10
relatedCommands: ["mine", "balance", "wallet"]
---

## Overview

Mining is a **depth-based progression** system where you dig underground for minerals. Each successful mine pushes you one floor deeper, increasing both rewards and risk. The deeper you go, the more valuable the minerals — but cave-ins become more likely.

## Getting Started

Run `/mine` to start digging. There's a **2-hour cooldown** between digs. No options, no setup — just dig and collect.

## Minerals & Rewards

Every dig rolls a random mineral from this table:

| Mineral | Rarity | Chance | Base Coins | Depth Bonus |
|---------|--------|--------|------------|-------------|
| 🪨 Stone | Common | 45% | 10–30 | +depth × 2 |
| ⛓️ Iron | Uncommon | 28% | 40–80 | +depth × 3 |
| 🥇 Gold | Rare | 15% | 100–200 | +depth × 5 |
| 💎 Diamond | Epic | 8% | 300–500 | +depth × 8 |
| 🟢 Emerald | Legendary | 4% | 500–800 | +depth × 12 |

**Total reward = base coins + (depth × multiplier)**

At depth 20, a Gold ore pays 100–200 base + 100 bonus = 200–300 coins total. An Emerald at depth 30 could yield 500–800 + 360 = 860–1,160 coins!

## Collapse Risk

Mining isn't safe. Every dig rolls a collapse check:

| Depth | Collapse Chance | What Happens |
|-------|-----------------|-------------|
| 1–5 | 5% | Lose 50–100 coins, fall to checkpoint |
| 6–10 | 10% | Lose 50–100 coins, fall to checkpoint |
| 11+ | 15% | Lose 50–100 coins, fall to checkpoint |

You never go into debt — if you have fewer coins than the penalty, you just lose what you have.

## Checkpoints

Your depth is auto-saved at **prime number floors**: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31...

When a collapse happens, you don't restart from floor 1 — you fall back to your last checkpoint. This means the further you progress, the less you lose on collapse.

### Checkpoint Strategy

- **Floors 1–5:** Minimal risk (5%). Push through quickly.
- **Floors 6–10:** Moderate risk (10%). Checkpoint at 7 is your safety net.
- **Floors 11+:** Higher risk (15%), but checkpoints come frequently (11, 13, 17, 19, 23...).

## Star Drops

Every successful mine (no collapse) has a **4% chance** to drop 1 star into your global wallet. Stars are rare and valuable — they work across all servers and can't be modified by admins.

## Maximizing Income

### Daily Mining Schedule

With a 2-hour cooldown, you can mine up to **12 times per day**. Combine with other economy commands for maximum income:

| Command | Cooldown | Expected Income |
|---------|----------|----------------|
| `/mine` | 2h | Varies by depth (50–1,000+ coins) |
| `/work` | 4h | 80–200 coins |
| `/fish` | 1h | 10–600 coins |
| `/pray` | 24h | 50–200 coins + gem chance |
| `/curse` | 24h | 20–100 coins |

### Depth vs. Safety

The depth bonus grows linearly but collapse risk caps at 15%. Past depth 11, the risk stays flat while rewards keep climbing. High depth is always more profitable long-term — checkpoints protect you from catastrophic loss.

## Commands Reference

| Command | Description |
|---------|-------------|
| `/mine` | Mine for minerals (2h cooldown) |
| `/balance` | Check your coin balance |
| `/wallet view` | Check global star balance |
