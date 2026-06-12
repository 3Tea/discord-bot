"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIO_CONTENT_TYPES = exports.CONFESSION_TAGS = exports.CONFESSION_KEYWORDS_MAX_COUNT = exports.CONFESSION_KEYWORD_MAX_LENGTH = exports.CONFESSION_REPLY_MAX_LENGTH = exports.CONFESSION_REPLY_COST_COIN = exports.CONFESSION_SKIP_CD_COST_COIN = exports.CONFESSION_VIP_COST_GEM = exports.CONFESSION_COOLDOWN_DEFAULT = exports.CONFESSION_COOLDOWN_MAX = exports.CONFESSION_COOLDOWN_MIN = exports.CONFESSION_CONTENT_MAX = void 0;
exports.confessionCooldownRedisKey = confessionCooldownRedisKey;
exports.confessionAudioRedisKey = confessionAudioRedisKey;
exports.CONFESSION_CONTENT_MAX = 3500;
exports.CONFESSION_COOLDOWN_MIN = 1;
exports.CONFESSION_COOLDOWN_MAX = 120;
exports.CONFESSION_COOLDOWN_DEFAULT = 10;
exports.CONFESSION_VIP_COST_GEM = 5;
exports.CONFESSION_SKIP_CD_COST_COIN = 50;
exports.CONFESSION_REPLY_COST_COIN = 5;
exports.CONFESSION_REPLY_MAX_LENGTH = 1500;
exports.CONFESSION_KEYWORD_MAX_LENGTH = 50;
exports.CONFESSION_KEYWORDS_MAX_COUNT = 50;
exports.CONFESSION_TAGS = ["heartfelt", "funny", "question", "sharing", "other"];
function confessionCooldownRedisKey(guildId, userId) {
    return `confession:cd:${guildId}:${userId}`;
}
exports.AUDIO_CONTENT_TYPES = [
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/webm",
];
function confessionAudioRedisKey(userId) {
    return `confession_audio:${userId}`;
}
