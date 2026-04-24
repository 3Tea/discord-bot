"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/bin/www.ts
const dotenv_1 = __importDefault(require("dotenv"));
const node_path_1 = __importDefault(require("node:path"));
const dotEnvConfigs = {
    path: node_path_1.default.resolve(process.cwd(), ".env"),
};
dotenv_1.default.config(dotEnvConfigs);
const validate_1 = require("../util/config/validate");
(0, validate_1.validateEnv)();
const index_1 = require("../util/i18n/index");
async function main() {
    await (0, index_1.initI18n)();
    await Promise.resolve().then(() => __importStar(require("../connector/mongo")));
    const { initializeClient } = await Promise.resolve().then(() => __importStar(require("../client")));
    await initializeClient();
    const { login } = await Promise.resolve().then(() => __importStar(require("../bot")));
    await login();
    const { startGuildStatsAggregator } = await Promise.resolve().then(() => __importStar(require("../util/xp/guildStatsAggregator")));
    startGuildStatsAggregator();
    const { startVoiceXPWorker } = await Promise.resolve().then(() => __importStar(require("../events/voiceStateUpdate")));
    startVoiceXPWorker();
    const { startPremiumExpiry } = await Promise.resolve().then(() => __importStar(require("../services/premium/premiumExpiry")));
    startPremiumExpiry();
    const { CommandLogService } = await Promise.resolve().then(() => __importStar(require("../services/commandLog.service")));
    CommandLogService.startFlusher();
    const { startAuditSnapshotJob } = await Promise.resolve().then(() => __importStar(require("../util/audit/snapshotJob")));
    const { default: clientSingleton } = await Promise.resolve().then(() => __importStar(require("../client")));
    startAuditSnapshotJob(clientSingleton);
}
main().catch(console.error);
// Graceful shutdown — flush pending command logs, disconnect DB, destroy client before exit
async function shutdown() {
    const { CommandLogService } = await Promise.resolve().then(() => __importStar(require("../services/commandLog.service")));
    await CommandLogService.flush();
    const { AuditDispatcherService } = await Promise.resolve().then(() => __importStar(require("../services/audit/auditDispatcher.service")));
    await AuditDispatcherService.drain();
    const { stopAuditSnapshotJob } = await Promise.resolve().then(() => __importStar(require("../util/audit/snapshotJob")));
    stopAuditSnapshotJob();
    const { stopVoiceXPWorker } = await Promise.resolve().then(() => __importStar(require("../events/voiceStateUpdate")));
    stopVoiceXPWorker();
    const mongoose = await Promise.resolve().then(() => __importStar(require("mongoose")));
    await mongoose.default.disconnect().catch(() => { });
    const { default: client } = await Promise.resolve().then(() => __importStar(require("../client")));
    client.destroy();
    process.exit(0);
}
process.on("SIGINT", () => {
    shutdown().catch(() => process.exit(1));
});
process.on("SIGTERM", () => {
    shutdown().catch(() => process.exit(1));
});
