// import mongoose from "mongoose";

// import { MONGO } from "../../../util/config/index";
// import { logger } from "../../../util/log/logger.mixed";

// (mongoose as any).Promise = global.Promise;

// mongoose
//     .connect(MONGO.DB_URL, {
//         useCreateIndex: true,
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//         poolSize: 15,
//         socketTimeoutMS: 90000,
//         serverSelectionTimeoutMS: 90000,
//     })
//     .then(
//         () => {
//             logger.debug(
//                 `[ Database =>] Connection to the database successful. ${MONGO.DB_URL} ✅`
//             );
//         },
//         (err) =>
//             logger.error(
//                 `[ Database =>] The connection to the database failed: ${err}. = ${MONGO.DB_URL} ❎`
//             )
//     );
