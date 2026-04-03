---
name: new-command
description: Scaffold a new Discord slash command following project patterns
---

# New Command Scaffolder

Create a new Discord slash command in `src/commands/slash/`.

## Usage

The user will provide:
- **name**: The command name (e.g., "roll", "poll")
- **description**: What the command does
- **options** (optional): Slash command options (string, integer, user, etc.)

## Project Patterns

All commands in this project follow this structure:

```typescript
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("command-name")
        .setDescription("Command description"),
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        // Command logic here

        return Reply.embed(interaction, embed);
    },
};
```

## Rules

1. File goes in `src/commands/slash/{name}.ts`
2. Always use `ChatInputCommandInteraction` (not `CommandInteraction`)
3. Use `Reply` utility from `../../util/decorator/reply` for responses
4. Use `EmbedBuilder` for rich responses
5. For long-running operations, use `await interaction.deferReply()` then `Reply.embedEdit()`
6. Add `(true)` to `getString()` / `getInteger()` for required options to get non-null types
7. If command needs NSFW check: `if (!(interaction.channel as TextChannel)?.nsfw)`
8. If command needs subcommands, use `.addSubcommand()`
9. No need to register the command anywhere — the loader in `src/loaders/commands.ts` auto-discovers it
