// #!/usr/bin/env node
/**
 * Module dependencies.
 */

const debug = require("debug")("ds112:server");
import http from "http";

import app from "../app";
import { SERVER } from "../util/config/index";
import { logger } from "../util/log/logger.mixed";

// const SERVER from "../config/constants");

/**
 * Get port from environment and store in Express.
 */

const port: Number = normalizePort(SERVER.PORT);
app.set("port", port);

/**
 * Create HTTP server.
 */

const server: any = http.createServer(app);
/**
 * TODO: Setup socket.io
 */
// app.set("socketService", new SocketIO(server));
// export const socketService = app.get("socketService");

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, () => {
    logger.warn(`Service APIs running on port: ${port}`);
    logger.info(`
    ─────────────────────╔╗╔╗──────╔═╗╔═╗───────────╔╗
    ─────────────────────║║║║──────║║╚╝║║──────────╔╝╚╗
    ╔══╦══╦╗╔╗╔╦══╦═╦══╦═╝║║╚═╦╗─╔╗║╔╗╔╗╠══╦═╗╔══╦═╩╗╔╬══╦══╗
    ║╔╗║╔╗║╚╝╚╝║║═╣╔╣║═╣╔╗║║╔╗║║─║║║║║║║║╔╗║╔╗╣╔╗║╔╗║║║║═╣╔╗║
    ║╚╝║╚╝╠╗╔╗╔╣║═╣║║║═╣╚╝║║╚╝║╚═╝║║║║║║║╔╗║║║║╚╝║╔╗║╚╣║═╣╔╗║
    ║╔═╩══╝╚╝╚╝╚══╩╝╚══╩══╝╚══╩═╗╔╝╚╝╚╝╚╩╝╚╩╝╚╩═╗╠╝╚╩═╩══╩╝╚╝
    ║║────────────────────────╔═╝║────────────╔═╝║
    ╚╝────────────────────────╚══╝────────────╚══╝`);
});
server.on("error", onError);
server.on("listening", onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: any) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    logger.error(
        `⚠️ ⚠️ ⚠️  Bruh... port = ${port}? 📌📌📌 , some function will be missing!!!`
    );
    return Math.abs(port);
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: any) {
    if (error.syscall !== "listen") {
        throw error;
    }

    const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case "EACCES":
            console.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    const addr = server.address();
    const bind =
        typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;
    debug(`Listening on ${bind}`);
}

export default server;
