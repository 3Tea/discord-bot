"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashMessage = hashMessage;
exports.checkMessageSpam = checkMessageSpam;
const node_crypto_1 = require("node:crypto");
function hashMessage(content) {
    return (0, node_crypto_1.createHash)("md5").update(content.toLowerCase().trim()).digest("hex");
}
function checkMessageSpam(content, contentHash, member, config) {
    // Check minimum length (skip if content is empty due to missing MessageContent intent)
    if (content.length > 0 && content.length < config.minMessageLength) {
        return { isSpam: true, reason: "too_short" };
    }
    // No member record yet — first message, not spam
    if (!member) {
        return { isSpam: false };
    }
    // Check duplicate content (skip if content is empty due to missing MessageContent intent)
    if (content.length > 0 && member.lastMessageHash === contentHash) {
        return { isSpam: true, reason: "duplicate" };
    }
    // Check cooldown
    if (member.lastMessageAt) {
        const elapsed = Date.now() - member.lastMessageAt.getTime();
        if (elapsed < config.messageCooldown * 1000) {
            return { isSpam: true, reason: "cooldown" };
        }
    }
    return { isSpam: false };
}
