import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import CurrencyService from "../../services/economy/currency.service";
import GuildEconomyRewardConfigModel from "../../models/guildEconomyRewardConfig.model";
import { invalidateRewardConfigCache } from "../../util/economy/activityReward";
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
        )
        .addSubcommand((sub) =>
            sub
                .setName("reward-config-view")
                .setDescription("View passive reward config")
        )
        .addSubcommand((sub) =>
            sub
                .setName("reward-config-toggle")
                .setDescription("Enable/disable passive rewards")
        )
        .addSubcommand((sub) =>
            sub
                .setName("reward-config-set")
                .setDescription("Set a reward config value")
                .addStringOption((opt) =>
                    opt
                        .setName("setting")
                        .setDescription("Setting to change")
                        .setRequired(true)
                        .addChoices(
                            { name: "level-coin-base", value: "levelUpCoinBase" },
                            { name: "level-coin-per-level", value: "levelUpCoinPerLevel" },
                            { name: "voice-interval", value: "voiceCoinInterval" },
                            { name: "voice-reward", value: "voiceCoinReward" },
                        )
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("value")
                        .setDescription("New value")
                        .setMinValue(0)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("reward-config-milestone")
                .setDescription("Set/remove a gem milestone (gems=0 removes)")
                .addIntegerOption((opt) =>
                    opt
                        .setName("level")
                        .setDescription("Level for the milestone")
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("gems")
                        .setDescription("Gem reward (0 to remove)")
                        .setMinValue(0)
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const locale = await resolveLocale(interaction);
            const guildId = interaction.guildId!;
            const subcommand = interaction.options.getSubcommand(true);

            let embed: EmbedBuilder;

            switch (subcommand) {
                case "set-coin": {
                    const target = interaction.options.getUser("user", true);
                    const amount = interaction.options.getInteger("amount", true);
                    const updated = await CurrencyService.setCoin(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "economy.set_coin", { userId: target.id, amount: updated.coin.toLocaleString() })
                        )
                        .setColor(0x5865f2);
                    break;
                }
                case "add-coin": {
                    const target = interaction.options.getUser("user", true);
                    const amount = interaction.options.getInteger("amount", true);
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
                    const target = interaction.options.getUser("user", true);
                    const amount = interaction.options.getInteger("amount", true);
                    const updated = await CurrencyService.setGem(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "economy.set_gem", { userId: target.id, amount: updated.gem.toLocaleString() })
                        )
                        .setColor(0x5865f2);
                    break;
                }
                case "add-gem": {
                    const target = interaction.options.getUser("user", true);
                    const amount = interaction.options.getInteger("amount", true);
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
                case "reward-config-view": {
                    const config = await GuildEconomyRewardConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    const milestones = config.gemMilestones instanceof Map
                        ? config.gemMilestones
                        : new Map(Object.entries(config.gemMilestones ?? {}));
                    const milestoneStr = [...milestones.entries()]
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([lvl, gems]) => `Lv.${lvl} → ${gems} 💎`)
                        .join("\n") || "None";

                    embed = new EmbedBuilder()
                        .setTitle(t(locale, "economy.reward_config.title"))
                        .addFields(
                            { name: t(locale, "economy.reward_config.enabled"), value: config.enabled ? "✅" : "❌", inline: true },
                            { name: t(locale, "economy.reward_config.level_base"), value: String(config.levelUpCoinBase), inline: true },
                            { name: t(locale, "economy.reward_config.level_per"), value: String(config.levelUpCoinPerLevel), inline: true },
                            { name: t(locale, "economy.reward_config.voice_interval"), value: `${config.voiceCoinInterval} min`, inline: true },
                            { name: t(locale, "economy.reward_config.voice_reward"), value: String(config.voiceCoinReward), inline: true },
                            { name: t(locale, "economy.reward_config.gem_milestones"), value: milestoneStr },
                        )
                        .setColor(0x5865f2);
                    break;
                }
                case "reward-config-toggle": {
                    const config = await GuildEconomyRewardConfigModel.findOneAndUpdate(
                        { guildId },
                        { $setOnInsert: { guildId } },
                        { upsert: true, new: true }
                    );
                    const newEnabled = !config.enabled;
                    await GuildEconomyRewardConfigModel.updateOne({ guildId }, { $set: { enabled: newEnabled } });
                    await invalidateRewardConfigCache(guildId);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, newEnabled ? "economy.reward_config.toggled_on" : "economy.reward_config.toggled_off"))
                        .setColor(newEnabled ? 0x57f287 : 0xed4245);
                    break;
                }
                case "reward-config-set": {
                    const setting = interaction.options.getString("setting", true);
                    const value = interaction.options.getInteger("value", true);
                    await GuildEconomyRewardConfigModel.findOneAndUpdate(
                        { guildId },
                        { $set: { [setting]: value }, $setOnInsert: { guildId } },
                        { upsert: true }
                    );
                    await invalidateRewardConfigCache(guildId);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, "economy.reward_config.updated"))
                        .setColor(0x57f287);
                    break;
                }
                case "reward-config-milestone": {
                    const level = interaction.options.getInteger("level", true);
                    const gems = interaction.options.getInteger("gems", true);
                    if (gems > 0) {
                        await GuildEconomyRewardConfigModel.findOneAndUpdate(
                            { guildId },
                            { $set: { [`gemMilestones.${level}`]: gems }, $setOnInsert: { guildId } },
                            { upsert: true }
                        );
                        embed = new EmbedBuilder()
                            .setDescription(t(locale, "economy.reward_config.milestone_set", { level: String(level), gems: String(gems) }))
                            .setColor(0x57f287);
                    } else {
                        await GuildEconomyRewardConfigModel.findOneAndUpdate(
                            { guildId },
                            { $unset: { [`gemMilestones.${level}`]: "" }, $setOnInsert: { guildId } },
                            { upsert: true }
                        );
                        embed = new EmbedBuilder()
                            .setDescription(t(locale, "economy.reward_config.milestone_removed", { level: String(level) }))
                            .setColor(0xed4245);
                    }
                    await invalidateRewardConfigCache(guildId);
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
