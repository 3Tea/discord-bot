"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_1 = require("../../util/config/index");
const commandLocales_1 = require("../../util/i18n/commandLocales");
const locale_1 = require("../../util/i18n/locale");
const t_1 = require("../../util/i18n/t");
const reply_1 = __importDefault(require("../../util/decorator/reply"));
const upgradeButton_1 = require("../../util/premium/upgradeButton");
const premium_service_1 = __importDefault(require("../../services/premium/premium.service"));
const premium_config_1 = require("../../services/premium/premium.config");
const DURATION_LABELS = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    "365d": "365 days",
    lifetime: "Lifetime",
};
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("premium")
        .setDescription("Premium status and management")
        .setDescriptionLocalizations((0, commandLocales_1.descriptionLocales)("cmd.premium.desc"))
        .addSubcommand((sub) => sub
        .setName("grant")
        .setDescription("Grant premium to a user")
        .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
        .addStringOption((opt) => opt
        .setName("tier")
        .setDescription("Premium tier")
        .setRequired(true)
        .addChoices({ name: "Star", value: "star" }, { name: "Galaxy", value: "galaxy" }))
        .addStringOption((opt) => opt
        .setName("duration")
        .setDescription("Subscription duration")
        .setRequired(true)
        .addChoices({ name: "7 days", value: "7d" }, { name: "30 days", value: "30d" }, { name: "90 days", value: "90d" }, { name: "365 days", value: "365d" }, { name: "Lifetime", value: "lifetime" })))
        .addSubcommand((sub) => sub
        .setName("revoke")
        .setDescription("Revoke premium from a user")
        .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason for revocation").setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("lookup")
        .setDescription("Check a user's premium status")
        .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true)))
        .addSubcommand((sub) => sub.setName("status").setDescription("View your premium status and benefits"))
        .addSubcommand((sub) => sub.setName("compare").setDescription("Compare Free vs Star vs Galaxy benefits")),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand(true);
        // Public subcommands — no permission check
        if (subcommand === "status" || subcommand === "compare") {
            await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
            const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
            try {
                if (subcommand === "status") {
                    await handleStatus(interaction, locale);
                }
                else {
                    await handleCompare(interaction, locale);
                }
            }
            catch {
                await interaction.editReply((0, t_1.t)(locale, "common.error"));
            }
            return;
        }
        // Admin subcommands — DEV_USER_ID only
        if (interaction.user.id !== index_1.DEV_USER_ID) {
            await interaction.reply({
                content: (0, t_1.t)(await (0, locale_1.resolveLocale)(interaction).catch(() => "en"), "premium.no_permission"),
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const locale = await (0, locale_1.resolveLocale)(interaction).catch(() => "en");
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
        }
        catch {
            await interaction.editReply((0, t_1.t)(locale, "common.error"));
        }
    },
};
async function handleGrant(interaction, locale) {
    const target = interaction.options.getUser("user", true);
    const tier = interaction.options.getString("tier", true);
    const duration = interaction.options.getString("duration", true);
    const result = await premium_service_1.default.activate(target.id, tier, duration, "manual", interaction.user.id);
    const untilStr = result.until
        ? `<t:${Math.floor(result.until.getTime() / 1000)}:F>`
        : (0, t_1.t)(locale, "premium.lookup.lifetime");
    let key;
    const params = { userId: target.id, tier, until: untilStr };
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
    const embed = new discord_js_1.EmbedBuilder()
        .setDescription((0, t_1.t)(locale, key, params))
        .setColor(0xf39c12)
        .setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
    await sendGrantDM(interaction, target.id, result.action, tier, result.until);
}
async function sendGrantDM(interaction, targetId, action, tier, until) {
    try {
        const dmLocale = await (0, locale_1.resolveUserLocale)(targetId);
        const untilStr = until ? `<t:${Math.floor(until.getTime() / 1000)}:F>` : (0, t_1.t)(dmLocale, "premium.lookup.lifetime");
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle((0, t_1.t)(dmLocale, `premium.dm.${action}.title`))
            .setDescription((0, t_1.t)(dmLocale, `premium.dm.${action}.notice`, { tier: tier.toUpperCase(), until: untilStr }))
            .setColor(tier === "galaxy" ? 0x9b59b6 : 0xf39c12)
            .setTimestamp();
        const user = await interaction.client.users.fetch(targetId);
        await user.send({ embeds: [embed] });
    }
    catch {
        // DM may fail if user has DMs closed — silently skip
    }
}
async function handleRevoke(interaction, locale) {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? undefined;
    const status = await premium_service_1.default.getPremiumStatus(target.id);
    const revoked = await premium_service_1.default.revoke(target.id, interaction.user.id, reason);
    if (!revoked) {
        await interaction.editReply((0, t_1.t)(locale, "premium.revoke.not_active"));
        return;
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setDescription((0, t_1.t)(locale, "premium.revoke.success", { userId: target.id, tier: status.tier ?? "none" }))
        .setColor(0xe74c3c)
        .setTimestamp();
    await reply_1.default.embedEdit(interaction, embed);
}
async function handleLookup(interaction, locale) {
    const target = interaction.options.getUser("user", true);
    const status = await premium_service_1.default.getPremiumStatus(target.id);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "premium.lookup.title", { username: target.username }))
        .setColor(status.isActive ? 0xf39c12 : 0x95a5a6)
        .setTimestamp();
    if (status.isActive) {
        const untilStr = status.until
            ? `<t:${Math.floor(status.until.getTime() / 1000)}:F>`
            : (0, t_1.t)(locale, "premium.lookup.lifetime");
        embed.addFields({ name: (0, t_1.t)(locale, "premium.lookup.tier"), value: (status.tier ?? "none").toUpperCase(), inline: true }, { name: (0, t_1.t)(locale, "premium.lookup.expires"), value: untilStr, inline: true }, { name: (0, t_1.t)(locale, "premium.lookup.source"), value: status.source ?? "—", inline: true });
        if (status.grantedBy) {
            embed.addFields({
                name: (0, t_1.t)(locale, "premium.lookup.granted_by"),
                value: `<@${status.grantedBy}>`,
                inline: true,
            });
        }
    }
    else {
        embed.setDescription((0, t_1.t)(locale, "premium.lookup.no_premium"));
    }
    await reply_1.default.embedEdit(interaction, embed);
}
async function handleStatus(interaction, locale) {
    const status = await premium_service_1.default.getPremiumStatus(interaction.user.id);
    const embed = new discord_js_1.EmbedBuilder().setTitle((0, t_1.t)(locale, "premium.status.title")).setTimestamp();
    if (status.isActive) {
        const config = (0, premium_config_1.getTierConfig)(status.tier);
        const untilStr = status.until
            ? `<t:${Math.floor(status.until.getTime() / 1000)}:R>`
            : (0, t_1.t)(locale, "premium.lookup.lifetime");
        embed
            .setColor(status.tier === "galaxy" ? 0x9b59b6 : 0xf39c12)
            .setDescription((0, t_1.t)(locale, "premium.status.active", { tier: (status.tier ?? "").toUpperCase() }))
            .addFields({ name: (0, t_1.t)(locale, "premium.status.expires"), value: untilStr, inline: true }, {
            name: (0, t_1.t)(locale, "premium.compare.manga_free"),
            value: Number.isFinite(config.mangaFreeUses)
                ? `${config.mangaFreeUses}/day`
                : (0, t_1.t)(locale, "premium.compare.unlimited"),
            inline: true,
        }, { name: (0, t_1.t)(locale, "premium.compare.manga_pages"), value: `${config.mangaMaxPages}`, inline: true }, {
            name: (0, t_1.t)(locale, "premium.compare.star_drop"),
            value: `\u00d7${config.starDropMultiplier}`,
            inline: true,
        }, { name: (0, t_1.t)(locale, "premium.compare.daily_bonus"), value: `+${config.dailyBonusStars}`, inline: true });
    }
    else {
        embed
            .setColor(0x95a5a6)
            .setDescription((0, t_1.t)(locale, "premium.status.free"))
            .addFields({ name: "\u200b", value: (0, t_1.t)(locale, "premium.status.free_desc") });
    }
    if (status.isActive) {
        await reply_1.default.embedEdit(interaction, embed);
    }
    else {
        const row = new discord_js_1.ActionRowBuilder().addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
        await reply_1.default.embedEditComponents(interaction, embed, [row]);
    }
}
function formatCd(ms) {
    const h = ms / (60 * 60 * 1000);
    if (h >= 1)
        return `${h}h`;
    return `${ms / (60 * 1000)}m`;
}
async function handleCompare(interaction, locale) {
    const free = (0, premium_config_1.getTierConfig)(null);
    const star = (0, premium_config_1.getTierConfig)("star");
    const galaxy = (0, premium_config_1.getTierConfig)("galaxy");
    const yes = (0, t_1.t)(locale, "premium.compare.yes");
    const no = (0, t_1.t)(locale, "premium.compare.no");
    const unlimited = (0, t_1.t)(locale, "premium.compare.unlimited");
    const rows = [
        [(0, t_1.t)(locale, "premium.compare.manga_free"), `${free.mangaFreeUses}`, `${star.mangaFreeUses}`, unlimited],
        [
            (0, t_1.t)(locale, "premium.compare.manga_pages"),
            `${free.mangaMaxPages}`,
            `${star.mangaMaxPages}`,
            `${galaxy.mangaMaxPages}`,
        ],
        [
            (0, t_1.t)(locale, "premium.compare.work_cd"),
            formatCd(free.workCooldownMs),
            formatCd(star.workCooldownMs),
            formatCd(galaxy.workCooldownMs),
        ],
        [
            (0, t_1.t)(locale, "premium.compare.fish_cd"),
            formatCd(free.fishCooldownMs),
            formatCd(star.fishCooldownMs),
            formatCd(galaxy.fishCooldownMs),
        ],
        [
            (0, t_1.t)(locale, "premium.compare.mine_cd"),
            formatCd(free.mineCooldownMs),
            formatCd(star.mineCooldownMs),
            formatCd(galaxy.mineCooldownMs),
        ],
        [
            (0, t_1.t)(locale, "premium.compare.dungeon_cd"),
            formatCd(free.dungeonCooldownMs),
            formatCd(star.dungeonCooldownMs),
            formatCd(galaxy.dungeonCooldownMs),
        ],
        [(0, t_1.t)(locale, "premium.compare.star_drop"), "\u00d71.0", "\u00d71.5", "\u00d72.0"],
        [(0, t_1.t)(locale, "premium.compare.confession_skip"), no, yes, yes],
        [(0, t_1.t)(locale, "premium.compare.confession_vip"), no, no, yes],
        [(0, t_1.t)(locale, "premium.compare.daily_bonus"), "0", "0", "+2"],
        [(0, t_1.t)(locale, "premium.compare.badge"), no, "\u2b50", "\ud83c\udf0c"],
    ];
    const freeLabel = (0, t_1.t)(locale, "premium.compare.free_tier");
    const starLabel = (0, t_1.t)(locale, "premium.compare.star_tier");
    const galaxyLabel = (0, t_1.t)(locale, "premium.compare.galaxy_tier");
    const description = rows
        .map(([label, f, s, g]) => `**${label}**\n${freeLabel}: ${f} | ${starLabel}: ${s} | ${galaxyLabel}: ${g}`)
        .join("\n\n");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle((0, t_1.t)(locale, "premium.compare.title"))
        .setDescription(description)
        .setColor(0xf39c12)
        .setTimestamp();
    const row = new discord_js_1.ActionRowBuilder().addComponents((0, upgradeButton_1.buildPremiumButton)(locale));
    await reply_1.default.embedEditComponents(interaction, embed, [row]);
}
