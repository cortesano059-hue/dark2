import { createEvent } from "#base";
import { env } from "#env";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import staticPlugin from "@fastify/static";
import ck from "chalk";
import fastify from "fastify";
import socketio from "fastify-socket.io";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { registerRoutes } from "./routes/index.js";
import { setSocket } from "./socket.js";

const app = fastify();
app.register(cors, { origin: "*" });
app.register(cookie);
app.register(socketio, {
    cors: { origin: "*" }
});
app.register(jwt, {
    secret: env.JWT_SECRET
});

const dashboardPath = path.join(process.cwd(), "dashboard", "dist");
console.log(ck.green(`▸ Dashboard`) + " > " + ck.blue(`${env.DASHBOARD_URL} `) + ck.green("✓"));
console.log(ck.green(`▸ Dashboard`) + " > " + ck.blue(`online `) + ck.green("✓"));

app.register(staticPlugin, {
    root: dashboardPath,
    prefix: "/",
});

app.setNotFoundHandler((req, res) => {
    if (!req.raw.url?.startsWith("/api")) {
        return res.sendFile("index.html", dashboardPath);
    }
    res.status(404).send({
        message: `Route ${req.method}:${req.url} not found`,
        error: "Not Found",
        statusCode: 404
    });
});

createEvent({
    name: "Start Fastify Server",
    event: "clientReady", once: true,
    async run(client) {
        setSocket(app);
        logger.setClient(client);
        registerRoutes(app, client);

        const port = env.SERVER_PORT ?? 3000;

        await app.listen({ port, host: "0.0.0.0" })
            .then(() => {
                console.log(ck.green(
                    `● ${ck.underline("Fastify")} server listening on port ${port}`
                ));
            })
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    },
});