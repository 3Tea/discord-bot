// src/events/interactionCreate.ts
import { ChatInputCommandInteraction, Events, MessageFlags } from "discord.js";
import client from "../client";
import { CommandLogService } from "../services/commandLog.service";
import type { CommandInteractionOption } from "discord.js";

function serializeOptions(data: readonly CommandInteractionOption[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const opt of data) {
        if (opt.type === 1) {
            // Subcommand
            result._subcommand = opt.name;
            if (opt.options) Object.assign(result, serializeOptions(opt.options));
        } else if (opt.type === 2) {
            // SubcommandGroup
            result._group = opt.name;
            if (opt.options) Object.assign(result, serializeOptions(opt.options));
        } else {
            result[opt.name] = opt.value;
        }
    }
    return result;
}

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client?.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        console.log(`/${interaction.commandName} => username: ${interaction.user.username} ID: ${interaction.user.id}`);

        const startTime = Date.now();
        let success = true;
        let errorMessage: string | undefined;

        try {
            await command.execute(interaction);
        } catch (error) {
            success = false;
            errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `There was an error while executing this command! ${interaction.commandName}`,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.editReply({
                    content: `There was an error while executing this command! ${interaction.commandName}`,
                });
            }
        }

        const latencyMs = Date.now() - startTime;

        CommandLogService.pushLog({
            commandName: interaction.commandName,
            userId: interaction.user.id,
            username: interaction.user.username,
            guildId: interaction.guildId ?? "DM",
            channelId: interaction.channelId,
            options: serializeOptions(interaction.options.data),
            success,
            errorMessage,
            latencyMs,
        });
    },
};
