import { ButtonInteraction } from "discord.js";

import { BUTTON_ID } from "../util/config/button";
import { mangaRead } from "../util/manga/reader";

export default {
    id: BUTTON_ID.MANGA_READ,
    async execute(interaction: ButtonInteraction) {
        await mangaRead(interaction);
    },
};
