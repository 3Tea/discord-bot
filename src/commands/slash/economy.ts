import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import CurrencyService from "../../services/economy/currency.service";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

function fallbackLocale(): SupportedLocale {
    return "en";
}

export default {
    data: new SlashCommandBuilder()
        .setName("economy")
        .setDescription("Economy management (admin)")
        .setDescriptionLocalizations(descriptionLocales("cmd.economy.desc"))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((sub) =>
            sub
                .setName("set-coin")
                .setDescription("Set a user's coin")
                .setDescriptionLocalizations(descriptionLocales("cmd.economy.set-coin.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("Target user")
                        .setDescriptionLocalizations(descriptionLocales("cmd.economy.set-coin.user.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("amount")
                        .setDescription("Coin amount")
                        .setDescriptionLocalizations(descriptionLocales("cmd.economy.set-coin.amount.desc"))
                        .setMinValue(0)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add-coin")
                .setDescription("Add coin to a user")
                .setDescriptionLocalizations(descriptionLocales("cmd.economy.add-coin.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("Target user")
                        .setDescriptionLocalizations(descriptionLocales("cmd.economy.add-coin.user.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("amount")
                        .setDescription("Coin to add")
                        .setDescriptionLocalizations(descriptionLocales("cmd.economy.add-coin.amount.desc"))
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("set-gem")
                .setDescription("Set a user's gem")
                .setDescriptionLocalizations(descriptionLocales("cmd.economy.set-gem.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("Target user")
                        .setDescriptionLocalizations(descriptionLocales("cmd.economy.set-gem.user.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("amount")
                        .setDescription("Gem amount")
                        .setDescriptionLocalizations(descriptionLocales("cmd.economy.set-gem.amount.desc"))
                        .setMinValue(0)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add-gem")
                .setDescription("Add gem to a user")
                .setDescriptionLocalizations(descriptionLocales("cmd.economy.add-gem.desc"))
                .addUserOption((opt) =>
                    opt
                        .setName("user")
                        .setDescription("Target user")
                        .setDescriptionLocalizations(descriptionLocales("cmd.economy.add-gem.user.desc"))
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("amount")
                        .setDescription("Gem to add")
                        .setDescriptionLocalizations(descriptionLocales("cmd.economy.add-gem.amount.desc"))
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const locale = await resolveLocale(interaction);
            const guildId = interaction.guildId!;
            const subcommand = interaction.options.getSubcommand(true);
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);

            let embed: EmbedBuilder;

            switch (subcommand) {
                case "set-coin": {
                    const updated = await CurrencyService.setCoin(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "economy.set_coin", { userId: target.id, amount: updated.coin.toLocaleString() })
                        )
                        .setColor(0x5865f2);
                    break;
                }
                case "add-coin": {
                    const updated = await CurrencyService.addCoin(target.id, guildId, amount, "admin", {
                        action: "add-coin",
                    });
                    embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "economy.add_coin", {
                                userId: target.id,
                                amount: amount.toLocaleString(),
                                total: updated.coin.toLocaleString(),
                            })
                        )
                        .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
                    break;
                }
                case "set-gem": {
                    const updated = await CurrencyService.setGem(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "economy.set_gem", { userId: target.id, amount: updated.gem.toLocaleString() })
                        )
                        .setColor(0x5865f2);
                    break;
                }
                case "add-gem": {
                    const updated = await CurrencyService.addGem(target.id, guildId, amount, "admin", {
                        action: "add-gem",
                    });
                    embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "economy.add_gem", {
                                userId: target.id,
                                amount: amount.toLocaleString(),
                                total: updated.gem.toLocaleString(),
                            })
                        )
                        .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
                    break;
                }
                default: {
                    await interaction.editReply(t(locale, "common.unknown_subcommand"));
                    return;
                }
            }

            await interaction.editReply({ embeds: [embed] });
        } catch {
            const locale = await resolveLocale(interaction).catch(fallbackLocale);
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
