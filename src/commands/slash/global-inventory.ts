import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Reply from "../../util/decorator/reply";
import GlobalShopService from "../../services/economy/globalShop.service";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

/** Inventory list embed color (yellow), consistent with global shop catalog. */
const COLOR_LIST = 0xffeb3b;

function fallbackLocale(): SupportedLocale {
    return "en";
}

function formatInventoryLine(
    locale: SupportedLocale,
    itemId: string,
    quantity: number,
    lastObtainedAt: Date | null | undefined
): string {
    const base = t(locale, "globalInventory.view.line_base", {
        itemId,
        quantity: String(quantity),
    });
    if (!lastObtainedAt) {
        return base;
    }
    const rel = `<t:${Math.floor(lastObtainedAt.getTime() / 1000)}:R>`;
    return `${base} ${t(locale, "globalInventory.view.last_obtained", { relative: rel })}`;
}

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    try {
        const locale = await resolveLocale(interaction);
        const userId = interaction.user.id;
        const page = interaction.options.getInteger("page") ?? 1;

        const { items, totalPages, safePage } = await GlobalShopService.getInventory(userId, page);

        const embed = new EmbedBuilder()
            .setColor(COLOR_LIST)
            .setTitle(t(locale, "globalInventory.view.title", { username: interaction.user.username }))
            .setTimestamp();

        if (items.length === 0) {
            embed.setDescription(t(locale, "globalInventory.view.empty"));
        } else {
            const lines = items.map((row) =>
                formatInventoryLine(locale, row.itemId, row.quantity, row.lastObtainedAt ?? null)
            );
            embed.setDescription(lines.join("\n"));
        }

        embed.setFooter({
            text: t(locale, "globalInventory.view.page_footer", {
                page: String(safePage),
                total: String(totalPages),
            }),
        });

        await Reply.embedEdit(interaction, embed);
    } catch {
        const locale = await resolveLocale(interaction).catch(fallbackLocale);
        await interaction.editReply(t(locale, "common.error"));
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName("global-inventory")
        .setDescription("View your global shop inventory")
        .setDescriptionLocalizations(descriptionLocales("cmd.global-inventory.desc"))
        .addSubcommand((sub) =>
            sub
                .setName("view")
                .setDescription("List items in your global inventory")
                .setDescriptionLocalizations(descriptionLocales("cmd.global-inventory.view.desc"))
                .addIntegerOption((opt) =>
                    opt
                        .setName("page")
                        .setDescription("Page number")
                        .setDescriptionLocalizations(descriptionLocales("cmd.global-inventory.view.page.desc"))
                        .setMinValue(1)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        return handleView(interaction);
    },
};
