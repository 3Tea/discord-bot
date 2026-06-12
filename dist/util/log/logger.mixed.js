"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const tracer_1 = __importDefault(require("tracer"));
const levels = process.env.LOG_LEVEL || "debug";
const myFormat = winston_1.default.format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`);
const winstonLogger = winston_1.default.createLogger({
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
    }), winston_1.default.format.colorize(), myFormat),
    transports: [
        new winston_1.default.transports.File({
            filename: "logs/error.log",
            level: "error",
        }),
        new winston_1.default.transports.File({
            filename: "logs/warn.log",
            level: "warn",
        }),
        new winston_1.default.transports.File({
            filename: "logs/info.log",
            level: "info",
        }),
        new winston_1.default.transports.File({
            filename: "logs/debug.log",
            level: "debug",
        }),
        new winston_1.default.transports.File({
            filename: "logs/verbose.log",
            level: "verbose",
        }),
        new winston_1.default.transports.File({
            filename: "logs/silly.log",
            level: "silly",
        }),
    ],
});
if (process.env.NODE_ENV !== "production") {
    winstonLogger.add(new winston_1.default.transports.Console({
        level: levels,
        format: winston_1.default.format.simple(),
    }));
}
exports.logger = tracer_1.default.colorConsole();
const winstonLog = (text, type = "log") => {
    if (type == "log" || type == "debug") {
        winstonLogger.debug(text);
    }
    if (type == "info") {
        winstonLogger.info(text);
    }
    if (type == "warn") {
        winstonLogger.warn(text);
    }
    if (type == "error") {
        winstonLogger.error(text);
    }
    winstonLogger.verbose(text);
};
const log = (text, type = "log") => {
    exports.logger[type](text);
    winstonLog(text, type);
};
exports.default = log;
