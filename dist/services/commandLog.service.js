"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLogService = void 0;
// src/services/commandLog.service.ts
const commandLog_model_1 = __importDefault(require("../models/commandLog.model"));
const logger_mixed_1 = require("../util/log/logger.mixed");
const audit_service_1 = require("./audit/audit.service");
const FLUSH_INTERVAL_MS = 10_000;
const BUFFER_THRESHOLD = 50;
let buffer = [];
let flushTimer = null;
async function flush() {
    if (buffer.length === 0)
        return;
    const batch = buffer;
    buffer = [];
    try {
        await commandLog_model_1.default.insertMany(batch, { ordered: false });
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error");
        logger_mixed_1.logger.error(`[CommandLogService] flush failed: ${err.message}`);
        audit_service_1.AuditService.logBackgroundError("CommandLogService.flush", err);
    }
}
function pushLog(entry) {
    buffer.push(entry);
    if (buffer.length >= BUFFER_THRESHOLD) {
        flush().catch(() => { });
    }
}
function startFlusher() {
    if (flushTimer)
        return;
    flushTimer = setInterval(() => {
        flush().catch(() => { });
    }, FLUSH_INTERVAL_MS);
}
exports.CommandLogService = { pushLog, startFlusher, flush };
