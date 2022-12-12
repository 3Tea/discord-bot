import dotenv from "dotenv";
import path from "path";

const dotEnvConfigs = {
    path: path.resolve(process.cwd(), ".env"),
};
dotenv.config(dotEnvConfigs);

// import "./server";
import "../bot";
// import "../connector/redis";
// import "../connector/mongo";
