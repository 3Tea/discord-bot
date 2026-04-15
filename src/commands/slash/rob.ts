import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import SocialService from "../../services/economy/social.service";
import GuildSocialConfigModel, { IGuildSocialConfig } from "../../models/guildSocialConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import EconomyAdminService from "../../services/economy/economyAdmin.service";
import QuestService from "../../services/quest/quest.service";
import EconomyLogService from "../../services/economy/economyLog.service";

const CONFIG_CACHE_TTL = 300;
const ROB_COOLDOWN = 21600; // 6 hours in seconds
const ROB_IMMUNITY = 7200; // 2 hours in seconds

async function getSocialConfig(guildId: string): Promise<IGuildSocialConfig> {
    const cacheKey = `social_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildSocialConfig;

    const config = await GuildSocialConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export default {
    data: new SlashCommandBuilder()
        .setName("rob")
        .setDescription("Attempt to rob coins from another user")
        .setDescriptionLocalizations(descriptionLocales("cmd.rob.desc"))
        .addUserOption((opt) => opt.setName("user").setDescription("User to rob").setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");

        if (await EconomyAdminService.isFrozen(interaction.user.id, interaction.guildId!)) {
            await interaction.editReply(t(locale, "common.frozen"));
            return;
        }

        const guildId = interaction.guildId!;
        const robberId = interaction.user.id;
        const target = interaction.options.getUser("user", true);

        try {
            const config = await getSocialConfig(guildId);

            if (!config.enabled) {
                const embed = new EmbedBuilder().setDescription(t(locale, "gift.disabled")).setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Validate target
            if (target.bot) {
                const embed = new EmbedBuilder().setDescription(t(locale, "rob.bot_error")).setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }
            if (target.id === robberId) {
                const embed = new EmbedBuilder().setDescription(t(locale, "rob.self_error")).setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check robber cooldown
            const cdKey = `rob_cd:${guildId}:${robberId}`;
            const cdRemaining = await redis.ttlKey(cdKey);
            if (cdRemaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "rob.cooldown", { time: SocialService.formatCooldown(cdRemaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check target balance protection
            const targetBalance = await CurrencyService.getBalance(target.id, guildId);
            if (targetBalance.coin < config.robMinBalance) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "rob.target_poor", { target: target.username }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check target immunity
            const immunityKey = `rob_immunity:${guildId}:${target.id}`;
            const immunityRemaining = await redis.ttlKey(immunityKey);
            if (immunityRemaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(
                        t(locale, "rob.target_immune", {
                            target: target.username,
                            time: SocialService.formatCooldown(immunityRemaining),
                        })
                    )
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Get robber balance for penalty calculation
            const robberBalance = await CurrencyService.getBalance(robberId, guildId);

            // Roll rob
            const result = SocialService.rollRob(robberBalance.coin, targetBalance.coin, config);

            let embed: EmbedBuilder;

            if (result.success) {
                let robSucceeded = false;
                if (result.amount > 0) {
                    try {
                        // Deduct from target
                        await CurrencyService.deduct(target.id, guildId, result.amount, 0, "rob", {
                            robberId,
                            stealPct: result.percentage,
                            stealAmount: result.amount,
                        });
                        // Add to robber
                        await CurrencyService.addCoin(robberId, guildId, result.amount, "rob", {
                            targetId: target.id,
                            stealPct: result.percentage,
                            stealAmount: result.amount,
                        });
                        robSucceeded = true;
                    } catch (deductError) {
                        if (
                            deductError instanceof CurrencyService.InsufficientFundsError
                        ) {
                            // Target balance changed since read — treat as escaped
                            robSucceeded = false;
                        } else {
                            throw deductError;
                        }
                    }
                }

                if (robSucceeded) {
                    // Set target immunity
                    await redis.setJson(immunityKey, 1, ROB_IMMUNITY);
                    await QuestService.trackProgress(robberId, guildId, "rob_success").catch(() => {});
                    EconomyLogService.shouldLog(guildId, "rob_success")
                        .then((should) => {
                            if (!should) return;
                            const logEmbed = new EmbedBuilder()
                                .setTitle("Rob Success")
                                .setDescription(
                                    `<@${robberId}> stole **${result.amount}** coin from <@${target.id}>`
                                )
                                .setColor(0xed4245)
                                .setTimestamp();
                            EconomyLogService.sendLog(guildId, logEmbed);
                        })
                        .catch(() => {});

                    embed = new EmbedBuilder()
                        .setTitle(`💰 ${t(locale, "rob.title.success")}`)
                        .setDescription(
                            t(locale, "rob.success", {
                                robber: interaction.user.username,
                                amount: String(result.amount),
                                target: target.username,
                            })
                        )
                        .setColor(0x57f287);
                } else {
                    // Target escaped — balance was insufficient at deduct time
                    embed = new EmbedBuilder()
                        .setTitle(`🏃 ${t(locale, "rob.title.fail")}`)
                        .setDescription(t(locale, "rob.fail_escaped", { target: target.username }))
                        .setColor(0xe67e22);
                }
            } else {
                // Penalty — only deduct if robber has coin and penalty > 0
                if (result.amount > 0) {
                    try {
                        await CurrencyService.deduct(robberId, guildId, result.amount, 0, "rob_penalty", {
                            targetId: target.id,
                            penaltyPct: result.percentage,
                            penaltyAmount: result.amount,
                        });
                    } catch {
                        // If deduct fails (insufficient after calculation), skip penalty
                    }

                    embed = new EmbedBuilder()
                        .setTitle(`🚔 ${t(locale, "rob.title.fail")}`)
                        .setDescription(
                            t(locale, "rob.fail", {
                                robber: interaction.user.username,
                                target: target.username,
                                penalty: String(result.amount),
                            })
                        )
                        .setColor(0xed4245);
                } else {
                    embed = new EmbedBuilder()
                        .setTitle(`🚔 ${t(locale, "rob.title.fail")}`)
                        .setDescription(
                            t(locale, "rob.fail_broke", {
                                robber: interaction.user.username,
                                target: target.username,
                            })
                        )
                        .setColor(0xed4245);
                }
            }

            // Set robber cooldown (always, regardless of success/fail)
            await redis.setJson(cdKey, 1, ROB_COOLDOWN);

            return Reply.embedEdit(interaction, embed);
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
