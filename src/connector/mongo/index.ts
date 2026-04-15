import mongoose from "mongoose";

import { MONGO } from "../../util/config/index";
import { logger } from "../../util/log/logger.mixed";

const maskedUrl = MONGO.DB_URL.replace(/:\/\/[^@]+@/, "://*****@");

mongoose
    .connect(MONGO.DB_URL, {
        autoCreate: true,
        autoIndex: true,
        connectTimeoutMS: 7 * 1000,
        socketTimeoutMS: 90000,
        maxPoolSize: 15,
    })
    .then(
        () => {
            logger.debug(`[ Database =>] Connection to the database successful. ${maskedUrl}`);
        },
        (err: Error) => logger.error(`[ Database =>] The connection to the database failed: ${err}. = ${maskedUrl}`)
    );
