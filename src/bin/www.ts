import dotenv from "dotenv";
import path from "path";

const dotEnvConfigs = {
    path: path.resolve(process.cwd(), ".env"),
};
dotenv.config(dotEnvConfigs);

if (!process.env.BOT_TOKEN) {
    console.error(
        `Error: Bot token is required, plz setup bot token in file .env`
    );
    process.exit(1);
}

import "../connector/mongo/init/index";
import "./commands";
import "./bot";
