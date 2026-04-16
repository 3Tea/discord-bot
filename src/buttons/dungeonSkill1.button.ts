import { ButtonInteraction } from "discord.js";
import { BUTTON_ID } from "../util/config/button";
import { handleCombatAction } from "./dungeonAttack.button";

export default {
    id: BUTTON_ID.DUNGEON_SKILL1,
    async execute(interaction: ButtonInteraction) {
        await handleCombatAction(interaction, "skill1");
    },
};
