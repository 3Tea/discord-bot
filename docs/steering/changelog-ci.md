# Changelog & CI (Discord webhook)

Human-maintained release notes live in **`CHANGELOG.md` at the repository root**. GitHub Actions may post the **latest section** to a Discord channel via **incoming webhook** when the bot **build succeeds** on `develop` and this file **changed** in that push.

## File format (required for automation)

Follow a [Keep a Changelog](https://keepachangelog.com/en/1.1.0)-style layout:

- Use **Markdown** with **`##` second-level headings** to separate versions or periods.
- **Always put new notes in the top section** — the block **from the first `##` line up to (but not including) the next `##` line** is the excerpt intended for Discord (the “what’s new in this update” slice).
- Recommended top heading: `## [Unreleased]` while drafting; rename or duplicate into a dated/versioned section when you cut a release, keeping older sections below for history.

Example skeleton:

```markdown
# Changelog

## [Unreleased]

- Added example feature
- Fixed example bug

## [1.2.0] - 2026-04-01

- Earlier release notes…
```

**Rules for editors:**

1. Add bullets under the **first** `##` section when recording changes for the next Discord announcement.
2. Do not put prose above the first `##` except the optional `# Changelog` title — otherwise the “first section” is ambiguous.
3. Keep the top section reasonably short; very long text may be truncated in the embed with a link to the file on GitHub at the commit.

## CI behavior (implemented)

| Item | Detail |
|------|--------|
| **Trigger** | Push to `develop` where `CHANGELOG.md` differs from the previous commit (or is present on the first commit when there is no parent) |
| **Gate** | Bot `npm run build` **succeeds** in the `build` job before the `notify-changelog` job runs |
| **Secret** | Repository secret `DISCORD_CHANGELOG_WEBHOOK_URL` — **never** commit the webhook URL. If unset, the notify step **skips** (does not fail the workflow) |
| **Payload** | Discord **embed**: title “Changelog update”, description = first `##` section plus optional GitHub blob link, footer with branch and short SHA |

| File | Role |
|------|------|
| [`.github/workflows/build.yml`](../../.github/workflows/build.yml) | `build` job (Node 24, `npm ci`, `npm run build`), then `notify-changelog` if `CHANGELOG.md` changed |
| [`.github/scripts/post_changelog_discord.py`](../../.github/scripts/post_changelog_discord.py) | Extract first `##` block, POST JSON to the webhook |

## Related

- Root [`CHANGELOG.md`](../../CHANGELOG.md) — human-edited source
