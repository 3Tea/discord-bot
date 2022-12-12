import TVC from "discord.js-temporary-channel";

import client from "./client";

const VC = new TVC(client, {
    userLimit: 23,
    reason: "powered by ds112",
    nameStartWith: "3AT ",
    nameStartWithTemporary: "* ",
});

VC.autoCreateTemporaryVoiceChannel();

client.login(process.env.DISCORD_TOKEN);

