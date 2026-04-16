import { ActionRowBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder, type MessageActionRowComponentBuilder } from "discord.js";
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
import { buildPremiumButton } from "../../util/premium/upgradeButton";
import { TIER_CONFIG } from "../../services/premium/premium.config";
import { tryStarDrop } from "../../util/economy/starDrop";
import QuestService from "../../services/quest/quest.service";
import GuildQuestService from "../../services/rpg/guildQuest.service";
import EconomyAdminService from "../../services/economy/economyAdmin.service";

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
        .setName("fish")
        .setDescription("Go fishing — catch fish for coins")
        .setDescriptionLocalizations(descriptionLocales("cmd.fish.desc")),

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

        if (await EconomyAdminService.isFrozen(userId, guildId)) {
            await interaction.editReply(t(locale, "common.frozen"));
            return;
        }

        try {
            const config = await getWorkConfig(guildId);
            const tierConfig = await PremiumService.getConfig(userId);

            if (!config.enabled) {
                const embed = new EmbedBuilder().setDescription(t(locale, "work.disabled")).setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check cooldown
            const cdKey = `fish_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                let description = t(locale, "fish.cooldown", { time: WorkService.formatCooldown(remaining) });
                const isFreeTier = tierConfig.fishCooldownMs === TIER_CONFIG.free.fishCooldownMs;
                if (isFreeTier) {
                    const reduced = WorkService.formatCooldown(TIER_CONFIG.star.fishCooldownMs / 1000);
                    description += `\n${t(locale, "premium.cooldown_hint", { reduced })}`;
                }
                const embed = new EmbedBuilder().setDescription(description).setColor(0xed4245);
                if (isFreeTier) {
                    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                        .addComponents(buildPremiumButton(locale));
                    return Reply.embedEditComponents(interaction, embed, [row]);
                }
                return Reply.embedEdit(interaction, embed);
            }

            // Roll fish
            const fish = WorkService.rollFish();
            const reward = WorkService.rollFishReward(fish.minCoin, fish.maxCoin, config.fishRewardMultiplier);

            // Pay out
            await CurrencyService.addCoin(userId, guildId, reward, "fish", {
                fish: fish.name,
                rarity: fish.rarity,
                reward,
            });

            // Set cooldown (premium tier determines duration)
            await redis.setJson(cdKey, 1, Math.ceil(tierConfig.fishCooldownMs / 1000));

            const gotStar = await tryStarDrop(userId, 0.03, "fish");

            // Build embed
            const fishName = t(locale, fish.name);
            const rarityLabel = t(locale, `fish.rarity.${fish.rarity}`);
            const descLines = [
                t(locale, "fish.catch", { emoji: fish.emoji, fish: fishName, rarity: rarityLabel }),
                t(locale, "fish.reward", { amount: String(reward) }),
            ];
            if (gotStar) {
                descLines.push("\n⭐ " + t(locale, "star_drop.found"));
            }
            const embed = new EmbedBuilder()
                .setTitle(`🎣 ${t(locale, "fish.title")}`)
                .setDescription(descLines.join("\n"))
                .setColor(WorkService.getRarityColor(fish.rarity));

            await QuestService.trackProgress(userId, guildId, "fish").catch(() => {});
            GuildQuestService.trackProgress(userId, "use_fish", 1).catch(() => {});
            return Reply.embedEdit(interaction, embed);
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
