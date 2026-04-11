import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import redis from "../../connector/redis";
import DungeonService from "../../services/economy/dungeon.service";
import type { EncounterResult } from "../../services/economy/dungeon.service";
import WorkService from "../../services/economy/work.service";
import Reply from "../../util/decorator/reply";
import { BUTTON_ID } from "../../util/config/button";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const DUNGEON_COOLDOWN = 3600; // 1 hour

function buildCombatRow(locale: SupportedLocale): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_ATTACK).setLabel(t(locale, "dungeon.btn.attack")).setEmoji("⚔️").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_DEFEND).setLabel(t(locale, "dungeon.btn.defend")).setEmoji("🛡️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_RUN).setLabel(t(locale, "dungeon.btn.run")).setEmoji("🏃").setStyle(ButtonStyle.Secondary),
    );
}

function buildTreasureEmbed(locale: SupportedLocale, result: EncounterResult): EmbedBuilder {
    const descLines = [
        t(locale, "dungeon.encounter.treasure", { floor: String(result.floor) }),
        t(locale, "dungeon.reward.coin", { amount: String(result.coinReward ?? 0) }),
    ];
    if (result.gemReward && result.gemReward > 0) {
        descLines.push(t(locale, "dungeon.reward.gem", { amount: String(result.gemReward) }));
    }
    descLines.push("", t(locale, "dungeon.floor", { floor: String(result.newFloor ?? result.floor), checkpoint: String(result.checkpoint) }));
    if (result.checkpointReached) {
        descLines.push("🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(result.newFloor ?? result.floor) }));
    }
    if (result.starReward) {
        descLines.push("\n⭐ " + t(locale, "star_drop.found"));
    }
    return new EmbedBuilder()
        .setTitle(`🎁 ${t(locale, "dungeon.title")}`)
        .setDescription(descLines.join("\n"))
        .setColor(0xf1c40f);
}

function buildTrapEmbed(locale: SupportedLocale, result: EncounterResult): EmbedBuilder {
    const descLines = [
        t(locale, "dungeon.encounter.trap", { floor: String(result.floor) }),
        t(locale, "dungeon.trap.damage", { hp: String(result.hpLost ?? 0), coin: String(result.coinLost ?? 0) }),
    ];
    if (result.collapsed) {
        descLines.push("", t(locale, "dungeon.collapse", { checkpoint: String(result.checkpoint) }));
    }
    descLines.push("", t(locale, "dungeon.floor", { floor: String(result.floor), checkpoint: String(result.checkpoint) }));
    return new EmbedBuilder()
        .setTitle(`🪤 ${t(locale, "dungeon.title")}`)
        .setDescription(descLines.join("\n"))
        .setColor(result.collapsed ? 0xed4245 : 0xe67e22);
}

function buildNpcEmbed(locale: SupportedLocale, result: EncounterResult): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`🧙 ${t(locale, "dungeon.title")}`)
        .setDescription(
            [
                t(locale, "dungeon.encounter.npc"),
                "",
                t(locale, "dungeon.floor", { floor: String(result.floor), checkpoint: String(result.checkpoint) }),
            ].join("\n"),
        )
        .setColor(0x9b59b6);
}

export default {
    data: new SlashCommandBuilder()
        .setName("dungeon")
        .setDescription("Explore the dungeon — fight monsters, find treasure")
        .setDescriptionLocalizations(descriptionLocales("cmd.dungeon.desc")),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const locale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
        const guildId = interaction.guildId!;
        const userId = interaction.user.id;

        try {
            // Check cooldown
            const cdKey = `dungeon_cd:${guildId}:${userId}`;
            const remaining = await redis.ttlKey(cdKey);
            if (remaining > 0) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.cooldown", { time: WorkService.formatCooldown(remaining) }))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Check existing combat state (prevent concurrent runs)
            const combatKey = `dungeon_combat:${userId}`;
            const existingCombat = await redis.getJson(combatKey);
            if (existingCombat) {
                const embed = new EmbedBuilder()
                    .setDescription(t(locale, "dungeon.in_combat"))
                    .setColor(0xed4245);
                return Reply.embedEdit(interaction, embed);
            }

            // Roll encounter
            const result = await DungeonService.rollEncounter(userId, guildId, locale);

            // Set cooldown
            await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);

            // --- Monster encounter: show combat UI ---
            if (result.type === "monster" && result.combatState) {
                const state = result.combatState;
                await redis.setJson(combatKey, state, 60);

                const embed = new EmbedBuilder()
                    .setTitle(`${state.monsterEmoji} ${t(locale, "dungeon.encounter.monster", { monster: state.monsterName, floor: String(state.floor) })}`)
                    .setDescription(
                        [
                            t(locale, "dungeon.combat.hp", { userHp: String(state.userHp), monster: state.monsterName, monsterHp: String(state.monsterHp) }),
                            "",
                            t(locale, "dungeon.floor", { floor: String(state.floor), checkpoint: String(result.checkpoint) }),
                        ].join("\n"),
                    )
                    .setColor(0xe67e22);

                await interaction.editReply({ embeds: [embed], components: [buildCombatRow(locale)] });

                // 30-second timeout: auto-run if no button click
                setTimeout(async () => {
                    try {
                        const activeState = await redis.getJson(combatKey);
                        if (activeState) {
                            await redis.deleteKey(combatKey);
                            const timeoutEmbed = new EmbedBuilder()
                                .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
                                .setDescription(t(locale, "dungeon.combat.timeout"))
                                .setColor(0x95a5a6);
                            await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                        }
                    } catch {
                        // Interaction may have expired — silently ignore
                    }
                }, 30_000);

                return;
            }

            // --- Non-combat encounters ---
            if (result.type === "treasure") return Reply.embedEdit(interaction, buildTreasureEmbed(locale, result));
            if (result.type === "trap") return Reply.embedEdit(interaction, buildTrapEmbed(locale, result));
            return Reply.embedEdit(interaction, buildNpcEmbed(locale, result));
        } catch {
            const errLocale = await resolveLocale(interaction).catch((): SupportedLocale => "en");
            const embed = new EmbedBuilder().setDescription(t(errLocale, "common.error")).setColor(0xed4245);
            return Reply.embedEdit(interaction, embed);
        }
    },
};
