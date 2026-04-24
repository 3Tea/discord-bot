"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCORD_TOKEN = exports.URL_DISCUSSIONS = exports.URL_HOMEPAGE = exports.SUPPORT_SERVER_LINK = exports.DEV_USER_ID = exports.URL_REPORT_BUG = exports.GUILD_ID = exports.APPLICATION_ID = exports.FOOTER = exports.SERVER_S = exports.SERVER_HD = exports.FE_URL = exports.REDIS = exports.MONGO = exports.SERVER = void 0;
exports.SERVER = {
    PORT: process.env.PORT || `4263`,
    URL_API_HOST: process.env.URL_API_HOST || `http://127.0.0.1`,
    DOCS_PATH: process.env.DOCS_PATH || `documents`,
    WS_PORT: process.env.WS_PORT || `9856`,
};
exports.MONGO = {
    DB_URL: process.env.DB_URL || `mongodb://localhost:27017/typescript`,
};
exports.REDIS = {
    REDIS_URL: process.env.REDIS_URL || `redis://127.0.0.1:6379/4`,
    URL: process.env.REDIS_BASEURL || `127.0.0.1`,
    PORT: process.env.REDIS_PORT || `6379`,
};
exports.FE_URL = process.env.FE_URL || `localhost:3000`;
exports.SERVER_HD = process.env.SERVER_HD;
exports.SERVER_S = process.env.SERVER_S;
exports.FOOTER = {
    icon: process.env.FOOTER_ICON || undefined,
    text: process.env.FOOTER_TEXT || undefined,
};
exports.APPLICATION_ID = process.env.APPLICATION_ID || "";
exports.GUILD_ID = process.env.GUILD_ID || "";
exports.URL_REPORT_BUG = process.env.URL_REPORT_BUG || "";
exports.DEV_USER_ID = process.env.DEV_USER_ID || "";
exports.SUPPORT_SERVER_LINK = process.env.SUPPORT_SERVER_LINK || "";
exports.URL_HOMEPAGE = process.env.URL_HOMEPAGE ?? "";
exports.URL_DISCUSSIONS = process.env.URL_DISCUSSIONS ?? "";
exports.DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? "";
