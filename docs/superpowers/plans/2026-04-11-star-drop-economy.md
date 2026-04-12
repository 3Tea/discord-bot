# Star Drop from Economy Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small chance for economy commands (pray, curse, work, fish) to drop 1 star into the user's global wallet.

**Architecture:** Create a shared `tryStarDrop()` helper in `src/util/economy/starDrop.ts`. Each command calls it after successful coin reward. Add `"star_drop"` transaction type and `star_drop.found` i18n key.

**Tech Stack:** TypeScript, Mongoose (transaction model), WalletService, i18next

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/models/transaction.model.ts` | Modify | Add `"star_drop"` transaction type |
| `src/util/economy/starDrop.ts` | Create | `tryStarDrop()` shared helper |
| `src/commands/slash/pray.ts` | Modify | Call `tryStarDrop()` after reward, append to embed |
| `src/commands/slash/curse.ts` | Modify | Call `tryStarDrop()` after reward, append to embed |
| `src/commands/slash/work.ts` | Modify | Call `tryStarDrop()` after reward, append to embed |
| `src/commands/slash/fish.ts` | Modify | Call `tryStarDrop()` after reward, append to embed |
| `src/locales/*.json` (15 files) | Modify | Add `star_drop.found` key |

---

### Task 1: Add `star_drop` transaction type

**Files:**
- Modify: `src/models/transaction.model.ts:3-28` (TransactionType union)
- Modify: `src/models/transaction.model.ts:44-70` (schema enum array)

- [ ] **Step 1: Add `"star_drop"` to TransactionType union**

After `| "command_refund"` add:

```typescript
    | "star_drop";
```

- [ ] **Step 2: Add `"star_drop"` to schema enum array**

After `"command_refund",` add:

```typescript
                "star_drop",
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(economy): add star_drop transaction type"
```

---

### Task 2: Create `tryStarDrop()` helper

**Files:**
- Create: `src/util/economy/starDrop.ts`

- [ ] **Step 1: Create the helper file**

Create `src/util/economy/starDrop.ts`:

```typescript
import WalletService from "../../services/economy/wallet.service";
import log from "../log/logger.mixed";

/**
 * Rolls for a star drop. If successful, awards 1 star to the user's global wallet.
 * @param userId - The user to potentially award
 * @param rate - Drop probability (0.0 to 1.0)
 * @param source - Command name for transaction metadata
 * @returns true if a star was awarded
 */
export async function tryStarDrop(userId: string, rate: number, source: string): Promise<boolean> {
    if (Math.random() >= rate) return false;

    try {
        await WalletService.addStar(userId, 1, "star_drop", { source });
        return true;
    } catch (error) {
        log(`[star_drop] Failed for ${userId}: ${error instanceof Error ? error.message : "Unknown"}`, "error");
        return false;
    }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/economy/starDrop.ts
git commit -m "feat(economy): create tryStarDrop helper"
```

---

### Task 3: Add i18n key for star drop

**Files:**
- Modify: `src/locales/en.json` and 14 other locale files

- [ ] **Step 1: Add `star_drop.found` to all 15 locale files**

Add the key near other economy-related keys in each file:

| Locale | Value |
|--------|-------|
| en | `"You found a star!"` |
| vi | `"Bạn tìm thấy một ngôi sao!"` |
| id | `"Kamu menemukan bintang!"` |
| es | `"Has encontrado una estrella!"` |
| ja | `"スターを見つけた！"` |
| zh | `"你发现了一颗星星！"` |
| ko | `"스타를 발견했어요!"` |
| pt-BR | `"Você encontrou uma estrela!"` |
| fr | `"Vous avez trouvé une étoile !"` |
| de | `"Du hast einen Stern gefunden!"` |
| it | `"Hai trovato una stella!"` |
| ru | `"Вы нашли звезду!"` |
| tr | `"Bir yıldız buldun!"` |
| pl | `"Znalazłeś gwiazdę!"` |
| nl | `"Je hebt een ster gevonden!"` |

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(i18n): add star_drop.found key for all 15 locales"
```

---

### Task 4: Integrate star drop into pray command

**Files:**
- Modify: `src/commands/slash/pray.ts`

- [ ] **Step 1: Add import**

Add after the existing imports in `src/commands/slash/pray.ts`:

```typescript
import { tryStarDrop } from "../../util/economy/starDrop";
```

- [ ] **Step 2: Add star drop after successful pray**

In the `execute()` function, after `const embed = formatPrayEmbed(interaction, result, locale);` (line 83) and before `await Reply.embedEdit(interaction, embed);` (line 84), insert:

```typescript
            const gotStar = await tryStarDrop(userId, 0.05, "pray");
            if (gotStar) {
                embed.setDescription(embed.data.description + "\n\n⭐ " + t(locale, "star_drop.found"));
            }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/pray.ts
git commit -m "feat(economy): add 5% star drop to pray command"
```

---

### Task 5: Integrate star drop into curse command

**Files:**
- Modify: `src/commands/slash/curse.ts`

- [ ] **Step 1: Add import**

Add after the existing imports in `src/commands/slash/curse.ts`:

```typescript
import { tryStarDrop } from "../../util/economy/starDrop";
```

- [ ] **Step 2: Add star drop after successful curse**

In the `execute()` function, after `const embed = formatCurseEmbed(interaction, result, locale);` (line 67) and before `await Reply.embedEdit(interaction, embed);` (line 68), insert:

```typescript
            const gotStar = await tryStarDrop(userId, 0.05, "curse");
            if (gotStar) {
                embed.setDescription(embed.data.description + "\n\n⭐ " + t(locale, "star_drop.found"));
            }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/curse.ts
git commit -m "feat(economy): add 5% star drop to curse command"
```

---

### Task 6: Integrate star drop into work command

**Files:**
- Modify: `src/commands/slash/work.ts`

- [ ] **Step 1: Add import**

Add after the existing imports in `src/commands/slash/work.ts`:

```typescript
import { tryStarDrop } from "../../util/economy/starDrop";
```

- [ ] **Step 2: Add star drop after reward payout**

In the `execute()` function, after `await redis.setJson(cdKey, 1, config.workCooldown);` (line 68) and before `// Build embed` (line 70), insert:

```typescript
            const gotStar = await tryStarDrop(userId, 0.04, "work");
```

Then modify the embed description array (line 75-78) to append the star drop line. Replace the embed building block:

```typescript
            const flavorText = t(locale, `work.texts.${textIndex}`);
            const descLines = [
                t(locale, "work.flavor", { username: interaction.user.username, text: flavorText }),
                t(locale, "work.reward", { amount: String(reward) }),
            ];
            if (gotStar) {
                descLines.push("\n⭐ " + t(locale, "star_drop.found"));
            }
            const embed = new EmbedBuilder()
                .setTitle(`💼 ${t(locale, "work.title")}`)
                .setDescription(descLines.join("\n"))
                .setColor(0x57f287);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/work.ts
git commit -m "feat(economy): add 4% star drop to work command"
```

---

### Task 7: Integrate star drop into fish command

**Files:**
- Modify: `src/commands/slash/fish.ts`

- [ ] **Step 1: Add import**

Add after the existing imports in `src/commands/slash/fish.ts`:

```typescript
import { tryStarDrop } from "../../util/economy/starDrop";
```

- [ ] **Step 2: Add star drop after reward payout**

In the `execute()` function, after `await redis.setJson(cdKey, 1, config.fishCooldown);` (line 72) and before `// Build embed` (line 74), insert:

```typescript
            const gotStar = await tryStarDrop(userId, 0.03, "fish");
```

Then modify the embed description array (line 79-82) to append the star drop line. Replace the embed building block:

```typescript
            const fishName = t(locale, fish.name);
            const rarityLabel = t(locale, `fish.rarity.${fish.rarity}`);
            const descLines = [
                t(locale, "fish.catch", { emoji: fish.emoji, fish: fishName, rarity: rarityLabel }),
                t(locale, "fish.reward", { amount: String(reward) }),
            ];
            if (gotStar) {
                descLines.push("\n⭐ " + t(locale, "star_drop.found"));
            }
            const embed = new EmbedBuilder()
                .setTitle(`🎣 ${t(locale, "fish.title")}`)
                .setDescription(descLines.join("\n"))
                .setColor(WorkService.getRarityColor(fish.rarity));
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/slash/fish.ts
git commit -m "feat(economy): add 3% star drop to fish command"
```
