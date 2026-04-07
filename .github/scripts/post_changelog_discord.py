#!/usr/bin/env python3
"""
Post the CHANGELOG section that matches package.json's version to Discord (incoming webhook).

Reads root package.json for the semver, finds "## [<version>]" (optional " - YYYY-MM-DD") in
CHANGELOG.md, and sends that block — not the first ## section, so "## [Unreleased]" can stay on top.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request

# Discord embed description limit (leave margin for link line).
MAX_DESCRIPTION = 4000


def read_package_version() -> str:
    """Return the `version` field from the repository root package.json."""
    with open("package.json", encoding="utf-8") as fp:
        data = json.load(fp)
    ver = data.get("version")
    if not ver or not isinstance(ver, str):
        raise ValueError("package.json must contain a string `version` field")
    return ver.strip()


def extract_released_section(text: str, version: str) -> str:
    """
    Return markdown for the ## [<version>] section (optional date suffix after the closing bracket).

    Example headings: ## [5.1.0] or ## [5.1.0] - 2026-04-07
    Skips [Unreleased] and other versions.
    """
    # Match the full heading line only (so we do not match a different semver that shares a prefix).
    line_re = re.compile(
        rf"^## \[{re.escape(version)}\](?:\s+-\s+\d{{4}}-\d{{2}}-\d{{2}})?\s*$",
        re.MULTILINE,
    )
    headings = list(re.finditer(r"^## .+$", text, re.MULTILINE))
    for i, m in enumerate(headings):
        if not line_re.match(m.group(0)):
            continue
        start = m.start()
        end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
        return text[start:end].strip()

    raise ValueError(
        f"No '## [{version}]' section found in CHANGELOG.md "
        f"(add a release block matching package.json version).",
    )


def main() -> int:
    webhook = os.environ.get("DISCORD_CHANGELOG_WEBHOOK_URL", "").strip()
    if not webhook:
        print("DISCORD_CHANGELOG_WEBHOOK_URL not set; skipping Discord notification.")
        return 0

    try:
        version = read_package_version()
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"package.json: {exc}", file=sys.stderr)
        return 1

    sha_full = os.environ.get("GITHUB_SHA", "")
    sha_short = (sha_full[:7] if len(sha_full) >= 7 else sha_full) or "unknown"
    ref_name = os.environ.get("GITHUB_REF_NAME", "unknown")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    server = os.environ.get("GITHUB_SERVER_URL", "https://github.com").rstrip("/")
    blob_link = f"{server}/{repo}/blob/{sha_full}/CHANGELOG.md" if repo and sha_full else ""

    try:
        changelog_text = open("CHANGELOG.md", encoding="utf-8").read()
    except OSError as exc:
        print(f"CHANGELOG.md: {exc}", file=sys.stderr)
        return 1

    try:
        section = extract_released_section(changelog_text, version)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    description = section
    if blob_link:
        link_line = f"\n\n[View CHANGELOG.md on GitHub]({blob_link})"
        if len(description) + len(link_line) <= MAX_DESCRIPTION:
            description = description + link_line
        elif len(link_line) < MAX_DESCRIPTION:
            budget = MAX_DESCRIPTION - len(link_line) - 3
            description = section[:budget].rstrip() + "..." + link_line
        else:
            description = section[:MAX_DESCRIPTION]

    elif len(description) > MAX_DESCRIPTION:
        description = description[: MAX_DESCRIPTION - 3] + "..."

    footer_text = f"v{version} · {ref_name} · {sha_short}"
    embed = {
        "title": f"Release notes · v{version}",
        "description": description,
        "color": 0x5865F2,
        "footer": {"text": footer_text[:2048]},
    }

    payload = {
        "embeds": [embed],
        "username": "GitHub Actions",
    }

    request = urllib.request.Request(
        webhook,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status not in (200, 204):
                print(f"Discord returned HTTP {response.status}", file=sys.stderr)
                return 1
    except urllib.error.HTTPError as exc:
        print(f"Discord HTTP error: {exc}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Discord network error: {exc}", file=sys.stderr)
        return 1

    print(f"Posted CHANGELOG section for v{version} to Discord.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
