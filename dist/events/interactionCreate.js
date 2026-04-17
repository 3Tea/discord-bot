"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/events/interactionCreate.ts
const discord_js_1 = require("discord.js");
const client_1 = __importDefault(require("../client"));
const commandLog_service_1 = require("../services/commandLog.service");
const locale_1 = require("../util/i18n/locale");
const t_1 = require("../util/i18n/t");
const audit_service_1 = require("../services/audit/audit.service");
function serializeOptions(data) {
    const result = {};
    for (const opt of data) {
        if (opt.type === 1) {
            // Subcommand
            result._subcommand = opt.name;
            if (opt.options)
                Object.assign(result, serializeOptions(opt.options));
        }
        else if (opt.type === 2) {
            // SubcommandGroup
            result._group = opt.name;
            if (opt.options)
                Object.assign(result, serializeOptions(opt.options));
        }
        else {
            result[opt.name] = opt.value;
        }
    }
    return result;
}
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        if (!interaction.isChatInputCommand())
            return;
        const command = client_1.default?.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        console.log(`/${interaction.commandName} => username: ${interaction.user.username} ID: ${interaction.user.id}`);
        const startTime = Date.now();
        let success = true;
        let errorMessage;
        try {
            await command.execute(interaction);
        }
        catch (error) {
            success = false;
            errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(error);
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            const errorMsg = (0, t_1.t)(locale, "common.error");
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: errorMsg,
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
            }
            else {
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
        commandLog_service_1.CommandLogService.pushLog(entry);
        audit_service_1.AuditService.onCommandExecuted(entry);
    },
};
