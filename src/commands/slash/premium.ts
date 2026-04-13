import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { DEV_USER_ID } from "../../util/config/index";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import Reply from "../../util/decorator/reply";
import PremiumService, { DurationKey } from "../../services/premium/premium.service";
import type { PremiumTier } from "../../models/userWallet.model";
import type { SupportedLocale } from "../../util/i18n/index";

const DURATION_LABELS: Record<DurationKey, string> = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    "365d": "365 days",
    lifetime: "Lifetime",
};

export default {
    data: new SlashCommandBuilder()
        .setName("premium")
        .setDescription("Premium management (bot developer only)")
        .setDescriptionLocalizations(descriptionLocales("cmd.premium.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("grant")
                .setDescription("Grant premium to a user")
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("tier")
                        .setDescription("Premium tier")
                        .setRequired(true)
                        .addChoices(
                            { name: "Star", value: "star" },
                            { name: "Galaxy", value: "galaxy" }
                        )
                )
                .addStringOption((opt) =>
                    opt
                        .setName("duration")
                        .setDescription("Subscription duration")
                        .setRequired(true)
                        .addChoices(
                            { name: "7 days", value: "7d" },
                            { name: "30 days", value: "30d" },
                            { name: "90 days", value: "90d" },
                            { name: "365 days", value: "365d" },
                            { name: "Lifetime", value: "lifetime" }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("revoke")
                .setDescription("Revoke premium from a user")
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setRequired(true)
                )
                .addStringOption((opt) =>
                    opt.setName("reason").setDescription("Reason for revocation").setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("lookup")
                .setDescription("Check a user's premium status")
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== DEV_USER_ID) {
            await interaction.reply({
                content: t(await resolveLocale(interaction).catch(() => "en" as const), "premium.no_permission"),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const locale = await resolveLocale(interaction).catch(() => "en" as const);

        try {
            const subcommand = interaction.options.getSubcommand(true);

            switch (subcommand) {
                case "grant":
                    await handleGrant(interaction, locale);
                    break;
                case "revoke":
                    await handleRevoke(interaction, locale);
                    break;
                case "lookup":
                    await handleLookup(interaction, locale);
                    break;
            }
        } catch {
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};

async function handleGrant(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const target = interaction.options.getUser("user", true);
    const tier = interaction.options.getString("tier", true) as PremiumTier;
    const duration = interaction.options.getString("duration", true) as DurationKey;

    const result = await PremiumService.activate(target.id, tier, duration, "manual", interaction.user.id);
    const untilStr = result.until ? `<t:${Math.floor(result.until.getTime() / 1000)}:F>` : "Lifetime";

    let key: string;
    const params: Record<string, string> = { userId: target.id, tier, until: untilStr };

    switch (result.action) {
        case "activate":
            key = "premium.grant.success";
            params.duration = DURATION_LABELS[duration];
            break;
        case "extend":
            key = "premium.grant.extended";
            break;
        case "upgrade":
            key = "premium.grant.upgraded";
            params.from = "star";
            break;
        case "downgrade":
            key = "premium.grant.downgraded";
            params.from = "galaxy";
            break;
    }

    const embed = new EmbedBuilder().setDescription(t(locale, key, params)).setColor(0xf39c12).setTimestamp();
    await Reply.embedEdit(interaction, embed);
}

async function handleRevoke(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const status = await PremiumService.getPremiumStatus(target.id);
    const revoked = await PremiumService.revoke(target.id, interaction.user.id, reason);

    if (!revoked) {
        await interaction.editReply(t(locale, "premium.revoke.not_active"));
        return;
    }

    const embed = new EmbedBuilder()
        .setDescription(t(locale, "premium.revoke.success", { userId: target.id, tier: status.tier ?? "none" }))
        .setColor(0xe74c3c)
        .setTimestamp();
    await Reply.embedEdit(interaction, embed);
}

async function handleLookup(
    interaction: ChatInputCommandInteraction,
    locale: SupportedLocale
): Promise<void> {
    const target = interaction.options.getUser("user", true);
    const status = await PremiumService.getPremiumStatus(target.id);

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "premium.lookup.title", { username: target.username }))
        .setColor(status.isActive ? 0xf39c12 : 0x95a5a6)
        .setTimestamp();

    if (status.isActive) {
        const untilStr = status.until
            ? `<t:${Math.floor(status.until.getTime() / 1000)}:F>`
            : t(locale, "premium.lookup.lifetime");

        embed.addFields(
            { name: t(locale, "premium.lookup.tier"), value: (status.tier ?? "none").toUpperCase(), inline: true },
            { name: t(locale, "premium.lookup.expires"), value: untilStr, inline: true },
            { name: t(locale, "premium.lookup.source"), value: status.source ?? "—", inline: true }
        );

        if (status.grantedBy) {
            embed.addFields({
                name: t(locale, "premium.lookup.granted_by"),
                value: `<@${status.grantedBy}>`,
                inline: true,
            });
        }
    } else {
        embed.setDescription(t(locale, "premium.lookup.no_premium"));
    }

    await Reply.embedEdit(interaction, embed);
}
