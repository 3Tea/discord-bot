---
title: Mine
command: mine
category: economy
description: Mine for minerals at increasing depth — risk collapse but earn bigger rewards deeper.
cooldown: "2h"
---

## Usage

```
/mine
```

## How It Works

Dig underground for minerals! Each successful mine finds a random mineral and pushes you **one floor deeper**. The deeper you go, the better the rewards — but the higher the chance of a **collapse** that costs coins and resets your depth.

### Mineral Table

| Mineral | Chance | Coin Reward | Depth Bonus |
|---------|--------|-------------|-------------|
| 🪨 Stone | 45% | 10–30 | +depth × 2 |
| ⛓️ Iron | 28% | 40–80 | +depth × 3 |
| 🥇 Gold | 15% | 100–200 | +depth × 5 |
| 💎 Diamond | 8% | 300–500 | +depth × 8 |
| 🟢 Emerald | 4% | 500–800 | +depth × 12 |

Rewards scale with depth — at depth 20, even a Stone gives +40 bonus coins on top of its base reward.

### Collapse Risk

| Depth | Collapse Chance |
|-------|-----------------|
| 1–5 | 5% |
| 6–10 | 10% |
| 11+ | 15% |

On collapse you lose 50–100 coins and your depth resets to your last **checkpoint**.

### Checkpoints

Your progress is automatically saved at **prime-numbered depths** (2, 3, 5, 7, 11, 13, 17, 19, 23, 29...). When you collapse, you fall back to your last checkpoint instead of starting over.

### Star Drops

Every successful mine has a **4% chance** to award 1 star to your global wallet.

> **Tip:** The risk-reward sweet spot is around depth 6–10. Collapse chance is only 10% but depth bonuses start adding up significantly!
