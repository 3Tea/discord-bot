# Confession Community Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add voting buttons (upvote/downvote) and anonymous reply threads to published confessions.

**Architecture:** Three new persistent button handlers (upvote, downvote, reply) attached to every published confession message. Votes tracked in a ConfessionVote model with counts cached on the Confession document. Replies posted anonymously into auto-created Discord threads, with first reply free and subsequent replies costing 5 coin.

**Tech Stack:** TypeScript, Discord.js v14 (Buttons, Modals, Threads), Mongoose, i18next

**Spec:** `docs/superpowers/specs/2026-04-08-confession-community-interaction-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/models/confessionVote.model.ts` | ConfessionVote schema (confessionId, userId, vote) |
| `src/models/confessionReply.model.ts` | ConfessionReply schema (confessionId, authorId, replyNumber, content, messageId) |
| `src/buttons/confessionUpvote.button.ts` | Handle upvote toggle/switch |
| `src/buttons/confessionDownvote.button.ts` | Handle downvote toggle/switch |
| `src/buttons/confessionReply.button.ts` | Show reply modal, handle submission, create thread + post |

### Modified Files

| File | Change |
|------|--------|
| `src/util/config/button.ts` | Add 3 button IDs + 1 modal ID |
| `src/services/confession/constants.ts` | Add `CONFESSION_REPLY_COST_COIN`, `CONFESSION_REPLY_MAX_LENGTH` |
| `src/models/confession.model.ts` | Add `upvotes`, `downvotes`, `threadId`, `replyCount` fields |
| `src/models/transaction.model.ts` | Add `"confession_reply"` to TransactionType |
| `src/services/confession/confession.service.ts` | Add vote/reply service functions, `buildConfessionInteractionRow`, update `sendAnonymousConfessionToChannel` to include buttons |
| `src/commands/slash/confession.ts` | Update instant mode: create record first → send with buttons → update messageId |
| `src/buttons/confessionApprove.button.ts` | Include interaction buttons when approving |
| `src/locales/*.json` (15 files) | Add 8 new i18n keys |

---

### Task 1: Add Constants and Button IDs

**Files:**
- Modify: `src/services/confession/constants.ts`
- Modify: `src/util/config/button.ts`

- [ ] **Step 1: Add reply constants**

In `src/services/confession/constants.ts`, append after line 6 (`CONFESSION_SKIP_CD_COST_COIN`):

```typescript
export const CONFESSION_REPLY_COST_COIN = 5;
export const CONFESSION_REPLY_MAX_LENGTH = 1500;
```

- [ ] **Step 2: Add button and modal IDs**

In `src/util/config/button.ts`, add after `CONFESSION_REJECT` (before the closing `};`):

```typescript
    // Confession interaction (customId: `confession_upvote:<mongoId>` etc.)
    CONFESSION_UPVOTE: "confession_upvote",
    CONFESSION_DOWNVOTE: "confession_downvote",
    CONFESSION_REPLY: "confession_reply",
    // Confession reply modal
    CONFESSION_REPLY_MODAL: "confession_reply_modal",
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/services/confession/constants.ts src/util/config/button.ts
git commit -m "feat(confession): add reply constants and interaction button IDs"
```

---

### Task 2: Add Transaction Type

**Files:**
- Modify: `src/models/transaction.model.ts`

- [ ] **Step 1: Add `confession_reply` to TransactionType**

In `src/models/transaction.model.ts`, update the type union (line 3) — add `| "confession_reply"` at the end:

```typescript
export type TransactionType = "pray" | "curse" | "purchase" | "exchange" | "streak_bonus" | "admin" | "confession_vip" | "confession_skip_cd" | "confession_refund" | "confession_reply";
```

Update the enum array in the schema (line 21) to include `"confession_reply"`:

```typescript
            enum: ["pray", "curse", "purchase", "exchange", "streak_bonus", "admin", "confession_vip", "confession_skip_cd", "confession_refund", "confession_reply"],
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "feat(confession): add confession_reply transaction type"
```

---

### Task 3: Create ConfessionVote Model

**Files:**
- Create: `src/models/confessionVote.model.ts`

- [ ] **Step 1: Create the model file**

Create `src/models/confessionVote.model.ts`:

```typescript
import { model, Schema, Document, Types } from "mongoose";

export interface IConfessionVote extends Document {
    confessionId: Types.ObjectId;
    guildId: string;
    userId: string;
    vote: "up" | "down";
}

const confessionVoteSchema = new Schema(
    {
        confessionId: { type: Schema.Types.ObjectId, required: true, ref: "Confession" },
        guildId: { type: String, required: true },
        userId: { type: String, required: true },
        vote: { type: String, enum: ["up", "down"], required: true },
    },
    { timestamps: true, collection: "ConfessionVotes" }
);

confessionVoteSchema.index({ confessionId: 1, userId: 1 }, { unique: true });

export default model<IConfessionVote>("ConfessionVote", confessionVoteSchema);
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/models/confessionVote.model.ts
git commit -m "feat(confession): add ConfessionVote model"
```

---

### Task 4: Create ConfessionReply Model

**Files:**
- Create: `src/models/confessionReply.model.ts`

- [ ] **Step 1: Create the model file**

Create `src/models/confessionReply.model.ts`:

```typescript
import { model, Schema, Document, Types } from "mongoose";

export interface IConfessionReply extends Document {
    confessionId: Types.ObjectId;
    guildId: string;
    authorId: string;
    replyNumber: number;
    content: string;
    messageId: string;
}

const confessionReplySchema = new Schema(
    {
        confessionId: { type: Schema.Types.ObjectId, required: true, ref: "Confession" },
        guildId: { type: String, required: true },
        authorId: { type: String, required: true },
        replyNumber: { type: Number, required: true },
        content: { type: String, required: true },
        messageId: { type: String, required: true },
    },
    { timestamps: true, collection: "ConfessionReplies" }
);

confessionReplySchema.index({ confessionId: 1, replyNumber: 1 }, { unique: true });
confessionReplySchema.index({ confessionId: 1, authorId: 1 });

export default model<IConfessionReply>("ConfessionReply", confessionReplySchema);
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/models/confessionReply.model.ts
git commit -m "feat(confession): add ConfessionReply model"
```

---

### Task 5: Update Confession Model — Add Vote + Thread Fields

**Files:**
- Modify: `src/models/confession.model.ts`

- [ ] **Step 1: Add fields to interface**

In `src/models/confession.model.ts`, update IConfession interface. Add after `isVip: boolean;` (line 17):

```typescript
    upvotes: number;
    downvotes: number;
    threadId: string | null;
    replyCount: number;
```

- [ ] **Step 2: Add fields to schema**

Add after `isVip` field in schema (after `isVip: { type: Boolean, default: false },`):

```typescript
        upvotes: { type: Number, default: 0 },
        downvotes: { type: Number, default: 0 },
        threadId: { type: String, default: null },
        replyCount: { type: Number, default: 0 },
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/models/confession.model.ts
git commit -m "feat(confession): add vote counts, threadId, and replyCount to model"
```

---

### Task 6: Update Confession Service — Interaction Row + Vote/Reply Functions

**Files:**
- Modify: `src/services/confession/confession.service.ts`

This is the largest task. Multiple additions to the service file.

- [ ] **Step 1: Add new imports**

At the top of `src/services/confession/confession.service.ts`, update the discord.js import (line 2-9) to add `ModalBuilder`, `TextInputBuilder`, `TextInputStyle`:

```typescript
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
```

Add import for new models after the existing model imports (after line 18):

```typescript
import ConfessionVoteModel from "../../models/confessionVote.model";
import ConfessionReplyModel from "../../models/confessionReply.model";
```

Update the constants import (line 22-28) to include new constants:

```typescript
import {
    CONFESSION_CONTENT_MAX,
    CONFESSION_COOLDOWN_MAX,
    CONFESSION_COOLDOWN_MIN,
    CONFESSION_VIP_COST_GEM,
    CONFESSION_SKIP_CD_COST_COIN,
    CONFESSION_REPLY_COST_COIN,
    CONFESSION_REPLY_MAX_LENGTH,
    confessionCooldownRedisKey,
} from "./constants";
```

Add re-export after existing re-exports (after line 38):

```typescript
export { CONFESSION_REPLY_COST_COIN, CONFESSION_REPLY_MAX_LENGTH } from "./constants";
```

- [ ] **Step 2: Add `buildConfessionInteractionRow` function**

Add after `buildConfessionReviewComponents` function (end of file, before the closing):

```typescript
export function buildConfessionInteractionRow(
    confessionMongoId: string,
    upvotes = 0,
    downvotes = 0
): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${BUTTON_ID.CONFESSION_UPVOTE}:${confessionMongoId}`)
            .setLabel(`👍 ${upvotes}`)
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`${BUTTON_ID.CONFESSION_DOWNVOTE}:${confessionMongoId}`)
            .setLabel(`👎 ${downvotes}`)
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`${BUTTON_ID.CONFESSION_REPLY}:${confessionMongoId}`)
            .setLabel("💬 Reply")
            .setStyle(ButtonStyle.Primary)
    );
}
```

- [ ] **Step 3: Update `sendAnonymousConfessionToChannel` to accept `mongoId` and include interaction buttons**

Replace the entire function:

```typescript
export async function sendAnonymousConfessionToChannel(
    channel: TextChannel,
    confessionNumber: number,
    content: string,
    image: IConfessionImage | null,
    isVip = false,
    mongoId?: string
): Promise<{ messageId: string } | { error: true }> {
    try {
        const embed = isVip
            ? buildVipPublicConfessionEmbed(confessionNumber, content)
            : buildPublicConfessionEmbed(confessionNumber, content);
        const files = await buildConfessionAttachmentFiles(image);
        const components = mongoId ? [buildConfessionInteractionRow(mongoId)] : [];
        const msg = await channel.send({
            embeds: [embed],
            files: files.length ? files : undefined,
            components: components.length ? components : undefined,
        });
        return { messageId: msg.id };
    } catch (error) {
        logger.error(
            `confession: sendAnonymousConfessionToChannel failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return { error: true };
    }
}
```

- [ ] **Step 4: Add vote handling function**

Add after `buildConfessionInteractionRow`:

```typescript
export type VoteResult =
    | { ok: true; upvotes: number; downvotes: number }
    | { ok: false; code: "invalid_id" | "not_found" | "own_confession" };

export async function handleConfessionVote(
    confessionMongoId: string,
    guildId: string,
    userId: string,
    voteType: "up" | "down"
): Promise<VoteResult> {
    if (!isValidObjectId(confessionMongoId)) {
        return { ok: false, code: "invalid_id" };
    }

    const doc = await ConfessionModel.findById(confessionMongoId).exec();
    if (!doc || doc.guildId !== guildId || doc.status !== "published") {
        return { ok: false, code: "not_found" };
    }

    if (doc.authorId === userId) {
        return { ok: false, code: "own_confession" };
    }

    const existing = await ConfessionVoteModel.findOne({
        confessionId: doc._id,
        userId,
    }).exec();

    if (!existing) {
        // New vote
        await ConfessionVoteModel.create({
            confessionId: doc._id,
            guildId,
            userId,
            vote: voteType,
        });
        const inc = voteType === "up" ? { upvotes: 1 } : { downvotes: 1 };
        await ConfessionModel.findByIdAndUpdate(confessionMongoId, { $inc: inc }).exec();
    } else if (existing.vote === voteType) {
        // Toggle off (same vote clicked again)
        await ConfessionVoteModel.deleteOne({ _id: existing._id }).exec();
        const inc = voteType === "up" ? { upvotes: -1 } : { downvotes: -1 };
        await ConfessionModel.findByIdAndUpdate(confessionMongoId, { $inc: inc }).exec();
    } else {
        // Switch vote
        existing.vote = voteType;
        await existing.save();
        const inc =
            voteType === "up"
                ? { upvotes: 1, downvotes: -1 }
                : { upvotes: -1, downvotes: 1 };
        await ConfessionModel.findByIdAndUpdate(confessionMongoId, { $inc: inc }).exec();
    }

    const updated = await ConfessionModel.findById(confessionMongoId).select("upvotes downvotes").exec();
    return {
        ok: true,
        upvotes: updated?.upvotes ?? 0,
        downvotes: updated?.downvotes ?? 0,
    };
}
```

- [ ] **Step 5: Add reply modal builder**

```typescript
export function buildConfessionReplyModal(
    confessionMongoId: string,
    labels: { title: string; inputLabel: string }
): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId(`${BUTTON_ID.CONFESSION_REPLY_MODAL}:${confessionMongoId}`)
        .setTitle(labels.title);

    const input = new TextInputBuilder()
        .setCustomId("reply_content")
        .setLabel(labels.inputLabel)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(CONFESSION_REPLY_MAX_LENGTH)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    return modal;
}
```

- [ ] **Step 6: Add reply handling function**

```typescript
export type ReplyResult =
    | { ok: true; replyNumber: number }
    | { ok: false; code: "not_found" | "empty" | "insufficient_coin" | "thread_failed" | "send_failed" };

export async function handleConfessionReply(params: {
    confessionMongoId: string;
    guildId: string;
    userId: string;
    content: string;
    channel: TextChannel;
    publicMessageId: string;
    confessionNumber: number;
}): Promise<ReplyResult> {
    const { confessionMongoId, guildId, userId, content, channel, publicMessageId, confessionNumber } = params;

    const trimmed = content.trim();
    if (trimmed.length === 0) {
        return { ok: false, code: "empty" };
    }

    // Check if user needs to pay (first reply is free)
    const existingCount = await ConfessionReplyModel.countDocuments({
        confessionId: confessionMongoId,
        authorId: userId,
    }).exec();

    if (existingCount > 0) {
        // Not first reply — charge coin
        const CurrencyService = (await import("../../services/economy/currency.service")).default;
        try {
            await CurrencyService.deduct(userId, guildId, CONFESSION_REPLY_COST_COIN, 0, "confession_reply", {
                confessionNumber,
            });
        } catch (error) {
            if (error instanceof CurrencyService.InsufficientFundsError) {
                return { ok: false, code: "insufficient_coin" };
            }
            throw error;
        }
    }

    // Increment reply count atomically to get replyNumber
    const updated = await ConfessionModel.findByIdAndUpdate(
        confessionMongoId,
        { $inc: { replyCount: 1 } },
        { new: true }
    ).exec();
    if (!updated) {
        return { ok: false, code: "not_found" };
    }
    const replyNumber = updated.replyCount;

    // Get or create thread
    let threadId = updated.threadId;
    if (threadId) {
        // Verify thread still exists
        const thread = await channel.threads.fetch(threadId).catch(() => null);
        if (!thread) {
            threadId = null; // Thread deleted, recreate
        }
    }

    if (!threadId) {
        try {
            const msg = await channel.messages.fetch(publicMessageId).catch(() => null);
            if (!msg) {
                return { ok: false, code: "thread_failed" };
            }
            const thread = await msg.startThread({
                name: `Confession #${confessionNumber} — Replies`,
                autoArchiveDuration: 1440,
            });
            threadId = thread.id;
            await ConfessionModel.findByIdAndUpdate(confessionMongoId, { threadId }).exec();
        } catch (error) {
            logger.error(
                `confession: failed to create reply thread: ${error instanceof Error ? error.message : String(error)}`
            );
            return { ok: false, code: "thread_failed" };
        }
    }

    // Post anonymous reply
    try {
        const thread = await channel.threads.fetch(threadId!);
        if (!thread) {
            return { ok: false, code: "thread_failed" };
        }

        const replyEmbed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setDescription(trimmed)
            .setFooter({ text: `Anonymous Reply #${replyNumber}` })
            .setTimestamp();

        const replyMsg = await thread.send({ embeds: [replyEmbed] });

        await ConfessionReplyModel.create({
            confessionId: confessionMongoId,
            guildId,
            authorId: userId,
            replyNumber,
            content: trimmed,
            messageId: replyMsg.id,
        });

        return { ok: true, replyNumber };
    } catch (error) {
        logger.error(
            `confession: failed to post reply: ${error instanceof Error ? error.message : String(error)}`
        );
        return { ok: false, code: "send_failed" };
    }
}
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/services/confession/confession.service.ts
git commit -m "feat(confession): add vote handling, reply system, and interaction row to service"
```

---

### Task 7: Create Upvote Button Handler

**Files:**
- Create: `src/buttons/confessionUpvote.button.ts`

- [ ] **Step 1: Create the button handler**

Create `src/buttons/confessionUpvote.button.ts`:

```typescript
import { ButtonInteraction, MessageFlags } from "discord.js";

import { buildConfessionInteractionRow, handleConfessionVote } from "../services/confession/confession.service";
import { BUTTON_ID } from "../util/config/button";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.CONFESSION_UPVOTE,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        if (!interaction.inGuild() || !interaction.guildId) {
            await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
            return;
        }

        await interaction.deferUpdate();

        const mongoId = interaction.customId.split(":")[1];
        const result = await handleConfessionVote(mongoId, interaction.guildId, interaction.user.id, "up");

        if (!result.ok) {
            if (result.code === "own_confession") {
                await interaction.followUp({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.vote_own") });
            }
            return;
        }

        await interaction.message.edit({
            components: [buildConfessionInteractionRow(mongoId, result.upvotes, result.downvotes)],
        });
    },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/buttons/confessionUpvote.button.ts
git commit -m "feat(confession): add upvote button handler"
```

---

### Task 8: Create Downvote Button Handler

**Files:**
- Create: `src/buttons/confessionDownvote.button.ts`

- [ ] **Step 1: Create the button handler**

Create `src/buttons/confessionDownvote.button.ts`:

```typescript
import { ButtonInteraction, MessageFlags } from "discord.js";

import { buildConfessionInteractionRow, handleConfessionVote } from "../services/confession/confession.service";
import { BUTTON_ID } from "../util/config/button";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.CONFESSION_DOWNVOTE,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        if (!interaction.inGuild() || !interaction.guildId) {
            await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
            return;
        }

        await interaction.deferUpdate();

        const mongoId = interaction.customId.split(":")[1];
        const result = await handleConfessionVote(mongoId, interaction.guildId, interaction.user.id, "down");

        if (!result.ok) {
            if (result.code === "own_confession") {
                await interaction.followUp({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.vote_own") });
            }
            return;
        }

        await interaction.message.edit({
            components: [buildConfessionInteractionRow(mongoId, result.upvotes, result.downvotes)],
        });
    },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/buttons/confessionDownvote.button.ts
git commit -m "feat(confession): add downvote button handler"
```

---

### Task 9: Create Reply Button Handler (Modal + Submit)

**Files:**
- Create: `src/buttons/confessionReply.button.ts`

- [ ] **Step 1: Create the reply button handler**

This handler shows a modal when the Reply button is clicked, then handles the modal submission.

Create `src/buttons/confessionReply.button.ts`:

```typescript
import { ButtonInteraction, MessageFlags, TextChannel } from "discord.js";
import { isValidObjectId } from "mongoose";

import ConfessionModel from "../models/confession.model";
import {
    buildConfessionReplyModal,
    handleConfessionReply,
    CONFESSION_REPLY_COST_COIN,
} from "../services/confession/confession.service";
import CurrencyService from "../services/economy/currency.service";
import { BUTTON_ID } from "../util/config/button";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.CONFESSION_REPLY,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        if (!interaction.inGuild() || !interaction.guildId) {
            await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
            return;
        }

        const mongoId = interaction.customId.split(":")[1];
        if (!mongoId || !isValidObjectId(mongoId)) {
            await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.button.invalid") });
            return;
        }

        const modal = buildConfessionReplyModal(mongoId, {
            title: t(locale, "confession.reply_modal_title"),
            inputLabel: t(locale, "confession.reply_modal_label"),
        });

        await interaction.showModal(modal);

        // Wait for modal submission
        const submitted = await interaction
            .awaitModalSubmit({
                filter: (i) =>
                    i.customId === `${BUTTON_ID.CONFESSION_REPLY_MODAL}:${mongoId}` &&
                    i.user.id === interaction.user.id,
                time: 300_000, // 5 minutes
            })
            .catch(() => null);

        if (!submitted) return; // Modal timed out or dismissed

        await submitted.deferReply({ flags: MessageFlags.Ephemeral });

        const content = submitted.fields.getTextInputValue("reply_content");

        const doc = await ConfessionModel.findById(mongoId).exec();
        if (!doc || doc.status !== "published" || !doc.publicMessageId) {
            await submitted.editReply({ content: t(locale, "confession.reply_not_found") });
            return;
        }

        const channel = interaction.channel as TextChannel;

        const result = await handleConfessionReply({
            confessionMongoId: mongoId,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            content,
            channel,
            publicMessageId: doc.publicMessageId,
            confessionNumber: doc.number,
        });

        if (!result.ok) {
            const codeMap: Record<typeof result.code, string> = {
                not_found: "confession.reply_not_found",
                empty: "confession.reply_empty",
                insufficient_coin: "confession.reply_insufficient_coin",
                thread_failed: "confession.send_failed",
                send_failed: "confession.send_failed",
            };

            if (result.code === "insufficient_coin") {
                const balance = (await CurrencyService.getBalance(interaction.user.id, interaction.guildId)).coin;
                await submitted.editReply({
                    content: t(locale, codeMap[result.code], {
                        cost: CONFESSION_REPLY_COST_COIN,
                        balance,
                    }),
                });
            } else {
                await submitted.editReply({ content: t(locale, codeMap[result.code]) });
            }
            return;
        }

        await submitted.editReply({ content: t(locale, "confession.reply_success") });
    },
};
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/buttons/confessionReply.button.ts
git commit -m "feat(confession): add reply button handler with modal and thread creation"
```

---

### Task 10: Update Publish Flows — Include Interaction Buttons

**Files:**
- Modify: `src/commands/slash/confession.ts`
- Modify: `src/buttons/confessionApprove.button.ts`

- [ ] **Step 1: Update confession.ts imports**

In `src/commands/slash/confession.ts`, add `buildConfessionInteractionRow` to the confession service import block:

```typescript
import {
    buildConfessionAttachmentFiles,
    buildConfessionInteractionRow,
    buildConfessionReviewComponents,
    buildReviewConfessionEmbed,
    ...
```

- [ ] **Step 2: Update instant mode in `executeSubmit`**

In the instant mode section of `executeSubmit`, the current flow is:
1. Send message
2. Create DB record

The new flow must be:
1. Create DB record (without publicMessageId)
2. Send message with buttons (using mongoId)
3. Update publicMessageId on the record

Find the instant mode block (starts with `if (config.mode === "instant")`). Replace the entire instant mode block (from the `if` to the `return;` before `// Review mode`):

```typescript
    if (config.mode === "instant") {
        const publicCh = await interaction.guild.channels.fetch(config.publicChannelId).catch(() => null);
        if (!publicCh || !publicCh.isTextBased() || publicCh.isDMBased()) {
            await refundAll("channel_fetch_failed");
            await interaction.editReply({ content: t(locale, "confession.send_failed") });
            return;
        }
        const textPublic = publicCh as TextChannel;

        // Create record first to get mongoId for buttons
        let publishedDoc;
        try {
            publishedDoc = await createPublishedConfessionRecord({
                guildId,
                number: confessionNumber,
                authorId,
                content,
                image,
                publicMessageId: "pending", // temporary, updated after send
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

        const mongoId = String(publishedDoc._id);
        const sendResult = await sendAnonymousConfessionToChannel(textPublic, confessionNumber, content, image, isVip, mongoId);
        if ("error" in sendResult) {
            await refundAll("send_failed");
            await interaction.editReply({ content: t(locale, "confession.send_failed") });
            return;
        }

        // Update with real publicMessageId
        publishedDoc.publicMessageId = sendResult.messageId;
        await publishedDoc.save();

        await setConfessionCooldown(guildId, userId, config.cooldownMinutes);
        await interaction.editReply({ content: t(locale, "confession.submit_success_instant") });
        return;
    }
```

- [ ] **Step 3: Update approve button to include interaction buttons**

In `src/buttons/confessionApprove.button.ts`, add import:

```typescript
import { approveConfession, buildConfessionInteractionRow } from "../services/confession/confession.service";
```

(Replace the existing `approveConfession` import line.)

The current `approveConfession` service function already sends the message. We need to update the service's `approveConfession` function to pass `mongoId` to `sendAnonymousConfessionToChannel`.

In `src/services/confession/confession.service.ts`, update the `approveConfession` function. Find the send call:

```typescript
    const sendResult = await sendAnonymousConfessionToChannel(textChannel, doc.number, doc.content, doc.image, doc.isVip);
```

Replace with:

```typescript
    const sendResult = await sendAnonymousConfessionToChannel(textChannel, doc.number, doc.content, doc.image, doc.isVip, rawId);
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/confession.ts src/services/confession/confession.service.ts src/buttons/confessionApprove.button.ts
git commit -m "feat(confession): include interaction buttons on published confessions"
```

---

### Task 11: Add i18n Keys

**Files:**
- Modify: All 15 locale files in `src/locales/`

- [ ] **Step 1: Add keys to en.json**

Add after the last confession key (after `"confession.vip_footer"`):

```json
    "confession.vote_own": "You cannot vote on your own confession.",
    "confession.vote_updated": "Vote updated.",
    "confession.reply_modal_title": "Anonymous Reply",
    "confession.reply_modal_label": "Your reply",
    "confession.reply_success": "Your anonymous reply was posted.",
    "confession.reply_insufficient_coin": "You need **{{cost}}** coins for additional replies. Balance: **{{balance}}** coins.",
    "confession.reply_not_found": "This confession no longer exists.",
    "confession.reply_empty": "Reply cannot be empty."
```

- [ ] **Step 2: Add keys to vi.json**

```json
    "confession.vote_own": "Bạn không thể vote confession của chính mình.",
    "confession.vote_updated": "Đã cập nhật vote.",
    "confession.reply_modal_title": "Reply ẩn danh",
    "confession.reply_modal_label": "Nội dung reply",
    "confession.reply_success": "Reply ẩn danh đã được đăng.",
    "confession.reply_insufficient_coin": "Bạn cần **{{cost}}** coin cho reply tiếp theo. Số dư: **{{balance}}** coin.",
    "confession.reply_not_found": "Confession này không còn tồn tại.",
    "confession.reply_empty": "Reply không được để trống."
```

- [ ] **Step 3: Add English keys to remaining 13 locale files**

Add the same English text (from Step 1) to: `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`.

- [ ] **Step 4: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "feat(confession): add i18n keys for voting and reply features"
```

---

### Task 12: Final Build Verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Verify button handlers are discoverable**

```bash
ls src/buttons/confession*.button.ts
```

Expected: 5 files (confessionApprove, confessionReject, confessionUpvote, confessionDownvote, confessionReply).

- [ ] **Step 3: Verify i18n key consistency**

```bash
grep -l "confession.vote_own" src/locales/*.json | wc -l
```

Expected: 15.

- [ ] **Step 4: Verify new models exist**

```bash
ls src/models/confessionVote.model.ts src/models/confessionReply.model.ts
```

Expected: Both files exist.
