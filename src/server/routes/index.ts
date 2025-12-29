import type { Client } from "discord.js";
import type { FastifyInstance } from "fastify";
import { homeRoute } from "./home.js";
import { authRoutes } from "./auth.js";
import { guildRoutes } from "./guilds.js";
import { economyRoutes } from "./economy.js";
import { botRoutes } from "./bot.js";

export function registerRoutes(app: FastifyInstance, client: Client<true>) {
    homeRoute(app, client);

    // API Prefix
    app.register((api, opts, done) => {
        authRoutes(api, client);
        guildRoutes(api, client);
        economyRoutes(api, client);
        botRoutes(api, client);
        done();
    }, { prefix: "/api" });
}