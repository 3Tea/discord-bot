import { model, Schema } from 'mongoose';
import logger from '../util/log/logger';

const userSchema = new Schema(
  {
    userID: { type: Schema.Types.Mixed, required: true, default: null },
    totalPoint: { type: Schema.Types.Number, default: 0 },
    totalCoin: { type: Schema.Types.Number, default: 0 },
    topAllServer: { type: Schema.Types.Number, default: 0 },
    lastActivity: { type: Schema.Types.Date, default: null },
    status: { type: Schema.Types.Boolean, default: true },
  },
  { timestamps: true, collection: 'Users' },
);

userSchema.post('save', (error: any, doc: any, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(JSON.stringify(doc));
  }
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('This document already exists, please try again'));
  } else {
    next(error);
  }
});

userSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    delete ret.__v;
  },
});

userSchema.set('toObject', {
  transform: (_doc: any, ret: any) => {
    delete ret.__v;
  },
});

const UserModel = model('User', userSchema);

export default UserModel;
