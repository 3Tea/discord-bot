#!/usr/bin/env python3
"""
Extract the first ## section from CHANGELOG.md and POST a Discord webhook embed.

Called from GitHub Actions when CHANGELOG.md changed and DISCORD_CHANGELOG_WEBHOOK_URL is set.
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


def extract_first_section(text: str) -> str:
    """Return markdown from the first ## heading through the line before the next ## heading."""
    matches = list(re.finditer(r"^## .+$", text, re.MULTILINE))
    if not matches:
        raise ValueError("No ## heading found in CHANGELOG.md")
    start = matches[0].start()
    end = matches[1].start() if len(matches) > 1 else len(text)
    return text[start:end].strip()


def main() -> int:
    webhook = os.environ.get("DISCORD_CHANGELOG_WEBHOOK_URL", "").strip()
    if not webhook:
        print("DISCORD_CHANGELOG_WEBHOOK_URL not set; skipping Discord notification.")
        return 0

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
        section = extract_first_section(changelog_text)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    description = section
    if blob_link:
        link_line = f"\n\n[View CHANGELOG.md on GitHub]({blob_link})"
        if len(description) + len(link_line) <= MAX_DESCRIPTION:
            description = description + link_line
        elif len(link_line) < MAX_DESCRIPTION:
            # Truncate section so the link still fits (human-readable changelog should stay short).
            budget = MAX_DESCRIPTION - len(link_line) - 3
            description = section[:budget].rstrip() + "..." + link_line
        else:
            description = section[:MAX_DESCRIPTION]

    elif len(description) > MAX_DESCRIPTION:
        description = description[: MAX_DESCRIPTION - 3] + "..."

    footer_text = f"{ref_name} · {sha_short}"
    embed = {
        "title": "Changelog update",
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

    print("Posted changelog embed to Discord.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
