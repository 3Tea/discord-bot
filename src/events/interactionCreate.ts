// src/events/interactionCreate.ts
import { ChatInputCommandInteraction, Events, MessageFlags } from "discord.js";
import client from "../client";
import { CommandLogService } from "../services/commandLog.service";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";
import type { CommandInteractionOption } from "discord.js";
import { AuditService } from "../services/audit/audit.service";
import { BotOutputAudit } from "../services/audit/botOutputAudit.service";
import { enforceBlocklist } from "../util/blocklist/enforce";

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
        if (await enforceBlocklist(interaction)) return;

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
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            const errorMsg = t(locale, "common.error");
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: errorMsg,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.editReply({
                    content: errorMsg,
                });
            }
        }

        const latencyMs = Date.now() - startTime;

        const entry = {
            commandName: interaction.commandName,
            userId: interaction.user.id,
            username: interaction.user.username,
            guildId: interaction.guildId ?? "DM",
            channelId: interaction.channelId,
            options: serializeOptions(interaction.options.data),
            success,
            errorMessage,
            latencyMs,
        };

        CommandLogService.pushLog(entry);
        const captured = BotOutputAudit.takeInteractionCapture(interaction.id);
        AuditService.onCommandExecuted(entry, captured);
    },
};
