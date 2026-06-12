"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const currency_service_1 = __importDefault(require("../../services/economy/currency.service"));
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const quest_service_1 = __importDefault(require("../../services/quest/quest.service"));
function fallbackLocale() {
    return "en";
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("balance")
        .setDescription("View your coin and gem balance")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.balance.desc"))
        .addUserOption((option) => option
        .setName("user")
        .setDescription("View another user's balance")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.balance.user.desc"))),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            await interaction.reply({ content: (0, t_1.t)(locale, "common.guild_only"), flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply();
        try {
            const locale = await (0, locale_1.resolveLocale)(interaction);
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId;
            const balance = await currency_service_1.default.getBalance(target.id, guildId);
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle((0, t_1.t)(locale, "balance.title", { username: target.username }))
                .addFields({ name: (0, t_1.t)(locale, "balance.coin"), value: `**${balance.coin.toLocaleString()}**`, inline: true }, { name: (0, t_1.t)(locale, "balance.gem"), value: `**${balance.gem.toLocaleString()}**`, inline: true }, {
                name: (0, t_1.t)(locale, "balance.pray_streak"),
                value: (0, t_1.t)(locale, "balance.pray_streak_value", { total: balance.prayStreak }),
                inline: true,
            })
                .setTimestamp();
            if (balance.lastPray) {
                embed.addFields({
                    name: (0, t_1.t)(locale, "balance.last_pray"),
                    value: `<t:${Math.floor(balance.lastPray.getTime() / 1000)}:R>`,
                    inline: true,
                });
            }
            await reply_1.default.embedEdit(interaction, embed);
            await quest_service_1.default.trackProgress(interaction.user.id, interaction.guildId, "balance").catch(() => { });
        }
        catch {
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(fallbackLocale);
            await interaction.editReply((0, t_1.t)(locale, "common.error"));
        }
    },
};
