# Refactor Manga Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate 6 duplicate manga commands + 6 identical button handlers into a shared handler architecture, reducing ~1000 LOC to ~250 LOC with zero user-facing changes.

**Architecture:** A source registry (`sources.ts`) defines per-source config (API path, URL, embed fields). A factory function (`handler.ts`) generates command objects from source config. A shared reader (`reader.ts`) handles thread creation and image delivery. Each existing command file becomes a thin ~10-line wrapper. One unified button handler replaces 6 identical files.

**Tech Stack:** Discord.js v14, TypeScript, axios, ioredis (RedisService), winston/tracer logger

**Spec:** `docs/specs/20260402-refactor-manga-commands/`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/util/manga/sources.ts` | Create | Source configs: name, apiPath, urlBase, embed field builders |
| `src/util/manga/handler.ts` | Create | `mangaCommand()` factory: NSFW check, API call, embed, buttons, cache |
| `src/util/manga/reader.ts` | Create | `mangaRead()`: thread creation, disclaimer, image delivery |
| `src/util/config/button.ts` | Modify | Add `mangaRead`, remove 6 old manga IDs |
| `src/util/config/index.ts` | Modify | Add `URL_REPORT_BUG` constant |
| `src/commands/slash/nhentai.ts` | Rewrite | Thin wrapper → `mangaCommand(MANGA_SOURCES.nhentai)` |
| `src/commands/slash/3hentai.ts` | Rewrite | Thin wrapper → `mangaCommand(MANGA_SOURCES.threeHentai)` |
| `src/commands/slash/asmhentai.ts` | Rewrite | Thin wrapper → `mangaCommand(MANGA_SOURCES.asmhentai)` |
| `src/commands/slash/hentaifox.ts` | Rewrite | Thin wrapper → `mangaCommand(MANGA_SOURCES.hentaifox)` |
| `src/commands/slash/nhentaiTo.ts` | Rewrite | Thin wrapper → `mangaCommand(MANGA_SOURCES.nhentaiTo)` |
| `src/commands/slash/pururin.ts` | Rewrite | Thin wrapper → `mangaCommand(MANGA_SOURCES.pururin)` |
| `src/buttons/mangaRead.button.ts` | Create | Unified button handler using `mangaRead()` |
| `src/buttons/nhentai.button.ts` | Delete | Replaced by mangaRead.button.ts |
| `src/buttons/3hentai.button.ts` | Delete | Replaced by mangaRead.button.ts |
| `src/buttons/asmhentai.button.ts` | Delete | Replaced by mangaRead.button.ts |
| `src/buttons/hentaifox.button.ts` | Delete | Replaced by mangaRead.button.ts |
| `src/buttons/nhentaiTo.button.ts` | Delete | Replaced by mangaRead.button.ts |
| `src/buttons/pururin.button.ts` | Delete | Replaced by mangaRead.button.ts |

---

### Task 1: Add config constants

**Files:**
- Modify: `src/util/config/index.ts`
- Modify: `src/util/config/button.ts`

- [ ] **Step 1: Add URL_REPORT_BUG to config**

In `src/util/config/index.ts`, add after the `KEY_CHAT` line:

```typescript
export const URL_REPORT_BUG = process.env.URL_REPORT_BUG || "";
```

- [ ] **Step 2: Add mangaRead button ID**

In `src/util/config/button.ts`, add `mangaRead` at the top of the BUTTON_ID object (before the old manga IDs):

```typescript
export const BUTTON_ID = {
    // Manga reader
    mangaRead: "mangaRead",
    nhtaiRead: `nhtaiRead`,
    // ... rest unchanged for now
```

- [ ] **Step 3: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 4: Commit**

```bash
git add src/util/config/index.ts src/util/config/button.ts
git commit -m "feat(manga): add mangaRead button ID and URL_REPORT_BUG config"
```

---

### Task 2: Create source registry

**Files:**
- Create: `src/util/manga/sources.ts`

- [ ] **Step 1: Create the sources file**

```typescript
import type { APIEmbedField } from "discord.js";

export interface MangaSource {
    name: string;
    description: string;
    apiPath: string;
    urlBase: string;
    fields: (result: Record<string, unknown>) => APIEmbedField[];
}

const fallback = (value: unknown, placeholder = "update..."): string =>
    value && String(value).length > 0 ? String(value) : placeholder;

export const MANGA_SOURCES: Record<string, MangaSource> = {
    nhentai: {
        name: "nhentai",
        description: "H manga and D reader",
        apiPath: "nhentai",
        urlBase: "https://nhentai.net/g/",
        fields: (r) => [
            {
                name: "Title: ",
                value: `${fallback(r.optional_title?.english)}\n${fallback(r.optional_title?.japanese)}\n${fallback(r.optional_title?.pretty)}`,
                inline: false,
            },
            { name: "Language: ", value: fallback(r.language), inline: true },
            { name: "Artist", value: fallback(r.artist), inline: true },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Group: ", value: `G: ${fallback(r.group)}`, inline: true },
            { name: "Parodies: ", value: `P: ${fallback(r.parodies)}`, inline: true },
            {
                name: "Characters: ",
                value: `C: ${fallback(r.characters)}`,
                inline: true,
            },
            { name: "Last updated: ", value: fallback(r.upload_date), inline: true },
        ],
    },

    threeHentai: {
        name: "3hentai",
        description: "H manga and D from 3hentai",
        apiPath: "3hentai",
        urlBase: "http://3hentai.net/d/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
            { name: "Update", value: fallback(r.upload_date), inline: true },
        ],
    },

    asmhentai: {
        name: "asmhentai",
        description: "Gets random doujinshi on asmhentai",
        apiPath: "asmhentai",
        urlBase: "https://asmhentai.com/g/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
            { name: "Update", value: fallback(r.upload_date), inline: true },
        ],
    },

    hentaifox: {
        name: "hentaifox",
        description: "Gets random doujinshi on hentaifox",
        apiPath: "hentaifox",
        urlBase: "https://hentaifox.com/gallery/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
            { name: "Update", value: fallback(r.upload_date), inline: true },
        ],
    },

    nhentaiTo: {
        name: "nhentai-lite",
        description: "H manga and D reader nhentai lite",
        apiPath: "nhentaito",
        urlBase: "https://nhentai.to/g/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
        ],
    },

    pururin: {
        name: "pururin",
        description: "Gets random doujinshi on pururin",
        apiPath: "pururin",
        urlBase: "https://pururin.to/gallery/",
        fields: (r) => [
            { name: "Title: ", value: String(r.title), inline: false },
            { name: "Total of pages", value: String(r.total), inline: true },
            { name: "Tags", value: fallback(r.tags, "Update..."), inline: true },
        ],
    },
};
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 3: Commit**

```bash
git add src/util/manga/sources.ts
git commit -m "feat(manga): add source registry with 6 manga source configs"
```

---

### Task 3: Create shared command handler

**Files:**
- Create: `src/util/manga/handler.ts`

- [ ] **Step 1: Create the handler factory**

```typescript
import axios from "axios";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { setTimeout as wait } from "node:timers/promises";

import redis from "../../connector/redis/index";
import { FOOTER, SERVER_HD, URL_REPORT_BUG } from "../../util/config";
import { BUTTON_ID } from "../../util/config/button";
import log from "../../util/log/logger.mixed";
import type { MangaSource } from "./sources";

const CACHE_TTL = 60 * 10; // 10 minutes
const BUTTON_REMOVE_DELAY = 20_000; // 20 seconds
const MAX_READ_PAGES = 50;

export function mangaCommand(source: MangaSource) {
    return {
        data: new SlashCommandBuilder()
            .setName(source.name)
            .setDescription(source.description)
            .addSubcommand((sub) =>
                sub
                    .setName("read")
                    .setDescription(`Read H manga and D`)
                    .addIntegerOption((opt) =>
                        opt.setName("id").setDescription("The ID you wanna read").setRequired(true)
                    )
            )
            .addSubcommand((sub) =>
                sub.setName("random").setDescription(`Random H and D from ${source.name}`)
            ),

        async execute(interaction: ChatInputCommandInteraction): Promise<void> {
            try {
                if (!(interaction.channel as TextChannel)?.nsfw) {
                    await interaction.reply({ content: "Only NSFW channel", ephemeral: true });
                    return;
                }

                const subcommand = interaction.options.getSubcommand(true);
                await interaction.deferReply();

                const apiUrl =
                    subcommand === "random"
                        ? `${SERVER_HD}${source.apiPath}/random`
                        : `${SERVER_HD}${source.apiPath}/get?book=${interaction.options.getInteger("id", true)}`;

                const response = await axios.get(apiUrl);

                if (!response.data?.data) return;

                const result = response.data.data;

                const embed = new EmbedBuilder()
                    .setColor("Random")
                    .setTitle(result.title)
                    .setURL(`${source.urlBase}${result.id}`)
                    .setImage(result.image[0])
                    .addFields(source.fields(result))
                    .setDescription(`${result.id}`)
                    .setTimestamp()
                    .setFooter({ text: FOOTER.text, iconURL: FOOTER.icon });

                const row = new ActionRowBuilder<ButtonBuilder>();

                if (result.total < MAX_READ_PAGES) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(BUTTON_ID.mangaRead)
                            .setLabel("Read")
                            .setStyle(ButtonStyle.Primary)
                    );
                    await redis.setJson(
                        `${BUTTON_ID.mangaRead}_${result.id}`,
                        result.image,
                        CACHE_TTL
                    );
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(BUTTON_ID.mangaRead)
                            .setLabel("Please read it online. There are too many pages.")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    );
                }

                row.addComponents(
                    new ButtonBuilder()
                        .setURL(`${source.urlBase}${result.id}`)
                        .setLabel("Read Online")
                        .setStyle(ButtonStyle.Link)
                );

                await interaction.editReply({ embeds: [embed], components: [row] });
                await wait(BUTTON_REMOVE_DELAY);
                await interaction.editReply({ components: [] });
            } catch (error) {
                log(
                    `[manga:${source.name}] ${error instanceof Error ? error.message : "Unknown error"}`,
                    "error"
                );
                const row = new ActionRowBuilder<ButtonBuilder>();
                row.addComponents(
                    new ButtonBuilder()
                        .setURL(URL_REPORT_BUG)
                        .setLabel("Report this issue")
                        .setStyle(ButtonStyle.Link)
                );
                await interaction.editReply({
                    content: "Server maintenance",
                    components: [row],
                });
            }
        },
    };
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 3: Commit**

```bash
git add src/util/manga/handler.ts
git commit -m "feat(manga): add shared command handler factory"
```

---

### Task 4: Create shared thread reader

**Files:**
- Create: `src/util/manga/reader.ts`

- [ ] **Step 1: Create the reader**

```typescript
import { ButtonInteraction, TextChannel, ThreadAutoArchiveDuration } from "discord.js";

import redis from "../../connector/redis";
import { FOOTER, SERVER_S } from "../../util/config";

const DISCLAIMER = `Dear {{USER}},\n\n**Disclaimer: All**\n\nThe service provided by this website may contain content that some users might find objectionable and is intended for mature persons only. By using this service you agree that you are of legal age and that you consent to viewing sexually explicit material. You also agree that you will not hold the website owner or any of its affiliates liable for any damages or losses that may result from accessing or using this service. If you are offended by such content or if it is illegal in your jurisdiction, please do not use this service.\n\nBest regards,\n\n**SBS Team.**`;

export async function mangaRead(interaction: ButtonInteraction): Promise<void> {
    const channel = interaction.channel as TextChannel;
    const title = interaction.message.embeds[0]?.title ?? "Thread";

    const thread = await channel.threads.create({
        name: title.length < 99 ? title : title.substring(0, 50),
        startMessage: interaction.message,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
        reason: FOOTER.text,
    });

    if (thread.joinable) await thread.join();
    await thread.members.add(interaction.user.id);

    await interaction.update({ components: [] });

    const bookId = interaction.message.embeds[0].description;
    const images: string[] | null = await redis.getJson(`${interaction.customId}_${bookId}`);

    if (!images) {
        await thread.send("The system is overloaded");
        return;
    }

    await thread.send(DISCLAIMER.replace("{{USER}}", `<@${interaction.user.id}>`));

    const length = images.length;
    for (const [index, image] of images.entries()) {
        await thread.send({
            content: `Page: ${index + 1}/${length}`,
            files: [
                {
                    attachment: image,
                    name: `${SERVER_S}${new Date().toISOString()}_${index + 1}/${length}.png`,
                },
            ],
        });
    }

    await thread.send(`Enjoy it <@${interaction.user.id}> 💖`);
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 3: Commit**

```bash
git add src/util/manga/reader.ts
git commit -m "feat(manga): add shared thread reader for image delivery"
```

---

### Task 5: Rewrite 6 command files as thin wrappers

**Files:**
- Rewrite: `src/commands/slash/nhentai.ts`
- Rewrite: `src/commands/slash/3hentai.ts`
- Rewrite: `src/commands/slash/asmhentai.ts`
- Rewrite: `src/commands/slash/hentaifox.ts`
- Rewrite: `src/commands/slash/nhentaiTo.ts`
- Rewrite: `src/commands/slash/pururin.ts`

- [ ] **Step 1: Rewrite all 6 command files**

Each file becomes:

**`src/commands/slash/nhentai.ts`:**
```typescript
import { mangaCommand } from "../../util/manga/handler";
import { MANGA_SOURCES } from "../../util/manga/sources";

export default mangaCommand(MANGA_SOURCES.nhentai);
```

**`src/commands/slash/3hentai.ts`:**
```typescript
import { mangaCommand } from "../../util/manga/handler";
import { MANGA_SOURCES } from "../../util/manga/sources";

export default mangaCommand(MANGA_SOURCES.threeHentai);
```

**`src/commands/slash/asmhentai.ts`:**
```typescript
import { mangaCommand } from "../../util/manga/handler";
import { MANGA_SOURCES } from "../../util/manga/sources";

export default mangaCommand(MANGA_SOURCES.asmhentai);
```

**`src/commands/slash/hentaifox.ts`:**
```typescript
import { mangaCommand } from "../../util/manga/handler";
import { MANGA_SOURCES } from "../../util/manga/sources";

export default mangaCommand(MANGA_SOURCES.hentaifox);
```

**`src/commands/slash/nhentaiTo.ts`:**
```typescript
import { mangaCommand } from "../../util/manga/handler";
import { MANGA_SOURCES } from "../../util/manga/sources";

export default mangaCommand(MANGA_SOURCES.nhentaiTo);
```

**`src/commands/slash/pururin.ts`:**
```typescript
import { mangaCommand } from "../../util/manga/handler";
import { MANGA_SOURCES } from "../../util/manga/sources";

export default mangaCommand(MANGA_SOURCES.pururin);
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors. All 6 commands still register (check loader output).

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/nhentai.ts src/commands/slash/3hentai.ts src/commands/slash/asmhentai.ts src/commands/slash/hentaifox.ts src/commands/slash/nhentaiTo.ts src/commands/slash/pururin.ts
git commit -m "refactor(manga): replace 6 command files with thin wrappers"
```

---

### Task 6: Replace 6 button files with 1 unified handler

**Files:**
- Create: `src/buttons/mangaRead.button.ts`
- Delete: `src/buttons/nhentai.button.ts`
- Delete: `src/buttons/3hentai.button.ts`
- Delete: `src/buttons/asmhentai.button.ts`
- Delete: `src/buttons/hentaifox.button.ts`
- Delete: `src/buttons/nhentaiTo.button.ts`
- Delete: `src/buttons/pururin.button.ts`

- [ ] **Step 1: Create unified button handler**

**`src/buttons/mangaRead.button.ts`:**
```typescript
import { ButtonInteraction } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { mangaRead } from "../util/manga/reader";

export default {
    id: BUTTON_ID.mangaRead,
    async execute(interaction: ButtonInteraction) {
        await mangaRead(interaction);
    },
};
```

- [ ] **Step 2: Delete 6 old button files**

```bash
rm src/buttons/nhentai.button.ts src/buttons/3hentai.button.ts src/buttons/asmhentai.button.ts src/buttons/hentaifox.button.ts src/buttons/nhentaiTo.button.ts src/buttons/pururin.button.ts
```

- [ ] **Step 3: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors. Only `mangaRead.button.ts` loaded by button loader.

- [ ] **Step 4: Commit**

```bash
git add src/buttons/mangaRead.button.ts
git rm src/buttons/nhentai.button.ts src/buttons/3hentai.button.ts src/buttons/asmhentai.button.ts src/buttons/hentaifox.button.ts src/buttons/nhentaiTo.button.ts src/buttons/pururin.button.ts
git commit -m "refactor(manga): replace 6 button handlers with unified mangaRead"
```

---

### Task 7: Remove old button IDs from config

**Files:**
- Modify: `src/util/config/button.ts`

- [ ] **Step 1: Remove old manga button IDs**

Update `src/util/config/button.ts` to remove the 6 old IDs:

```typescript
export const BUTTON_ID = {
    // Manga reader
    mangaRead: "mangaRead",
    // Voice control panel buttons
    VOICE_LOCK: "voice_lock",
    // ... rest unchanged
```

Remove these lines: `nhtaiRead`, `nhentaiToRead`, `threeHentaiRead`, `asmHentaiRead`, `hentaiFoxRead`, `pururinRead`.

- [ ] **Step 2: Verify no stale references**

Run grep to confirm no code references the old IDs:
```bash
grep -r "nhtaiRead\|nhentaiToRead\|threeHentaiRead\|asmHentaiRead\|hentaiFoxRead\|pururinRead" src/
```
Expected: zero results

- [ ] **Step 3: Run build to verify**

Run: `npm run build`
Expected: compiles with zero errors

- [ ] **Step 4: Commit**

```bash
git add src/util/config/button.ts
git commit -m "refactor(manga): remove 6 old button IDs, keep unified mangaRead"
```

---

### Task 8: Final verification

- [ ] **Step 1: Clean build**

```bash
rm -rf dist && npm run build
```

Expected: zero errors, zero warnings about manga files

- [ ] **Step 2: Verify file counts**

```bash
ls src/util/manga/
```
Expected: `sources.ts`, `handler.ts`, `reader.ts` (3 files)

```bash
ls src/buttons/*manga* src/buttons/*hentai* src/buttons/*pururin* 2>/dev/null
```
Expected: only `src/buttons/mangaRead.button.ts`

```bash
wc -l src/commands/slash/nhentai.ts src/commands/slash/3hentai.ts src/commands/slash/pururin.ts
```
Expected: ~4 lines each

- [ ] **Step 3: Verify no console.log in manga code**

```bash
grep -r "console.log" src/util/manga/ src/commands/slash/nhentai.ts src/commands/slash/3hentai.ts src/commands/slash/asmhentai.ts src/commands/slash/hentaifox.ts src/commands/slash/nhentaiTo.ts src/commands/slash/pururin.ts src/buttons/mangaRead.button.ts
```
Expected: zero results

- [ ] **Step 4: Verify no direct process.env in manga code**

```bash
grep -r "process.env" src/util/manga/ src/commands/slash/nhentai.ts src/commands/slash/3hentai.ts src/commands/slash/asmhentai.ts src/commands/slash/hentaifox.ts src/commands/slash/nhentaiTo.ts src/commands/slash/pururin.ts src/buttons/mangaRead.button.ts
```
Expected: zero results

- [ ] **Step 5: Commit spec progress**

Update `docs/specs/20260402-refactor-manga-commands/tasks.md` — mark all tasks `[x]`.

```bash
git add docs/specs/20260402-refactor-manga-commands/tasks.md
git commit -m "docs: mark refactor-manga-commands spec as complete"
```
