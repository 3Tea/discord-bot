# Remove Music Bot (DisTube) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all DisTube music bot functionality because the library is no longer available/maintained.

**Architecture:** Pure deletion — remove music commands, button handlers, utility modules, type augmentation, client initialization, and npm dependencies. No new code needed. The voice channel management feature (voiceStateUpdate.ts) is unrelated and stays.

**Tech Stack:** TypeScript, Discord.js v14, npm

---

### Task 1: Delete music source files

**Files:**
- Delete: `src/util/music/player.ts`
- Delete: `src/util/music/embed.ts`
- Delete: `src/util/music/panel.ts`
- Delete: `src/commands/slash/play.ts`
- Delete: `src/commands/slash/nowplaying.ts`
- Delete: `src/buttons/musicPause.button.ts`
- Delete: `src/buttons/musicSkip.button.ts`
- Delete: `src/buttons/musicStop.button.ts`
- Delete: `src/buttons/musicLoop.button.ts`
- Delete: `src/buttons/musicQueue.button.ts`

- [ ] **Step 1: Delete all music utility files**

```bash
rm src/util/music/player.ts src/util/music/embed.ts src/util/music/panel.ts
rmdir src/util/music
```

- [ ] **Step 2: Delete music commands**

```bash
rm src/commands/slash/play.ts src/commands/slash/nowplaying.ts
```

- [ ] **Step 3: Delete music button handlers**

```bash
rm src/buttons/musicPause.button.ts src/buttons/musicSkip.button.ts src/buttons/musicStop.button.ts src/buttons/musicLoop.button.ts src/buttons/musicQueue.button.ts
```

---

### Task 2: Remove music references from shared files

**Files:**
- Modify: `src/client.ts` (lines 9, 15)
- Modify: `src/types/common/discord.d.ts` (lines 1, 30)
- Modify: `src/util/config/button.ts` (lines 4-9)
- Modify: `src/util/config/index.ts` (lines 34-35)

- [ ] **Step 1: Remove music init from client.ts**

In `src/client.ts`, remove the import and call:

```typescript
// REMOVE this line:
import { initMusic } from "./util/music/player";

// REMOVE this line:
initMusic(client);
```

Result should be:

```typescript
/// <reference path="./types/common/discord.d.ts" />
import { Client, GatewayIntentBits } from "discord.js";

import { loadCommands } from "./loaders/commands";
import { loadEvents } from "./loaders/events";
import { loadButtons } from "./loaders/buttons";
import { loadSelectMenus } from "./loaders/selectMenus";
import { deployCommands } from "./loaders/deploy";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
});

const commands = loadCommands(client);
loadEvents(client);
loadButtons(client);
loadSelectMenus(client);

deployCommands(commands).catch(console.error);

export default client;
```

Note: Keep `GuildVoiceStates` intent — it's used by `voiceStateUpdate.ts` for temp voice channels.

- [ ] **Step 2: Remove DisTube from type augmentation**

In `src/types/common/discord.d.ts`, remove the DisTube import and the `distube` property:

```typescript
// REMOVE this line:
import type { DisTube } from "distube";

// REMOVE this line from the Client interface:
        distube: DisTube;
```

Result should be:

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

- [ ] **Step 3: Remove music button IDs from config**

In `src/util/config/button.ts`, remove lines 4-9 (the music player button constants):

```typescript
// REMOVE these lines:
    // Music player buttons
    MUSIC_PAUSE: "music_pause",
    MUSIC_SKIP: "music_skip",
    MUSIC_STOP: "music_stop",
    MUSIC_LOOP: "music_loop",
    MUSIC_QUEUE: "music_queue",
```

Result should be:

```typescript
export const BUTTON_ID = {
    // Manga reader
    mangaRead: "mangaRead",
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

- [ ] **Step 4: Remove Spotify config exports**

In `src/util/config/index.ts`, remove the last two lines:

```typescript
// REMOVE these lines:
export const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
```

---

### Task 3: Remove music npm dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Uninstall music packages**

```bash
npm uninstall distube @distube/spotify @distube/yt-dlp @discordjs/voice @discordjs/opus ffmpeg-static
```

Expected: 6 packages removed from `package.json` and `package-lock.json`.

---

### Task 4: Verify build and cleanup

- [ ] **Step 1: Clean dist and rebuild**

```bash
rm -rf dist && npm run build
```

Expected: TypeScript compiles with zero errors.

- [ ] **Step 2: Verify no dangling music references**

```bash
grep -r "distube\|music\|DisTube\|ffmpeg\|@discordjs/voice\|@discordjs/opus\|SPOTIFY" src/ --include="*.ts"
```

Expected: No output (zero matches in `src/`).

- [ ] **Step 3: Clean compiled music output if any remain**

```bash
rm -rf dist/util/music dist/commands/slash/play.js dist/commands/slash/nowplaying.js dist/buttons/musicPause.button.js dist/buttons/musicSkip.button.js dist/buttons/musicStop.button.js dist/buttons/musicLoop.button.js dist/buttons/musicQueue.button.js
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove DisTube music bot - library no longer available"
```
