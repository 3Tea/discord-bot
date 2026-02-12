import mongoose from 'mongoose';

import { MONGO } from '../../util/config/index';
import logger from '../../util/log/logger';

mongoose
  .connect(MONGO.DB_URL, {
    autoCreate: true,
    autoIndex: true,
    connectTimeoutMS: 7000,
    socketTimeoutMS: 90000,
    maxPoolSize: 15,
  })
  .then(
    () => {
      logger.debug(`Database connection successful: ${MONGO.DB_URL}`);
    },
    (err) => {
      logger.error(`Database connection failed: ${err} - ${MONGO.DB_URL}`);
    },
  );
