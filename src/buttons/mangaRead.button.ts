import { ButtonInteraction } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { mangaRead } from "../util/manga/reader";

export default {
    id: BUTTON_ID.mangaRead,
    async execute(interaction: ButtonInteraction) {
        await mangaRead(interaction);
    },
};
