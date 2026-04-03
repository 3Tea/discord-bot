# Voice Channel Advanced Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a control panel with buttons to temporary voice channels, enabling lock/unlock/hide, permit/block users, kick (with optional block), transfer ownership, rename/limit via modals, all backed by slash commands.

**Architecture:** Button and select menu handlers in `src/buttons/`, a shared voice helper module for owner checks, cooldown, and panel updates, a new select menu event router, and expanded `/voice` slash subcommands. All state in Redis with 12h TTL.

**Tech Stack:** Discord.js v14.26.0, TypeScript, ioredis, existing loader pattern.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/util/config/button.ts` | Modify | Add all VOICE_* button/select ID constants |
| `src/util/voice/helpers.ts` | Create | Shared helpers: owner check, cooldown check, build control panel embed+rows, update panel, cleanup Redis keys |
| `src/types/common/discord.d.ts` | Modify | Add `selectMenus` Collection to Client augmentation |
| `src/events/voiceStateUpdate.ts` | Modify | Send control panel on create, cleanup all Redis keys on delete |
| `src/loaders/selectMenus.ts` | Create | Auto-discover select menu handlers from `src/buttons/` (files with `voice_select_` prefix in id) |
| `src/events/interactionCreateSelectMenu.ts` | Create | Route `UserSelectMenuInteraction` to handlers |
| `src/events/interactionCreateModal.ts` | Create | Route `ModalSubmitInteraction` for rename/limit modals |
| `src/client.ts` | Modify | Import and call `loadSelectMenus()` |
| `src/buttons/voiceLock.button.ts` | Create | Lock button handler |
| `src/buttons/voiceUnlock.button.ts` | Create | Unlock button handler |
| `src/buttons/voiceHide.button.ts` | Create | Hide button handler |
| `src/buttons/voiceRename.button.ts` | Create | Open rename modal |
| `src/buttons/voiceLimit.button.ts` | Create | Open limit modal |
| `src/buttons/voicePermit.button.ts` | Create | Open permit user select menu |
| `src/buttons/voiceBlock.button.ts` | Create | Open block user select menu |
| `src/buttons/voiceKick.button.ts` | Create | Open kick user select menu |
| `src/buttons/voiceTransfer.button.ts` | Create | Open transfer user select menu |
| `src/buttons/voiceKickConfirm.button.ts` | Create | Handle kick-only vs kick+block follow-up buttons |
| `src/buttons/voiceSelectPermit.button.ts` | Create | Handle permit select menu response |
| `src/buttons/voiceSelectBlock.button.ts` | Create | Handle block select menu response |
| `src/buttons/voiceSelectKick.button.ts` | Create | Handle kick select menu response (show confirm buttons) |
| `src/buttons/voiceSelectTransfer.button.ts` | Create | Handle transfer select menu response |
| `src/commands/slash/voice.ts` | Modify | Add 7 new subcommands |

---

## Task 1: Button ID Constants

**Files:**
- Modify: `src/util/config/button.ts`

- [ ] **Step 1: Add all voice button and select menu ID constants**

```typescript
export const BUTTON_ID = {
    nhtaiRead: `nhtaiRead`,
    nhentaiToRead: `nhentaiToRead`,
    threeHentaiRead: `threeHentaiRead`,
    asmHentaiRead: `asmHentaiRead`,
    hentaiFoxRead: `hentaiFoxRead`,
    pururinRead: `pururinRead`,
    // Voice control panel buttons
    VOICE_LOCK: "voice_lock",
    VOICE_UNLOCK: "voice_unlock",
    VOICE_HIDE: "voice_hide",
    VOICE_RENAME: "voice_rename",
    VOICE_LIMIT: "voice_limit",
    VOICE_PERMIT: "voice_permit",
    VOICE_BLOCK: "voice_block",
    VOICE_KICK: "voice_kick",
    VOICE_TRANSFER: "voice_transfer",
    // Kick confirmation buttons
    VOICE_KICK_ONLY: "voice_kick_only",
    VOICE_KICK_BLOCK: "voice_kick_block",
    // Select menu IDs
    VOICE_SELECT_PERMIT: "voice_select_permit",
    VOICE_SELECT_BLOCK: "voice_select_block",
    VOICE_SELECT_KICK: "voice_select_kick",
    VOICE_SELECT_TRANSFER: "voice_select_transfer",
    // Modal IDs
    VOICE_MODAL_RENAME: "voice_modal_rename",
    VOICE_MODAL_LIMIT: "voice_modal_limit",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/util/config/button.ts
git commit -m "feat(voice): add button, select menu, and modal ID constants"
```

---

## Task 2: Voice Helpers Module

**Files:**
- Create: `src/util/voice/helpers.ts`

This is the shared module used by all button handlers. Contains: owner validation, cooldown check, control panel embed builder, panel update, Redis cleanup.

- [ ] **Step 1: Create the helpers file**

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    PermissionFlagsBits,
    RepliableInteraction,
    VoiceChannel,
} from "discord.js";

import redis from "../../connector/redis";
import { FOOTER } from "../config/index";
import { BUTTON_ID } from "../config/button";

const TTL_12H = 60 * 60 * 12;

/**
 * Check if the interaction user is the owner of the voice channel.
 * Returns the voice channel if valid, or null (and replies with error) if not.
 */
export async function validateOwner(
    interaction: RepliableInteraction
): Promise<VoiceChannel | null> {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel as VoiceChannel | null;

    if (!voiceChannel) {
        await interaction.reply({
            content: "You are not in a voice channel.",
            flags: MessageFlags.Ephemeral,
        });
        return null;
    }

    const ownerId = await redis.getJson(voiceChannel.id);
    if (ownerId !== interaction.user.id) {
        await interaction.reply({
            content: "You are not the owner of this voice channel.",
            flags: MessageFlags.Ephemeral,
        });
        return null;
    }

    return voiceChannel;
}

/**
 * Check cooldown for an action. Returns remaining seconds if on cooldown, 0 if clear.
 * If on cooldown, replies with ephemeral message.
 */
export async function checkCooldown(
    interaction: RepliableInteraction,
    redisKey: string
): Promise<boolean> {
    const ttl = await redis.ttlKey(redisKey);
    if (ttl > 0) {
        await interaction.reply({
            content: `Please try again in ${ttl}s.`,
            flags: MessageFlags.Ephemeral,
        });
        return false;
    }
    return true;
}

/**
 * Set cooldown for an action.
 */
export async function setCooldown(redisKey: string, seconds: number): Promise<void> {
    await redis.setJson(redisKey, 1, seconds);
}

/**
 * Build the control panel embed showing owner and status.
 */
export async function buildPanelEmbed(channelId: string, ownerId: string): Promise<EmbedBuilder> {
    const state: string = (await redis.getJson(`state:${channelId}`)) || "unlocked";
    const permitted: string[] = (await redis.getJson(`permitted:${channelId}`)) || [];
    const blocked: string[] = (await redis.getJson(`blocked:${channelId}`)) || [];

    const statusMap: Record<string, string> = {
        unlocked: "Unlocked",
        locked: "Locked",
        hidden: "Hidden",
    };

    const embed = new EmbedBuilder()
        .setTitle("Voice Control Panel")
        .setColor("Random")
        .setTimestamp()
        .setFooter({ text: FOOTER.text, iconURL: FOOTER.icon })
        .setDescription(`**Owner:** <@${ownerId}>\n**Status:** ${statusMap[state] ?? "Unlocked"}`);

    if (permitted.length > 0) {
        embed.addFields({
            name: "Permitted",
            value: permitted.map((id) => `<@${id}>`).join(", "),
        });
    }

    if (blocked.length > 0) {
        embed.addFields({
            name: "Blocked",
            value: blocked.map((id) => `<@${id}>`).join(", "),
        });
    }

    return embed;
}

/**
 * Build the button rows for the control panel.
 */
export function buildPanelRows(): ActionRowBuilder<ButtonBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_LOCK).setEmoji("🔒").setLabel("Lock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_UNLOCK).setEmoji("🔓").setLabel("Unlock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_HIDE).setEmoji("👁️").setLabel("Hide").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_RENAME).setEmoji("✏️").setLabel("Rename").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_LIMIT).setEmoji("👥").setLabel("Limit").setStyle(ButtonStyle.Primary),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_PERMIT).setEmoji("✅").setLabel("Permit").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_BLOCK).setEmoji("🚫").setLabel("Block").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_KICK).setEmoji("👢").setLabel("Kick").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_TRANSFER).setEmoji("🔄").setLabel("Transfer").setStyle(ButtonStyle.Primary),
    );

    return [row1, row2];
}

/**
 * Update the control panel message in the voice channel.
 */
export async function updatePanel(voiceChannel: VoiceChannel): Promise<void> {
    const panelMessageId = await redis.getJson(`panel:${voiceChannel.id}`);
    if (!panelMessageId) return;

    const ownerId = await redis.getJson(voiceChannel.id);
    if (!ownerId) return;

    try {
        const message = await voiceChannel.messages.fetch(panelMessageId);
        const embed = await buildPanelEmbed(voiceChannel.id, ownerId);
        await message.edit({ embeds: [embed], components: buildPanelRows() });
    } catch {
        // Message may have been deleted, ignore
    }
}

/**
 * Send the control panel to the voice channel text chat and store the message ID.
 */
export async function sendPanel(voiceChannel: VoiceChannel, ownerId: string): Promise<void> {
    const embed = await buildPanelEmbed(voiceChannel.id, ownerId);
    const rows = buildPanelRows();
    const message = await voiceChannel.send({ embeds: [embed], components: rows });
    await redis.setJson(`panel:${voiceChannel.id}`, message.id, TTL_12H);
}

/**
 * Clean up all Redis keys for a voice channel.
 */
export async function cleanupRedisKeys(channelId: string): Promise<void> {
    await Promise.all([
        redis.deleteKey(channelId),
        redis.deleteKey(`panel:${channelId}`),
        redis.deleteKey(`state:${channelId}`),
        redis.deleteKey(`blocked:${channelId}`),
        redis.deleteKey(`permitted:${channelId}`),
    ]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/util/voice/helpers.ts
git commit -m "feat(voice): add shared voice helpers module"
```

---

## Task 3: Update voiceStateUpdate to Send Panel & Cleanup Keys

**Files:**
- Modify: `src/events/voiceStateUpdate.ts`

- [ ] **Step 1: Rewrite voiceStateUpdate.ts**

Replace the full file content with:

```typescript
import {
    CategoryChannelResolvable,
    ChannelType,
    Events,
    PermissionFlagsBits,
    StageChannel,
    VoiceChannel,
    VoiceState,
} from "discord.js";

import { FOOTER } from "../util/config";
import redis from "../connector/redis";
import { sendPanel, cleanupRedisKeys } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;
const NAME_PREFIX_TRIGGER = "3AT ";
const NAME_PREFIX_TEMP = "* ";

export default {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(oldState: VoiceState, newState: VoiceState) {
        const reason = `Automatic create voice channel ${FOOTER.text}`;

        // Handle leave: delete empty temporary channels
        if (oldState.channel?.name.startsWith(NAME_PREFIX_TEMP)) {
            const memberCount = oldState.channel.members.size;
            const onlyBots = memberCount === 1 && oldState.channel.members.every((m) => m.user.bot);

            if (memberCount === 0 || onlyBots) {
                const channelId = oldState.channel.id;
                try {
                    const channel = await oldState.channel.fetch() as VoiceChannel | StageChannel;
                    await channel.delete(`Voice channel ${channel.name} deleted, powered by DS112`);
                } catch {
                    // Channel may already be deleted
                }
                await cleanupRedisKeys(channelId);
            }
        }

        // Handle join: create temporary voice channel
        if (newState.channel?.name.startsWith(NAME_PREFIX_TRIGGER)) {
            const everyone = newState.guild.roles.everyone;
            const voiceChannel = await newState.guild.channels.create({
                type: ChannelType.GuildVoice,
                name: `${NAME_PREFIX_TEMP}${newState.member?.user.username}`,
                bitrate: newState.channel.bitrate || 64000,
                parent: newState.channel.parent as CategoryChannelResolvable,
                userLimit: 23,
                reason,
                permissionOverwrites: [
                    {
                        id: everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                    },
                ],
            });

            await newState.setChannel(voiceChannel);
            await redis.setJson(voiceChannel.id, newState.id, TTL_12H);
            await sendPanel(voiceChannel as VoiceChannel, newState.id!);
        }
    },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/events/voiceStateUpdate.ts
git commit -m "feat(voice): send control panel on channel create, cleanup all Redis keys on delete"
```

---

## Task 4: Lock / Unlock / Hide Button Handlers

**Files:**
- Create: `src/buttons/voiceLock.button.ts`
- Create: `src/buttons/voiceUnlock.button.ts`
- Create: `src/buttons/voiceHide.button.ts`

- [ ] **Step 1: Create voiceLock.button.ts**

```typescript
import { ButtonInteraction, MessageFlags, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { validateOwner, checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_LOCK,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const cdKey = `cd:lock:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const everyone = interaction.guild!.roles.everyone;
        await voiceChannel.permissionOverwrites.edit(everyone, {
            Connect: false,
            ViewChannel: true,
        });

        await redis.setJson(`state:${voiceChannel.id}`, "locked", TTL_12H);
        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.reply({ content: "Channel locked 🔒", flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 2: Create voiceUnlock.button.ts**

```typescript
import { ButtonInteraction, MessageFlags, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { validateOwner, checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_UNLOCK,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const cdKey = `cd:lock:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const everyone = interaction.guild!.roles.everyone;
        await voiceChannel.permissionOverwrites.edit(everyone, {
            Connect: null,
            ViewChannel: true,
        });

        await redis.setJson(`state:${voiceChannel.id}`, "unlocked", TTL_12H);
        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.reply({ content: "Channel unlocked 🔓", flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 3: Create voiceHide.button.ts**

```typescript
import { ButtonInteraction, MessageFlags, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { validateOwner, checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_HIDE,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const cdKey = `cd:lock:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const everyone = interaction.guild!.roles.everyone;
        await voiceChannel.permissionOverwrites.edit(everyone, {
            Connect: false,
            ViewChannel: false,
        });

        await redis.setJson(`state:${voiceChannel.id}`, "hidden", TTL_12H);
        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.reply({ content: "Channel hidden 👁️", flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 4: Commit**

```bash
git add src/buttons/voiceLock.button.ts src/buttons/voiceUnlock.button.ts src/buttons/voiceHide.button.ts
git commit -m "feat(voice): add lock, unlock, hide button handlers"
```

---

## Task 5: Rename & Limit Modal Button Handlers + Modal Event Router

**Files:**
- Create: `src/buttons/voiceRename.button.ts`
- Create: `src/buttons/voiceLimit.button.ts`
- Create: `src/events/interactionCreateModal.ts`

- [ ] **Step 1: Create voiceRename.button.ts**

```typescript
import {
    ActionRowBuilder,
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner, checkCooldown } from "../util/voice/helpers";

export default {
    id: BUTTON_ID.VOICE_RENAME,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const cdKey = `setVoiceName:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const modal = new ModalBuilder()
            .setCustomId(BUTTON_ID.VOICE_MODAL_RENAME)
            .setTitle("Rename Voice Channel");

        const nameInput = new TextInputBuilder()
            .setCustomId("voice_name_input")
            .setLabel("New channel name (max 50 chars)")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(50)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
        await interaction.showModal(modal);
    },
};
```

- [ ] **Step 2: Create voiceLimit.button.ts**

```typescript
import {
    ActionRowBuilder,
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner, checkCooldown } from "../util/voice/helpers";

export default {
    id: BUTTON_ID.VOICE_LIMIT,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const cdKey = `setUserLimit:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const modal = new ModalBuilder()
            .setCustomId(BUTTON_ID.VOICE_MODAL_LIMIT)
            .setTitle("Set User Limit");

        const limitInput = new TextInputBuilder()
            .setCustomId("voice_limit_input")
            .setLabel("User limit (0-99, 0 = unlimited)")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(2)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput));
        await interaction.showModal(modal);
    },
};
```

- [ ] **Step 3: Create interactionCreateModal.ts**

```typescript
import { Events, GuildMember, MessageFlags, ModalSubmitInteraction, VoiceChannel } from "discord.js";

import redis from "../connector/redis";
import { BUTTON_ID } from "../util/config/button";
import { FOOTER } from "../util/config";
import { setCooldown, updatePanel } from "../util/voice/helpers";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.isModalSubmit()) return;

        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;
        if (!voiceChannel) {
            await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({ content: "You are not the owner of this voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        switch (interaction.customId) {
            case BUTTON_ID.VOICE_MODAL_RENAME: {
                const name = interaction.fields.getTextInputValue("voice_name_input");
                await voiceChannel.setName(`* ${name}`, `setVoiceName to ${name} ${FOOTER.text}`);
                await setCooldown(`setVoiceName:${voiceChannel.id}`, 120);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: `Channel renamed to **${name}** ✏️`, flags: MessageFlags.Ephemeral });
                break;
            }
            case BUTTON_ID.VOICE_MODAL_LIMIT: {
                const raw = interaction.fields.getTextInputValue("voice_limit_input");
                const limit = parseInt(raw, 10);
                if (isNaN(limit) || limit < 0 || limit > 99) {
                    await interaction.reply({ content: "Please enter a number between 0 and 99.", flags: MessageFlags.Ephemeral });
                    return;
                }
                await voiceChannel.setUserLimit(limit, `userLimit to ${limit} ${FOOTER.text}`);
                await setCooldown(`setUserLimit:${voiceChannel.id}`, 120);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: `User limit set to **${limit}** 👥`, flags: MessageFlags.Ephemeral });
                break;
            }
            default:
                break;
        }
    },
};
```

- [ ] **Step 4: Commit**

```bash
git add src/buttons/voiceRename.button.ts src/buttons/voiceLimit.button.ts src/events/interactionCreateModal.ts
git commit -m "feat(voice): add rename/limit modals with modal submit event handler"
```

---

## Task 6: Select Menu Infrastructure — Permit, Block, Kick, Transfer Buttons

These buttons open a `UserSelectMenuBuilder` when clicked.

**Files:**
- Create: `src/buttons/voicePermit.button.ts`
- Create: `src/buttons/voiceBlock.button.ts`
- Create: `src/buttons/voiceKick.button.ts`
- Create: `src/buttons/voiceTransfer.button.ts`
- Create: `src/events/interactionCreateSelectMenu.ts`
- Modify: `src/types/common/discord.d.ts`

- [ ] **Step 1: Create voicePermit.button.ts**

```typescript
import { ActionRowBuilder, ButtonInteraction, MessageFlags, UserSelectMenuBuilder } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner } from "../util/voice/helpers";

export default {
    id: BUTTON_ID.VOICE_PERMIT,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const selectMenu = new UserSelectMenuBuilder()
            .setCustomId(BUTTON_ID.VOICE_SELECT_PERMIT)
            .setPlaceholder("Select a user to permit")
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
        await interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 2: Create voiceBlock.button.ts**

```typescript
import { ActionRowBuilder, ButtonInteraction, MessageFlags, UserSelectMenuBuilder } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner } from "../util/voice/helpers";

export default {
    id: BUTTON_ID.VOICE_BLOCK,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const selectMenu = new UserSelectMenuBuilder()
            .setCustomId(BUTTON_ID.VOICE_SELECT_BLOCK)
            .setPlaceholder("Select a user to block")
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
        await interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 3: Create voiceKick.button.ts**

```typescript
import { ActionRowBuilder, ButtonInteraction, MessageFlags, UserSelectMenuBuilder } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner } from "../util/voice/helpers";

export default {
    id: BUTTON_ID.VOICE_KICK,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const selectMenu = new UserSelectMenuBuilder()
            .setCustomId(BUTTON_ID.VOICE_SELECT_KICK)
            .setPlaceholder("Select a user to kick")
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
        await interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 4: Create voiceTransfer.button.ts**

```typescript
import { ActionRowBuilder, ButtonInteraction, MessageFlags, UserSelectMenuBuilder } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { validateOwner } from "../util/voice/helpers";

export default {
    id: BUTTON_ID.VOICE_TRANSFER,
    async execute(interaction: ButtonInteraction) {
        const voiceChannel = await validateOwner(interaction);
        if (!voiceChannel) return;

        const selectMenu = new UserSelectMenuBuilder()
            .setCustomId(BUTTON_ID.VOICE_SELECT_TRANSFER)
            .setPlaceholder("Select the new owner")
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);
        await interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 5: Update discord.d.ts — add SelectMenuHandler interface**

```typescript
import {
    Collection,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
    UserSelectMenuInteraction,
} from "discord.js";

export interface SlashCommand {
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface ButtonHandler {
    id: string;
    execute(interaction: ButtonInteraction): Promise<void>;
}

export interface SelectMenuHandler {
    id: string;
    execute(interaction: UserSelectMenuInteraction): Promise<void>;
}

declare module "discord.js" {
    export interface Client {
        commands: Collection<string, SlashCommand>;
        buttons: Collection<string, ButtonHandler>;
        selectMenus: Collection<string, SelectMenuHandler>;
    }
}
```

- [ ] **Step 6: Create interactionCreateSelectMenu.ts**

```typescript
import { Events, MessageFlags, UserSelectMenuInteraction } from "discord.js";

import client from "../client";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: UserSelectMenuInteraction) {
        if (!interaction.isUserSelectMenu()) return;

        const handler = client?.selectMenus.get(interaction.customId);

        if (!handler) {
            console.error(`No select menu handler matching ${interaction.customId} was found.`);
            return;
        }

        try {
            await handler.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `There was an error while executing this select menu! ${interaction.customId}`,
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
```

- [ ] **Step 7: Commit**

```bash
git add src/buttons/voicePermit.button.ts src/buttons/voiceBlock.button.ts src/buttons/voiceKick.button.ts src/buttons/voiceTransfer.button.ts src/types/common/discord.d.ts src/events/interactionCreateSelectMenu.ts
git commit -m "feat(voice): add user select menu buttons and select menu event router"
```

---

## Task 7: Select Menu Response Handlers

**Files:**
- Create: `src/buttons/voiceSelectPermit.button.ts`
- Create: `src/buttons/voiceSelectBlock.button.ts`
- Create: `src/buttons/voiceSelectKick.button.ts`
- Create: `src/buttons/voiceSelectTransfer.button.ts`
- Create: `src/buttons/voiceKickConfirm.button.ts`

- [ ] **Step 1: Create voiceSelectPermit.button.ts**

```typescript
import { GuildMember, MessageFlags, UserSelectMenuInteraction, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_SELECT_PERMIT,
    async execute(interaction: UserSelectMenuInteraction) {
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;
        if (!voiceChannel) {
            await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({ content: "You are not the owner.", flags: MessageFlags.Ephemeral });
            return;
        }

        const cdKey = `cd:permit:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.reply({ content: "You cannot permit yourself.", flags: MessageFlags.Ephemeral });
            return;
        }

        await voiceChannel.permissionOverwrites.edit(targetId, {
            Connect: true,
            ViewChannel: true,
        });

        const permitted: string[] = (await redis.getJson(`permitted:${voiceChannel.id}`)) || [];
        if (!permitted.includes(targetId)) {
            permitted.push(targetId);
            await redis.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
        }

        // Remove from blocked if present
        const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
        const blockedIndex = blocked.indexOf(targetId);
        if (blockedIndex !== -1) {
            blocked.splice(blockedIndex, 1);
            await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
        }

        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.reply({ content: `<@${targetId}> has been permitted ✅`, flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 2: Create voiceSelectBlock.button.ts**

```typescript
import { GuildMember, MessageFlags, UserSelectMenuInteraction, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_SELECT_BLOCK,
    async execute(interaction: UserSelectMenuInteraction) {
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;
        if (!voiceChannel) {
            await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({ content: "You are not the owner.", flags: MessageFlags.Ephemeral });
            return;
        }

        const cdKey = `cd:block:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.reply({ content: "You cannot block yourself.", flags: MessageFlags.Ephemeral });
            return;
        }

        await voiceChannel.permissionOverwrites.edit(targetId, {
            Connect: false,
            ViewChannel: false,
        });

        const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
        if (!blocked.includes(targetId)) {
            blocked.push(targetId);
            await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
        }

        // Remove from permitted if present
        const permitted: string[] = (await redis.getJson(`permitted:${voiceChannel.id}`)) || [];
        const permIndex = permitted.indexOf(targetId);
        if (permIndex !== -1) {
            permitted.splice(permIndex, 1);
            await redis.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
        }

        // Disconnect user if in channel
        const targetMember = voiceChannel.members.get(targetId);
        if (targetMember) {
            await targetMember.voice.disconnect("Blocked by channel owner");
        }

        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.reply({ content: `<@${targetId}> has been blocked 🚫`, flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 3: Create voiceSelectKick.button.ts**

Shows the "Kick" vs "Kick & Block" confirmation buttons. Stores targetId in Redis briefly.

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
    MessageFlags,
    UserSelectMenuInteraction,
    VoiceChannel,
} from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { checkCooldown } from "../util/voice/helpers";

export default {
    id: BUTTON_ID.VOICE_SELECT_KICK,
    async execute(interaction: UserSelectMenuInteraction) {
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;
        if (!voiceChannel) {
            await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({ content: "You are not the owner.", flags: MessageFlags.Ephemeral });
            return;
        }

        const cdKey = `cd:kick:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.reply({ content: "You cannot kick yourself.", flags: MessageFlags.Ephemeral });
            return;
        }

        const targetMember = voiceChannel.members.get(targetId);
        if (!targetMember) {
            await interaction.reply({ content: "That user is not in the voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        // Store target for the confirmation handler (30s TTL)
        await redis.setJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`, targetId, 30);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_KICK_ONLY).setLabel("Kick").setEmoji("👢").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_KICK_BLOCK).setLabel("Kick & Block").setEmoji("🚫").setStyle(ButtonStyle.Danger),
        );

        await interaction.reply({
            content: `Kick <@${targetId}> from the voice channel?`,
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
    },
};
```

- [ ] **Step 4: Create voiceKickConfirm.button.ts**

```typescript
import { ButtonInteraction, GuildMember, MessageFlags, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_KICK_ONLY,
    async execute(interaction: ButtonInteraction) {
        await handleKick(interaction, interaction.customId === BUTTON_ID.VOICE_KICK_BLOCK);
    },
};

async function handleKick(interaction: ButtonInteraction, block: boolean): Promise<void> {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel as VoiceChannel | null;
    if (!voiceChannel) {
        await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
        return;
    }

    const targetId = await redis.getJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`);
    if (!targetId) {
        await interaction.reply({ content: "Kick request expired. Please try again.", flags: MessageFlags.Ephemeral });
        return;
    }

    await redis.deleteKey(`kick_target:${interaction.user.id}:${voiceChannel.id}`);

    const targetMember = voiceChannel.members.get(targetId);
    if (targetMember) {
        await targetMember.voice.disconnect("Kicked by channel owner");
    }

    if (block) {
        await voiceChannel.permissionOverwrites.edit(targetId, {
            Connect: false,
            ViewChannel: false,
        });

        const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
        if (!blocked.includes(targetId)) {
            blocked.push(targetId);
            await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
        }
    }

    await setCooldown(`cd:kick:${voiceChannel.id}`, 10);
    await updatePanel(voiceChannel);

    const action = block ? "kicked and blocked" : "kicked";
    await interaction.update({ content: `<@${targetId}> has been ${action}.`, components: [] });
}
```

Note: This handler is registered with `VOICE_KICK_ONLY` as its id. The `VOICE_KICK_BLOCK` button needs a separate handler since the loader matches by id. We'll register both in a single file by also registering the kick-block handler. However, the current loader only supports one handler per file. So we split into two approaches:

**Updated approach:** Register `voiceKickConfirm.button.ts` with `VOICE_KICK_ONLY` id, and create a second small file for `VOICE_KICK_BLOCK`:

Replace the above with:

**voiceKickConfirm.button.ts** (for VOICE_KICK_ONLY):

```typescript
import { ButtonInteraction, GuildMember, MessageFlags, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { setCooldown, updatePanel } from "../util/voice/helpers";
import { handleKick } from "../util/voice/kick";

export default {
    id: BUTTON_ID.VOICE_KICK_ONLY,
    async execute(interaction: ButtonInteraction) {
        await handleKick(interaction, false);
    },
};
```

Create **voiceKickBlock.button.ts** (for VOICE_KICK_BLOCK):

```typescript
import { ButtonInteraction } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { handleKick } from "../util/voice/kick";

export default {
    id: BUTTON_ID.VOICE_KICK_BLOCK,
    async execute(interaction: ButtonInteraction) {
        await handleKick(interaction, true);
    },
};
```

Create shared **src/util/voice/kick.ts**:

```typescript
import { ButtonInteraction, GuildMember, MessageFlags, VoiceChannel } from "discord.js";

import redis from "../../connector/redis";
import { setCooldown, updatePanel } from "./helpers";

const TTL_12H = 60 * 60 * 12;

export async function handleKick(interaction: ButtonInteraction, block: boolean): Promise<void> {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel as VoiceChannel | null;
    if (!voiceChannel) {
        await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
        return;
    }

    const targetId = await redis.getJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`);
    if (!targetId) {
        await interaction.reply({ content: "Kick request expired. Please try again.", flags: MessageFlags.Ephemeral });
        return;
    }

    await redis.deleteKey(`kick_target:${interaction.user.id}:${voiceChannel.id}`);

    const targetMember = voiceChannel.members.get(targetId);
    if (targetMember) {
        await targetMember.voice.disconnect("Kicked by channel owner");
    }

    if (block) {
        await voiceChannel.permissionOverwrites.edit(targetId, {
            Connect: false,
            ViewChannel: false,
        });

        const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
        if (!blocked.includes(targetId)) {
            blocked.push(targetId);
            await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
        }
    }

    await setCooldown(`cd:kick:${voiceChannel.id}`, 10);
    await updatePanel(voiceChannel);

    const action = block ? "kicked and blocked" : "kicked";
    await interaction.update({ content: `<@${targetId}> has been ${action}.`, components: [] });
}
```

- [ ] **Step 5: Create voiceSelectTransfer.button.ts**

```typescript
import { GuildMember, MessageFlags, UserSelectMenuInteraction, VoiceChannel } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import redis from "../connector/redis";
import { checkCooldown, setCooldown, updatePanel } from "../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    id: BUTTON_ID.VOICE_SELECT_TRANSFER,
    async execute(interaction: UserSelectMenuInteraction) {
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;
        if (!voiceChannel) {
            await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({ content: "You are not the owner.", flags: MessageFlags.Ephemeral });
            return;
        }

        const cdKey = `cd:transfer:${voiceChannel.id}`;
        if (!(await checkCooldown(interaction, cdKey))) return;

        const targetId = interaction.values[0];
        if (targetId === interaction.user.id) {
            await interaction.reply({ content: "You are already the owner.", flags: MessageFlags.Ephemeral });
            return;
        }

        // Transfer ownership
        await redis.setJson(voiceChannel.id, targetId, TTL_12H);
        // Clear permitted and blocked lists (clean slate)
        await redis.deleteKey(`permitted:${voiceChannel.id}`);
        await redis.deleteKey(`blocked:${voiceChannel.id}`);

        await setCooldown(cdKey, 5);
        await updatePanel(voiceChannel);
        await interaction.reply({ content: `Ownership transferred to <@${targetId}> 🔄`, flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 6: Commit**

```bash
git add src/buttons/voiceSelectPermit.button.ts src/buttons/voiceSelectBlock.button.ts src/buttons/voiceSelectKick.button.ts src/buttons/voiceKickConfirm.button.ts src/buttons/voiceKickBlock.button.ts src/buttons/voiceSelectTransfer.button.ts src/util/voice/kick.ts
git commit -m "feat(voice): add select menu response handlers and kick confirmation flow"
```

---

## Task 8: Select Menu Loader & Client Integration

**Files:**
- Create: `src/loaders/selectMenus.ts`
- Modify: `src/client.ts`

- [ ] **Step 1: Create selectMenus.ts loader**

```typescript
import { Client, Collection } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export function loadSelectMenus(client: Client): void {
    client.selectMenus = new Collection();

    const buttonsPath = path.join(__dirname, "../buttons");
    const files = fs.readdirSync(buttonsPath);

    for (const file of files) {
        const filePath = path.join(buttonsPath, file);
        const handler = require(filePath);

        if ("id" in handler.default && "execute" in handler.default) {
            const id: string = handler.default.id;
            // Select menu handlers have IDs starting with "voice_select_"
            if (id.startsWith("voice_select_")) {
                client.selectMenus.set(id, handler.default);
            }
        }
    }

    console.log(`Loaded ${client.selectMenus.size} select menus.`);
}
```

- [ ] **Step 2: Update client.ts**

```typescript
/// <reference path="./types/common/discord.d.ts" />
import { Client, GatewayIntentBits } from "discord.js";

import { loadCommands } from "./loaders/commands";
import { loadEvents } from "./loaders/events";
import { loadButtons } from "./loaders/buttons";
import { loadSelectMenus } from "./loaders/selectMenus";
import { deployCommands } from "./loaders/deploy";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const commands = loadCommands(client);
loadEvents(client);
loadButtons(client);
loadSelectMenus(client);

deployCommands(commands).catch(console.error);

export default client;
```

- [ ] **Step 3: Commit**

```bash
git add src/loaders/selectMenus.ts src/client.ts
git commit -m "feat(voice): add select menu loader and register in client"
```

---

## Task 9: Expand /voice Slash Command with New Subcommands

**Files:**
- Modify: `src/commands/slash/voice.ts`

- [ ] **Step 1: Rewrite voice.ts with all subcommands**

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    SlashCommandBuilder,
    VoiceChannel,
} from "discord.js";

import Reply from "../../util/decorator/reply";
import redis from "../../connector/redis";
import { FOOTER } from "../../util/config";
import { BUTTON_ID } from "../../util/config/button";
import { validateOwner, checkCooldown, setCooldown, updatePanel } from "../../util/voice/helpers";

const TTL_12H = 60 * 60 * 12;

export default {
    data: new SlashCommandBuilder()
        .setName("voice")
        .setDescription("Voice channel management")
        .addSubcommand((sub) =>
            sub.setName("limit")
                .setDescription("Set the user limit for the voice channel")
                .addIntegerOption((opt) =>
                    opt.setName("number").setDescription("Number of users (0-99)").setMinValue(0).setMaxValue(99).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub.setName("name")
                .setDescription("Change the voice channel name")
                .addStringOption((opt) =>
                    opt.setName("string").setDescription("New name").setMaxLength(50).setRequired(true)
                )
        )
        .addSubcommand((sub) => sub.setName("lock").setDescription("Lock the voice channel"))
        .addSubcommand((sub) => sub.setName("unlock").setDescription("Unlock the voice channel"))
        .addSubcommand((sub) => sub.setName("hide").setDescription("Hide the voice channel"))
        .addSubcommand((sub) =>
            sub.setName("permit")
                .setDescription("Permit a user to join")
                .addUserOption((opt) => opt.setName("user").setDescription("User to permit").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName("block")
                .setDescription("Block a user from the channel")
                .addUserOption((opt) => opt.setName("user").setDescription("User to block").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName("kick")
                .setDescription("Kick a user from the voice channel")
                .addUserOption((opt) => opt.setName("user").setDescription("User to kick").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName("transfer")
                .setDescription("Transfer channel ownership")
                .addUserOption((opt) => opt.setName("user").setDescription("New owner").setRequired(true))
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel as VoiceChannel | null;

        if (!voiceChannel) {
            await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ownerId = await redis.getJson(voiceChannel.id);
        if (ownerId !== interaction.user.id) {
            await interaction.reply({ content: "You are not the owner of this voice channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const subcommand = interaction.options.getSubcommand(true);

        switch (subcommand) {
            case "limit": {
                const cdKey = `setUserLimit:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const limit = interaction.options.getInteger("number", true);
                await voiceChannel.setUserLimit(limit, `userLimit to ${limit} ${FOOTER.text}`);
                await setCooldown(cdKey, 120);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: `User limit set to **${limit}** 👥`, flags: MessageFlags.Ephemeral });
                break;
            }
            case "name": {
                const cdKey = `setVoiceName:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const name = interaction.options.getString("string", true);
                await voiceChannel.setName(`* ${name}`, `setVoiceName to ${name} ${FOOTER.text}`);
                await setCooldown(cdKey, 120);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: `Channel renamed to **${name}** ✏️`, flags: MessageFlags.Ephemeral });
                break;
            }
            case "lock": {
                const cdKey = `cd:lock:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const everyone = interaction.guild!.roles.everyone;
                await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false, ViewChannel: true });
                await redis.setJson(`state:${voiceChannel.id}`, "locked", TTL_12H);
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: "Channel locked 🔒", flags: MessageFlags.Ephemeral });
                break;
            }
            case "unlock": {
                const cdKey = `cd:lock:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const everyone = interaction.guild!.roles.everyone;
                await voiceChannel.permissionOverwrites.edit(everyone, { Connect: null, ViewChannel: true });
                await redis.setJson(`state:${voiceChannel.id}`, "unlocked", TTL_12H);
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: "Channel unlocked 🔓", flags: MessageFlags.Ephemeral });
                break;
            }
            case "hide": {
                const cdKey = `cd:lock:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const everyone = interaction.guild!.roles.everyone;
                await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false, ViewChannel: false });
                await redis.setJson(`state:${voiceChannel.id}`, "hidden", TTL_12H);
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: "Channel hidden 👁️", flags: MessageFlags.Ephemeral });
                break;
            }
            case "permit": {
                const cdKey = `cd:permit:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const target = interaction.options.getUser("user", true);
                if (target.id === interaction.user.id) {
                    await interaction.reply({ content: "You cannot permit yourself.", flags: MessageFlags.Ephemeral });
                    return;
                }
                await voiceChannel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true });
                const permitted: string[] = (await redis.getJson(`permitted:${voiceChannel.id}`)) || [];
                if (!permitted.includes(target.id)) {
                    permitted.push(target.id);
                    await redis.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
                }
                const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
                const bi = blocked.indexOf(target.id);
                if (bi !== -1) {
                    blocked.splice(bi, 1);
                    await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
                }
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: `<@${target.id}> has been permitted ✅`, flags: MessageFlags.Ephemeral });
                break;
            }
            case "block": {
                const cdKey = `cd:block:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const target = interaction.options.getUser("user", true);
                if (target.id === interaction.user.id) {
                    await interaction.reply({ content: "You cannot block yourself.", flags: MessageFlags.Ephemeral });
                    return;
                }
                await voiceChannel.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false });
                const blocked: string[] = (await redis.getJson(`blocked:${voiceChannel.id}`)) || [];
                if (!blocked.includes(target.id)) {
                    blocked.push(target.id);
                    await redis.setJson(`blocked:${voiceChannel.id}`, blocked, TTL_12H);
                }
                const permitted: string[] = (await redis.getJson(`permitted:${voiceChannel.id}`)) || [];
                const pi = permitted.indexOf(target.id);
                if (pi !== -1) {
                    permitted.splice(pi, 1);
                    await redis.setJson(`permitted:${voiceChannel.id}`, permitted, TTL_12H);
                }
                const targetMember = voiceChannel.members.get(target.id);
                if (targetMember) {
                    await targetMember.voice.disconnect("Blocked by channel owner");
                }
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: `<@${target.id}> has been blocked 🚫`, flags: MessageFlags.Ephemeral });
                break;
            }
            case "kick": {
                const cdKey = `cd:kick:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const target = interaction.options.getUser("user", true);
                if (target.id === interaction.user.id) {
                    await interaction.reply({ content: "You cannot kick yourself.", flags: MessageFlags.Ephemeral });
                    return;
                }
                const targetMember = voiceChannel.members.get(target.id);
                if (!targetMember) {
                    await interaction.reply({ content: "That user is not in the voice channel.", flags: MessageFlags.Ephemeral });
                    return;
                }
                await redis.setJson(`kick_target:${interaction.user.id}:${voiceChannel.id}`, target.id, 30);
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_KICK_ONLY).setLabel("Kick").setEmoji("👢").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(BUTTON_ID.VOICE_KICK_BLOCK).setLabel("Kick & Block").setEmoji("🚫").setStyle(ButtonStyle.Danger),
                );
                await interaction.reply({ content: `Kick <@${target.id}> from the voice channel?`, components: [row], flags: MessageFlags.Ephemeral });
                break;
            }
            case "transfer": {
                const cdKey = `cd:transfer:${voiceChannel.id}`;
                if (!(await checkCooldown(interaction, cdKey))) return;
                const target = interaction.options.getUser("user", true);
                if (target.id === interaction.user.id) {
                    await interaction.reply({ content: "You are already the owner.", flags: MessageFlags.Ephemeral });
                    return;
                }
                await redis.setJson(voiceChannel.id, target.id, TTL_12H);
                await redis.deleteKey(`permitted:${voiceChannel.id}`);
                await redis.deleteKey(`blocked:${voiceChannel.id}`);
                await setCooldown(cdKey, 5);
                await updatePanel(voiceChannel);
                await interaction.reply({ content: `Ownership transferred to <@${target.id}> 🔄`, flags: MessageFlags.Ephemeral });
                break;
            }
            default:
                break;
        }
    },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/slash/voice.ts
git commit -m "feat(voice): expand /voice slash command with lock, unlock, hide, permit, block, kick, transfer subcommands"
```

---

## Task 10: Build & Verify

- [ ] **Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Fix any type errors found**

Address issues one at a time.

- [ ] **Step 3: Run the build**

```bash
npm run build
```

Expected: Clean compile to `dist/`.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(voice): resolve type errors from build"
```
