"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREFIX = exports.IMAGE_CDN = exports.FOOTER = exports.REDIS = exports.MONGO = exports.SERVER = void 0;
exports.SERVER = {
    PORT: process.env.PORT || `4263`,
    URL_API_HOST: process.env.URL_API_HOST,
    DOCS_PATH: process.env.DOCS_PATH || `documents`,
};
exports.MONGO = {
    DB_URL: process.env.DB_URL || `mongodb://localhost:27017/typescript`,
};
exports.REDIS = {
    REDIS_URL: process.env.REDIS_URL || `redis://127.0.0.1:6379/4`,
};
exports.FOOTER = {
    TEXT: process.env.FOOTER_TEXT || `Powered by @ds112, @onepiecehung`,
    IMAGE: process.env.FOOTER_IMAGE || `https://i.imgur.com/NUHqDg3.jpg`,
};
exports.IMAGE_CDN = process.env.IMAGE_CDN;
exports.PREFIX = process.env.PREFIX || `?`;
