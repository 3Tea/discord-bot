import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import redis from "../../connector/redis";
import CurrencyService from "../../services/economy/currency.service";
import WorkService from "../../services/economy/work.service";
import GuildWorkConfigModel, { IGuildWorkConfig } from "../../models/guildWorkConfig.model";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import PremiumService from "../../services/premium/premium.service";
import { tryStarDrop } from "../../util/economy/starDrop";
import QuestService from "../../services/quest/quest.service";

const CONFIG_CACHE_TTL = 300;

async function getWorkConfig(guildId: string): Promise<IGuildWorkConfig> {
    const cacheKey = `work_config:${guildId}`;
    const cached = await redis.getJson(cacheKey);
    if (cached) return cached as IGuildWorkConfig;

    const config = await GuildWorkConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    await redis.setJson(cacheKey, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export default {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription("Work a job to earn coins")
        .setDescriptionLocalizations(descriptionLocales("cmd.work.desc")),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.reply({ content: t(locale, "common.guild_only"), flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;

        try {
            const config = await getWorkConfig(guildId);
            const tierConfig = await PremiumService.getConfig(userId);

            if (!config.enabled) {
                const embed = new EmbedBuilder().setDescription(t(locale, "work.disabled")).setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check cooldown
            const cdKey = `work_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "work.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Roll reward
            const reward = WorkService.rollWorkReward(config.workMinReward, config.workMaxReward);
            const textIndex = WorkService.rollWorkText();

            // Pay out
            await CurrencyService.addCoin(userId, guildId, reward, "work", { reward });

            // Set cooldown
            const effectiveCooldown = Math.min(config.workCooldown, tierConfig.workCooldownMs / 1000);
            await redis.setJson(cdKey, 1, effectiveCooldown);

            const gotStar = await tryStarDrop(userId, 0.04, "work");

            // Build embed
            const flavorText = t(locale, `work.texts.${textIndex}`);
            const descLines = [
                t(locale, "work.flavor", { username: interaction.user.username, text: flavorText }),
                t(locale, "work.reward", { amount: String(reward) }),
            ];
            if (gotStar) {
                descLines.push("\n⭐ " + t(locale, "star_drop.found"));
            }
            const embed = new EmbedBuilder()
                .setTitle(`💼 ${t(locale, "work.title")}`)
                .setDescription(descLines.join("\n"))
                .setColor(0x57f287);

            await QuestService.trackProgress(userId, guildId, "work").catch(() => {});
            return Reply.embedEdit(interaction, embed);
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
