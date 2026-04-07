# Moderation Slash Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/moderation` with subcommands `timeout`, `untimeout`, `ban`, and `unban` — timed Discord timeouts (≤28 days), permanent bans with optional message purge, and unban by user ID — with full i18n (15 locales), permission checks per spec, and no MongoDB audit log.

**Architecture:** One new slash module `src/commands/slash/moderation.ts` registers a `SlashCommandBuilder` with four subcommands. **Do not call `setDefaultMemberPermissions` on the root command:** Discord applies one bitfield to the whole command, but we need `ModerateMembers` for timeout/untimeout and `BanMembers` for ban/unban without requiring both. Enforce permissions inside `execute` with `GuildMember#permissions.has(...)` and ephemeral denials. Optional: server admins restrict who can invoke `/moderation` via **Server Settings → Integrations → Bot → Command permissions** (recommended). Helpers for duration→ms, snowflake validation, and `unknown`→user-message mapping live in the same file to avoid extra barrels.

**Tech Stack:** TypeScript (strict), Discord.js v14 (`ChatInputCommandInteraction`, `GuildMember`, `PermissionFlagsBits`, `MessageFlags`), existing `Reply`, `resolveLocale`, `t`, `descriptionLocales`.

**Spec:** [2026-04-07-moderation-commands-design.md](../specs/2026-04-07-moderation-commands-design.md)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/commands/slash/moderation.ts` | Create | Slash command group + subcommand handlers, validation, Discord API calls |
| `src/locales/en.json` | Modify | `cmd.moderation.*` + `moderation.*` strings |
| `src/locales/vi.json` | Modify | Vietnamese translations (same keys) |
| `src/locales/id.json` | Modify | Same keys (use English copy or translate) |
| `src/locales/es.json` | Modify | Same keys |
| `src/locales/ja.json` | Modify | Same keys |
| `src/locales/zh.json` | Modify | Same keys |
| `src/locales/ko.json` | Modify | Same keys |
| `src/locales/pt-BR.json` | Modify | Same keys |
| `src/locales/fr.json` | Modify | Same keys |
| `src/locales/de.json` | Modify | Same keys |
| `src/locales/ru.json` | Modify | Same keys |
| `src/locales/tr.json` | Modify | Same keys |
| `src/locales/it.json` | Modify | Same keys |
| `src/locales/pl.json` | Modify | Same keys |
| `src/locales/nl.json` | Modify | Same keys |
| `docs/steering/commands.md` | Modify | Add `/moderation` row(s) to command inventory table |

---

### Task 1: English locale keys

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Insert new keys** (keep JSON valid: add commas after the preceding entry). Use these exact keys and English text:

```json
    "cmd.moderation.desc": "Server moderation (timeout, ban, unban)",
    "cmd.moderation.timeout.desc": "Timeout a member (mute text and voice) for a duration",
    "cmd.moderation.timeout.user.desc": "Member to timeout",
    "cmd.moderation.timeout.duration.desc": "Duration amount (min 1)",
    "cmd.moderation.timeout.unit.desc": "Time unit",
    "cmd.moderation.timeout.reason.desc": "Reason (optional)",
    "cmd.moderation.untimeout.desc": "Remove an active timeout",
    "cmd.moderation.untimeout.user.desc": "Member to remove timeout from",
    "cmd.moderation.ban.desc": "Ban a member from the server",
    "cmd.moderation.ban.user.desc": "Member to ban",
    "cmd.moderation.ban.reason.desc": "Reason (optional)",
    "cmd.moderation.ban.delete_messages.desc": "Delete recent messages (seconds, max 7 days)",
    "cmd.moderation.unban.desc": "Unban a user by ID",
    "cmd.moderation.unban.user_id.desc": "Banned user's snowflake ID",
    "cmd.moderation.unban.reason.desc": "Reason (optional)",
    "moderation.guild_only": "This command can only be used in a server.",
    "moderation.no_target_self": "You cannot use this action on yourself.",
    "moderation.no_target_bot": "You cannot use this action on a bot.",
    "moderation.no_permission_moderate": "You need **Moderate Members** permission to use this.",
    "moderation.no_permission_ban": "You need **Ban Members** permission to use this.",
    "moderation.bot_missing_permission": "The bot lacks permission to perform this action.",
    "moderation.bot_hierarchy": "The bot cannot moderate this member (role hierarchy).",
    "moderation.member_not_found": "That user is not a member of this server.",
    "moderation.duration_invalid": "Duration must be at least 1 in the chosen unit.",
    "moderation.duration_too_long": "Timeout cannot exceed **28 days** (Discord limit).",
    "moderation.timeout_success": "Timed out **{{username}}** for **{{duration}}**.",
    "moderation.untimeout_success": "Removed timeout for **{{username}}**.",
    "moderation.untimeout_not_timed_out": "**{{username}}** is not timed out.",
    "moderation.ban_success": "Banned **{{username}}**.",
    "moderation.unban_success": "Unbanned user `<{{userId}}>`.",
    "moderation.unban_invalid_id": "Invalid user ID. Use a numeric Discord snowflake (17–20 digits).",
    "moderation.unban_not_banned": "That user is not banned.",
    "moderation.api_error": "Discord rejected the action. Check permissions and try again.",
    "moderation.fmt.days": "{{count}}d",
    "moderation.fmt.hours": "{{count}}h",
    "moderation.fmt.minutes": "{{count}}m"
```

- [ ] **Step 2: Commit**

```bash
git add src/locales/en.json
git commit -m "i18n(en): add moderation command strings"
```

---

### Task 2: Localize for `vi` + copy keys to other locales

**Files:**
- Modify: `src/locales/vi.json`, and the 13 other non-`en` locale files listed in File Structure (excluding `en` already done)

- [ ] **Step 1: Add Vietnamese strings** for every `cmd.moderation.*` and `moderation.*` key in `vi.json` (same keys as English). Example line style (translate the full set consistently):

```text
"cmd.moderation.desc": "Quản lý server (timeout, cấm, gỡ cấm)",
"moderation.guild_only": "Lệnh này chỉ dùng được trong server.",
```

- [ ] **Step 2: For `id`, `es`, `ja`, `zh`, `ko`, `pt-BR`, `fr`, `de`, `ru`, `tr`, `it`, `pl`, `nl`:** add the **same keys** as `en.json`. You may use the **English text** for every value to satisfy “no missing keys” quickly; native translations can be follow-up PRs.

- [ ] **Step 3: Commit**

```bash
git add src/locales/*.json
git commit -m "i18n: add moderation strings for all locales"
```

---

### Task 3: Implement `moderation.ts`

**Files:**
- Create: `src/commands/slash/moderation.ts`

- [ ] **Step 1: Create the command module** with the following behavior (copy this implementation and fix imports/paths if your IDE reorganizes):

```typescript
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;
const SNOWFLAKE_RE = /^\d{17,20}$/;

function fallbackLocale(): SupportedLocale {
    return "en";
}

type DurationUnit = "minutes" | "hours" | "days";

function durationToMs(amount: number, unit: DurationUnit): number {
    switch (unit) {
        case "minutes":
            return amount * 60 * 1000;
        case "hours":
            return amount * 60 * 60 * 1000;
        case "days":
            return amount * 24 * 60 * 60 * 1000;
        default: {
            const _exhaustive: never = unit;
            return _exhaustive;
        }
    }
}

function formatDuration(locale: SupportedLocale, ms: number): string {
    const totalMinutes = Math.round(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(t(locale, "moderation.fmt.days", { count: days }));
    if (hours > 0) parts.push(t(locale, "moderation.fmt.hours", { count: hours }));
    if (minutes > 0 || parts.length === 0) parts.push(t(locale, "moderation.fmt.minutes", { count: minutes }));
    return parts.join(" ");
}
```

Add the same three `moderation.fmt.*` keys to every other locale in Task 2 (values may match English or use short localized unit suffixes).

```typescript
function ephemeralError(interaction: ChatInputCommandInteraction, locale: SupportedLocale, key: string, vars?: Record<string, string | number>): Promise<unknown> {
    return interaction.reply({
        content: t(locale, key, vars),
        flags: MessageFlags.Ephemeral,
    });
}

function parseApiError(locale: SupportedLocale): string {
    return t(locale, "moderation.api_error");
}

export default {
    data: new SlashCommandBuilder()
        .setName("moderation")
        .setDescription("Server moderation (timeout, ban, unban)")
        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("timeout")
                .setDescription("Timeout a member (mute text and voice) for a duration")
                .setDescriptionLocalizations(descriptionLocales("cmd.moderation.timeout.desc"))
                .addUserOption((o) =>
                    o
                        .setName("user")
                        .setDescription("Member to timeout")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.timeout.user.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((o) =>
                    o
                        .setName("duration")
                        .setDescription("Duration amount (min 1)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.timeout.duration.desc"))
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addStringOption((o) =>
                    o
                        .setName("unit")
                        .setDescription("Time unit")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.timeout.unit.desc"))
                        .setRequired(true)
                        .addChoices(
                            { name: "minutes", value: "minutes" },
                            { name: "hours", value: "hours" },
                            { name: "days", value: "days" }
                        )
                )
                .addStringOption((o) =>
                    o
                        .setName("reason")
                        .setDescription("Reason (optional)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.timeout.reason.desc"))
                        .setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("untimeout")
                .setDescription("Remove an active timeout")
                .setDescriptionLocalizations(descriptionLocales("cmd.moderation.untimeout.desc"))
                .addUserOption((o) =>
                    o
                        .setName("user")
                        .setDescription("Member to remove timeout from")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.untimeout.user.desc"))
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("ban")
                .setDescription("Ban a member from the server")
                .setDescriptionLocalizations(descriptionLocales("cmd.moderation.ban.desc"))
                .addUserOption((o) =>
                    o
                        .setName("user")
                        .setDescription("Member to ban")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.ban.user.desc"))
                        .setRequired(true)
                )
                .addStringOption((o) =>
                    o
                        .setName("reason")
                        .setDescription("Reason (optional)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.ban.reason.desc"))
                        .setRequired(false)
                )
                .addIntegerOption((o) =>
                    o
                        .setName("delete_messages")
                        .setDescription("Delete recent messages (seconds, max 7 days)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.ban.delete_messages.desc"))
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(604800)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("unban")
                .setDescription("Unban a user by ID")
                .setDescriptionLocalizations(descriptionLocales("cmd.moderation.unban.desc"))
                .addStringOption((o) =>
                    o
                        .setName("user_id")
                        .setDescription("Banned user's snowflake ID")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.unban.user_id.desc"))
                        .setRequired(true)
                )
                .addStringOption((o) =>
                    o
                        .setName("reason")
                        .setDescription("Reason (optional)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.moderation.unban.reason.desc"))
                        .setRequired(false)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const locale = await resolveLocale(interaction).catch(fallbackLocale);

        if (!interaction.inGuild() || !interaction.guild) {
            return ephemeralError(interaction, locale, "moderation.guild_only");
        }

        const sub = interaction.options.getSubcommand(true);
        const executor = interaction.member;
        if (!executor || typeof executor.permissions === "undefined") {
            return ephemeralError(interaction, locale, "moderation.guild_only");
        }
        const execMember = executor as GuildMember;

        try {
            if (sub === "timeout") {
                if (!execMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return ephemeralError(interaction, locale, "moderation.no_permission_moderate");
                }
                const targetUser = interaction.options.getUser("user", true);
                if (targetUser.id === interaction.user.id) {
                    return ephemeralError(interaction, locale, "moderation.no_target_self");
                }
                if (targetUser.bot) {
                    return ephemeralError(interaction, locale, "moderation.no_target_bot");
                }

                const amount = interaction.options.getInteger("duration", true);
                const unit = interaction.options.getString("unit", true) as DurationUnit;
                const reason = interaction.options.getString("reason") ?? undefined;

                const ms = durationToMs(amount, unit);
                if (ms <= 0) {
                    return ephemeralError(interaction, locale, "moderation.duration_invalid");
                }
                if (ms > MAX_TIMEOUT_MS) {
                    return ephemeralError(interaction, locale, "moderation.duration_too_long");
                }

                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (!member) {
                    return ephemeralError(interaction, locale, "moderation.member_not_found");
                }

                const botMember = await interaction.guild.members.fetchMe();
                if (!member.moderatable) {
                    return ephemeralError(interaction, locale, "moderation.bot_hierarchy");
                }
                if (!botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return ephemeralError(interaction, locale, "moderation.bot_missing_permission");
                }

                await member.timeout(ms, reason);

                const embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription(
                        t(locale, "moderation.timeout_success", {
                            username: member.user.tag,
                            duration: formatDuration(locale, ms),
                        })
                    );
                return Reply.embed(interaction, embed);
            }

            if (sub === "untimeout") {
                if (!execMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return ephemeralError(interaction, locale, "moderation.no_permission_moderate");
                }
                const targetUser = interaction.options.getUser("user", true);
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (!member) {
                    return ephemeralError(interaction, locale, "moderation.member_not_found");
                }

                if (!member.communicationDisabledUntil) {
                    return ephemeralError(interaction, locale, "moderation.untimeout_not_timed_out", {
                        username: member.user.tag,
                    });
                }

                const botMember = await interaction.guild.members.fetchMe();
                if (!member.moderatable) {
                    return ephemeralError(interaction, locale, "moderation.bot_hierarchy");
                }
                if (!botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return ephemeralError(interaction, locale, "moderation.bot_missing_permission");
                }

                await member.timeout(null);

                const embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription(t(locale, "moderation.untimeout_success", { username: member.user.tag }));
                return Reply.embed(interaction, embed);
            }

            if (sub === "ban") {
                if (!execMember.permissions.has(PermissionFlagsBits.BanMembers)) {
                    return ephemeralError(interaction, locale, "moderation.no_permission_ban");
                }
                const targetUser = interaction.options.getUser("user", true);
                if (targetUser.id === interaction.user.id) {
                    return ephemeralError(interaction, locale, "moderation.no_target_self");
                }
                if (targetUser.id === interaction.client.user?.id) {
                    return ephemeralError(interaction, locale, "moderation.no_target_bot");
                }

                const reason = interaction.options.getString("reason") ?? undefined;
                const deleteSeconds = interaction.options.getInteger("delete_messages");

                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (member && !member.bannable) {
                    return ephemeralError(interaction, locale, "moderation.bot_hierarchy");
                }

                const botMember = await interaction.guild.members.fetchMe();
                if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
                    return ephemeralError(interaction, locale, "moderation.bot_missing_permission");
                }

                await interaction.guild.members.ban(targetUser, {
                    reason,
                    deleteMessageSeconds: deleteSeconds ?? undefined,
                });

                const embed = new EmbedBuilder()
                    .setColor(0xed4245)
                    .setDescription(t(locale, "moderation.ban_success", { username: targetUser.tag }));
                return Reply.embed(interaction, embed);
            }

            if (sub === "unban") {
                if (!execMember.permissions.has(PermissionFlagsBits.BanMembers)) {
                    return ephemeralError(interaction, locale, "moderation.no_permission_ban");
                }
                const rawId = interaction.options.getString("user_id", true).trim();
                if (!SNOWFLAKE_RE.test(rawId)) {
                    return ephemeralError(interaction, locale, "moderation.unban_invalid_id");
                }
                const reason = interaction.options.getString("reason") ?? undefined;

                const botMember = await interaction.guild.members.fetchMe();
                if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
                    return ephemeralError(interaction, locale, "moderation.bot_missing_permission");
                }

                await interaction.guild.bans.remove(rawId, reason);

                const embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription(t(locale, "moderation.unban_success", { userId: rawId }));
                return Reply.embed(interaction, embed);
            }

            return ephemeralError(interaction, locale, "common.unknown_subcommand");
        } catch (error: unknown) {
            const code =
                error && typeof error === "object" && "code" in error
                    ? Number((error as { code: unknown }).code)
                    : NaN;
            if (code === 10026) {
                return ephemeralError(interaction, locale, "moderation.unban_not_banned");
            }
            const message = parseApiError(locale);
            if (interaction.replied || interaction.deferred) {
                return interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
            }
            return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        }
    },
};
```

**Step 1 notes (when pasting):**

1. **`moderation.fmt.*`:** Task 1–2 must define these keys in all 15 locales (same pattern as `en`).
2. **Unknown unban:** Outer `catch` maps `code === 10026` to `moderation.unban_not_banned`; confirm during manual test (Discord REST error code for unknown ban).
3. **`executor`:** Cast to `GuildMember` after guild checks; `interaction.member` is present in guild slash commands.

- [ ] **Step 2: Build**

Run: `npm run build`  
Expected: exit code 0

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/moderation.ts
git commit -m "feat(commands): add /moderation timeout, untimeout, ban, unban"
```

---

### Task 4: Docs — `docs/steering/commands.md`

**Files:**
- Modify: `docs/steering/commands.md`

- [ ] **Step 1:** In the slash-command table (near other admin-style commands), add rows:

| Command | Description | Options |
|---------|-------------|---------|
| `moderation timeout` | Timeout member (≤28d) | `user`, `duration`, `unit`, `reason?` |
| `moderation untimeout` | Remove timeout | `user` |
| `moderation ban` | Ban member | `user`, `reason?`, `delete_messages?` |
| `moderation unban` | Unban by user ID | `user_id`, `reason?` |

- [ ] **Step 2: Commit**

```bash
git add docs/steering/commands.md
git commit -m "docs: document /moderation commands"
```

---

### Task 5: Manual verification

**Files:** none

- [ ] **Step 1:** Run the bot in `development` with `GUILD_ID` set; deploy slash commands (existing loader).

- [ ] **Step 2:** In a test guild, use a moderator account:
  - `timeout` a user for 1 minute; confirm timeout icon in UI.
  - `untimeout` same user.
  - `ban` a test user (or dummy account); confirm ban list.
  - `unban` using their user ID.

- [ ] **Step 3:** Confirm ephemeral errors for missing `ModerateMembers` / `BanMembers` using a user without those permissions.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Subcommands timeout, untimeout, ban, unban | Task 3 |
| Duration ≤ 28 days | Task 3 (`MAX_TIMEOUT_MS`) |
| Permissions: ModerateMembers / BanMembers | Task 3 |
| Unban by snowflake | Task 3 |
| Ban `deleteMessageSeconds` 0–604800 | Task 3 (`delete_messages` integer) |
| Guild-only, self/bot guards | Task 3 |
| Untimeout explicit “not timed out” | Task 3 |
| i18n 15 locales | Tasks 1–2 |
| No Mongo audit | No DB tasks |
| `npm run build` | Task 3 Step 2 |

## Placeholder scan

- No `TBD`/`TODO` in tasks; `moderation.fmt.*` keys are listed in Task 1 and copied in Task 2.
- Discord error code `10026` for unknown ban on unban — verify during Task 5; adjust mapping if the API returns a different code.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-07-moderation-commands.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach do you want?**
