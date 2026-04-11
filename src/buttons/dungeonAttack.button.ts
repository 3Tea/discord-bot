import {
    ButtonInteraction,
    EmbedBuilder,
} from "discord.js";
import redis from "../connector/redis";
import DungeonService from "../services/economy/dungeon.service";
import type { CombatState, CombatActionResult, CombatResolveResult, DungeonRunState } from "../services/economy/dungeon.service";
import { BUTTON_ID } from "../util/config/button";
import type { SupportedLocale } from "../util/i18n/index";
import { t } from "../util/i18n/t";
import { buildContinueLeaveRow, buildCombatRow } from "../commands/slash/dungeon";

const DUNGEON_COOLDOWN = 3600;
const RUN_TTL = 900;

function buildWinDesc(locale: SupportedLocale, actionLine: string, state: CombatState, resolve: CombatResolveResult): string {
    const lines = [
        actionLine,
        "",
        t(locale, "dungeon.combat.win", { monster: state.monsterName }),
        t(locale, "dungeon.reward.coin", { amount: String(resolve.coinReward) }),
        ...(resolve.gemReward > 0 ? [t(locale, "dungeon.reward.gem", { amount: String(resolve.gemReward) })] : []),
        "",
        t(locale, "dungeon.floor", { floor: String(resolve.newFloor), checkpoint: String(resolve.checkpoint) }),
        ...(resolve.checkpointReached ? ["🔖 " + t(locale, "dungeon.checkpoint_reached", { floor: String(resolve.newFloor) })] : []),
        ...(resolve.starReward ? ["\n⭐ " + t(locale, "star_drop.found")] : []),
    ];
    return lines.join("\n");
}

async function handleWin(
    interaction: ButtonInteraction,
    state: CombatState,
    result: CombatActionResult,
    runState: DungeonRunState | null,
    runKey: string,
    locale: SupportedLocale,
    actionLine: string,
): Promise<void> {
    const resolve = await DungeonService.resolveCombatWin(state.userId, state.guildId, state.floor);

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${t(locale, "dungeon.title")}`)
        .setDescription(buildWinDesc(locale, actionLine, state, resolve))
        .setColor(0x2ecc71);

    if (!runState) {
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    runState.hp = result.userHp;
    runState.floor = resolve.newFloor;
    runState.checkpoint = resolve.checkpoint;
    await redis.setJson(runKey, runState, RUN_TTL);
    await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, runState.encountersLeft)] });
}

async function handleLoss(
    interaction: ButtonInteraction,
    state: CombatState,
    runState: DungeonRunState | null,
    runKey: string,
    locale: SupportedLocale,
    actionLine: string,
): Promise<void> {
    const loss = await DungeonService.resolveCombatLoss(state.userId, state.guildId);

    const embed = new EmbedBuilder()
        .setTitle(`💀 ${t(locale, "dungeon.title")}`)
        .setDescription([
            actionLine,
            "",
            t(locale, "dungeon.combat.lose", { checkpoint: String(loss.checkpoint) }),
            t(locale, "dungeon.penalty", { amount: String(loss.coinLost) }),
        ].join("\n"))
        .setColor(0xed4245);

    if (runState) {
        await redis.deleteKey(runKey);
        const cdKey = `dungeon_cd:${state.guildId}:${state.userId}`;
        await redis.setJson(cdKey, 1, DUNGEON_COOLDOWN);
    }
    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleTurnsUp(
    interaction: ButtonInteraction,
    result: CombatActionResult,
    runState: DungeonRunState | null,
    runKey: string,
    locale: SupportedLocale,
    actionLine: string,
): Promise<void> {
    const embed = new EmbedBuilder()
        .setTitle(`🏃 ${t(locale, "dungeon.title")}`)
        .setDescription([actionLine, "", t(locale, "dungeon.combat.turns_up")].join("\n"))
        .setColor(0x95a5a6);

    if (!runState) {
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    runState.hp = result.userHp;
    await redis.setJson(runKey, runState, RUN_TTL);
    await interaction.editReply({ embeds: [embed], components: [buildContinueLeaveRow(locale, runState.encountersLeft)] });
}

export async function handleCombatAction(
    interaction: ButtonInteraction,
    action: "attack" | "defend",
): Promise<void> {
    const userId = interaction.user.id;
    const combatKey = `dungeon_combat:${userId}`;
    const runKey = `dungeon_run:${userId}`;

    const state = (await redis.getJson(combatKey)) as CombatState | null;
    if (!state) {
        await interaction.reply({ content: t("en", "dungeon.combat.timeout"), ephemeral: true });
        return;
    }

    if (state.userId !== userId) {
        await interaction.deferUpdate();
        return;
    }

    await interaction.deferUpdate();

    const runState = (await redis.getJson(runKey)) as DungeonRunState | null;
    const locale = state.locale as SupportedLocale;
    const result = DungeonService.processCombatAction(state, action, runState?.activeBuff);

    const actionLine =
        action === "attack"
            ? t(locale, "dungeon.combat.attack", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) })
            : t(locale, "dungeon.combat.defend", { userDmg: String(result.userDmg), monsterDmg: String(result.monsterDmg) });

    if (result.won) {
        await redis.deleteKey(combatKey);
        await handleWin(interaction, state, result, runState, runKey, locale, actionLine);
        return;
    }

    if (result.lost) {
        await redis.deleteKey(combatKey);
        await handleLoss(interaction, state, runState, runKey, locale, actionLine);
        return;
    }

    if (result.turnsUp) {
        await redis.deleteKey(combatKey);
        await handleTurnsUp(interaction, result, runState, runKey, locale, actionLine);
        return;
    }

    // Combat continues
    const updatedState: CombatState = {
        ...state,
        monsterHp: result.monsterHp,
        userHp: result.userHp,
        turnsLeft: result.turnsLeft,
    };
    await redis.setJson(combatKey, updatedState, 60);

    const embed = new EmbedBuilder()
        .setTitle(`${state.monsterEmoji} ${t(locale, "dungeon.encounter.monster", { monster: state.monsterName, floor: String(state.floor) })}`)
        .setDescription([
            actionLine,
            "",
            t(locale, "dungeon.combat.hp", { userHp: String(result.userHp), monster: state.monsterName, monsterHp: String(result.monsterHp) }),
            t(locale, "dungeon.floor", { floor: String(state.floor), checkpoint: String(state.checkpoint) }),
        ].join("\n"))
        .setColor(0xe67e22);

    await interaction.editReply({ embeds: [embed], components: [buildCombatRow(locale)] });
}

export default {
    id: BUTTON_ID.DUNGEON_ATTACK,
    async execute(interaction: ButtonInteraction) {
        await handleCombatAction(interaction, "attack");
    },
};
