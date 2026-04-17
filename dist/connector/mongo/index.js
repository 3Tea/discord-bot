"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = require("../../util/config/index");
const logger_mixed_1 = require("../../util/log/logger.mixed");
const maskedUrl = index_1.MONGO.DB_URL.replace(/:\/\/[^@]+@/, "://*****@");
mongoose_1.default
    .connect(index_1.MONGO.DB_URL, {
    autoCreate: true,
    autoIndex: true,
    connectTimeoutMS: 7 * 1000,
    socketTimeoutMS: 90000,
    maxPoolSize: 15,
})
    .then(() => {
    logger_mixed_1.logger.debug(`[ Database =>] Connection to the database successful. ${maskedUrl}`);
}, (err) => logger_mixed_1.logger.error(`[ Database =>] The connection to the database failed: ${err}. = ${maskedUrl}`));
