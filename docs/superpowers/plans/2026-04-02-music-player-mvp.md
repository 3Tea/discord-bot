# Music Player MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add music playback to the Discord bot with /play command, Spotify support, persistent Now Playing panel with 5 control buttons, using DisTube v5 as the engine.

**Architecture:** DisTube v5 singleton attached to the Discord client handles queue management, audio streaming, and voice connections. A panel system (embed + buttons) follows the same persistent-panel pattern as voice channel management — 1 panel per guild, stored in Redis, edited in-place on song changes. SpotifyPlugin resolves Spotify URLs via YouTube search.

**Tech Stack:** Discord.js v14.26.0, DisTube v5, @discordjs/voice, @discordjs/opus, @distube/spotify, ffmpeg-static, ioredis

**Spec:** `docs/specs/20260402-music-player-mvp/`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add dependencies, update engines to >=22.12.0 |
| `src/util/config/button.ts` | Modify | Add 5 music button IDs |
| `src/util/config/index.ts` | Modify | Add SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET |
| `src/types/common/discord.d.ts` | Modify | Add `distube: DisTube` to Client interface |
| `src/util/music/embed.ts` | Create | buildNowPlayingEmbed, buildIdleEmbed, buildQueueEmbed, buildButtonRow |
| `src/util/music/panel.ts` | Create | sendPanel, updatePanel, deletePanel, resendPanel |
| `src/util/music/player.ts` | Create | DisTube singleton, initMusic(), event handlers |
| `src/client.ts` | Modify | Call initMusic() after client creation |
| `src/commands/slash/play.ts` | Create | /play slash command |
| `src/commands/slash/nowplaying.ts` | Create | /nowplaying slash command |
| `src/buttons/musicPause.button.ts` | Create | Toggle pause/resume |
| `src/buttons/musicSkip.button.ts` | Create | Skip to next song |
| `src/buttons/musicStop.button.ts` | Create | Stop + disconnect |
| `src/buttons/musicLoop.button.ts` | Create | Cycle repeat mode |
| `src/buttons/musicQueue.button.ts` | Create | Show queue (ephemeral) |

---

### Task 1: Install dependencies and update config

**Files:**
- Modify: `package.json`
- Modify: `src/util/config/button.ts`
- Modify: `src/util/config/index.ts`

- [ ] **Step 1: Install npm packages**

```bash
npm install distube @discordjs/voice @discordjs/opus @distube/spotify ffmpeg-static
```

- [ ] **Step 2: Update Node.js engines in package.json**

In `package.json`, change:
```json
"engines": {
    "node": ">=22.12.0"
}
```

- [ ] **Step 3: Add music button IDs to button config**

In `src/util/config/button.ts`, add after the `mangaRead` line:

```typescript
export const BUTTON_ID = {
    // Manga reader
    mangaRead: "mangaRead",
    // Music player buttons
    MUSIC_PAUSE: "music_pause",
    MUSIC_SKIP: "music_skip",
    MUSIC_STOP: "music_stop",
    MUSIC_LOOP: "music_loop",
    MUSIC_QUEUE: "music_queue",
    // Voice control panel buttons
    VOICE_LOCK: "voice_lock",
    // ... rest unchanged
```

- [ ] **Step 4: Add Spotify config constants**

In `src/util/config/index.ts`, add after the `URL_REPORT_BUG` line:

```typescript
export const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
```

- [ ] **Step 5: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/util/config/button.ts src/util/config/index.ts
git commit -m "feat(music): install DisTube + voice deps, add music button IDs and Spotify config"
```

---

### Task 2: Create embed and button row builders

**Files:**
- Create: `src/util/music/embed.ts`

- [ ] **Step 1: Create the music directory and embed file**

```bash
mkdir -p src/util/music
```

Write `src/util/music/embed.ts`:

```typescript
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { Queue, Song } from "distube";

import { FOOTER } from "../config/index";
import { BUTTON_ID } from "../config/button";

const LOOP_LABELS = ["Off", "🔂 Song", "🔁 Queue"] as const;

export function buildNowPlayingEmbed(song: Song, queue: Queue): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle("🎵 Now Playing")
        .setColor(0x1db954)
        .setDescription(`**[${song.name}](${song.url})**`)
        .addFields(
            { name: "Artist", value: song.uploader?.name || "Unknown", inline: true },
            { name: "Duration", value: song.formattedDuration || "Live", inline: true },
            { name: "Requested by", value: `${song.member?.user || "Unknown"}`, inline: true },
            {
                name: "Queue",
                value: queue.songs.length > 1 ? `${queue.songs.length - 1} song(s) remaining` : "No songs in queue",
                inline: true,
            },
            { name: "Loop", value: LOOP_LABELS[queue.repeatMode] || "Off", inline: true }
        )
        .setTimestamp();

    if (song.thumbnail) {
        embed.setThumbnail(song.thumbnail);
    }

    if (FOOTER.text) {
        embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon || undefined });
    }

    return embed;
}

export function buildIdleEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle("🎵 Music Player")
        .setColor(0x808080)
        .setDescription("No music playing. Use `/play` to start!")
        .setTimestamp();

    if (FOOTER.text) {
        embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon || undefined });
    }

    return embed;
}

export function buildQueueEmbed(queue: Queue): EmbedBuilder {
    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1, 11);

    let description = `**🎵 Now:** [${current.name}](${current.url}) — ${current.formattedDuration}\n\n`;

    if (upcoming.length > 0) {
        description += upcoming
            .map((song, i) => `**${i + 1}.** [${song.name}](${song.url}) — ${song.formattedDuration}`)
            .join("\n");
    } else {
        description += "*No upcoming songs*";
    }

    if (queue.songs.length > 11) {
        description += `\n\n*...and ${queue.songs.length - 11} more*`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`📋 Queue (${queue.songs.length} song${queue.songs.length === 1 ? "" : "s"})`)
        .setColor(0x1db954)
        .setDescription(description)
        .setTimestamp();

    if (FOOTER.text) {
        embed.setFooter({ text: FOOTER.text, iconURL: FOOTER.icon || undefined });
    }

    return embed;
}

export function buildButtonRow(isPaused: boolean, repeatMode: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_PAUSE)
            .setEmoji(isPaused ? "▶️" : "⏸️")
            .setLabel(isPaused ? "Resume" : "Pause")
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_SKIP)
            .setEmoji("⏭️")
            .setLabel("Skip")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_STOP)
            .setEmoji("⏹️")
            .setLabel("Stop")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_LOOP)
            .setEmoji(repeatMode === 0 ? "🔁" : repeatMode === 1 ? "🔂" : "🔁")
            .setLabel(`Loop: ${LOOP_LABELS[repeatMode] || "Off"}`)
            .setStyle(repeatMode === 0 ? ButtonStyle.Secondary : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_QUEUE)
            .setEmoji("📋")
            .setLabel("Queue")
            .setStyle(ButtonStyle.Secondary)
    );
}

export function buildDisabledButtonRow(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_PAUSE)
            .setEmoji("⏸️")
            .setLabel("Pause")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_SKIP)
            .setEmoji("⏭️")
            .setLabel("Skip")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_STOP)
            .setEmoji("⏹️")
            .setLabel("Stop")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_LOOP)
            .setEmoji("🔁")
            .setLabel("Loop: Off")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(BUTTON_ID.MUSIC_QUEUE)
            .setEmoji("📋")
            .setLabel("Queue")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 3: Commit**

```bash
git add src/util/music/embed.ts
git commit -m "feat(music): add Now Playing embed, queue embed, and button row builders"
```

---

### Task 3: Create panel manager

**Files:**
- Create: `src/util/music/panel.ts`

- [ ] **Step 1: Create the panel manager**

Write `src/util/music/panel.ts`:

```typescript
import type { Client, TextBasedChannel } from "discord.js";
import type { Queue } from "distube";

import redis from "../../connector/redis";
import log from "../log/logger.mixed";
import { buildNowPlayingEmbed, buildButtonRow, buildIdleEmbed, buildDisabledButtonRow } from "./embed";

const TTL_12H = 60 * 60 * 12;

interface PanelData {
    channelId: string;
    messageId: string;
}

export async function sendPanel(textChannel: TextBasedChannel, queue: Queue): Promise<void> {
    const song = queue.songs[0];
    if (!song) return;

    const guildId = queue.voiceChannel?.guild.id;
    if (!guildId) return;

    const embed = buildNowPlayingEmbed(song, queue);
    const row = buildButtonRow(queue.paused, queue.repeatMode);

    const message = await textChannel.send({ embeds: [embed], components: [row] });

    const panelData: PanelData = { channelId: textChannel.id, messageId: message.id };
    await redis.setJson(`music_panel:${guildId}`, panelData, TTL_12H);
}

export async function updatePanel(client: Client, guildId: string, queue: Queue): Promise<void> {
    const panelData: PanelData | null = await redis.getJson(`music_panel:${guildId}`);
    if (!panelData) return;

    try {
        const channel = await client.channels.fetch(panelData.channelId);
        if (!channel?.isTextBased()) return;

        const message = await channel.messages.fetch(panelData.messageId);
        const song = queue.songs[0];

        if (song) {
            const embed = buildNowPlayingEmbed(song, queue);
            const row = buildButtonRow(queue.paused, queue.repeatMode);
            await message.edit({ embeds: [embed], components: [row] });
        } else {
            const embed = buildIdleEmbed();
            const row = buildDisabledButtonRow();
            await message.edit({ embeds: [embed], components: [row] });
        }
    } catch {
        // Message was deleted or channel inaccessible — clean up Redis
        await redis.deleteKey(`music_panel:${guildId}`);
    }
}

export async function setIdlePanel(client: Client, guildId: string): Promise<void> {
    const panelData: PanelData | null = await redis.getJson(`music_panel:${guildId}`);
    if (!panelData) return;

    try {
        const channel = await client.channels.fetch(panelData.channelId);
        if (!channel?.isTextBased()) return;

        const message = await channel.messages.fetch(panelData.messageId);
        const embed = buildIdleEmbed();
        const row = buildDisabledButtonRow();
        await message.edit({ embeds: [embed], components: [row] });
    } catch {
        await redis.deleteKey(`music_panel:${guildId}`);
    }
}

export async function deletePanel(client: Client, guildId: string): Promise<void> {
    const panelData: PanelData | null = await redis.getJson(`music_panel:${guildId}`);
    if (!panelData) return;

    try {
        const channel = await client.channels.fetch(panelData.channelId);
        if (channel?.isTextBased()) {
            const message = await channel.messages.fetch(panelData.messageId);
            await message.delete();
        }
    } catch {
        // Already deleted, ignore
    }

    await redis.deleteKey(`music_panel:${guildId}`);
}

export async function resendPanel(textChannel: TextBasedChannel, client: Client, queue: Queue): Promise<void> {
    const guildId = queue.voiceChannel?.guild.id;
    if (!guildId) return;

    await deletePanel(client, guildId);
    await sendPanel(textChannel, queue);
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 3: Commit**

```bash
git add src/util/music/panel.ts
git commit -m "feat(music): add Redis-backed music panel manager (send/update/delete/resend)"
```

---

### Task 4: Create DisTube instance and wire up events

**Files:**
- Create: `src/util/music/player.ts`
- Modify: `src/types/common/discord.d.ts`
- Modify: `src/client.ts`

- [ ] **Step 1: Update Client type augmentation**

In `src/types/common/discord.d.ts`, add the DisTube import and property:

```typescript
import {
    Collection,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
    UserSelectMenuInteraction,
} from "discord.js";
import type { DisTube } from "distube";

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
        distube: DisTube;
    }
}
```

- [ ] **Step 2: Create the DisTube player module**

Write `src/util/music/player.ts`:

```typescript
import type { Client } from "discord.js";
import { DisTube } from "distube";
import { SpotifyPlugin } from "@distube/spotify";

import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from "../config/index";
import log from "../log/logger.mixed";
import { sendPanel, updatePanel, setIdlePanel, deletePanel } from "./panel";

export function initMusic(client: Client): void {
    const plugins = [];

    if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
        plugins.push(
            new SpotifyPlugin({
                api: {
                    clientId: SPOTIFY_CLIENT_ID,
                    clientSecret: SPOTIFY_CLIENT_SECRET,
                },
            })
        );
        log("[music] Spotify plugin loaded", "info");
    } else {
        log("[music] Spotify credentials not set — Spotify URLs will not work", "warn");
    }

    const distube = new DisTube(client, { plugins });
    client.distube = distube;

    distube.on("playSong", async (queue, song) => {
        log(`[music] Playing: ${song.name} in guild ${queue.voiceChannel?.guild.id}`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        const panelData = await import("../../connector/redis").then((r) => r.default.getJson(`music_panel:${guildId}`));

        if (panelData) {
            await updatePanel(client, guildId, queue);
        } else if (queue.textChannel) {
            await sendPanel(queue.textChannel, queue);
        }
    });

    distube.on("addSong", async (queue, song) => {
        log(`[music] Added to queue: ${song.name} in guild ${queue.voiceChannel?.guild.id}`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        await updatePanel(client, guildId, queue);
    });

    distube.on("addList", async (queue, playlist) => {
        log(`[music] Playlist added: ${playlist.name} (${playlist.songs.length} songs)`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        await updatePanel(client, guildId, queue);
    });

    distube.on("finish", async (queue) => {
        log(`[music] Queue finished in guild ${queue.voiceChannel?.guild.id}`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        await setIdlePanel(client, guildId);
    });

    distube.on("disconnect", async (queue) => {
        log(`[music] Disconnected in guild ${queue.voiceChannel?.guild.id}`, "info");

        const guildId = queue.voiceChannel?.guild.id;
        if (!guildId) return;

        await setIdlePanel(client, guildId);
    });

    distube.on("empty", async (queue) => {
        log(`[music] Voice channel empty in guild ${queue.voiceChannel?.guild.id}`, "info");
        // DisTube auto-handles disconnect after leaveOnEmpty timeout
    });

    distube.on("error", async (error, queue, song) => {
        log(
            `[music] Error: ${error.message}${song ? ` (song: ${song.name})` : ""} in guild ${queue.voiceChannel?.guild.id}`,
            "error"
        );
        // DisTube auto-skips on error by default
    });

    log("[music] DisTube initialized", "info");
}
```

- [ ] **Step 3: Wire up DisTube in client.ts**

Update `src/client.ts`:

```typescript
/// <reference path="./types/common/discord.d.ts" />
import { Client, GatewayIntentBits } from "discord.js";

import { loadCommands } from "./loaders/commands";
import { loadEvents } from "./loaders/events";
import { loadButtons } from "./loaders/buttons";
import { loadSelectMenus } from "./loaders/selectMenus";
import { deployCommands } from "./loaders/deploy";
import { initMusic } from "./util/music/player";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
});

initMusic(client);

const commands = loadCommands(client);
loadEvents(client);
loadButtons(client);
loadSelectMenus(client);

deployCommands(commands).catch(console.error);

export default client;
```

- [ ] **Step 4: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 5: Commit**

```bash
git add src/util/music/player.ts src/types/common/discord.d.ts src/client.ts
git commit -m "feat(music): initialize DisTube with Spotify plugin and event handlers"
```

---

### Task 5: Create /play command

**Files:**
- Create: `src/commands/slash/play.ts`

- [ ] **Step 1: Create the play command**

Write `src/commands/slash/play.ts`:

```typescript
import { ChatInputCommandInteraction, GuildMember, MessageFlags, SlashCommandBuilder } from "discord.js";

import log from "../../util/log/logger.mixed";

export default {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song from Spotify, YouTube, or search by name")
        .addStringOption((opt) =>
            opt.setName("query").setDescription("Song name, YouTube URL, or Spotify URL").setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({
                content: "You need to be in a voice channel to play music.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const query = interaction.options.getString("query", true);

        await interaction.deferReply();

        try {
            await interaction.client.distube.play(voiceChannel, query, {
                member,
                textChannel: interaction.channel ?? undefined,
            });

            await interaction.deleteReply();
        } catch (error) {
            log(`[music] Play error: ${error instanceof Error ? error.message : "Unknown"}`, "error");

            await interaction.editReply({
                content: `No results found for: **${query}**`,
            });
        }
    },
};
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/play.ts
git commit -m "feat(music): add /play command with Spotify and YouTube support"
```

---

### Task 6: Create /nowplaying command

**Files:**
- Create: `src/commands/slash/nowplaying.ts`

- [ ] **Step 1: Create the nowplaying command**

Write `src/commands/slash/nowplaying.ts`:

```typescript
import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";

import { resendPanel } from "../../util/music/panel";

export default {
    data: new SlashCommandBuilder().setName("nowplaying").setDescription("Show the current music player panel"),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue || !queue.songs.length) {
            await interaction.reply({
                content: "Nothing is playing right now. Use `/play` to start!",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply();

        if (interaction.channel) {
            await resendPanel(interaction.channel, interaction.client, queue);
        }

        await interaction.deleteReply();
    },
};
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/nowplaying.ts
git commit -m "feat(music): add /nowplaying command to re-send music panel"
```

---

### Task 7: Create 5 music button handlers

**Files:**
- Create: `src/buttons/musicPause.button.ts`
- Create: `src/buttons/musicSkip.button.ts`
- Create: `src/buttons/musicStop.button.ts`
- Create: `src/buttons/musicLoop.button.ts`
- Create: `src/buttons/musicQueue.button.ts`

- [ ] **Step 1: Create musicPause button**

Write `src/buttons/musicPause.button.ts`:

```typescript
import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { updatePanel } from "../util/music/panel";

export default {
    id: BUTTON_ID.MUSIC_PAUSE,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue) {
            await interaction.reply({ content: "Nothing is playing.", flags: MessageFlags.Ephemeral });
            return;
        }

        if (queue.paused) {
            queue.resume();
        } else {
            queue.pause();
        }

        await updatePanel(interaction.client, interaction.guildId!, queue);
        await interaction.deferUpdate();
    },
};
```

- [ ] **Step 2: Create musicSkip button**

Write `src/buttons/musicSkip.button.ts`:

```typescript
import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";

export default {
    id: BUTTON_ID.MUSIC_SKIP,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue) {
            await interaction.reply({ content: "Nothing is playing.", flags: MessageFlags.Ephemeral });
            return;
        }

        if (queue.songs.length <= 1) {
            queue.stop();
        } else {
            await queue.skip();
        }

        await interaction.deferUpdate();
    },
};
```

- [ ] **Step 3: Create musicStop button**

Write `src/buttons/musicStop.button.ts`:

```typescript
import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { setIdlePanel } from "../util/music/panel";

export default {
    id: BUTTON_ID.MUSIC_STOP,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue) {
            await interaction.reply({ content: "Nothing is playing.", flags: MessageFlags.Ephemeral });
            return;
        }

        queue.stop();
        await setIdlePanel(interaction.client, interaction.guildId!);
        await interaction.deferUpdate();
    },
};
```

- [ ] **Step 4: Create musicLoop button**

Write `src/buttons/musicLoop.button.ts`:

```typescript
import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { updatePanel } from "../util/music/panel";

const LOOP_NAMES = ["disabled", "song repeat", "queue repeat"];

export default {
    id: BUTTON_ID.MUSIC_LOOP,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue) {
            await interaction.reply({ content: "Nothing is playing.", flags: MessageFlags.Ephemeral });
            return;
        }

        const newMode = queue.setRepeatMode();
        await updatePanel(interaction.client, interaction.guildId!, queue);

        await interaction.reply({
            content: `Loop mode: **${LOOP_NAMES[newMode]}**`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
```

- [ ] **Step 5: Create musicQueue button**

Write `src/buttons/musicQueue.button.ts`:

```typescript
import { ButtonInteraction, MessageFlags } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { buildQueueEmbed } from "../util/music/embed";

export default {
    id: BUTTON_ID.MUSIC_QUEUE,
    async execute(interaction: ButtonInteraction): Promise<void> {
        const queue = interaction.client.distube.getQueue(interaction.guildId!);

        if (!queue || !queue.songs.length) {
            await interaction.reply({ content: "The queue is empty.", flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = buildQueueEmbed(queue);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};
```

- [ ] **Step 6: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 7: Commit**

```bash
git add src/buttons/musicPause.button.ts src/buttons/musicSkip.button.ts src/buttons/musicStop.button.ts src/buttons/musicLoop.button.ts src/buttons/musicQueue.button.ts
git commit -m "feat(music): add 5 music control button handlers (pause, skip, stop, loop, queue)"
```

---

### Task 8: Update .env.example and final build verification

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add Spotify env vars to .env.example**

Add to `.env.example`:

```
# Spotify (optional — needed for Spotify URL support)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

- [ ] **Step 2: Clean build**

```bash
rm -rf dist && npm run build
```

Expected: zero errors

- [ ] **Step 3: Verify file counts**

```bash
ls src/util/music/
```
Expected: `embed.ts`, `panel.ts`, `player.ts` (3 files)

```bash
ls src/buttons/music*.button.ts
```
Expected: 5 files (musicPause, musicSkip, musicStop, musicLoop, musicQueue)

```bash
ls src/commands/slash/play.ts src/commands/slash/nowplaying.ts
```
Expected: both exist

- [ ] **Step 4: Verify no console.log in music code**

```bash
grep -r "console.log" src/util/music/ src/commands/slash/play.ts src/commands/slash/nowplaying.ts src/buttons/music*.button.ts
```
Expected: zero results

- [ ] **Step 5: Verify no direct process.env in music code**

```bash
grep -r "process.env" src/util/music/ src/commands/slash/play.ts src/commands/slash/nowplaying.ts src/buttons/music*.button.ts
```
Expected: zero results

- [ ] **Step 6: Commit**

```bash
git add .env.example
git commit -m "docs: add Spotify env vars to .env.example"
```
