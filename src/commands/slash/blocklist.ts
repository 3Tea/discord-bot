import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { BlocklistService } from "../../services/blocklist/blocklist.service";
import { AuditService } from "../../services/audit/audit.service";
import { DEV_USER_ID, GUILD_ID } from "../../util/config/index";
import { descriptionLocales } from "../../util/i18n/commandLocales";

function isDevAuthorized(interaction: ChatInputCommandInteraction): boolean {
    return interaction.guildId === GUILD_ID && interaction.user.id === DEV_USER_ID;
}

export default {
    data: new SlashCommandBuilder()
        .setName("blocklist")
        .setDescription("Manage global blocklist (dev only)")
        .setDescriptionLocalizations(descriptionLocales("cmd.blocklist.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("add-user")
                .setDescription("Block a user globally")
                .setDescriptionLocalizations(descriptionLocales("cmd.blocklist.add_user.desc"))
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("User to block").setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("reason")
                        .setDescription("Reason (max 500 chars)")
                        .setRequired(true)
                        .setMaxLength(500)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove-user")
                .setDescription("Unblock a user globally")
                .setDescriptionLocalizations(descriptionLocales("cmd.blocklist.remove_user.desc"))
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("User to unblock").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add-guild")
                .setDescription("Block a guild globally (bot auto-leaves)")
                .setDescriptionLocalizations(descriptionLocales("cmd.blocklist.add_guild.desc"))
                .addStringOption((opt) =>
                    opt.setName("guild-id").setDescription("Guild ID").setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("reason")
                        .setDescription("Reason (max 500 chars)")
                        .setRequired(true)
                        .setMaxLength(500)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove-guild")
                .setDescription("Unblock a guild globally")
                .setDescriptionLocalizations(descriptionLocales("cmd.blocklist.remove_guild.desc"))
                .addStringOption((opt) =>
                    opt.setName("guild-id").setDescription("Guild ID").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("list")
                .setDescription("List blocked users or guilds")
                .setDescriptionLocalizations(descriptionLocales("cmd.blocklist.list.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("type")
                        .setDescription("user or guild")
                        .setRequired(true)
                        .addChoices({ name: "user", value: "user" }, { name: "guild", value: "guild" })
                )
                .addIntegerOption((opt) =>
                    opt.setName("page").setDescription("Page (default 1)").setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("info")
                .setDescription("Show details for a blocklist entry")
                .setDescriptionLocalizations(descriptionLocales("cmd.blocklist.info.desc"))
                .addStringOption((opt) =>
                    opt
                        .setName("type")
                        .setDescription("user or guild")
                        .setRequired(true)
                        .addChoices({ name: "user", value: "user" }, { name: "guild", value: "guild" })
                )
                .addStringOption((opt) =>
                    opt.setName("target").setDescription("User ID or Guild ID").setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: "Guild only.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (!isDevAuthorized(interaction)) {
            await interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand(true);

        switch (sub) {
            case "add-user":
                return handleAddUser(interaction);
            case "remove-user":
                return handleRemoveUser(interaction);
            case "add-guild":
                return handleAddGuild(interaction);
            case "remove-guild":
                return handleRemoveGuild(interaction);
            case "list":
                return handleList(interaction);
            case "info":
                return handleInfo(interaction);
            default:
                await interaction.editReply("Unknown subcommand.");
        }
    },
};

async function handleAddUser(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    await BlocklistService.blockUser(user.id, reason, interaction.user.id);
    AuditService.recordBlocklistAction({
        action: "add",
        type: "user",
        targetId: user.id,
        reason,
        blockedBy: interaction.user.id,
    });
    await interaction.editReply(`Blocked user <@${user.id}> (\`${user.id}\`). Reason: ${reason}`);
}

async function handleRemoveUser(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.options.getUser("user", true);
    const removed = await BlocklistService.unblockUser(user.id);
    if (!removed) {
        await interaction.editReply(`No blocklist entry for <@${user.id}>.`);
        return;
    }
    AuditService.recordBlocklistAction({
        action: "remove",
        type: "user",
        targetId: user.id,
        blockedBy: interaction.user.id,
    });
    await interaction.editReply(`Unblocked user <@${user.id}>.`);
}

async function handleAddGuild(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.options.getString("guild-id", true);
    const reason = interaction.options.getString("reason", true);

    if (guildId === GUILD_ID) {
        await interaction.editReply("Cannot block the bot's home guild — that would lock you out of this command.");
        return;
    }

    const guildName = interaction.client.guilds.cache.get(guildId)?.name;
    const result = await BlocklistService.blockGuild(
        guildId,
        reason,
        interaction.user.id,
        interaction.client,
        guildName
    );
    AuditService.recordBlocklistAction({
        action: "add",
        type: "guild",
        targetId: guildId,
        guildName,
        reason,
        blockedBy: interaction.user.id,
    });
    if (result.status === "left") {
        AuditService.recordBlocklistAction({
            action: "auto-leave",
            type: "guild",
            targetId: guildId,
            guildName,
            reason,
        });
    }
    const suffix =
        result.status === "left"
            ? " Bot left the guild."
            : result.status === "not-in-guild"
                ? " Bot was not in this guild."
                : ` ⚠️ Failed to leave — manual kick may be needed. Error: ${result.error}`;
    await interaction.editReply(`Blocked guild \`${guildId}\`.${suffix} Reason: ${reason}`);
}

async function handleRemoveGuild(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.options.getString("guild-id", true);
    const removed = await BlocklistService.unblockGuild(guildId);
    if (!removed) {
        await interaction.editReply(`No blocklist entry for guild \`${guildId}\`.`);
        return;
    }
    AuditService.recordBlocklistAction({
        action: "remove",
        type: "guild",
        targetId: guildId,
        blockedBy: interaction.user.id,
    });
    await interaction.editReply(`Unblocked guild \`${guildId}\`.`);
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    const type = interaction.options.getString("type", true) as "user" | "guild";
    const page = interaction.options.getInteger("page") ?? 1;
    const pageSize = 10;
    const { items, total } = await BlocklistService.listEntries(type, page, pageSize);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const lines = items
        .map((e, i) => {
            const n = (page - 1) * pageSize + i + 1;
            const when = `<t:${Math.floor(new Date(e.blockedAt).getTime() / 1000)}:R>`;
            const label =
                type === "user"
                    ? `<@${e.targetId}>`
                    : `\`${e.targetId}\`${e.guildName ? ` (${e.guildName})` : ""}`;
            return `${n}. ${label} — ${when} — ${e.reason}`;
        })
        .join("\n") || "No entries.";

    const embed = new EmbedBuilder()
        .setTitle(`Blocklist: ${type} (page ${page} / ${totalPages})`)
        .setDescription(lines.slice(0, 4000))
        .setFooter({ text: `Total: ${total}` })
        .setColor(0xef4444)
        .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
}

async function handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const type = interaction.options.getString("type", true) as "user" | "guild";
    const target = interaction.options.getString("target", true);
    const entry = await BlocklistService.getInfo(type, target);
    if (!entry) {
        await interaction.editReply(`No blocklist entry for ${type} \`${target}\`.`);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`Blocklist entry: ${type}`)
        .setColor(0xef4444)
        .addFields(
            {
                name: "Target",
                value: type === "user" ? `<@${entry.targetId}> (\`${entry.targetId}\`)` : `\`${entry.targetId}\``,
                inline: false,
            },
            { name: "Reason", value: entry.reason, inline: false },
            { name: "Blocked by", value: `<@${entry.blockedBy}>`, inline: true },
            {
                name: "Blocked at",
                value: `<t:${Math.floor(new Date(entry.blockedAt).getTime() / 1000)}:F>`,
                inline: true,
            }
        )
        .setTimestamp();

    if (type === "guild") {
        const currentlyIn = interaction.client.guilds.cache.has(entry.targetId);
        embed.addFields(
            { name: "Guild name", value: entry.guildName ?? "—", inline: true },
            { name: "Currently in", value: String(currentlyIn), inline: true },
            {
                name: "Left at",
                value: entry.leftAt ? `<t:${Math.floor(new Date(entry.leftAt).getTime() / 1000)}:F>` : "—",
                inline: true,
            }
        );
    }

    await interaction.editReply({ embeds: [embed] });
}
