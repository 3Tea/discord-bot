import mongoose from "mongoose";

import { MONGO } from "../../../config/service.config";

(<any>mongoose).Promise = global.Promise;

mongoose
    .connect(MONGO.DB_URL, {
        useCreateIndex: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(
        () => {
            console.debug(
                `\n[ Database =>] Connection to the database successful. ${MONGO.DB_URL} ✅\n`
            );
        },
        (err) =>
            console.error(
                `[ Database =>] The connection to the database failed: ${err}. = ${MONGO.DB_URL} ❎`
            )
    );
