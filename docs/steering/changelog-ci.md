# Changelog & CI (Discord webhook)

Human-maintained release notes live in **`CHANGELOG.md` at the repository root**. The **released** version is defined by **`package.json` → `version`** (same value **`/info bot`** shows). GitHub Actions posts the **`## [version]`** section that matches that semver — not `[Unreleased]`.

## File format (required for automation)

Follow a [Keep a Changelog](https://keepachangelog.com/en/1.1.0)-style layout:

- **`## [Unreleased]`** at the top for work-in-progress (optional bullets).
- One **`## [x.y.z]`** heading per release, optionally with a date: **`## [5.1.0] - 2026-04-07`**.
- The **`[x.y.z]`** must **exactly match** `package.json` `version` for that release, or the notify step will fail when it cannot find the section.

Example:

```markdown
## [Unreleased]

- WIP items…

## [5.1.0] - 2026-04-07

### Added
- …
```

**Rules for editors:**

1. When you **cut a release**, bump **`package.json` `version`**, add a matching **`## [x.y.z] - date`** section (and move items out of `[Unreleased]` as appropriate).
2. The Discord webhook script **does not** post `[Unreleased]`; it posts only the block for **`package.json`’s version**.
3. Keep release sections reasonably short; long text may be truncated in the embed with a link to the file on GitHub at the commit.

## CI behavior (implemented)

| Item | Detail |
|------|--------|
| **Trigger** | Push to `develop` where `CHANGELOG.md` differs from the previous commit (or is present on the first commit when there is no parent) |
| **Gate** | Bot `npm run build` **succeeds** in the `build` job before the `notify-changelog` job runs |
| **Secret** | Repository secret `DISCORD_CHANGELOG_WEBHOOK_URL` — **never** commit the webhook URL. If unset, the notify step **skips** (does not fail the workflow) |
| **Payload** | Discord **embed**: title `Release notes · v<version>`, description = **`## [version]`** section (from `CHANGELOG.md`) plus optional GitHub blob link, footer with version, branch, short SHA |

| File | Role |
|------|------|
| [`package.json`](../../package.json) | **Source of truth** for semver (`version` field) |
| [`.github/workflows/build.yml`](../../.github/workflows/build.yml) | `build` job (Node 24, `npm ci`, `npm run build`), then `notify-changelog` if `CHANGELOG.md` changed |
| [`.github/scripts/post_changelog_discord.py`](../../.github/scripts/post_changelog_discord.py) | Read `package.json` version, extract matching `## [version]` block, POST JSON to the webhook |

## Related

- Root [`CHANGELOG.md`](../../CHANGELOG.md) — human-edited source
