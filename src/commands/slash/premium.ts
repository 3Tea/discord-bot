import {
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    type MessageActionRowComponentBuilder,
} from "discord.js";
import { DEV_USER_ID } from "../../util/config/index";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import Reply from "../../util/decorator/reply";
import { buildPremiumButton } from "../../util/premium/upgradeButton";
import PremiumService, { DurationKey } from "../../services/premium/premium.service";
import { getTierConfig } from "../../services/premium/premium.config";
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
        .setDescription("Premium status and management")
        .setDescriptionLocalizations(descriptionLocales("cmd.premium.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("grant")
                .setDescription("Grant premium to a user")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addStringOption((opt) =>
                    opt
                        .setName("tier")
                        .setDescription("Premium tier")
                        .setRequired(true)
                        .addChoices({ name: "Star", value: "star" }, { name: "Galaxy", value: "galaxy" })
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
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
                .addStringOption((opt) =>
                    opt.setName("reason").setDescription("Reason for revocation").setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("lookup")
                .setDescription("Check a user's premium status")
                .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
        )
        .addSubcommand((sub) => sub.setName("status").setDescription("View your premium status and benefits"))
        .addSubcommand((sub) => sub.setName("compare").setDescription("Compare Free vs Star vs Galaxy benefits")),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);

        // Public subcommands — no permission check
        if (subcommand === "status" || subcommand === "compare") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            try {
                if (subcommand === "status") {
                    await handleStatus(interaction, locale);
                } else {
                    await handleCompare(interaction, locale);
                }
            } catch {
                await interaction.editReply(t(locale, "common.error"));
            }
            return;
        }

        // Admin subcommands — DEV_USER_ID only
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

async function handleGrant(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const target = interaction.options.getUser("user", true);
    const tier = interaction.options.getString("tier", true) as PremiumTier;
    const duration = interaction.options.getString("duration", true) as DurationKey;

    const result = await PremiumService.activate(target.id, tier, duration, "manual", interaction.user.id);
    const untilStr = result.until
        ? `<t:${Math.floor(result.until.getTime() / 1000)}:F>`
        : t(locale, "premium.lookup.lifetime");

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

    const embed = new EmbedBuilder()
        .setDescription(t(locale, key, params))
        .setColor(0xf39c12)
        .setTimestamp();
    await Reply.embedEdit(interaction, embed);
}

async function handleRevoke(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
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

async function handleLookup(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
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

async function handleStatus(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const status = await PremiumService.getPremiumStatus(interaction.user.id);

    const embed = new EmbedBuilder().setTitle(t(locale, "premium.status.title")).setTimestamp();

    if (status.isActive) {
        const config = getTierConfig(status.tier);
        const untilStr = status.until
            ? `<t:${Math.floor(status.until.getTime() / 1000)}:R>`
            : t(locale, "premium.lookup.lifetime");

        embed
            .setColor(status.tier === "galaxy" ? 0x9b59b6 : 0xf39c12)
            .setDescription(t(locale, "premium.status.active", { tier: (status.tier ?? "").toUpperCase() }))
            .addFields(
                { name: t(locale, "premium.status.expires"), value: untilStr, inline: true },
                {
                    name: t(locale, "premium.compare.manga_free"),
                    value: Number.isFinite(config.mangaFreeUses)
                        ? `${config.mangaFreeUses}/day`
                        : t(locale, "premium.compare.unlimited"),
                    inline: true,
                },
                { name: t(locale, "premium.compare.manga_pages"), value: `${config.mangaMaxPages}`, inline: true },
                {
                    name: t(locale, "premium.compare.star_drop"),
                    value: `\u00d7${config.starDropMultiplier}`,
                    inline: true,
                },
                { name: t(locale, "premium.compare.daily_bonus"), value: `+${config.dailyBonusStars}`, inline: true }
            );
    } else {
        embed
            .setColor(0x95a5a6)
            .setDescription(t(locale, "premium.status.free"))
            .addFields({ name: "\u200b", value: t(locale, "premium.status.free_desc") });
    }

    if (status.isActive) {
        await Reply.embedEdit(interaction, embed);
    } else {
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buildPremiumButton(locale));
        await Reply.embedEditComponents(interaction, embed, [row]);
    }
}

function formatCd(ms: number): string {
    const h = ms / (60 * 60 * 1000);
    if (h >= 1) return `${h}h`;
    return `${ms / (60 * 1000)}m`;
}

async function handleCompare(interaction: ChatInputCommandInteraction, locale: SupportedLocale): Promise<void> {
    const free = getTierConfig(null);
    const star = getTierConfig("star");
    const galaxy = getTierConfig("galaxy");

    const yes = t(locale, "premium.compare.yes");
    const no = t(locale, "premium.compare.no");
    const unlimited = t(locale, "premium.compare.unlimited");

    const rows = [
        [t(locale, "premium.compare.manga_free"), `${free.mangaFreeUses}`, `${star.mangaFreeUses}`, unlimited],
        [
            t(locale, "premium.compare.manga_pages"),
            `${free.mangaMaxPages}`,
            `${star.mangaMaxPages}`,
            `${galaxy.mangaMaxPages}`,
        ],
        [
            t(locale, "premium.compare.work_cd"),
            formatCd(free.workCooldownMs),
            formatCd(star.workCooldownMs),
            formatCd(galaxy.workCooldownMs),
        ],
        [
            t(locale, "premium.compare.fish_cd"),
            formatCd(free.fishCooldownMs),
            formatCd(star.fishCooldownMs),
            formatCd(galaxy.fishCooldownMs),
        ],
        [
            t(locale, "premium.compare.mine_cd"),
            formatCd(free.mineCooldownMs),
            formatCd(star.mineCooldownMs),
            formatCd(galaxy.mineCooldownMs),
        ],
        [
            t(locale, "premium.compare.dungeon_cd"),
            formatCd(free.dungeonCooldownMs),
            formatCd(star.dungeonCooldownMs),
            formatCd(galaxy.dungeonCooldownMs),
        ],
        [t(locale, "premium.compare.star_drop"), "\u00d71.0", "\u00d71.5", "\u00d72.0"],
        [t(locale, "premium.compare.confession_skip"), no, yes, yes],
        [t(locale, "premium.compare.confession_vip"), no, no, yes],
        [t(locale, "premium.compare.daily_bonus"), "0", "0", "+2"],
        [t(locale, "premium.compare.badge"), no, "\u2b50", "\ud83c\udf0c"],
    ];

    const freeLabel = t(locale, "premium.compare.free_tier");
    const starLabel = t(locale, "premium.compare.star_tier");
    const galaxyLabel = t(locale, "premium.compare.galaxy_tier");

    const description = rows
        .map(([label, f, s, g]) => `**${label}**\n${freeLabel}: ${f} | ${starLabel}: ${s} | ${galaxyLabel}: ${g}`)
        .join("\n\n");

    const embed = new EmbedBuilder()
        .setTitle(t(locale, "premium.compare.title"))
        .setDescription(description)
        .setColor(0xf39c12)
        .setTimestamp();

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buildPremiumButton(locale));
    await Reply.embedEditComponents(interaction, embed, [row]);
}
