import TVC from "discord.js-temporary-channel";
import dotenv from "dotenv";
import path from "path";

import client from "./client";

const dotEnvConfigs = {
    path: path.resolve(process.cwd(), ".env"),
};
dotenv.config(dotEnvConfigs);

const VC = new TVC(client, {
    userLimit: 23,
    reason: "powered by ds112",
    nameStartWith: "3AT ",
    nameStartWithTemporary: "* ",
});

VC.autoCreateTemporaryVoiceChannel();

client.login(process.env.DISCORD_TOKEN);
