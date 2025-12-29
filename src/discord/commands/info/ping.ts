import { createCommand } from "#base";
import { ApplicationCommandType, EmbedBuilder } from "discord.js";
import { safeReply } from "../../../utils/safeReply.js";
import mongoose from "mongoose";
import os from "os";

createCommand({
    name: "ping",
    description: "Comprueba la latencia del bot y la salud del sistema.",
    type: ApplicationCommandType.ChatInput,
    async run(interaction) {
        const start = Date.now();
        let dbPing = "0ms";

        try {
            await mongoose.connection.db?.admin().ping();
            dbPing = `${Date.now() - start}ms`;
        } catch (e) {
            dbPing = "Error";
        }

        const wsPing = Math.abs(interaction.client.ws.ping);

        // Calcular uptime
        let totalSeconds = (interaction.client.uptime || 0) / 1000;
        const days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);

        const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // RAM Info (Extra info)
        const usedRam = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);

        const embed = new EmbedBuilder()
            .setColor(0x00ffff)
            .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
            .addFields(
                { name: "Ping del Bot", value: `┃ \`${wsPing}ms\``, inline: true },
                { name: "Ping de la DB", value: `┃ \`${dbPing}\``, inline: true },
                { name: "Tiempo en Línea", value: `┃ \`${uptimeStr}\``, inline: true },
                { name: "Memoria RAM", value: `┃ \`${usedRam}MB / ${totalRam}GB\``, inline: true },
                { name: "Node.js", value: `┃ \`${process.version}\``, inline: true },
                { name: "Versión Bot", value: `┃ \`1.2.1\``, inline: true }
            )
            .setFooter({
                text: `Estos tiempos de respuesta son aproximados • hoy a las ${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, '0')}`
            });

        await safeReply(interaction, { embeds: [embed] });
    }
});
