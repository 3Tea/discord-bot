import { Interaction, MessageFlags } from "discord.js";
import { BlocklistService } from "../../services/blocklist/blocklist.service";
import { resolveLocale, LocaleInteraction } from "../i18n/locale";
import { t } from "../i18n/t";

function isLocaleInteraction(interaction: Interaction): interaction is LocaleInteraction {
    return (
        interaction.isChatInputCommand() ||
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isUserSelectMenu() ||
        interaction.isRoleSelectMenu() ||
        interaction.isStringSelectMenu() ||
        interaction.isMentionableSelectMenu() ||
        interaction.isChannelSelectMenu()
    );
}

export async function enforceBlocklist(interaction: Interaction): Promise<boolean> {
    if (interaction.guildId) {
        const { blocked } = await BlocklistService.isGuildBlocked(interaction.guildId);
        if (blocked) return true;
    }

    const { blocked, reason } = await BlocklistService.isUserBlocked(interaction.user.id);
    if (!blocked) return false;

    if (!interaction.isRepliable()) return true;

    const shouldNotify = await BlocklistService.shouldNotifyBlockedUser(interaction.user.id);
    if (!shouldNotify) return true;

    try {
        const locale = isLocaleInteraction(interaction)
            ? await resolveLocale(interaction).catch(() => "en" as const)
            : ("en" as const);
        await interaction.reply({
            content: t(locale, "blocklist.user_blocked", { reason: reason ?? "—" }),
            flags: MessageFlags.Ephemeral,
        });
    } catch {
        // ignore expired or already-replied interactions
    }
    return true;
}
