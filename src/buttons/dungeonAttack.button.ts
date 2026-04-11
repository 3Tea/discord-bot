import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
} from "discord.js";
import redis from "../connector/redis";
import DungeonService from "../services/economy/dungeon.service";
import type { CombatState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";

export async function handleCombatAction(
    interaction: ButtonInteraction,
    action: "attack" | "defend",
): Promise<void> {
    const userId = interaction.user.id;
    const stateKey = `dungeon_combat:${userId}`;

    const state = (await redis.getJson(stateKey)) as CombatState | null;
    if (!state) {
        await interaction.reply({ content: t("en", "dungeon.combat.timeout"), ephemeral: true });
        return;
    }

    // Guard: only the combat owner can interact
    if (state.userId !== userId) {
        await interaction.deferUpdate();
        return;
    }

    await interaction.deferUpdate();

    const result = DungeonService.processCombatAction(state, action);
    const locale = state.locale as SupportedLocale;

    const actionLine =
        action === "attack"
            ? t(locale, "dungeon.combat.attack", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) })
            : t(locale, "dungeon.combat.defend", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) });

    if (result.won) {
        await redis.deleteKey(stateKey);
        const resolve = await DungeonService.resolveCombatWin(userId, state.guildId, state.floor);

        const descLines = [
            actionLine,
            "",
            t(locale, "dungeon.combat.win", { monster: state.monsterName }),
            t(locale, "dungeon.reward.coin", { amount: String(resolve.coinReward) }),
        ];
        if (resolve.gemReward > 0) {
            descLines.push(t(locale, "dungeon.reward.gem", { amount: String(resolve.gemReward) }));
        }
        descLines.push("", t(locale, "dungeon.floor", { floor: String(resolve.newFloor), checkpoint: String(resolve.checkpoint) }));
        if (resolve.checkpointReached) {
            descLines.push("🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(resolve.newFloor) }));
        }
        if (resolve.starReward) {
            descLines.push("\n⭐ " + t(locale, "star_drop.found"));
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚔️ ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0x2ecc71);
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    if (result.lost) {
        await redis.deleteKey(stateKey);
        const loss = await DungeonService.resolveCombatLoss(userId, state.guildId);

        const descLines = [
            actionLine,
            "",
            t(locale, "dungeon.combat.lose", { checkpoint: String(loss.checkpoint) }),
            t(locale, "dungeon.penalty", { amount: String(loss.coinLost) }),
        ];

        const embed = new EmbedBuilder()
            .setTitle(`💀 ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0xed4245);
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    if (result.turnsUp) {
        await redis.deleteKey(stateKey);

        const descLines = [actionLine, "", t(locale, "dungeon.combat.turns_up")];

        const embed = new EmbedBuilder()
            .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
            .setDescription(descLines.join("\n"))
            .setColor(0x95a5a6);
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    // Combat continues — update state in Redis
    const updatedState: CombatState = {
        ...state,
        monsterHp: result.monsterHp,
        userHp: result.userHp,
        turnsLeft: result.turnsLeft,
    };
    await redis.setJson(stateKey, updatedState, 60);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_ATTACK).setLabel(t(locale, "dungeon.btn.attack")).setEmoji("⚔️").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_DEFEND).setLabel(t(locale, "dungeon.btn.defend")).setEmoji("🛡️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(BUTTON_ID.DUNGEON_RUN).setLabel(t(locale, "dungeon.btn.run")).setEmoji("🏃").setStyle(ButtonStyle.Secondary),
    );

    const descLines = [
        actionLine,
        "",
        t(locale, "dungeon.combat.hp", { userHp: String(result.userHp), monster: state.monsterName, monsterHp: String(result.monsterHp) }),
        t(locale, "dungeon.floor", { floor: String(state.floor), checkpoint: String(state.checkpoint) }),
    ];

    const embed = new EmbedBuilder()
        .setTitle(`${state.monsterEmoji} ${t(locale, "dungeon.encounter.monster", { monster: state.monsterName, floor: String(state.floor) })}`)
        .setDescription(descLines.join("\n"))
        .setColor(0xe67e22);

    await interaction.editReply({ embeds: [embed], components: [row] });
}

export default {
    id: BUTTON_ID.DUNGEON_ATTACK,
    async execute(interaction: ButtonInteraction) {
        await handleCombatAction(interaction, "attack");
    },
};
