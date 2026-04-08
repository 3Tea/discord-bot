# Confession Economy Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add VIP Confession (5 gem, gold embed) and Skip Cooldown (50 coin) as pay-per-use options on `/confession submit`.

**Architecture:** Two new boolean options on the existing submit subcommand. Economy deduction via `CurrencyService.deduct()` before sending. New `isVip` field on Confession model drives embed styling. New transaction types added for audit trail.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose, ioredis, i18next

**Spec:** `docs/superpowers/specs/2026-04-08-confession-economy-integration-design.md`

---

## File Map

### Modified Files

| File | Change |
|------|--------|
| `src/services/confession/constants.ts` | Add `CONFESSION_VIP_COST_GEM`, `CONFESSION_SKIP_CD_COST_COIN` |
| `src/models/transaction.model.ts` | Add `"confession_vip"`, `"confession_skip_cd"`, `"confession_refund"` to TransactionType |
| `src/models/confession.model.ts` | Add `isVip: boolean` field to interface + schema |
| `src/services/confession/confession.service.ts` | Add VIP embed builder, update `sendAnonymousConfessionToChannel` to accept `isVip`, update `createPublishedConfessionRecord` / `createPendingConfessionRecord` |
| `src/commands/slash/confession.ts` | Add `vip` and `skip_cooldown` options, economy integration in `executeSubmit` |
| `src/buttons/confessionApprove.button.ts` | Pass `isVip` to send function when approving |
| `src/locales/en.json` | Add 5 new i18n keys |
| `src/locales/vi.json` | Add 5 new i18n keys |
| `src/locales/*.json` (13 other files) | Add 5 new i18n keys |

---

### Task 1: Add Pricing Constants

**Files:**
- Modify: `src/services/confession/constants.ts`

- [ ] **Step 1: Add VIP and skip cooldown cost constants**

In `src/services/confession/constants.ts`, append after line 4 (`CONFESSION_COOLDOWN_DEFAULT`):

```typescript
export const CONFESSION_VIP_COST_GEM = 5;
export const CONFESSION_SKIP_CD_COST_COIN = 50;
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/confession/constants.ts
git commit -m "feat(confession): add VIP and skip-cooldown pricing constants"
```

---

### Task 2: Add Transaction Types

**Files:**
- Modify: `src/models/transaction.model.ts`

- [ ] **Step 1: Extend TransactionType union**

In `src/models/transaction.model.ts`, replace line 3:

```typescript
export type TransactionType = "pray" | "curse" | "purchase" | "exchange" | "streak_bonus" | "admin";
```

With:

```typescript
export type TransactionType = "pray" | "curse" | "purchase" | "exchange" | "streak_bonus" | "admin" | "confession_vip" | "confession_skip_cd" | "confession_refund";
```

- [ ] **Step 2: Update enum in schema**

Replace the `type` field enum array in the schema (line 22):

```typescript
            enum: ["pray", "curse", "purchase", "exchange", "streak_bonus", "admin"],
```

With:

```typescript
            enum: ["pray", "curse", "purchase", "exchange", "streak_bonus", "admin", "confession_vip", "confession_skip_cd", "confession_refund"],
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(confession): add confession economy transaction types"
```

---

### Task 3: Add `isVip` Field to Confession Model

**Files:**
- Modify: `src/models/confession.model.ts`

- [ ] **Step 1: Add `isVip` to IConfession interface**

In `src/models/confession.model.ts`, add `isVip` after `image` in the interface (after line 16):

```typescript
    isVip: boolean;
```

The full interface becomes:

```typescript
export interface IConfession extends Document {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    isVip: boolean;
    status: ConfessionStatus;
    reviewMessageId: string | null;
    publicMessageId: string | null;
    resolvedAt: Date | null;
}
```

- [ ] **Step 2: Add `isVip` to schema**

In the schema definition, add after the `image` field block (after line 36, before `status`):

```typescript
        isVip: { type: Boolean, default: false },
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/models/confession.model.ts
git commit -m "feat(confession): add isVip field to confession model"
```

---

### Task 4: Update Confession Service — VIP Embed + Record Functions

**Files:**
- Modify: `src/services/confession/confession.service.ts`

- [ ] **Step 1: Import new constants**

In `src/services/confession/confession.service.ts`, update the import from `"./constants"` (line 27) to include the new constants:

```typescript
import {
    CONFESSION_CONTENT_MAX,
    CONFESSION_COOLDOWN_MAX,
    CONFESSION_COOLDOWN_MIN,
    CONFESSION_VIP_COST_GEM,
    CONFESSION_SKIP_CD_COST_COIN,
    confessionCooldownRedisKey,
} from "./constants";
```

Also add re-exports after line 35:

```typescript
export { CONFESSION_VIP_COST_GEM, CONFESSION_SKIP_CD_COST_COIN } from "./constants";
```

- [ ] **Step 2: Create VIP public embed builder**

Add a new function after `buildPublicConfessionEmbed` (after line 137):

```typescript
export function buildVipPublicConfessionEmbed(confessionNumber: number, content: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`✨ Confession (#${confessionNumber})`)
        .setDescription(content.length > CONFESSION_CONTENT_MAX ? content.slice(0, CONFESSION_CONTENT_MAX) : content)
        .setTimestamp();
    embed.setFooter({
        text: "VIP Confession",
        ...(FOOTER.icon ? { iconURL: FOOTER.icon } : {}),
    });
    return embed;
}
```

- [ ] **Step 3: Update `sendAnonymousConfessionToChannel` to accept `isVip`**

Update the function signature and body (replace lines 195-212):

```typescript
export async function sendAnonymousConfessionToChannel(
    channel: TextChannel,
    confessionNumber: number,
    content: string,
    image: IConfessionImage | null,
    isVip = false
): Promise<{ messageId: string } | { error: true }> {
    try {
        const embed = isVip
            ? buildVipPublicConfessionEmbed(confessionNumber, content)
            : buildPublicConfessionEmbed(confessionNumber, content);
        const files = await buildConfessionAttachmentFiles(image);
        const msg = await channel.send({ embeds: [embed], files: files.length ? files : undefined });
        return { messageId: msg.id };
    } catch (error) {
        logger.error(
            `confession: sendAnonymousConfessionToChannel failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return { error: true };
    }
}
```

- [ ] **Step 4: Update `createPublishedConfessionRecord` to accept `isVip`**

Replace the function (lines 214-233):

```typescript
export async function createPublishedConfessionRecord(input: {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    publicMessageId: string;
    isVip?: boolean;
}): Promise<IConfession> {
    return ConfessionModel.create({
        guildId: input.guildId,
        number: input.number,
        authorId: input.authorId,
        content: input.content,
        image: input.image,
        isVip: input.isVip ?? false,
        status: "published",
        reviewMessageId: null,
        publicMessageId: input.publicMessageId,
        resolvedAt: new Date(),
    });
}
```

- [ ] **Step 5: Update `createPendingConfessionRecord` to accept `isVip`**

Replace the function (lines 235-253):

```typescript
export async function createPendingConfessionRecord(input: {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    isVip?: boolean;
}): Promise<IConfession> {
    return ConfessionModel.create({
        guildId: input.guildId,
        number: input.number,
        authorId: input.authorId,
        content: input.content,
        image: input.image,
        isVip: input.isVip ?? false,
        status: "pending",
        reviewMessageId: null,
        publicMessageId: null,
        resolvedAt: null,
    });
}
```

- [ ] **Step 6: Update `buildReviewConfessionEmbed` to show VIP badge**

Update the function (replace lines 139-159):

```typescript
export function buildReviewConfessionEmbed(params: {
    confessionNumber: number;
    content: string;
    authorId: string;
    isVip?: boolean;
}): EmbedBuilder {
    const title = params.isVip
        ? `✨ Confession review (#${params.confessionNumber}) — VIP`
        : `Confession review (#${params.confessionNumber})`;
    const embed = new EmbedBuilder()
        .setColor(params.isVip ? 0xf1c40f : 0xe67e22)
        .setTitle(title)
        .setDescription(
            params.content.length > CONFESSION_CONTENT_MAX
                ? params.content.slice(0, CONFESSION_CONTENT_MAX)
                : params.content
        )
        .addFields({
            name: "Author (moderators only)",
            value: `<@${params.authorId}> — \`${params.authorId}\``,
        })
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}
```

- [ ] **Step 7: Update `approveConfession` to pass `isVip` to send function**

In the `approveConfession` function, update the `sendAnonymousConfessionToChannel` call (line 292). Replace:

```typescript
    const sendResult = await sendAnonymousConfessionToChannel(textChannel, doc.number, doc.content, doc.image);
```

With:

```typescript
    const sendResult = await sendAnonymousConfessionToChannel(textChannel, doc.number, doc.content, doc.image, doc.isVip);
```

- [ ] **Step 8: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/services/confession/confession.service.ts
git commit -m "feat(confession): add VIP embed builder and isVip support in service"
```

---

### Task 5: Update Confession Command — Economy Integration

**Files:**
- Modify: `src/commands/slash/confession.ts`

- [ ] **Step 1: Add new imports**

Add these imports at the top of `src/commands/slash/confession.ts`. After the existing confession service imports (line 27), add:

```typescript
import CurrencyService from "../../services/economy/currency.service";
import {
    CONFESSION_VIP_COST_GEM,
    CONFESSION_SKIP_CD_COST_COIN,
} from "../../services/confession/confession.service";
```

- [ ] **Step 2: Add `vip` and `skip_cooldown` options to the submit subcommand**

In the `submit` subcommand builder (after the `.addAttachmentOption` block, before the closing `)` of the subcommand around line 103), add:

```typescript
                .addBooleanOption((opt) =>
                    opt
                        .setName("vip")
                        .setDescription("VIP confession with special embed (costs gems)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.submit.vip.desc"))
                        .setRequired(false)
                )
                .addBooleanOption((opt) =>
                    opt
                        .setName("skip_cooldown")
                        .setDescription("Skip active cooldown (costs coins)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.submit.skip_cooldown.desc"))
                        .setRequired(false)
                )
```

- [ ] **Step 3: Rewrite `executeSubmit` with economy integration**

Replace the entire `executeSubmit` function (lines 186-348) with:

```typescript
async function executeSubmit(
    interaction: ChatInputCommandInteraction,
    locale: Awaited<ReturnType<typeof resolveLocale>>
): Promise<void> {
    if (!interaction.inGuild() || !interaction.guildId || !interaction.guild) {
        await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: t(locale, "confession.guild_only"),
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const rawContent = interaction.options.getString("content", true);
    const content = rawContent.trim();
    if (content.length === 0) {
        await interaction.editReply({ content: t(locale, "confession.empty_content") });
        return;
    }
    if (content.length > CONFESSION_CONTENT_MAX) {
        await interaction.editReply({ content: t(locale, "confession.content_too_long") });
        return;
    }

    const attachment = interaction.options.getAttachment("image");
    const validated = validateConfessionAttachment(attachment);
    if (!validated.ok) {
        await interaction.editReply({ content: t(locale, "confession.invalid_image") });
        return;
    }
    const image = validated.image;

    const wantVip = interaction.options.getBoolean("vip") ?? false;
    const wantSkipCd = interaction.options.getBoolean("skip_cooldown") ?? false;

    const config = await getGuildConfessionConfig(interaction.guildId);
    if (!config) {
        await interaction.editReply({ content: t(locale, "confession.not_configured") });
        return;
    }
    if (!config.enabled) {
        await interaction.editReply({ content: t(locale, "confession.disabled") });
        return;
    }
    if (config.mode === "review" && !config.reviewChannelId) {
        logger.warn(`confession: guild ${interaction.guildId} has review mode but no review channel`);
        await interaction.editReply({ content: t(locale, "confession.review_misconfigured") });
        return;
    }

    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    // --- Cooldown check with skip_cooldown economy integration ---
    let coinDeducted = false;
    const onCooldown = await isConfessionOnCooldown(guildId, userId);

    if (onCooldown && !wantSkipCd) {
        const sec = await getConfessionCooldownRemainingSeconds(guildId, userId);
        await interaction.editReply({
            content: t(locale, "confession.cooldown", { seconds: Math.max(1, sec) }),
        });
        return;
    }

    if (onCooldown && wantSkipCd) {
        try {
            await CurrencyService.deduct(userId, guildId, CONFESSION_SKIP_CD_COST_COIN, 0, "confession_skip_cd", {
                action: "skip_cooldown",
            });
            coinDeducted = true;
        } catch (error) {
            if (error instanceof CurrencyService.InsufficientFundsError) {
                const balance = (await CurrencyService.getBalance(userId, guildId)).coin;
                await interaction.editReply({
                    content: t(locale, "confession.insufficient_coin", {
                        cost: CONFESSION_SKIP_CD_COST_COIN,
                        balance,
                    }),
                });
                return;
            }
            throw error;
        }
    }

    // --- VIP economy integration ---
    let gemDeducted = false;
    if (wantVip) {
        try {
            await CurrencyService.deduct(userId, guildId, 0, CONFESSION_VIP_COST_GEM, "confession_vip", {
                action: "vip_confession",
            });
            gemDeducted = true;
        } catch (error) {
            if (error instanceof CurrencyService.InsufficientFundsError) {
                // Refund coin if it was already deducted
                if (coinDeducted) {
                    await CurrencyService.addCoin(userId, guildId, CONFESSION_SKIP_CD_COST_COIN, "confession_refund", {
                        reason: "vip_gem_insufficient",
                    });
                }
                const balance = (await CurrencyService.getBalance(userId, guildId)).gem;
                await interaction.editReply({
                    content: t(locale, "confession.insufficient_gem", {
                        cost: CONFESSION_VIP_COST_GEM,
                        balance,
                    }),
                });
                return;
            }
            throw error;
        }
    }

    // --- Reserve confession number ---
    let confessionNumber: number;
    try {
        confessionNumber = await reserveNextConfessionNumber(guildId);
    } catch {
        // Refund all on failure
        if (coinDeducted) {
            await CurrencyService.addCoin(userId, guildId, CONFESSION_SKIP_CD_COST_COIN, "confession_refund", {
                reason: "reserve_failed",
            });
        }
        if (gemDeducted) {
            await CurrencyService.addGem(userId, guildId, CONFESSION_VIP_COST_GEM, "confession_refund", {
                reason: "reserve_failed",
            });
        }
        await interaction.editReply({ content: t(locale, "confession.not_configured") });
        return;
    }

    const authorId = userId;
    const isVip = wantVip && gemDeducted;

    // --- Helper to refund all deducted currency ---
    async function refundAll(reason: string): Promise<void> {
        if (coinDeducted) {
            await CurrencyService.addCoin(userId, guildId, CONFESSION_SKIP_CD_COST_COIN, "confession_refund", { reason });
        }
        if (gemDeducted) {
            await CurrencyService.addGem(userId, guildId, CONFESSION_VIP_COST_GEM, "confession_refund", { reason });
        }
    }

    if (config.mode === "instant") {
        const publicCh = await interaction.guild.channels.fetch(config.publicChannelId).catch(() => null);
        if (!publicCh || !publicCh.isTextBased() || publicCh.isDMBased()) {
            await refundAll("channel_fetch_failed");
            await interaction.editReply({ content: t(locale, "confession.send_failed") });
            return;
        }
        const textPublic = publicCh as TextChannel;
        const sendResult = await sendAnonymousConfessionToChannel(textPublic, confessionNumber, content, image, isVip);
        if ("error" in sendResult) {
            await refundAll("send_failed");
            await interaction.editReply({ content: t(locale, "confession.send_failed") });
            return;
        }

        try {
            await createPublishedConfessionRecord({
                guildId,
                number: confessionNumber,
                authorId,
                content,
                image,
                publicMessageId: sendResult.messageId,
                isVip,
            });
        } catch (error) {
            logger.error(
                `confession: failed to save published record: ${error instanceof Error ? error.message : String(error)}`
            );
            await refundAll("db_save_failed");
            await interaction.editReply({ content: t(locale, "confession.send_failed") });
            return;
        }

        await setConfessionCooldown(guildId, userId, config.cooldownMinutes);
        await interaction.editReply({ content: t(locale, "confession.submit_success_instant") });
        return;
    }

    // Review mode
    let pendingDoc;
    try {
        pendingDoc = await createPendingConfessionRecord({
            guildId,
            number: confessionNumber,
            authorId,
            content,
            image,
            isVip,
        });
    } catch (error) {
        logger.error(
            `confession: failed to create pending record: ${error instanceof Error ? error.message : String(error)}`
        );
        await refundAll("db_save_failed");
        await interaction.editReply({ content: t(locale, "confession.send_failed") });
        return;
    }

    const mongoId = String(pendingDoc._id);
    const reviewChannelId = config.reviewChannelId;
    if (!reviewChannelId) {
        await interaction.editReply({ content: t(locale, "confession.review_misconfigured") });
        return;
    }
    const reviewCh = await interaction.guild.channels.fetch(reviewChannelId).catch(() => null);
    if (!reviewCh || !reviewCh.isTextBased() || reviewCh.isDMBased()) {
        await interaction.editReply({ content: t(locale, "confession.send_failed") });
        return;
    }
    const textReview = reviewCh as TextChannel;

    const reviewEmbed = buildReviewConfessionEmbed({
        confessionNumber,
        content,
        authorId,
        isVip,
    });
    const files = await buildConfessionAttachmentFiles(image);
    const row = buildConfessionReviewComponents(mongoId, {
        approve: t(locale, "btn.confession.approve"),
        reject: t(locale, "btn.confession.reject"),
    });

    try {
        const msg = await textReview.send({
            embeds: [reviewEmbed],
            files: files.length > 0 ? files : undefined,
            components: [row],
        });
        await setConfessionReviewMessageId(mongoId, msg.id);
    } catch (error) {
        logger.error(
            `confession: failed to post review message: ${error instanceof Error ? error.message : String(error)}`
        );
        await interaction.editReply({ content: t(locale, "confession.send_failed") });
        return;
    }

    await setConfessionCooldown(guildId, userId, config.cooldownMinutes);
    await interaction.editReply({ content: t(locale, "confession.submit_success_review") });
}
```

- [ ] **Step 4: Update imports from confession service**

Update the import block at top of file (lines 11-27). Add the new exports. The full import becomes:

```typescript
import {
    buildConfessionAttachmentFiles,
    buildConfessionReviewComponents,
    buildReviewConfessionEmbed,
    CONFESSION_COOLDOWN_DEFAULT,
    CONFESSION_CONTENT_MAX,
    CONFESSION_VIP_COST_GEM,
    CONFESSION_SKIP_CD_COST_COIN,
    createPendingConfessionRecord,
    createPublishedConfessionRecord,
    getConfessionCooldownRemainingSeconds,
    getGuildConfessionConfig,
    isConfessionOnCooldown,
    reserveNextConfessionNumber,
    sendAnonymousConfessionToChannel,
    setConfessionCooldown,
    setConfessionReviewMessageId,
    upsertGuildConfessionConfig,
    validateConfessionAttachment,
} from "../../services/confession/confession.service";
```

Note: Remove the separate import of `CONFESSION_VIP_COST_GEM` and `CONFESSION_SKIP_CD_COST_COIN` from Step 1 since they're now in this unified import block.

- [ ] **Step 5: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/confession.ts
git commit -m "feat(confession): add VIP and skip-cooldown options with economy integration"
```

---

### Task 6: Add i18n Keys (All 15 Locales)

**Files:**
- Modify: All 15 locale files in `src/locales/`

- [ ] **Step 1: Add keys to en.json**

In `src/locales/en.json`, add after the `"btn.confession.reject"` key:

```json
    "cmd.confession.submit.vip.desc": "VIP confession with golden embed (costs 5 gems)",
    "cmd.confession.submit.skip_cooldown.desc": "Skip cooldown (costs 50 coins)",
    "confession.insufficient_coin": "You need at least **{{cost}}** coins to skip cooldown. Your balance: **{{balance}}** coins.",
    "confession.insufficient_gem": "You need at least **{{cost}}** gems for a VIP confession. Your balance: **{{balance}}** gems.",
    "confession.vip_footer": "VIP Confession"
```

- [ ] **Step 2: Add keys to vi.json**

In `src/locales/vi.json`, add the same keys with Vietnamese translations:

```json
    "cmd.confession.submit.vip.desc": "Confession VIP với embed vàng đặc biệt (tốn 5 gem)",
    "cmd.confession.submit.skip_cooldown.desc": "Bỏ qua cooldown (tốn 50 coin)",
    "confession.insufficient_coin": "Bạn cần ít nhất **{{cost}}** coin để bỏ qua cooldown. Số dư: **{{balance}}** coin.",
    "confession.insufficient_gem": "Bạn cần ít nhất **{{cost}}** gem để gửi confession VIP. Số dư: **{{balance}}** gem.",
    "confession.vip_footer": "VIP Confession"
```

- [ ] **Step 3: Add keys to remaining 13 locale files**

Add these keys to each of: `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`.

Use English text as the value for all non-EN/VI locales (matching the project pattern where translations are added incrementally):

```json
    "cmd.confession.submit.vip.desc": "VIP confession with golden embed (costs 5 gems)",
    "cmd.confession.submit.skip_cooldown.desc": "Skip cooldown (costs 50 coins)",
    "confession.insufficient_coin": "You need at least **{{cost}}** coins to skip cooldown. Your balance: **{{balance}}** coins.",
    "confession.insufficient_gem": "You need at least **{{cost}}** gems for a VIP confession. Your balance: **{{balance}}** gems.",
    "confession.vip_footer": "VIP Confession"
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "feat(confession): add i18n keys for VIP and skip-cooldown features"
```

---

### Task 7: Final Build Verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Verify all confession-related imports resolve**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && grep -r "CONFESSION_VIP_COST_GEM\|CONFESSION_SKIP_CD_COST_COIN" src/ --include="*.ts"
```

Expected: References in `constants.ts`, `confession.service.ts`, and `confession.ts`.

- [ ] **Step 3: Verify i18n key consistency**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && grep -l "confession.insufficient_coin" src/locales/*.json | wc -l
```

Expected: 15 (all locale files).
