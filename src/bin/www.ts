import dotenv from "dotenv";
import path from "node:path";

const dotEnvConfigs = {
    path: path.resolve(process.cwd(), ".env"),
};
dotenv.config(dotEnvConfigs);

import "../bot";
import "../connector/mongo";
