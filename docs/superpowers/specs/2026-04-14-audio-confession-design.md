# Audio Confession — Design Spec

## Goal

Add audio file attachment support to the confession system as a premium-only feature. Star tier gets 1 audio confession/day (30s, 2MB), Galaxy tier gets unlimited (60s, 5MB). Users attach a pre-recorded voice note file — no in-Discord recording.

## User Flow

```
/confession submit content:"Listen to this..." audio:<file.m4a>
```

1. User runs `/confession submit` with the new `audio` attachment option
2. Validation checks (in order, inserted before economy deductions in existing flow):
   a. Premium check — free users rejected with `confession.audio_premium_only`
   b. Mutual exclusion — cannot attach both `image` and `audio` → `confession.audio_or_image`
   c. Format validation — content type must be in whitelist → `confession.audio_invalid_format`
   d. File size — must be within tier limit → `confession.audio_too_large`
   e. Daily limit (Star only) — Redis counter check → `confession.audio_daily_limit`
3. Rest of existing submit flow continues (cooldown, economy, publish/review)
4. Audio file attached to the published/review embed — Discord auto-renders audio player

## Tier Limits

| Limit | Free | Star | Galaxy |
|-------|------|------|--------|
| Audio confession | No | Yes | Yes |
| Daily limit | — | 1/day | Unlimited |
| Max duration | — | 30 seconds | 60 seconds |
| Max file size | — | 2MB | 5MB |

## Accepted Audio Formats

```typescript
const AUDIO_CONTENT_TYPES = [
    "audio/mpeg",      // .mp3
    "audio/ogg",       // .ogg
    "audio/wav",       // .wav
    "audio/mp4",       // .m4a (iOS)
    "audio/x-m4a",     // .m4a (alternative)
    "audio/webm",      // .webm (Chrome/Android)
];
```

Validation: `attachment.contentType` must start with `audio/` AND be in the whitelist.

## Content Requirement

`content` (text) remains **required** even when audio is attached. User must write at least some text alongside the audio.

## Mutual Exclusion

User can attach **either** `image` or `audio`, not both. If both are provided, reject with `confession.audio_or_image`.

## Data Model

### Confession model — add `audio` field

```typescript
audio: {
    url: string;
    name: string;
    contentType: string;
    duration?: number;
} | null
```

Default: `null`. Same structure pattern as existing `image` field.

### TierConfig — add 4 fields

```typescript
confessionAudioEnabled: boolean;      // free: false, star: true, galaxy: true
confessionAudioMaxSize: number;       // free: 0, star: 2_097_152 (2MB), galaxy: 5_242_880 (5MB)
confessionAudioMaxDuration: number;   // free: 0, star: 30, galaxy: 60 (seconds)
confessionAudioDailyLimit: number;    // free: 0, star: 1, galaxy: Infinity
```

## Redis

| Key | Value | TTL | Purpose |
|-----|-------|-----|---------|
| `confession_audio:{userId}` | count (number) | Seconds until UTC midnight | Star tier daily audio counter |

Same pattern as `manga_free:{userId}`. Galaxy skips this check entirely (`Infinity` limit).

## Embed Display

- Standard confession embed with text content as usual
- `🎙️ Voice Confession` label added above content text in the embed description
- Audio file sent as attachment — Discord renders inline audio player below the embed
- VIP styling (gold embed) still applies when `vip: true`
- Review mode: mod sees the same embed + audio in review channel, can listen before approve/reject

## Validation Function

```typescript
async function validateConfessionAudio(
    attachment: Attachment,
    userId: string,
    tierConfig: TierConfig
): Promise<{ valid: true } | { valid: false; errorKey: string; params?: Record<string, string> }>
```

Checks in order:
1. `tierConfig.confessionAudioEnabled` → `confession.audio_premium_only`
2. Content type whitelist → `confession.audio_invalid_format`
3. File size ≤ `tierConfig.confessionAudioMaxSize` → `confession.audio_too_large` with `{ max: MB }`
4. Daily limit (Star): Redis counter < `tierConfig.confessionAudioDailyLimit` → `confession.audio_daily_limit`

Duration validation is best-effort — Discord attachment metadata may not include duration. If unavailable, skip the duration check (file size limit is the primary gate).

## i18n Keys (15 locales)

```
confession.audio_premium_only   — "Audio confession is a premium feature. Use `/premium compare` to see upgrade options."
confession.audio_daily_limit    — "You've used your daily audio confession. Galaxy tier gets unlimited."
confession.audio_too_large      — "Audio file too large. Max {{max}}MB for your tier."
confession.audio_too_long       — "Audio too long. Max {{max}} seconds for your tier."
confession.audio_invalid_format — "Unsupported audio format. Use MP3, OGG, WAV, M4A, or WebM."
confession.audio_label          — "🎙️ Voice Confession"
confession.audio_or_image       — "You can attach either an image or an audio file, not both."
```

## Files to Modify

| File | Change |
|------|--------|
| `src/commands/slash/confession.ts` | Add `audio` attachment option to submit subcommand; validation + mutual exclusion with image; pass audio to service |
| `src/services/confession/confession.service.ts` | Add `validateConfessionAudio()`; update `sendAnonymousConfessionToChannel()` to attach audio file; update `buildConfessionAttachmentFiles()` to handle audio |
| `src/services/confession/constants.ts` | Add `AUDIO_CONTENT_TYPES` whitelist |
| `src/models/confession.model.ts` | Add `audio` field to schema and interface |
| `src/services/premium/premium.config.ts` | Add 4 `confessionAudio*` fields to `TierConfig` and all 3 tier configs |
| `src/locales/*.json` (15 files) | Add 7 i18n keys |

No new files needed — everything fits into existing structure.

## Out of Scope

- **In-Discord voice recording**: Discord API does not support recording voice from slash command interactions. Future consideration if API changes.
- **Audio transcription**: No speech-to-text. The audio is posted as-is.
- **Audio moderation**: Mod listens manually in review mode. No automated audio content filtering.
