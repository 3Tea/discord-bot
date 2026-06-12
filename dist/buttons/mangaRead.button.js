"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const button_1 = require("../util/config/button");
const reader_1 = require("../util/manga/reader");
exports.default = {
    id: button_1.BUTTON_ID.MANGA_READ,
    async execute(interaction) {
        await (0, reader_1.mangaRead)(interaction);
    },
};
