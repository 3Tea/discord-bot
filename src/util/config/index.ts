export const MONGO = {
  DB_URL: process.env.DB_URL || 'mongodb://localhost:27017/typescript',
};

export const REDIS = {
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379/4',
};

export const SERVER_HD = process.env.SERVER_HD;
export const SERVER_S = process.env.SERVER_S;

export const FOOTER = {
  icon: process.env.FOOTER_ICON || '',
  text: process.env.FOOTER_TEXT || '',
};

export const CLIENT_ID = process.env.CLIENT_ID || '';
export const GUILD_ID = process.env.GUILD_ID || '';

export const SERVER_CHAT = process.env.SERVER_CHAT;
export const KEY_CHAT = process.env.KEY_CHAT;
