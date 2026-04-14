# Audio Confession — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audio file attachment support to confessions as a premium-only feature (Star: 1/day 30s 2MB, Galaxy: unlimited 60s 5MB).

**Architecture:** Add `audio` attachment option to `/confession submit`. Validation function checks premium tier, format, size, and daily limit. Audio file attached to Discord embed message. Reuses existing image attachment pattern.

**Tech Stack:** Discord.js v14, Mongoose, ioredis, i18next

**Spec:** `docs/superpowers/specs/2026-04-14-audio-confession-design.md`

---

## File Structure

| Action | File | Change |
|--------|------|--------|
| Modify | `src/services/premium/premium.config.ts` | Add 4 `confessionAudio*` fields to TierConfig |
| Modify | `src/services/confession/constants.ts` | Add `AUDIO_CONTENT_TYPES` whitelist |
| Modify | `src/models/confession.model.ts` | Add `audio` field |
| Modify | `src/services/confession/confession.service.ts` | Add `validateConfessionAudio()`, update attachment builder |
| Modify | `src/commands/slash/confession.ts` | Add `audio` option, validation, mutual exclusion |
| Modify | `src/locales/*.json` (15 files) | Add 7 i18n keys |

---

### Task 1: Add audio fields to TierConfig

**Files:**
- Modify: `src/services/premium/premium.config.ts`

- [ ] **Step 1: Add 4 fields to TierConfig interface**

In `src/services/premium/premium.config.ts`, add after `confessionVipFree: boolean;`:

```typescript
    confessionAudioEnabled: boolean;
    confessionAudioMaxSize: number;
    confessionAudioMaxDuration: number;
    confessionAudioDailyLimit: number;
```

- [ ] **Step 2: Add values to all 3 tier configs**

In the `free` config, add:
```typescript
        confessionAudioEnabled: false,
        confessionAudioMaxSize: 0,
        confessionAudioMaxDuration: 0,
        confessionAudioDailyLimit: 0,
```

In the `star` config, add:
```typescript
        confessionAudioEnabled: true,
        confessionAudioMaxSize: 2_097_152,
        confessionAudioMaxDuration: 30,
        confessionAudioDailyLimit: 1,
```

In the `galaxy` config, add:
```typescript
        confessionAudioEnabled: true,
        confessionAudioMaxSize: 5_242_880,
        confessionAudioMaxDuration: 60,
        confessionAudioDailyLimit: Infinity,
```

- [ ] **Step 3: Commit**

```bash
git add src/services/premium/premium.config.ts
git commit -m "feat(confession): add audio tier config fields"
```

---

### Task 2: Add audio constants and model field

**Files:**
- Modify: `src/services/confession/constants.ts`
- Modify: `src/models/confession.model.ts`

- [ ] **Step 1: Add audio content type whitelist to constants.ts**

At the end of `src/services/confession/constants.ts`, add:

```typescript
export const AUDIO_CONTENT_TYPES = [
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/webm",
] as const;

export function confessionAudioRedisKey(userId: string): string {
    return `confession_audio:${userId}`;
}
```

- [ ] **Step 2: Add audio field to confession model**

In `src/models/confession.model.ts`, add to the `IConfession` interface after `image`:

```typescript
    audio: IConfessionAudio | null;
```

Add the interface after `IConfessionImage`:

```typescript
export interface IConfessionAudio {
    url: string;
    name: string | null;
    contentType: string | null;
}
```

Add to the schema after the `image` field:

```typescript
        audio: {
            type: {
                url: { type: String, required: true },
                name: { type: String, default: null },
                contentType: { type: String, default: null },
            },
            default: null,
        },
```

- [ ] **Step 3: Commit**

```bash
git add src/services/confession/constants.ts src/models/confession.model.ts
git commit -m "feat(confession): add audio model field and format whitelist"
```

---

### Task 3: Add audio validation and attachment building to confession service

**Files:**
- Modify: `src/services/confession/confession.service.ts`

- [ ] **Step 1: Import new types and constants**

Add to existing imports:

```typescript
import type { IConfessionAudio } from "../../models/confession.model";
import { AUDIO_CONTENT_TYPES, confessionAudioRedisKey } from "./constants";
import type { TierConfig } from "../premium/premium.config";
```

- [ ] **Step 2: Add validateConfessionAudio function**

Add after the existing `validateConfessionAttachment` function:

```typescript
export function validateConfessionAudio(
    att: { url: string; name: string | null; contentType: string | null; size: number } | null | undefined
): { ok: true; audio: IConfessionAudio | null } | { ok: false } {
    if (!att) return { ok: true, audio: null };
    const ct = att.contentType ?? "";
    if (!ct.startsWith("audio/")) return { ok: false };
    if (!AUDIO_CONTENT_TYPES.includes(ct as (typeof AUDIO_CONTENT_TYPES)[number])) return { ok: false };
    return {
        ok: true,
        audio: { url: att.url, name: att.name, contentType: att.contentType },
    };
}
```

- [ ] **Step 3: Add checkConfessionAudioLimit function**

Add after `validateConfessionAudio`:

```typescript
function secondsUntilUTCMidnight(): number {
    const now = new Date();
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
}

export async function checkAndIncrementAudioLimit(userId: string, dailyLimit: number): Promise<boolean> {
    if (!Number.isFinite(dailyLimit)) return true;

    const key = confessionAudioRedisKey(userId);
    const used = (await redis.getJson(key)) as number | null;

    if (used !== null && used >= dailyLimit) return false;

    await redis.setJson(key, (used ?? 0) + 1, secondsUntilUTCMidnight());
    return true;
}

export async function decrementAudioLimit(userId: string): Promise<void> {
    const key = confessionAudioRedisKey(userId);
    const current = (await redis.getJson(key)) as number | null;
    if (current && current > 0) {
        await redis.setJson(key, current - 1, secondsUntilUTCMidnight());
    }
}
```

- [ ] **Step 4: Update buildConfessionAttachmentFiles to handle audio**

Replace the existing `buildConfessionAttachmentFiles` function:

```typescript
export async function buildConfessionAttachmentFiles(
    image: IConfessionImage | null,
    audio: IConfessionAudio | null
): Promise<AttachmentBuilder[]> {
    const files: AttachmentBuilder[] = [];

    if (image) {
        try {
            const res = await axios.get<ArrayBuffer>(image.url, {
                responseType: "arraybuffer",
                timeout: 15_000,
            });
            const buf = Buffer.from(res.data);
            const name = image.name && image.name.length > 0 ? image.name : "image.png";
            files.push(new AttachmentBuilder(buf, { name }));
        } catch (error) {
            logger.warn(
                `confession: failed to download image for attachment: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    if (audio) {
        try {
            const res = await axios.get<ArrayBuffer>(audio.url, {
                responseType: "arraybuffer",
                timeout: 15_000,
            });
            const buf = Buffer.from(res.data);
            const name = audio.name && audio.name.length > 0 ? audio.name : "audio.mp3";
            files.push(new AttachmentBuilder(buf, { name }));
        } catch (error) {
            logger.warn(
                `confession: failed to download audio for attachment: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    return files;
}
```

- [ ] **Step 5: Update sendAnonymousConfessionToChannel signature**

Find the `sendAnonymousConfessionToChannel` function. Add `audio` parameter alongside `image` and update the `buildConfessionAttachmentFiles` call:

Change the parameter list to include `audio: IConfessionAudio | null` after `image`.

Change the call from:
```typescript
const files = await buildConfessionAttachmentFiles(image);
```
to:
```typescript
const files = await buildConfessionAttachmentFiles(image, audio);
```

Also, if `audio` is present, prepend `🎙️ Voice Confession\n\n` to the embed description (before the content text). Read the function to find where the embed description is set and add:

```typescript
if (audio) {
    embed.setDescription(`🎙️ **Voice Confession**\n\n${content}`);
}
```

Do the same for the review embed builder function if it exists separately.

- [ ] **Step 6: Commit**

```bash
git add src/services/confession/confession.service.ts
git commit -m "feat(confession): add audio validation, limit check, and attachment building"
```

---

### Task 4: Add audio option to /confession submit command

**Files:**
- Modify: `src/commands/slash/confession.ts`

- [ ] **Step 1: Add audio attachment option to submit subcommand builder**

Find the `.addAttachmentOption` for `image` in the submit subcommand builder. Add after it:

```typescript
                .addAttachmentOption((opt) =>
                    opt
                        .setName("audio")
                        .setDescription("Optional voice note (premium only)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.submit.audio.desc"))
                        .setRequired(false)
                )
```

- [ ] **Step 2: Add audio validation in executeSubmit**

In the `executeSubmit` function, find where `const attachment = interaction.options.getAttachment("image");` is. After the image validation block, add:

```typescript
    const audioAttachment = interaction.options.getAttachment("audio");

    // Mutual exclusion: image or audio, not both
    if (validated.image && audioAttachment) {
        await interaction.editReply({ content: t(locale, "confession.audio_or_image") });
        return;
    }

    // Audio validation (premium-gated)
    let confessionAudio: IConfessionAudio | null = null;
    if (audioAttachment) {
        if (!tierConfig.confessionAudioEnabled) {
            await interaction.editReply({ content: t(locale, "confession.audio_premium_only") });
            return;
        }

        const audioValidated = validateConfessionAudio(audioAttachment);
        if (!audioValidated.ok) {
            await interaction.editReply({ content: t(locale, "confession.audio_invalid_format") });
            return;
        }

        if (audioAttachment.size > tierConfig.confessionAudioMaxSize) {
            const maxMB = Math.round(tierConfig.confessionAudioMaxSize / 1_048_576);
            await interaction.editReply({ content: t(locale, "confession.audio_too_large", { max: String(maxMB) }) });
            return;
        }

        const allowed = await checkAndIncrementAudioLimit(userId, tierConfig.confessionAudioDailyLimit);
        if (!allowed) {
            await interaction.editReply({ content: t(locale, "confession.audio_daily_limit") });
            return;
        }

        confessionAudio = audioValidated.audio;
    }
```

Add imports at top:
```typescript
import { validateConfessionAudio, checkAndIncrementAudioLimit, decrementAudioLimit } from "../../services/confession/confession.service";
import type { IConfessionAudio } from "../../models/confession.model";
```

- [ ] **Step 3: Pass audio through to service calls**

Find where `createPublishedConfessionRecord` or `createPendingConfessionRecord` are called. Add `audio: confessionAudio` to the input object.

Find where `sendAnonymousConfessionToChannel` is called. Add `confessionAudio` as the audio parameter.

- [ ] **Step 4: Add audio refund on error**

In the catch/error blocks where image refund logic exists, add audio limit refund:

```typescript
if (confessionAudio) {
    await decrementAudioLimit(userId).catch(() => {});
}
```

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/confession.ts
git commit -m "feat(confession): add audio attachment option with premium gating"
```

---

### Task 5: Add i18n keys (15 locales)

**Files:**
- Modify: All 15 locale files in `src/locales/`

- [ ] **Step 1: Add keys to en.json**

```json
"confession.audio_premium_only": "Audio confession is a premium feature. Use `/premium compare` to see upgrade options.",
"confession.audio_daily_limit": "You've used your daily audio confession. Galaxy tier gets unlimited.",
"confession.audio_too_large": "Audio file too large. Max {{max}}MB for your tier.",
"confession.audio_too_long": "Audio too long. Max {{max}} seconds for your tier.",
"confession.audio_invalid_format": "Unsupported audio format. Use MP3, OGG, WAV, M4A, or WebM.",
"confession.audio_label": "🎙️ Voice Confession",
"confession.audio_or_image": "You can attach either an image or an audio file, not both.",
"cmd.confession.submit.audio.desc": "Optional voice note (premium only)"
```

- [ ] **Step 2: Add keys to vi.json**

```json
"confession.audio_premium_only": "Confession thoại là tính năng premium. Dùng `/premium compare` để xem các gói nâng cấp.",
"confession.audio_daily_limit": "Bạn đã dùng hết lượt confession thoại hôm nay. Gói Galaxy được không giới hạn.",
"confession.audio_too_large": "File audio quá lớn. Tối đa {{max}}MB cho gói của bạn.",
"confession.audio_too_long": "Audio quá dài. Tối đa {{max}} giây cho gói của bạn.",
"confession.audio_invalid_format": "Định dạng audio không được hỗ trợ. Dùng MP3, OGG, WAV, M4A, hoặc WebM.",
"confession.audio_label": "🎙️ Confession Thoại",
"confession.audio_or_image": "Bạn chỉ có thể đính kèm ảnh hoặc audio, không được cả hai.",
"cmd.confession.submit.audio.desc": "Voice note tùy chọn (chỉ premium)"
```

- [ ] **Step 3: Add keys to all other 13 locale files with native translations**

Add the same 8 keys to `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json` — each with native translations. Keep `{{max}}` placeholders exactly as-is.

- [ ] **Step 4: Commit**

```bash
git add src/locales/
git commit -m "feat(confession): add audio confession i18n keys (15 locales)"
```

---

### Task 6: Verify build

- [ ] **Step 1: Run TypeScript build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual test (if dev environment available)**

Test with a premium user:
- `/confession submit content:"test" audio:<file.m4a>` — should post confession with audio player
- `/confession submit content:"test" image:<img> audio:<file>` — should reject with mutual exclusion error
- Non-premium user with audio — should reject with premium-only message
- Star user second audio in same day — should reject with daily limit
