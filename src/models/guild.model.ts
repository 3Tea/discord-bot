import { model, Schema } from 'mongoose';
import logger from '../util/log/logger';

const guildSchema = new Schema(
  {
    guildID: { type: Schema.Types.Mixed, default: null },
    totalPoint: { type: Schema.Types.Mixed, default: null },
    topAllGuild: { type: Schema.Types.Mixed, default: null },
    status: { type: Schema.Types.Boolean, default: true },
    verify: { type: Schema.Types.Boolean, default: true },
  },
  { timestamps: true, collection: 'Guilds' },
);

guildSchema.post('save', (error: any, doc: any, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(JSON.stringify(doc));
  }
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('This document already exists, please try again'));
  } else {
    next(error);
  }
});

guildSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    delete ret.__v;
  },
});

guildSchema.set('toObject', {
  transform: (_doc: any, ret: any) => {
    delete ret.__v;
  },
});

const GuildModel = model('Guild', guildSchema);

export default GuildModel;
