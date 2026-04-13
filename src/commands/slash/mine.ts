import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import redis from "../../connector/redis";
import MineService from "../../services/economy/mine.service";
import WorkService from "../../services/economy/work.service";
import Reply from "../../util/decorator/reply";
import { tryStarDrop } from "../../util/economy/starDrop";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";
import PremiumService from "../../services/premium/premium.service";

export default {
    data: new SlashCommandBuilder()
        .setName("mine")
        .setDescription("Dig for minerals — go deeper for better rewards")
        .setDescriptionLocalizations(descriptionLocales("cmd.mine.desc")),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;

        try {
            const tierConfig = await PremiumService.getConfig(userId);

            // Check cooldown
            const cdKey = `mine_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "mine.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Execute mine
            const result = await MineService.mine(userId, guildId);

            // Set cooldown
            await redis.setJson(cdKey, 1, tierConfig.mineCooldownMs / 1000);

            if (result.collapsed) {
                const embed = new EmbedBuilder()
                    .setTitle(`💥 ${t(locale, "mine.title")}`)
                    .setDescription(
                        [
                            t(locale, "mine.collapse", { depth: String(result.newDepth) }),
                            t(locale, "mine.collapse_penalty", {
                                amount: String(result.penalty),
                                checkpoint: String(result.checkpoint),
                            }),
                        ].join("\n")
                    )
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            const mineral = result.mineral!;
            const mineralName = t(locale, `mine.mineral.${mineral.name}`);
            const descLines = [
                t(locale, "mine.success", { depth: String(result.newDepth - 1) }),
                `${mineral.emoji} **${mineralName}**`,
                t(locale, "mine.reward", { amount: String(mineral.totalReward) }),
                "",
                t(locale, "mine.depth", { depth: String(result.newDepth), checkpoint: String(result.checkpoint) }),
            ];

            if (result.checkpointReached) {
                descLines.push("🔖 " + t(locale, "mine.checkpoint_reached", { depth: String(result.newDepth) }));
            }

            const gotStar = await tryStarDrop(userId, 0.04, "mine");
            if (gotStar) {
                descLines.push("\n⭐ " + t(locale, "star_drop.found"));
            }

            const embed = new EmbedBuilder()
                .setTitle(`⛏️ ${t(locale, "mine.title")}`)
                .setDescription(descLines.join("\n"))
                .setColor(MineService.getRarityColor(mineral.rarity));

            return Reply.embedEdit(interaction, embed);
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
