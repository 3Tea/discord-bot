export const SERVER = {
    PORT: process.env.PORT || `4263`,
    URL_API_HOST: process.env.URL_API_HOST || `http://127.0.0.1`,
    DOCS_PATH: process.env.DOCS_PATH || `documents`,
    WS_PORT: process.env.WS_PORT || `9856`,
};

export const MONGO = {
    DB_URL: process.env.DB_URL || `mongodb://localhost:27017/typescript`,
};

export const REDIS = {
    REDIS_URL: process.env.REDIS_URL || `redis://127.0.0.1:6379/4`,
    URL: process.env.REDIS_BASEURL || `127.0.0.1`,
    PORT: process.env.REDIS_PORT || `6379`,
};

export const FE_URL = process.env.FE_URL || `localhost:3000`;

export const SERVER_HD = process.env.SERVER_HD;
export const SERVER_S = process.env.SERVER_S;

export const FOOTER = {
    icon: process.env.FOOTER_ICON || "",
    text: process.env.FOOTER_TEXT || "",
};
export const CLIENT_ID = process.env.CLIENT_ID || "";
export const GUILD_ID = process.env.GUILD_ID || "";
