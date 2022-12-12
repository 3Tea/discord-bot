import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";

const app: Application = express();
/**
 * todo: setup helmet
 * Helmet can help protect your app from some well-known web vulnerabilities by setting HTTP headers appropriately.
 * Helmet is actually just a collection of smaller middleware functions that set security-related HTTP response headers:
 */
// app.use(
//     helmet({
//         contentSecurityPolicy: false,
//     })
// );

/**
 * todo: https://www.npmjs.com/package/express-prom-bundle
 */

/**
 * todo: Use gzip compression
 */

// TODO: Setup for get IP, for reverse proxy
app.set("trust proxy", true);

// TODO: set up cors
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

export default app;
