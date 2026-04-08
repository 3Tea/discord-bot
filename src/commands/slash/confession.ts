import {
    ChannelType,
    ChatInputCommandInteraction,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";

import {
    buildConfessionAttachmentFiles,
    buildConfessionInteractionRow,
    buildConfessionReviewComponents,
    buildReviewConfessionEmbed,
    CONFESSION_COOLDOWN_DEFAULT,
    CONFESSION_CONTENT_MAX,
    CONFESSION_VIP_COST_GEM,
    CONFESSION_SKIP_CD_COST_COIN,
    createPendingConfessionRecord,
    createPublishedConfessionRecord,
    getConfessionCooldownRemainingSeconds,
    getGuildConfessionConfig,
    isConfessionOnCooldown,
    reserveNextConfessionNumber,
    sendAnonymousConfessionToChannel,
    setConfessionCooldown,
    setConfessionReviewMessageId,
    upsertGuildConfessionConfig,
    validateConfessionAttachment,
} from "../../services/confession/confession.service";
import CurrencyService from "../../services/economy/currency.service";
import { logger } from "../../util/log/logger.mixed";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("confession")
        .setDescription("Anonymous confessions for this server")
        .setDescriptionLocalizations(descriptionLocales("cmd.confession.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("setup")
                .setDescription("Configure confession channels and mode (Manage Guild)")
                .setDescriptionLocalizations(descriptionLocales("cmd.confession.setup.desc"))
                .addBooleanOption((opt) =>
                    opt
                        .setName("enabled")
                        .setDescription("Turn confessions on or off")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.setup.enabled.desc"))
                        .setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("mode")
                        .setDescription("Post instantly or require moderator review first")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.setup.mode.desc"))
                        .setRequired(true)
                        .addChoices({ name: "Instant", value: "instant" }, { name: "Review", value: "review" })
                )
                .addChannelOption((opt) =>
                    opt
                        .setName("public_channel")
                        .setDescription("Channel where approved confessions are posted (anonymous)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.setup.public_channel.desc"))
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(true)
                )
                .addChannelOption((opt) =>
                    opt
                        .setName("review_channel")
                        .setDescription("Required if mode is Review — moderators approve or reject here")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.setup.review_channel.desc"))
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(false)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("cooldown_minutes")
                        .setDescription("Minutes between submissions per user (1–120)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.setup.cooldown_minutes.desc"))
                        .setMinValue(1)
                        .setMaxValue(120)
                        .setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("submit")
                .setDescription("Submit an anonymous confession")
                .setDescriptionLocalizations(descriptionLocales("cmd.confession.submit.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("content")
                        .setDescription("Your confession text")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.submit.content.desc"))
                        .setRequired(true)
                        .setMaxLength(CONFESSION_CONTENT_MAX)
                )
                .addAttachmentOption((opt) =>
                    opt
                        .setName("image")
                        .setDescription("Optional single image")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.submit.image.desc"))
                        .setRequired(false)
                )
                .addBooleanOption((opt) =>
                    opt
                        .setName("vip")
                        .setDescription("VIP confession with golden embed (costs gems)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.submit.vip.desc"))
                        .setRequired(false)
                )
                .addBooleanOption((opt) =>
                    opt
                        .setName("skip_cooldown")
                        .setDescription("Skip active cooldown (costs coins)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.submit.skip_cooldown.desc"))
                        .setRequired(false)
                )
        ),
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const locale = await resolveLocale(interaction);
        const sub = interaction.options.getSubcommand(true);

        if (sub === "setup") {
            await executeSetup(interaction, locale);
            return;
        }

        await executeSubmit(interaction, locale);
    },
};

async function executeSetup(
    interaction: ChatInputCommandInteraction,
    locale: Awaited<ReturnType<typeof resolveLocale>>
): Promise<void> {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: t(locale, "confession.guild_only"),
        });
        return;
    }

    const memberPerms = interaction.memberPermissions;
    if (!memberPerms?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: t(locale, "confession.no_permission_setup"),
        });
        return;
    }

    const enabled = interaction.options.getBoolean("enabled", true);
    const mode = interaction.options.getString("mode", true) as "instant" | "review";
    const publicChannel = interaction.options.getChannel("public_channel", true);
    const reviewChannel = interaction.options.getChannel("review_channel");
    const cooldownRaw = interaction.options.getInteger("cooldown_minutes");
    const cooldownMinutes = cooldownRaw ?? CONFESSION_COOLDOWN_DEFAULT;

    if (mode === "review" && !reviewChannel) {
        await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: t(locale, "confession.review_channel_required"),
        });
        return;
    }

    try {
        await upsertGuildConfessionConfig({
            guildId: interaction.guildId,
            enabled,
            mode,
            publicChannelId: publicChannel.id,
            reviewChannelId: reviewChannel?.id ?? null,
            cooldownMinutes,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "";
        if (msg === "REVIEW_CHANNEL_REQUIRED") {
            await interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: t(locale, "confession.review_channel_required"),
            });
            return;
        }
        logger.error(`confession setup upsert failed: ${msg}`);
        await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: t(locale, "confession.send_failed"),
        });
        return;
    }

    await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: t(locale, "confession.setup_success"),
    });
}

async function executeSubmit(
    interaction: ChatInputCommandInteraction,
    locale: Awaited<ReturnType<typeof resolveLocale>>
): Promise<void> {
    if (!interaction.inGuild() || !interaction.guildId || !interaction.guild) {
        await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: t(locale, "confession.guild_only"),
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const rawContent = interaction.options.getString("content", true);
    const content = rawContent.trim();
    if (content.length === 0) {
        await interaction.editReply({ content: t(locale, "confession.empty_content") });
        return;
    }
    if (content.length > CONFESSION_CONTENT_MAX) {
        await interaction.editReply({ content: t(locale, "confession.content_too_long") });
        return;
    }

    const attachment = interaction.options.getAttachment("image");
    const validated = validateConfessionAttachment(attachment);
    if (!validated.ok) {
        await interaction.editReply({ content: t(locale, "confession.invalid_image") });
        return;
    }
    const image = validated.image;

    const wantVip = interaction.options.getBoolean("vip") ?? false;
    const wantSkipCd = interaction.options.getBoolean("skip_cooldown") ?? false;

    const config = await getGuildConfessionConfig(interaction.guildId);
    if (!config) {
        await interaction.editReply({ content: t(locale, "confession.not_configured") });
        return;
    }
    if (!config.enabled) {
        await interaction.editReply({ content: t(locale, "confession.disabled") });
        return;
    }
    if (config.mode === "review" && !config.reviewChannelId) {
        logger.warn(`confession: guild ${interaction.guildId} has review mode but no review channel`);
        await interaction.editReply({ content: t(locale, "confession.review_misconfigured") });
        return;
    }

    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    // --- Cooldown check with skip_cooldown economy integration ---
    let coinDeducted = false;
    const onCooldown = await isConfessionOnCooldown(guildId, userId);

    if (onCooldown && !wantSkipCd) {
        const sec = await getConfessionCooldownRemainingSeconds(guildId, userId);
        await interaction.editReply({
            content: t(locale, "confession.cooldown", { seconds: Math.max(1, sec) }),
        });
        return;
    }

    if (onCooldown && wantSkipCd) {
        try {
            await CurrencyService.deduct(userId, guildId, CONFESSION_SKIP_CD_COST_COIN, 0, "confession_skip_cd", {
                action: "skip_cooldown",
            });
            coinDeducted = true;
        } catch (error) {
            if (error instanceof CurrencyService.InsufficientFundsError) {
                const balance = (await CurrencyService.getBalance(userId, guildId)).coin;
                await interaction.editReply({
                    content: t(locale, "confession.insufficient_coin", {
                        cost: CONFESSION_SKIP_CD_COST_COIN,
                        balance,
                    }),
                });
                return;
            }
            throw error;
        }
    }

    // --- VIP economy integration ---
    let gemDeducted = false;
    if (wantVip) {
        try {
            await CurrencyService.deduct(userId, guildId, 0, CONFESSION_VIP_COST_GEM, "confession_vip", {
                action: "vip_confession",
            });
            gemDeducted = true;
        } catch (error) {
            if (error instanceof CurrencyService.InsufficientFundsError) {
                // Refund coin if it was already deducted
                if (coinDeducted) {
                    await CurrencyService.addCoin(userId, guildId, CONFESSION_SKIP_CD_COST_COIN, "confession_refund", {
                        reason: "vip_gem_insufficient",
                    });
                }
                const balance = (await CurrencyService.getBalance(userId, guildId)).gem;
                await interaction.editReply({
                    content: t(locale, "confession.insufficient_gem", {
                        cost: CONFESSION_VIP_COST_GEM,
                        balance,
                    }),
                });
                return;
            }
            throw error;
        }
    }

    // --- Reserve confession number ---
    let confessionNumber: number;
    try {
        confessionNumber = await reserveNextConfessionNumber(guildId);
    } catch {
        // Refund all on failure
        if (coinDeducted) {
            await CurrencyService.addCoin(userId, guildId, CONFESSION_SKIP_CD_COST_COIN, "confession_refund", {
                reason: "reserve_failed",
            });
        }
        if (gemDeducted) {
            await CurrencyService.addGem(userId, guildId, CONFESSION_VIP_COST_GEM, "confession_refund", {
                reason: "reserve_failed",
            });
        }
        await interaction.editReply({ content: t(locale, "confession.not_configured") });
        return;
    }

    const authorId = userId;
    const isVip = wantVip && gemDeducted;

    // --- Helper to refund all deducted currency ---
    async function refundAll(reason: string): Promise<void> {
        if (coinDeducted) {
            await CurrencyService.addCoin(userId, guildId, CONFESSION_SKIP_CD_COST_COIN, "confession_refund", { reason });
        }
        if (gemDeducted) {
            await CurrencyService.addGem(userId, guildId, CONFESSION_VIP_COST_GEM, "confession_refund", { reason });
        }
    }

    if (config.mode === "instant") {
        const publicCh = await interaction.guild.channels.fetch(config.publicChannelId).catch(() => null);
        if (!publicCh || !publicCh.isTextBased() || publicCh.isDMBased()) {
            await refundAll("channel_fetch_failed");
            await interaction.editReply({ content: t(locale, "confession.send_failed") });
            return;
        }
        const textPublic = publicCh as TextChannel;

        // Create record first to get mongoId for buttons
        let publishedDoc;
        try {
            publishedDoc = await createPublishedConfessionRecord({
                guildId,
                number: confessionNumber,
                authorId,
                content,
                image,
                publicMessageId: "pending",
                isVip,
            });
        } catch (error) {
            logger.error(
                `confession: failed to save published record: ${error instanceof Error ? error.message : String(error)}`
            );
            await refundAll("db_save_failed");
            await interaction.editReply({ content: t(locale, "confession.send_failed") });
            return;
        }

        const mongoId = String(publishedDoc._id);
        const sendResult = await sendAnonymousConfessionToChannel(textPublic, confessionNumber, content, image, isVip, mongoId);
        if ("error" in sendResult) {
            await refundAll("send_failed");
            await interaction.editReply({ content: t(locale, "confession.send_failed") });
            return;
        }

        // Update with real publicMessageId
        publishedDoc.publicMessageId = sendResult.messageId;
        await publishedDoc.save();

        await setConfessionCooldown(guildId, userId, config.cooldownMinutes);
        await interaction.editReply({ content: t(locale, "confession.submit_success_instant") });
        return;
    }

    // Review mode
    let pendingDoc;
    try {
        pendingDoc = await createPendingConfessionRecord({
            guildId,
            number: confessionNumber,
            authorId,
            content,
            image,
            isVip,
        });
    } catch (error) {
        logger.error(
            `confession: failed to create pending record: ${error instanceof Error ? error.message : String(error)}`
        );
        await refundAll("db_save_failed");
        await interaction.editReply({ content: t(locale, "confession.send_failed") });
        return;
    }

    const mongoId = String(pendingDoc._id);
    const reviewChannelId = config.reviewChannelId;
    if (!reviewChannelId) {
        await interaction.editReply({ content: t(locale, "confession.review_misconfigured") });
        return;
    }
    const reviewCh = await interaction.guild.channels.fetch(reviewChannelId).catch(() => null);
    if (!reviewCh || !reviewCh.isTextBased() || reviewCh.isDMBased()) {
        await interaction.editReply({ content: t(locale, "confession.send_failed") });
        return;
    }
    const textReview = reviewCh as TextChannel;

    const reviewEmbed = buildReviewConfessionEmbed({
        confessionNumber,
        content,
        authorId,
        isVip,
    });
    const files = await buildConfessionAttachmentFiles(image);
    const row = buildConfessionReviewComponents(mongoId, {
        approve: t(locale, "btn.confession.approve"),
        reject: t(locale, "btn.confession.reject"),
    });

    try {
        const msg = await textReview.send({
            embeds: [reviewEmbed],
            files: files.length > 0 ? files : undefined,
            components: [row],
        });
        await setConfessionReviewMessageId(mongoId, msg.id);
    } catch (error) {
        logger.error(
            `confession: failed to post review message: ${error instanceof Error ? error.message : String(error)}`
        );
        await interaction.editReply({ content: t(locale, "confession.send_failed") });
        return;
    }

    await setConfessionCooldown(guildId, userId, config.cooldownMinutes);
    await interaction.editReply({ content: t(locale, "confession.submit_success_review") });
}
