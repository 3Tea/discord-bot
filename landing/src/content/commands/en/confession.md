---
title: Confession
command: confession
category: confession
description: Anonymous confession system with optional moderator review workflow.
---

## Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/confession setup` | Configure the confession system | Manage Guild |
| `/confession submit` | Submit an anonymous confession | Everyone |

## How to Use

### Setting Up (Admin)

Use `/confession setup` to configure:
- **Enabled:** Turn the confession system on/off
- **Mode:** `instant` (posts immediately) or `review` (requires moderator approval)
- **Public channel:** Where approved confessions appear
- **Review channel:** Where pending confessions are reviewed (required in review mode)
- **Cooldown:** 1–120 minutes between submissions per user

### Submitting a Confession

```
/confession submit text:Your confession here image:(optional attachment)
```

- Text can be up to **3,500 characters**
- Optionally attach one image
- Your identity is **completely hidden** from other members
- Each confession gets a unique number (e.g., Confession #42)

### Review Mode

In review mode, confessions go to the review channel where moderators see the confession text with **Approve** and **Reject** buttons. Approved confessions are posted to the public channel. In review mode, moderators can see the author's identity.

> **Warning:** The confession system must be set up by an admin before members can submit confessions.
