import type { Client } from "discord.js";
import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

function countFiles(dir: string): number {
    let count = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            count += countFiles(fullPath);
        } else if (file.endsWith(".ts") || file.endsWith(".js")) {
            count++;
        }
    }
    return count;
}

import { Constatic } from "../../discord/base/app.js";

export function botRoutes(app: FastifyInstance, client: Client<true>) {
    const commandsPath = path.join(process.cwd(), "src", "discord", "commands");

    app.get("/stats", async (_, res) => {
        let commandCount = 0;
        try {
            commandCount = countFiles(commandsPath);
        } catch (e) {
            commandCount = 0;
        }

        let dbPing = -1;
        try {
            const start = Date.now();
            await mongoose.connection.db?.admin().ping();
            dbPing = Date.now() - start;
        } catch (e) { }

        return res.send({
            servers: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
            commands: commandCount,
            ping: client.ws.ping,
            ram: process.memoryUsage().heapUsed,
            uptime: client.uptime,
            dbPing
        });
    });

    app.get("/bot/info", async (_, res) => {
        return res.send({
            username: client.user.username,
            avatar: client.user.displayAvatarURL({ size: 256, extension: "png" }),
            id: client.user.id
        });
    });

    app.get("/bot/commands", async (_, res) => {
        const commands = Constatic.getInstance().commands.build();

        return res
            .header('Content-Type', 'application/json; charset=utf-8')
            .send(JSON.stringify(commands, (_, v) =>
                typeof v === 'bigint' ? v.toString() : v
            ));
    });
}
