const winston = require("winston");
const levels = process.env.LOG_LEVEL || "debug";
const myFormat = winston.format.printf(
    ({
        levels,
        message,
        timestamp,
    }: {
        levels: any;
        message: any;
        timestamp: any;
    }) => `${timestamp} ${levels}: ${message}`
);

const winstonLogger: any = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        winston.format.colorize(),
        myFormat
    ),
    transports: [
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
        }),
        new winston.transports.File({
            filename: "logs/warn.log",
            level: "warn",
        }),
        new winston.transports.File({
            filename: "logs/info.log",
            level: "info",
        }),
        new winston.transports.File({
            filename: "logs/debug.log",
            level: "debug",
        }),
        new winston.transports.File({
            filename: "logs/verbose.log",
            level: "verbose",
        }),
        new winston.transports.File({
            filename: "logs/silly.log",
            level: "silly",
        }),
    ],
});

// Write log to console when run on mode is not production
if (process.env.NODE_ENV !== "production") {
    winstonLogger.add(
        new winston.transports.Console({
            level: levels,
            timestamp: () => {
                return new Date().toISOString();
            },
            format: winston.format.simple(),
        })
    );
}

import tracer from "tracer";

export const logger: any = tracer.colorConsole();
// interface
type TLog = "log" | "trace" | "debug" | "info" | "warn" | "error";

/**
 *
 * @param text
 * @param type
 */
const winstonLog = (text: string, type: TLog = "log"): void => {
    if (type == "log") {
        winstonLogger.debug(text);
    }
    if (type == "debug") {
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
/**
 * Log data
 * @param text message
 * @param shop shop domain
 */
const log = (text: string, type: TLog = "log"): void => {
    logger[type](text);
    winstonLog(text, type);
};

export default log;
